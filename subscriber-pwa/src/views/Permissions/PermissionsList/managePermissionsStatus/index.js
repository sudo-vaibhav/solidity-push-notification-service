import localforage from "localforage";
import {
  NOTIFICATION_PRIVATE_KEY,
  ENCRYPT_OPTIONS,
} from "../../../../constants";
import JSEncrypt from "jsencrypt";
const managePermissionStatus = async ({ setState, account, contract }) => {
  const newState = {};
  newState["notifications"] =
    "Notification" in window &&
    localStorage.getItem("PUSH_NOTIFICATION_SUBSCRIBED") === "1";

  newState["connected"] = account != null;

  const privateKey = await localforage.getItem(NOTIFICATION_PRIVATE_KEY);
  newState["published-keys"] = false;

  if (privateKey && contract) {
    // now check if blockchain is updated or not
    const encrypt = new JSEncrypt(ENCRYPT_OPTIONS);
    encrypt.setKey(privateKey);
    const publicKey = encrypt.getPublicKey();
    const publishedPublicKey = await contract.methods
      .publicKeys(account)
      .call();
    if (publicKey === publishedPublicKey) {
      newState["published-keys"] = true;
    }
  }
  setState((oldState) => ({ ...oldState, ...newState }));
};

export default managePermissionStatus;
