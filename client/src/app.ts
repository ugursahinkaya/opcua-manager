import { SecureSocket } from "@ugursahinkaya/secure-socket";
import { useOPCUAManager } from "./manager";
const secureSocket = new SecureSocket({
  socketUrl: "ws://localhost:2525/ws/",
  authUrl: "http://localhost:2000",
  logLevel: "trae",
  operations: {
    saveRefreshToken(token: string) {
      console.log("saveRefreshToken", token);
      localStorage.setItem("refreshToken", token);
    },
    getRefreshToken() {
      return localStorage.getItem("refreshToken") as string;
    },
    login(user: any) {
      console.log("login", user);
    },
  },
});
//secureSocket.socketInit("HSIgOkBpPI3hT3zKBjIQbqRr3Z6bZZHVTCF8Ryjh");
setTimeout(() => {
  console.log(1111);
  secureSocket.login("test-user", "1239.Ugur");
}, 2000);
export const manager = useOPCUAManager("opcua-manager", secureSocket);
