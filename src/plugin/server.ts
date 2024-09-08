import { InsertOneResult, MongoClient, ObjectId, UpdateResult } from "mongodb";
import { OPCUAServer } from "node-opcua";
import type { ServerManager } from "../index.js";
import { OPCUAServerManager } from "../manager/server.js";

export function OPCUAServerPlugin(args?: {
  databaseUrl: string;
  dbName: string;
  serversCollection: string;
  deletedServersCollection: string;
}) {
  const uri = args?.databaseUrl ?? process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("DATABASE_URL must be provided");
  }
  const opcuaDb = args?.dbName ?? process.env.OPCUA_DB ?? "opcua";

  const managersCollection =
    args?.serversCollection ??
    process.env.OPCUA_SERVER_COLLECTION ??
    "managers";
  const deletedManagersCollection =
    args?.deletedServersCollection ??
    process.env.DELETED_OPCUA_SERVER_COLLECTION ??
    "managers_deleted";

  const managers = new Map<string, OPCUAServerManager>();

  const dbClient = new MongoClient(uri);
  try {
    dbClient.connect();
  } catch (err) {
    console.error("Bir hata oluştu:", err);
  }

  async function saveStatus(name: string, active: boolean) {
    const old = await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .findOne({ name, type: "server" });
    if (old) {
      await dbClient
        .db(opcuaDb)
        .collection(deletedManagersCollection)
        .updateOne(
          { _id: old._id },
          {
            $set: {
              active,
              meta: { ...old.meta, lastSave: new Date() },
            },
          }
        );
    }
  }

  function shutDownServer(managerName: string, serverName: string) {
    const server = getServer(managerName, serverName);
    server?.shutdown();
    server?.dispose();
    return;
  }

  function getManager(managerName: string): OPCUAServerManager {
    const manager = managers.get(managerName);
    if (!manager) {
      throw new Error(`Manager ${managerName} not found`);
    }
    return manager;
  }

  function getServer(managerName: string, serverName: string): OPCUAServer {
    const manager = getManager(managerName);
    const server = manager.servers.get(serverName);
    if (!server) {
      throw new Error(`Server ${serverName} not found`);
    }
    return server;
  }

  function useManager(
    manager: ServerManager,
    operations: Record<string, (...args: any[]) => any>
  ) {
    const { applicationName } = manager;
    const newManager = new OPCUAServerManager(manager, operations);
    void saveStatus(applicationName, false);
    managers.set(applicationName, newManager);
    return newManager;
  }

  function useServer(managerName: string, serverName: string) {
    const manager = getManager(managerName);
    manager.startServer(serverName);
    return getServer(managerName, serverName);
  }

  async function saveManager(
    manager: ServerManager & Record<string, any>,
    context: { payload: { sender: string } }
  ): Promise<UpdateResult<ServerManager> | InsertOneResult<ServerManager>> {
    const user = context.payload.sender;
    const { name } = manager;
    const old = await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .findOne({ name, type: "server" });
    if (old) {
      delete manager._id;
      return await dbClient
        .db(opcuaDb)
        .collection(managersCollection)
        .updateOne(
          { _id: old._id },
          {
            $set: {
              ...manager,
              meta: { ...old.meta, user, lastSave: new Date() },
            },
          }
        );
    }
    return await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .insertOne({
        ...manager,
        type: "server",
        meta: { user, firstSave: new Date() },
      });
  }

  async function getManagers(filter: Record<string, any>) {
    return await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .find<ServerManager>({ ...filter, type: "server" })
      .toArray();
  }

  async function removeManagers(idList: string[]) {
    const selector = {
      id: { $in: idList.map((id) => new ObjectId(id)) },
      type: "server",
    };
    const list = await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .find(selector)
      .toArray();
    if (list.length > 0) {
      await dbClient
        .db(opcuaDb)
        .collection(deletedManagersCollection)
        .insertMany(list);
    }
    await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .deleteMany(selector);
    return await getManagers({});
  }

  return {
    operations: {
      saveServerManager: saveManager,
      getServerManagers: getManagers,
      removeServerManagers: removeManagers,
      useServerManager: useManager,
      useServer,
      getServer,
      shutDownServer,
    },
    managers,
  };
}
