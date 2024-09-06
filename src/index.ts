import {
  DataChangeTrigger,
  DataType,
  DeadbandType,
  MessageSecurityMode,
  SecurityPolicy,
  TimestampsToReturn,
} from "node-opcua";
export { OPCUAManager } from "./OPCUA-manager.js";

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
  requestedPublishingInterval: number;
  requestedLifetimeCount: number;
  requestedMaxKeepAliveCount: number;
  maxNotificationsPerPublish: number;
  publishingEnabled: boolean;
  priority: number;
};

export type RawMonitoringParameters = {
  clientHandle: number;
  samplingInterval: number;
  filter: RawMonitoringFilter;
  queueSize: number;
  discardOldest: boolean;
};

export type RawMonitoredItem = {
  subscriptionName: string;
  itemOptions: {
    nodeId: string;
    attributeId: string;
    indexRange?: string | null;
    monitoringParameters?: RawMonitoringParameters;
    timestampsToReturn?: keyof typeof TimestampsToReturn;
  };
  handler: string;
};

export type RawVariable<T> = {
  browseName: string;
  nodeId: string;
  dataType: keyof typeof DataType;
  value: T;
};

export type RawClient = {
  endpointUrl: string;
  autoConnect?: boolean;
  endpointMustExist?: boolean;
  securityMode?: keyof typeof MessageSecurityMode;
  securityPolicy?: keyof typeof SecurityPolicy;
};

export type RawManager = {
  applicationName: string;
  client: RawClient;
  subscriptions?: Record<string, RawSubscription>;
  monitoredItems?: Record<string, RawMonitoredItem>;
  variables?: Record<string, RawVariable<any>>;
};
