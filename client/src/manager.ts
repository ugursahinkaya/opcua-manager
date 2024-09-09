import { SecureSocket } from "@ugursahinkaya/secure-socket/index";
import type { ClientManager, ServerManager } from "../../node";
import { computed, ref } from "vue";

export function useOPCUAManager(
  botName: string,
  secureSocket: SecureSocket<any>
) {
  const clientManagers = ref<ClientManager[]>([]);

  const serverManagers = ref<ServerManager[]>([]);

  const clientManagerFilter = ref<Record<string, any>>({});
  const serverManagerFilter = ref<Record<string, any>>({});

  const activeServerManagerIndex = ref(-1);
  const activeServerManager = computed(
    () => serverManagers.value[activeServerManagerIndex.value]
  );

  const activeClientManagerIndex = ref(-1);
  const activeClientManager = computed(
    () => clientManagers.value[activeClientManagerIndex.value]
  );

  const activeServerIndex = ref(-1);
  const activeServer = computed(
    () => activeServerManager.value?.servers[activeServerIndex.value]
  );

  async function sendToBot<T>(payload: any, context?: any): Promise<T> {
    return (await secureSocket.sendMessage(botName, payload, context)) as T;
  }

  async function saveClientManager(
    manager: ClientManager
  ): Promise<ClientManager> {
    return await sendToBot<ClientManager>(manager, {
      process: "saveClientManager",
    });
  }

  async function getClientManagers(): Promise<void> {
    clientManagers.value = await sendToBot(clientManagerFilter.value, {
      process: "getClientManagers",
    });
  }

  async function removeClientManagers(idList: string[]): Promise<void> {
    clientManagers.value = await sendToBot(idList, {
      process: "removeClientManagers",
    });
  }

  async function useClientManager(
    manager: ClientManager
  ): Promise<ClientManager> {
    return await sendToBot<ClientManager>(manager, {
      process: "useClientManager",
    });
  }

  async function closeClientManager(
    manager: ClientManager
  ): Promise<ClientManager> {
    return await sendToBot<ClientManager>(manager, {
      process: "closeClientManager",
    });
  }

  async function saveServerManager(
    manager: ServerManager
  ): Promise<ServerManager> {
    return await sendToBot<ServerManager>(
      { manager, filter: serverManagerFilter.value },
      { process: "saveServerManager" }
    );
  }

  async function getServerManagers(): Promise<void> {
    serverManagers.value = await sendToBot(serverManagerFilter.value, {
      process: "getServerManagers",
    });
  }

  async function removeServerManagers(idList: string[]): Promise<void> {
    serverManagers.value = await sendToBot(idList, {
      process: "removeServerManagers",
    });
  }

  async function useServerManager(
    manager: ServerManager
  ): Promise<ServerManager> {
    return await sendToBot<ServerManager>(manager, {
      process: "useServerManager",
    });
  }

  async function useServer(
    managerName: string,
    serverName: string
  ): Promise<ServerManager> {
    return await sendToBot<ServerManager>(
      { managerName, serverName },
      { process: "useServer" }
    );
  }

  async function getServer(
    managerName: string,
    serverName: string
  ): Promise<ServerManager> {
    return await sendToBot<ServerManager>(
      { managerName, serverName },
      { process: "getServer" }
    );
  }

  async function shutDownServer(
    managerName: string,
    serverName: string
  ): Promise<ServerManager> {
    return await sendToBot<ServerManager>(
      { managerName, serverName },
      { process: "shutDownServer" }
    );
  }

  return {
    clientManager: {
      list: clientManagers,
      filter: clientManagerFilter,
      get: getClientManagers,
      remove: removeClientManagers,
      save: saveClientManager,
      use: useClientManager,
      close: closeClientManager,
      activeManager: activeClientManager,
      activeIndex: activeClientManagerIndex,
    },
    serverManager: {
      list: serverManagers,
      filter: serverManagerFilter,
      get: getServerManagers,
      remove: removeServerManagers,
      save: saveServerManager,
      use: useServerManager,
      activeManager: activeServerManager,
      activeIndex: activeServerManagerIndex,
    },
    server: {
      use: useServer,
      get: getServer,
      shutDown: shutDownServer,
      activeServer: activeServer,
      activeIndex: activeServerIndex,
    },
  };
}
