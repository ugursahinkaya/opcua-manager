import { InsertOneResult, MongoClient, ObjectId, UpdateResult } from "mongodb";
import type { ClientManager } from "../index.js";
import { OPCUAClientManager } from "../manager/client.js";

export function OPCUAClientPlugin(args?: {
  databaseUrl: string;
  dbName: string;
  managersCollection: string;
  deletedManagersCollection: string;
}) {
  const uri = args?.databaseUrl ?? process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("DATABASE_URL must be provided");
  }
  const opcuaDb = args?.dbName ?? process.env.OPCUA_DB ?? "opcua";
  const managersCollection =
    args?.managersCollection ??
    process.env.OPCUA_MANAGER_COLLECTION ??
    "managers";
  const deletedManagersCollection =
    args?.deletedManagersCollection ??
    process.env.DELETED_OPCUA_MANAGER_COLLECTION ??
    "managers_deleted";
  const managers = new Map<string, OPCUAClientManager>();
  const dbClient = new MongoClient(uri);
  try {
    dbClient.connect();
  } catch (err) {
    console.error("Bir hata oluştu:", err);
  }

  async function saveStatus(manager: ClientManager, active: boolean) {
    const { applicationName, client } = manager;
    const old = await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .findOne({ applicationName, "client.endpointUrl": client.endpointUrl });
    if (old) {
      await dbClient
        .db(opcuaDb)
        .collection(managersCollection)
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

  function closeManager(rawManager: ClientManager) {
    const { applicationName, client } = rawManager;
    const manager = managers.get(`${applicationName}-${client.endpointUrl}`);
    manager?.disconnectClient();
    void saveStatus(rawManager, false);
    return;
  }

  function useManager(
    manager: ClientManager,
    operations: Record<string, (...args: any[]) => any>
  ) {
    const { applicationName, client } = manager;
    const newManager = new OPCUAClientManager(manager, operations);
    managers.set(`${applicationName}-${client.endpointUrl}`, newManager);
    void saveStatus(manager, true);
    return newManager;
  }

  async function saveManager(
    manager: ClientManager & Record<string, any>,
    context: { payload: { sender: string } }
  ): Promise<UpdateResult<ClientManager> | InsertOneResult<ClientManager>> {
    const user = context.payload.sender;
    const { applicationName, client } = manager;
    const old = await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .findOne({ applicationName, "client.endpointUrl": client.endpointUrl });
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
              client,
              meta: { ...old.meta, user, lastSave: new Date() },
            },
          }
        );
    }
    return await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .insertOne({ ...manager, client, meta: { user, firstSave: new Date() } });
  }

  async function getManagers(filter: Record<string, any>) {
    return (await dbClient
      .db(opcuaDb)
      .collection(managersCollection)
      .find(filter)
      .toArray()) as unknown as ClientManager[];
  }

  async function removeManagers(idList: string[]) {
    const selector = { id: { $in: idList.map((id) => new ObjectId(id)) } };
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
      saveClientManager: saveManager,
      getClientManagers: getManagers,
      removeClientManagers: removeManagers,
      useClientManager: useManager,
      closeClientManager: closeManager,
    },
    managers,
  };
}
