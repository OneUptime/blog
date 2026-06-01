# Validation Summary: How to Build Real-Time Power BI Dashboards with Azure Stream Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Power BI real-time streaming semantic models
- Azure Stream Analytics
- Azure Event Hubs
- Azure IoT Hub
- Azure Stream Analytics Query Language
- Node.js
- Azure Event Hubs JavaScript SDK
- Azure managed identities
- Azure Monitor

## Sources Consulted
- Microsoft Learn: Power BI output from Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/power-bi-output
- Microsoft Learn: Real-time streaming in Power BI - https://learn.microsoft.com/en-us/power-bi/connect-data/service-real-time-streaming
- Microsoft Learn: Power BI REST APIs push semantic model limitations - https://learn.microsoft.com/en-us/power-bi/developer/embedded/push-datasets-limitations
- Microsoft Learn: Configuring event ordering policies for Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/event-ordering
- Microsoft Learn: Azure Stream Analytics windowing functions overview - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-window-functions
- Microsoft Learn: Understand and adjust Azure Stream Analytics streaming units - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-streaming-unit-consumption
- Microsoft Learn: EventHubProducerClient class for JavaScript - https://learn.microsoft.com/en-us/javascript/api/%40azure/event-hubs/eventhubproducerclient
- Microsoft Learn: EventDataBatch interface for JavaScript - https://learn.microsoft.com/en-us/javascript/api/%40azure/event-hubs/eventdatabatch

## Issues Found
- The post described Azure Stream Analytics as creating only a Power BI push dataset. Updated this to the current documented behavior: Stream Analytics creates a pushStreaming semantic model, which supports both stored push-model reporting and streaming dashboard tiles.
- The post omitted Microsoft's announced retirement timeline for Power BI real-time streaming. Added a concise note that creation remains available until October 31, 2027 and that Fabric Real-Time Intelligence should be evaluated for long-term architectures.
- The Stream Analytics queries did not use `TIMESTAMP BY`, while the later late-arrival and out-of-order guidance depended on event-time processing. Added `TIMESTAMP BY timestamp` to the sample queries.
- The streaming-unit setup said 3 SUs are the production minimum. Updated this to start with 1 SU V2 for a simple query and scale based on throughput and SU utilization, matching current Azure Stream Analytics guidance.
- The Power BI push limit list included outdated or incorrect values. Replaced them with the current documented limits: 1 million rows per hour per dataset, 10,000 rows per POST rows request, 120 POST rows requests per minute per dataset, and 200,000 rows stored per FIFO table.
- The explanation of direct streaming tiles said they connect directly to the push dataset. Updated it to clarify that they use the streaming side of the pushStreaming semantic model.

## Review Notes
The Node.js Event Hubs producer sample uses the current `@azure/event-hubs` `EventHubProducerClient`, `createBatch()`, `tryAdd()`, and `sendBatch()` APIs and is syntactically valid for the small simulated payload shown. For larger or variable-size payloads, production code should check the return value of `tryAdd()` and handle full batches explicitly.
