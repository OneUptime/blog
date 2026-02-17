# How to Send Power Automate Flow Data to Azure Event Hubs for Real-Time Stream Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Power Automate, Azure Event Hubs, Stream Processing, Real-Time, Power Platform, Event Streaming, Azure

Description: Send business event data from Power Automate flows to Azure Event Hubs for real-time stream processing and analytics with downstream consumers.

---

Power Automate is good at reacting to business events, but it is not designed for high-throughput, real-time analytics. Azure Event Hubs is. By sending event data from Power Automate to Event Hubs, you bridge the gap between the low-code business process world and the high-throughput streaming analytics world. Downstream consumers like Azure Stream Analytics, Azure Databricks, or custom applications can then process the data in real time.

This guide covers setting up Event Hubs, sending events from Power Automate, and building downstream processing pipelines.

## Use Cases

This pattern is useful when:

- You want to aggregate business events from Power Apps and Dynamics 365 for real-time dashboards.
- You need to feed machine learning models with live business data.
- Compliance requires a real-time audit trail of all data changes.
- You are building event sourcing architecture where business events are the source of truth.
- You need to fan out a single event to multiple consumers (analytics, archival, alerting).

## Step 1: Create the Azure Event Hubs Namespace and Event Hub

### Create the Namespace

1. In the Azure portal, search for "Event Hubs" and click Create.
2. Choose your subscription and resource group.
3. Enter a namespace name (globally unique).
4. Select the pricing tier:
   - Basic: 1 consumer group, 100 brokered connections
   - Standard: 20 consumer groups, 1000 brokered connections, capture support
   - Premium: For mission-critical workloads
5. Set throughput units to 1 (can auto-inflate later).
6. Click Create.

### Create an Event Hub

1. Go to the namespace resource.
2. Click Event Hubs > New Event Hub.
3. Name it (e.g., `business-events`).
4. Set partition count to 4 (for parallel processing - increase for higher throughput).
5. Set message retention to 7 days.
6. Click Create.

### Configure Access Policies

Create separate policies for sending and receiving:

1. Go to the event hub (not the namespace).
2. Click Shared access policies > Add.
3. Create a "Send" policy with only the Send claim.
4. Create a "Listen" policy with only the Listen claim.
5. Copy the connection string for the Send policy.

## Step 2: Build the Power Automate Producer Flow

Create a Power Automate flow that sends events to Event Hubs.

### Add the Event Hubs Connection

1. In your flow, add an action "Send event" from the Azure Event Hubs connector.
2. For the connection, enter:
   - Connection name: A descriptive name
   - Connection string: The Send policy connection string
3. Click Create.

### Configure the Send Event Action

- Event Hub name: Select your event hub (e.g., `business-events`)
- Content: The event payload as JSON

Here is an example for sending Dataverse record change events:

```json
{
    "eventType": "ContactUpdated",
    "eventTime": "@{utcNow()}",
    "source": "PowerAutomate/DataverseTrigger",
    "data": {
        "contactId": "@{triggerOutputs()?['body/contactid']}",
        "fullName": "@{triggerOutputs()?['body/fullname']}",
        "email": "@{triggerOutputs()?['body/emailaddress1']}",
        "company": "@{triggerOutputs()?['body/parentcustomerid']}",
        "modifiedOn": "@{triggerOutputs()?['body/modifiedon']}",
        "modifiedBy": "@{triggerOutputs()?['body/_modifiedby_value']}"
    },
    "correlationId": "@{workflow()['run']['name']}"
}
```

### Set Partition Key

For events related to the same entity, use a consistent partition key to maintain ordering:

- In the Send event action, set the Partition key to the entity ID:
  `@{triggerOutputs()?['body/contactid']}`

This ensures all events for the same contact go to the same partition and are processed in order.

### Set Custom Properties

Event Hubs supports custom properties (like HTTP headers) on events. Use them for routing:

- Click "Add new parameter" > Properties
- Add key-value pairs like:
  - `EventType`: `ContactUpdated`
  - `Priority`: `Normal`
  - `Region`: `US`

Downstream consumers can filter on these properties without parsing the event body.

## Step 3: Handle High-Volume Event Production

If your Power Automate flow triggers frequently, you might want to batch events rather than sending them one at a time.

### Batch Pattern

1. Create a scheduled flow that runs every minute.
2. Query Dataverse for all records modified in the last minute.
3. Build an array of events.
4. Send the batch to Event Hubs using the "Send events" (plural) action.

The batch action sends multiple events in a single call, which is more efficient and reduces the number of flow actions.

```
// Build an array of events from the query results
// Each item becomes a separate event in the Event Hub
@{json(concat('[',
    join(
        body('List_changed_records')?['value'],
        ','
    ),
']'))}
```

### Throttling Considerations

Power Automate has action execution limits:

- Per flow: 100,000 actions per day (Performance plan) or less.
- Per connector: Varies by connector.

If you are hitting limits, consider sending events from an Azure Function instead. Power Automate triggers the function, and the function handles the Event Hubs communication at higher throughput.

## Step 4: Build a Downstream Consumer with Stream Analytics

Azure Stream Analytics can process Event Hubs data in real time and output to various sinks.

### Create a Stream Analytics Job

1. In the Azure portal, create a Stream Analytics job.
2. Add an Input:
   - Type: Event Hub
   - Select your event hub and the Listen policy
   - Serialization: JSON, UTF-8
3. Add an Output (e.g., Power BI for a real-time dashboard).
4. Write the query:

```sql
-- Count events by type in 5-minute tumbling windows
-- This feeds a real-time dashboard in Power BI
SELECT
    EventType,
    COUNT(*) AS EventCount,
    System.Timestamp AS WindowEnd
INTO
    [powerbi-output]
FROM
    [eventhub-input]
GROUP BY
    EventType,
    TumblingWindow(minute, 5)
```

Another useful query - detect anomalies:

```sql
-- Alert when a single contact has more than 10 updates in 1 minute
-- This might indicate a runaway automation or data corruption
SELECT
    data.contactId,
    data.fullName,
    COUNT(*) AS UpdateCount,
    System.Timestamp AS WindowEnd
INTO
    [alert-output]
FROM
    [eventhub-input]
WHERE
    eventType = 'ContactUpdated'
GROUP BY
    data.contactId,
    data.fullName,
    TumblingWindow(minute, 1)
HAVING
    COUNT(*) > 10
```

## Step 5: Archive Events with Event Hubs Capture

Enable Capture to automatically archive all events to Azure Blob Storage or Data Lake:

1. Go to your event hub > Capture.
2. Enable Capture.
3. Select the destination:
   - Azure Blob Storage: Select a storage account and container.
   - Azure Data Lake Storage: Select a Data Lake store.
4. Set the capture window:
   - Time window: 5 minutes (captures every 5 minutes)
   - Size window: 300 MB (captures when data reaches this size)

Captured data is stored in Avro format, organized by date and time:

```
{StorageAccount}/{Container}/{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}
```

This gives you a complete historical record of all events for compliance, replay, or batch analytics.

## Step 6: Build a Custom Consumer with Azure Functions

For custom processing, create an Event Hubs-triggered Azure Function:

```csharp
// Azure Function triggered by Event Hubs events
// Processes each event and writes results to Cosmos DB
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;

public static class EventProcessor
{
    [FunctionName("ProcessBusinessEvent")]
    public static async Task Run(
        [EventHubTrigger("business-events",
            Connection = "EventHubConnection",
            ConsumerGroup = "function-consumer")] EventData[] events,
        [CosmosDB("analytics", "processedEvents",
            Connection = "CosmosConnection")] IAsyncCollector<dynamic> cosmosOutput,
        ILogger log)
    {
        // Process events in batch for efficiency
        foreach (var eventData in events)
        {
            string body = Encoding.UTF8.GetString(eventData.Body.ToArray());
            var businessEvent = JsonSerializer.Deserialize<BusinessEvent>(body);

            log.LogInformation($"Processing {businessEvent.EventType} " +
                             $"for entity {businessEvent.Data.ContactId}");

            // Transform and enrich the event
            var processed = new
            {
                id = Guid.NewGuid().ToString(),
                eventType = businessEvent.EventType,
                entityId = businessEvent.Data.ContactId,
                processedAt = DateTime.UtcNow,
                originalEvent = businessEvent,
                // Add computed fields
                dayOfWeek = DateTime.UtcNow.DayOfWeek.ToString(),
                hourOfDay = DateTime.UtcNow.Hour
            };

            // Write to Cosmos DB
            await cosmosOutput.AddAsync(processed);
        }
    }
}
```

## Step 7: Monitor the Pipeline

### Event Hubs Metrics

Monitor these in the Azure portal:

- **Incoming Messages**: Events sent to the event hub.
- **Outgoing Messages**: Events consumed by downstream consumers.
- **Throttled Requests**: If you are exceeding throughput unit capacity.
- **Capture Backlog**: If Capture is falling behind.

### Set Up Alerts

Configure Azure Monitor alerts for:

- Throttled requests exceeding zero (need more throughput units).
- Consumer lag growing (consumers are not keeping up).
- Incoming messages dropping to zero unexpectedly (producer issue).

### Power Automate Monitoring

In the Power Automate admin center, check:

- Flow run success/failure rates.
- Average duration of the Event Hubs send action.
- Connector throttling events.

## Wrapping Up

Sending Power Automate flow data to Azure Event Hubs creates a bridge between low-code business automation and high-throughput stream processing. Power Automate captures business events as they happen, Event Hubs provides reliable ingestion at scale, and downstream consumers like Stream Analytics, Azure Functions, or Databricks process the data in real time. Use partition keys for ordering, custom properties for routing, and Event Hubs Capture for archival. This pattern scales from a handful of events per day to millions per hour without changing the architecture.
