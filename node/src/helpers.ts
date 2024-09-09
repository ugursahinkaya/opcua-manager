import {
  DataChangeFilter,
  DataChangeTrigger,
  DeadbandType,
  TimestampsToReturn,
  EventFilter,
  AggregateFilter,
  coerceNodeId,
} from "node-opcua";
import {
  RawDataChangeFilter,
  RawEventFilter,
  RawAggregateFilter,
  RawMonitoringFilter,
} from "./index.js"; // İlgili türleri içe aktar

function mapRawToDataChangeTrigger(
  trigger: keyof typeof DataChangeTrigger
): DataChangeTrigger {
  return DataChangeTrigger[trigger as keyof typeof DataChangeTrigger];
}

function mapRawToDeadbandType(
  deadbandType: keyof typeof DeadbandType
): DeadbandType {
  return DeadbandType[deadbandType as keyof typeof DeadbandType];
}

function createDataChangeFilterFromRaw(
  rawFilter: RawDataChangeFilter
): DataChangeFilter {
  return new DataChangeFilter({
    trigger: mapRawToDataChangeTrigger(rawFilter.trigger),
    deadbandType: mapRawToDeadbandType(rawFilter.deadbandType),
    deadbandValue: rawFilter.deadbandValue,
  });
}

function createEventFilterFromRaw(rawFilter: RawEventFilter): EventFilter {
  return new EventFilter({
    selectClauses: rawFilter.selectClauses,
    whereClause: rawFilter.whereClause,
  });
}

function createAggregateFilterFromRaw(
  rawFilter: RawAggregateFilter
): AggregateFilter {
  return new AggregateFilter({
    aggregateType: coerceNodeId(rawFilter.aggregateType),
    processingInterval: rawFilter.processingInterval,
    startTime: new Date(rawFilter.startTime),
    aggregateConfiguration: {
      treatUncertainAsBad: rawFilter.aggregateConfiguration.treatUncertainAsBad,
      percentDataBad: rawFilter.aggregateConfiguration.percentDataBad,
      percentDataGood: rawFilter.aggregateConfiguration.percentDataGood,
      useSlopedExtrapolation:
        rawFilter.aggregateConfiguration.useSlopedExtrapolation,
    },
  });
}

export function mapRawToTimestampsToReturn(
  timestamps: keyof typeof TimestampsToReturn
): TimestampsToReturn {
  return TimestampsToReturn[timestamps as keyof typeof TimestampsToReturn];
}

export function createFilterFromRaw(rawFilter: RawMonitoringFilter) {
  switch (rawFilter.type) {
    case "DataChangeFilter":
      return createDataChangeFilterFromRaw(rawFilter.filter);
    case "EventFilter":
      return createEventFilterFromRaw(rawFilter.filter);
    case "AggregateFilter":
      return createAggregateFilterFromRaw(rawFilter.filter);
    default:
      return null;
  }
}
