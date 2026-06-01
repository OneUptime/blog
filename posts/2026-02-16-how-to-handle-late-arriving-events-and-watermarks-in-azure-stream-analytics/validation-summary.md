# Validation Summary: How to Handle Late-Arriving Events and Watermarks in Azure Stream Analytics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Stream Analytics
- Azure Stream Analytics Query Language
- Azure Event Hubs and IoT Hub input timing concepts
- Azure CLI
- Azure Monitor metrics and metric alerts

## Sources Consulted
- Microsoft Learn: Configuring event ordering policies for Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/event-ordering
- Microsoft Learn: Understand time handling in Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-time-handling
- Microsoft Learn: Time Skew Policies - https://learn.microsoft.com/en-us/stream-analytics-query/time-skew-policies-azure-stream-analytics
- Microsoft Learn: az stream-analytics job - https://learn.microsoft.com/en-us/cli/azure/stream-analytics/job
- Microsoft Learn: az monitor metrics alert - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: Azure Stream Analytics monitoring data reference - https://learn.microsoft.com/en-us/azure/stream-analytics/monitor-azure-stream-analytics-reference
- Microsoft Learn: Analyze Stream Analytics job performance by using metrics and dimensions - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-job-analysis-with-metric-dimensions

## Issues Found
- The watermark explanation incorrectly said the watermark is computed as the minimum latest event time across partitions minus the late arrival tolerance. Updated it to match Azure Stream Analytics behavior: per-partition watermarks use the largest event time minus the out-of-order tolerance when events arrive, and estimated arrival time minus late arrival tolerance when events are absent; combined partitions are gated by the slowest partition.
- The Azure CLI examples used non-current option names and duration strings. Replaced `--late-arrival-max-delay-time "00:10:00"` with `--arrival-max-delay 600`, and `--out-of-order-max-delay-time "00:00:30"` with `--order-max-delay 30`, matching current Azure CLI documentation.
- The late-arrival tolerance description implied the setting was always a simple wait window from 0 seconds to 20 days. Reworded it as the tolerated delay between event timestamp and arrival at the input source, with the maximum governed by the documented deployment method.
- The monitoring section described Out-of-Order Events as successfully reordered events. Updated it to reflect the official metric definition: events received out of order that were either dropped or assigned an adjusted timestamp.
- The partitioned input guidance referenced a non-documented "Last Event Time" arrival policy. Replaced it with documented guidance to use a `PARTITION BY PartitionId` pattern where appropriate so partitions can progress independently.
- The "Output Policy" heading was inaccurate because the Drop/Adjust setting is an event ordering policy. Renamed the heading to "Event Ordering Policy."

## Review Notes
The SQL query shape and `TIMESTAMP BY DeviceTimestamp` usage are consistent with Azure Stream Analytics event-time processing. The alert example uses the Azure Monitor metric alert command grammar and the official REST metric name `LateInputEvents`; it was not executed because Azure CLI is not installed in this environment.
