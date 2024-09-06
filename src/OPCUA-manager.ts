import {
  ClientSubscription,
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  ClientMonitoredItem,
  AttributeIds,
  coerceNodeId,
  NumericRange,
  DataValue,
  Variant,
  DataType,
  WriteValue,
  StatusCodes,
  ClientSession,
  OPCUAClientOptions,
} from "node-opcua";
import {
  RawClient,
  RawManager,
  RawMonitoredItem,
  RawSubscription,
  RawVariable,
} from "./index.js";
import { mapRawToTimestampsToReturn, createFilterFromRaw } from "./helpers.js";
import { GenericRouter } from "@ugursahinkaya/generic-router";

class OPCUAError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OPCUAError";
  }
}

const DEFAULT_TIMESTAMP_RETURN = 3;

export class OPCUAManager {
  client: OPCUAClient;
  router: GenericRouter<any>;
  protected session?: ClientSession;
  protected applicationName: string;
  protected endpointUrl: string;
  protected subscriptions: Map<string, ClientSubscription>;
  protected monitoredItems: Map<string, ClientMonitoredItem>;
  protected variables: Map<string, WriteValue>;
  protected rawManager: RawManager;

  constructor(
    manager: RawManager,
    operations: Record<string, (...args: any[]) => any>
  ) {
    this.applicationName = manager.applicationName;
    this.endpointUrl = manager.client.endpointUrl;
    this.rawManager = manager;

    this.client = this.createClient(manager.client);
    this.router = new GenericRouter(operations);
    this.monitoredItems = new Map();
    this.subscriptions = new Map();
    this.variables = new Map();

    if (manager.client.autoConnect !== false) {
      void this.connectClient();
    }
  }

  private createClient(clientConfig: RawClient): OPCUAClient {
    const clientArgs: OPCUAClientOptions = {
      applicationName: this.applicationName,
      endpointMustExist: clientConfig.endpointMustExist ?? false,
    };

    if (clientConfig.securityMode) {
      clientArgs.securityMode = MessageSecurityMode[clientConfig.securityMode];
    }
    if (clientConfig.securityPolicy) {
      clientArgs.securityPolicy = SecurityPolicy[clientConfig.securityPolicy];
    }

    return OPCUAClient.create(clientArgs);
  }

  async connectClient() {
    try {
      await this.client.connect(this.endpointUrl);
      await this.initializeSession();
      await this.initializeSubscriptions();
      await this.initializeMonitoredItems();
      await this.initializeVariables();
    } catch (error) {
      this.handleError("Failed to connect client", error);
    }
  }

  async reconnectClient(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
        await this.connectClient();
      } catch (error) {
        this.handleError("Failed to reconnect client", error);
      }
    } else {
      console.error("Client not initialized");
    }
  }

  private async initializeSession(): Promise<void> {
    if (!this.session) {
      console.log("Creating session...");
      this.session = await this.client.createSession();
    }
  }

  private async initializeSubscriptions(): Promise<void> {
    const { subscriptions } = this.rawManager;
    if (subscriptions) {
      for (const [name, options] of Object.entries(subscriptions)) {
        await this.addSubscription(name, options);
      }
    }
  }

  private async initializeMonitoredItems(): Promise<void> {
    const { monitoredItems } = this.rawManager;
    if (monitoredItems) {
      for (const [name, options] of Object.entries(monitoredItems)) {
        await this.addMonitoredItem(name, options);
      }
    }
  }

  private async initializeVariables(): Promise<void> {
    const { variables } = this.rawManager;
    if (variables) {
      for (const [_name, options] of Object.entries(variables)) {
        await this.addVariable(options);
      }
    }
  }

  private async getSession(): Promise<ClientSession> {
    if (!this.session) {
      await this.initializeSession();
    }
    return this.session as ClientSession;
  }

  async disconnectClient(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      console.log("Client disconnected.");
    } else {
      console.error("Client not initialized");
    }
  }

  async addSubscription(
    subscriptionName: string,
    subscriptionOptions: RawSubscription
  ): Promise<void> {
    const session = await this.getSession();
    const subscription = ClientSubscription.create(
      session,
      subscriptionOptions
    );
    this.subscriptions.set(subscriptionName, subscription);
  }

  async removeSubscription(subscriptionName: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionName);
    if (subscription) {
      await subscription.terminate();
      console.log(`Subscription ${subscriptionName} terminated.`);
      this.subscriptions.delete(subscriptionName);
    } else {
      console.error(`Subscription ${subscriptionName} not found.`);
    }
  }

  addMonitoredItem(itemName: string, rawMonitoredItem: RawMonitoredItem): void {
    const { subscriptionName, itemOptions, handler } = rawMonitoredItem;
    const subscription = this.subscriptions.get(subscriptionName);
    if (!subscription) {
      throw new OPCUAError(`Subscription ${subscriptionName} not found`);
    }

    const monitoredItem = ClientMonitoredItem.create(
      subscription,
      {
        nodeId: coerceNodeId(itemOptions.nodeId),
        attributeId:
          AttributeIds[itemOptions.attributeId as keyof typeof AttributeIds],
        indexRange: itemOptions.indexRange
          ? new NumericRange(itemOptions.indexRange)
          : undefined,
      },
      {
        clientHandle: itemOptions.monitoringParameters?.clientHandle,
        samplingInterval: itemOptions.monitoringParameters?.samplingInterval,
        filter: itemOptions.monitoringParameters?.filter
          ? createFilterFromRaw(itemOptions.monitoringParameters.filter)
          : undefined,
        queueSize: itemOptions.monitoringParameters?.queueSize,
        discardOldest: itemOptions.monitoringParameters?.discardOldest,
      },
      itemOptions.timestampsToReturn
        ? mapRawToTimestampsToReturn(itemOptions.timestampsToReturn)
        : DEFAULT_TIMESTAMP_RETURN
    );

    this.monitoredItems.set(itemName, monitoredItem);
    monitoredItem.on("changed", (dataValue: DataValue) =>
      this.router.call(handler, {}, dataValue)
    );
  }

  removeMonitoredItem(itemName: string): void {
    const monitoredItem = this.monitoredItems.get(itemName);
    if (monitoredItem) {
      monitoredItem.terminate();
      console.log(`Monitored item ${itemName} terminated.`);
      this.monitoredItems.delete(itemName);
    } else {
      console.error(`Monitored item ${itemName} not found.`);
    }
  }

  async writeValue(
    nodeId: string,
    value: any,
    dataType: keyof typeof DataType = "Double"
  ): Promise<void> {
    const session = await this.getSession();
    const variable = this.variables.get(nodeId);
    if (!variable) {
      throw new OPCUAError(`Variable ${nodeId} not found`);
    }

    variable.value.value = new Variant({
      dataType: DataType[dataType],
      value: value,
    });

    try {
      const statusCodes = await session.write([variable]);
      if (statusCodes[0] !== StatusCodes.Good) {
        console.error(
          `Failed to write value to ${nodeId}, statusCode:`,
          statusCodes[0]?.toString()
        );
      }
    } catch (error) {
      this.handleError(`Error writing value to ${nodeId}`, error);
    }
  }

  async writeValues(
    values: { nodeId: string; value: any; dataType: keyof typeof DataType }[]
  ): Promise<void> {
    const session = await this.getSession();
    const writeValues = values.map(({ nodeId, value, dataType }) => ({
      nodeId: coerceNodeId(nodeId),
      attributeId: AttributeIds.Value,
      value: new Variant({ dataType: DataType[dataType], value }),
    }));

    try {
      const statusCodes = await session.write(writeValues);
      statusCodes.forEach((statusCode, index) => {
        if (statusCode !== StatusCodes.Good) {
          console.error(
            `Failed to write value to ${values[index]?.nodeId}, statusCode:`,
            statusCode.toString()
          );
        }
      });
    } catch (error) {
      this.handleError("Error writing values", error);
    }
  }

  async readValue(nodeId: string): Promise<DataValue> {
    const session = await this.getSession();
    const variable = this.variables.get(nodeId);
    if (!variable) {
      throw new OPCUAError(`Variable ${nodeId} not found`);
    }

    try {
      const dataValue = await session.read({
        nodeId: coerceNodeId(nodeId),
        attributeId: AttributeIds.Value,
      });
      if (dataValue.statusCode !== StatusCodes.Good) {
        console.error(
          `Failed to read value from ${nodeId}, statusCode:`,
          dataValue.statusCode.toString()
        );
      }
      return dataValue;
    } catch (error) {
      this.handleError(`Error reading value from ${nodeId}`, error);
      throw error;
    }
  }

  addVariable<T>(variableOptions: RawVariable<T>): string {
    const { nodeId, value, ...opt } = variableOptions;
    if (!value) {
      throw new OPCUAError(`Value must be set for ${nodeId} variable init`);
    }
    const variable = new WriteValue({
      ...opt,
      nodeId: coerceNodeId(nodeId),
      value,
    });
    this.variables.set(nodeId, variable);
    return nodeId;
  }

  private handleError(message: string, error: any): void {
    console.error(`${message}:`, error);
  }
}
