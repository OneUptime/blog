# Validation Summary: Write Windowing Queries in Azure Stream Analytics for Time-Based Aggregations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Stream Analytics
- Azure Stream Analytics Query Language
- SQL windowing queries
- Time-based stream aggregations
- Reference data joins

## Sources Consulted
- Microsoft Learn: Introduction to Stream Analytics windowing functions - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-window-functions
- Microsoft Learn: Tumbling Window - https://learn.microsoft.com/en-us/stream-analytics-query/tumbling-window-azure-stream-analytics
- Microsoft Learn: Hopping Window - https://learn.microsoft.com/en-us/stream-analytics-query/hopping-window-azure-stream-analytics
- Microsoft Learn: Sliding Window - https://learn.microsoft.com/en-us/stream-analytics-query/sliding-window-azure-stream-analytics
- Microsoft Learn: Session Window - https://learn.microsoft.com/en-us/stream-analytics-query/session-window-azure-stream-analytics
- Microsoft Learn: System.Timestamp() - https://learn.microsoft.com/en-us/stream-analytics-query/system-timestamp-stream-analytics
- Microsoft Learn: DATEDIFF - https://learn.microsoft.com/en-us/stream-analytics-query/datediff-azure-stream-analytics
- Microsoft Learn: JOIN - https://learn.microsoft.com/en-us/stream-analytics-query/join-azure-stream-analytics
- Microsoft Learn: Reference Data JOIN - https://learn.microsoft.com/en-us/stream-analytics-query/reference-data-join-azure-stream-analytics
- Microsoft Learn: INTO - https://learn.microsoft.com/en-us/stream-analytics-query/into-azure-stream-analytics
- Microsoft Learn: Snapshot Window - https://learn.microsoft.com/en-us/stream-analytics-query/snapshot-window-azure-stream-analytics

## Issues Found
- The post said Stream Analytics offers four window types. Microsoft Learn's current overview also documents snapshot windows, while the post focuses on tumbling, hopping, sliding, and session windows. Changed the wording to say the post covers four commonly used window types.
- The session window examples grouped by `DeviceId` and `MachineId` but did not use `SessionWindow(...) OVER (PARTITION BY ...)`. Microsoft Learn documents the partition key as part of the session window syntax for independent sessions per key. Added `OVER (PARTITION BY DeviceId)` and `OVER (PARTITION BY MachineId)`.
- The post described `maxDuration` as a hard cap for session windows. Microsoft Learn states that maximum duration is checked at intervals equal to the specified max duration, so the actual session can be up to twice `maxDuration`. Updated the comment and explanation to avoid implying a strict cap.

## Review Notes
The remaining query examples use supported Azure Stream Analytics Query Language syntax for the covered window functions, aggregate functions, `System.Timestamp()`, `TIMESTAMP BY`, `HAVING`, and reference data joins. The post intentionally does not cover snapshot windows in detail.
