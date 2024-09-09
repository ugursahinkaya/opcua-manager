import {
  DataChangeTrigger,
  DataType,
  DeadbandType,
  MessageSecurityMode,
  SecurityPolicy,
  TimestampsToReturn,
} from "node-opcua";
export { OPCUAClientManager } from "./manager/client.js";
export { OPCUAServerManager } from "./manager/server.js";
export { OPCUAClientPlugin } from "./plugin/client.js";
export { OPCUAServerPlugin } from "./plugin/server.js";

export type RawDataChangeFilter = {
  trigger: keyof typeof DataChangeTrigger;
  deadbandType: keyof typeof DeadbandType;
  deadbandValue: number;
};

export type RawEventFilter = {
  selectClauses: any[];
  whereClause: any;
};

export type RawAggregateConfiguration = {
  treatUncertainAsBad: boolean;
  percentDataBad: number;
  percentDataGood: number;
  useSlopedExtrapolation: boolean;
};

export type RawAggregateFilter = {
  aggregateType: string;
  processingInterval: number;
  startTime: string;
  aggregateConfiguration: RawAggregateConfiguration;
};

export type RawMonitoringFilter =
  | { type: "DataChangeFilter"; filter: RawDataChangeFilter }
  | { type: "EventFilter"; filter: RawEventFilter }
  | { type: "AggregateFilter"; filter: RawAggregateFilter }
  | { type: "None"; filter: null };

export type RawSubscription = {
  requestedPublishingInterval?: number;
  requestedLifetimeCount?: number;
  requestedMaxKeepAliveCount?: number;
  maxNotificationsPerPublish?: number;
  publishingEnabled?: boolean;
  priority?: number;
};

export type RawMonitoringParameters = {
  clientHandle: number;
  samplingInterval: number;
  filter: RawMonitoringFilter;
  queueSize: number;
  discardOldest: boolean;
};

export type RawMonitoredItem = {
  nodeId: string;
  attributeId: string;
  indexRange?: string | null;
  monitoringParameters?: RawMonitoringParameters;
  timestampsToReturn?: keyof typeof TimestampsToReturn;
};

export type RawVariable<T> = {
  browseName: string;
  nodeId: string;
  dataType: keyof typeof DataType;
  value: T;
  handler?: string;
};

export type RawClient = {
  endpointUrl: string;
  autoConnect?: boolean;
  endpointMustExist?: boolean;
  securityMode?: keyof typeof MessageSecurityMode;
  securityPolicy?: keyof typeof SecurityPolicy;
};

export type RawServer = {
  name: string;
  port: number;
  //TODO: extend with more options
  variables?: Record<string, RawVariable<any>>;
};
export type Dependency = {
  initArgs: Record<string, any>;
  version: string;
  instanceName?: string;
};

export type ManagerBase = {
  applicationName: string;
  dependencies: Record<string, Dependency>;
  handlers?: Record<
    string,
    {
      module: string;
      operation: string;
      instance?: string;
    }
  >;
};
export type ClientManager = ManagerBase & {
  client: RawClient;
  subscriptions?: {
    subscriptionOptions: RawSubscription;
    itemOptions: RawMonitoredItem;
    handler: string;
  }[];
  variables?: Record<string, RawVariable<any>>;
};

export type ServerManager = ManagerBase & {
  servers: Record<string, RawServer>;
};
