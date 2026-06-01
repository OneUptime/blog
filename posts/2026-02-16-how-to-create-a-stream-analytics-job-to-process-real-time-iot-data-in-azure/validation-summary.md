# Validation Summary: How to Create a Stream Analytics Job to Process Real-Time IoT Data in Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Stream Analytics
- Azure IoT Hub
- Azure Event Hubs
- Azure SQL Database
- Azure Blob Storage and Azure Data Lake Storage Gen2
- Azure Functions
- Power BI
- Stream Analytics Query Language
- JSON configuration

## Sources Consulted
- Microsoft Learn: Stream data input options in Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-define-inputs
- Microsoft Learn: Azure Stream Analytics streaming units explained - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-streaming-unit-consumption
- Microsoft Learn: Introduction to Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/stream-analytics-introduction
- Microsoft Learn: Event delivery guarantees - https://learn.microsoft.com/en-us/stream-analytics-query/event-delivery-guarantees-azure-stream-analytics
- Microsoft Learn: FROM clause in Stream Analytics Query Language - https://learn.microsoft.com/en-us/stream-analytics-query/from-azure-stream-analytics
- Microsoft Learn: Reference Data JOIN - https://learn.microsoft.com/en-us/stream-analytics-query/reference-data-join-azure-stream-analytics
- Microsoft Learn: Azure Functions output from Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/azure-functions-output
- Microsoft Learn: Use SQL Database reference data in an Azure Stream Analytics job - https://learn.microsoft.com/en-us/azure/stream-analytics/sql-reference-data
- Microsoft Learn: Configuring event ordering policies for Azure Stream Analytics - https://learn.microsoft.com/en-us/azure/stream-analytics/event-ordering
- Microsoft Learn: Microsoft.StreamAnalytics ARM/Bicep resource reference - https://learn.microsoft.com/en-us/azure/templates/microsoft.streamanalytics/streamingjobs

## Issues Found
- The post claimed that Stream Analytics "handles scaling, fault tolerance, and exactly-once processing" without mentioning output delivery semantics. I changed this to "exactly-once event processing with at-least-once delivery to output sinks" because Azure documents exactly-once processing separately from at-least-once output delivery.
- The post stated that 1 SU provides roughly 1 MB/s of throughput. I changed this to roughly 7 MB/s of input per SU, with a caveat that actual throughput depends on query complexity, partitions, and outputs.
- The scaling guidance said to scale in increments of 1, 3, or 6 SUs. I updated it for the recommended SU V2 model, which uses fractional options such as 1/3 and 2/3 SU and scales to 1, 2, 3, and higher SU counts.
- The input configuration block was labeled as JSON but included a `//` comment, which is not valid JSON. I removed the comment line from inside the fenced JSON block.
- The first query used the unqualified `IoTHub.ConnectionDeviceId` after assigning the stream alias `telemetry`. I qualified those references as `telemetry.IoTHub.ConnectionDeviceId` to avoid ambiguity and align with the aliased query source.
- The partitioned query placed `PARTITION BY` after `TIMESTAMP BY`. I changed the order to `FROM [iot-input] PARTITION BY ... TIMESTAMP BY ...`, matching the documented Stream Analytics `FROM` syntax.

## Review Notes
The tutorial remains a portal-oriented guide, so some configuration labels can vary slightly over time in the Azure portal. The technical concepts, Stream Analytics query examples, IoT Hub metadata fields, reference-data join usage, event ordering guidance, and output options were checked against Microsoft documentation and are accurate after the edits above.
