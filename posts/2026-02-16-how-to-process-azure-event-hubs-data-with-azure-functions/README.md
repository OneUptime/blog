# How to Process Azure Event Hubs Data with Azure Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Functions, Azure Event Hubs, Serverless, Event Processing, Azure Cloud, Real-Time Processing, Triggers

Description: Learn how to build serverless event processors using Azure Functions with Event Hubs triggers for real-time data processing pipelines.

---

Azure Functions and Event Hubs are a natural pairing. Event Hubs handles the high-throughput ingestion of events, and Azure Functions provides the serverless compute to process them. When an event arrives in your Event Hub, a function is triggered automatically to process it. You do not manage servers, you do not configure scaling - Functions scales out based on the event backlog, and you pay only for the compute time you use.

In this post, we will build event processing functions in multiple languages, configure the Event Hubs trigger for optimal performance, handle errors and retries, and set up monitoring for production workloads.

## How the Event Hubs Trigger Works

When you create an Azure Function with an Event Hubs trigger, the Functions runtime creates an internal event processor that reads from your Event Hub. Behind the scenes, it uses the same EventProcessorHost pattern that you would use if building a consumer manually:

1. The runtime claims ownership of partitions using a checkpoint store (Azure Blob Storage)
2. Events are read in batches from each partition
3. Your function is invoked with the batch of events
4. After successful processing, checkpoints are updated

The key benefit is that all the partition management, checkpointing, and scaling logic is handled for you.

## Creating Your First Event Hub Function

### C# (In-Process Model)

```csharp
using Microsoft.Azure.WebJobs;
using Microsoft.Extensions.Logging;
using System.Text;

public class EventHubProcessor
{
    // This function triggers on every batch of events from the Event Hub
    // The runtime handles partition assignment and checkpointing
    [FunctionName("ProcessUserEvents")]
    public void Run(
        [EventHubTrigger(
            "user-events",                              // Event Hub name
            Connection = "EventHubConnectionString",     // App setting name
            ConsumerGroup = "functions-processor"        // Consumer group
        )] string[] events,
        ILogger log)
    {
        // Process each event in the batch
        foreach (string eventBody in events)
        {
            log.LogInformation($"Processing event: {eventBody}");

            // Your business logic here
            // Parse the event, transform data, write to a database, etc.
        }

        log.LogInformation($"Processed batch of {events.Length} events");
    }
}
```

### Python

```python
import azure.functions as func
import json
import logging

app = func.FunctionApp()

# Trigger on events from the user-events Event Hub
# The function receives a batch of events for efficient processing
@app.event_hub_message_trigger(
    arg_name="events",
    event_hub_name="user-events",
    connection="EventHubConnectionString",
    consumer_group="functions-processor"
)
def process_user_events(events: func.EventHubEvent):
    # events can be a single event or a batch depending on configuration
    for event in events:
        # Parse the event body
        body = event.get_body().decode('utf-8')
        event_data = json.loads(body)

        logging.info(f"User: {event_data.get('userId')}, "
                     f"Action: {event_data.get('action')}")

        # Access event metadata
        logging.info(f"Partition: {event.partition_key}, "
                     f"Sequence: {event.sequence_number}, "
                     f"Enqueued: {event.enqueued_time}")

    logging.info(f"Processed {len(events)} events")
```

### JavaScript/TypeScript

```typescript
import { app, InvocationContext } from "@azure/functions";

// Register the Event Hub trigger function
app.eventHub('processUserEvents', {
    eventHubName: 'user-events',
    connection: 'EventHubConnectionString',
    consumerGroup: 'functions-processor',
    cardinality: 'many',  // Receive events in batches
    handler: async (events: any[], context: InvocationContext) => {
        // Process each event in the batch
        for (const event of events) {
            context.log(`Processing event: ${JSON.stringify(event)}`);

            // Business logic here
            const userId = event.userId;
            const action = event.action;

            if (action === 'purchase') {
                // Trigger downstream processing for purchases
                context.log(`Purchase detected for user ${userId}`);
            }
        }

        context.log(`Batch of ${events.length} events processed`);
    }
});
```

## Configuration Settings

### local.settings.json (for local development)

```json
{
    "IsEncrypted": false,
    "Values": {
        "AzureWebJobsStorage": "DefaultEndpointsProtocol=https;AccountName=myfuncstore;AccountKey=your-key",
        "FUNCTIONS_WORKER_RUNTIME": "python",
        "EventHubConnectionString": "Endpoint=sb://my-eventhubs-namespace.servicebus.windows.net/;SharedAccessKeyName=listen-policy;SharedAccessKey=your-key"
    }
}
```

### host.json (Event Hub-specific settings)

The `host.json` file controls how the Event Hub trigger behaves:

```json
{
    "version": "2.0",
    "extensions": {
        "eventHubs": {
            "batchCheckpointFrequency": 5,
            "eventProcessorOptions": {
                "maxBatchSize": 64,
                "prefetchCount": 256
            },
            "initialOffsetOptions": {
                "type": "fromEnqueuedTime",
                "enqueuedTimeUtc": "2026-02-16T00:00:00Z"
            }
        }
    }
}
```

Key settings explained:

- **maxBatchSize**: Maximum events per function invocation. Higher values improve throughput but increase per-invocation processing time.
- **batchCheckpointFrequency**: Checkpoint every N batches. Setting this to 5 means checkpoints happen every 5th batch instead of every batch, reducing storage I/O.
- **prefetchCount**: How many events to prefetch from Event Hubs. Higher values reduce latency between batches.
- **initialOffsetOptions**: Where to start reading when there is no existing checkpoint. Use `fromStart` for all historical events or `fromEnqueuedTime` for a specific point in time.

## Writing Processed Data to Output Bindings

Azure Functions output bindings let you write processed data to other services without managing connections:

### Event Hub to Cosmos DB

```python
import azure.functions as func
import json
import logging
import uuid

app = func.FunctionApp()

@app.event_hub_message_trigger(
    arg_name="events",
    event_hub_name="user-events",
    connection="EventHubConnectionString",
    consumer_group="functions-processor"
)
@app.cosmos_db_output(
    arg_name="documents",
    database_name="analytics",
    container_name="processed-events",
    connection="CosmosDBConnectionString"
)
def process_and_store(events: func.EventHubEvent, documents: func.Out[func.DocumentList]):
    """Read events from Event Hub and write enriched documents to Cosmos DB."""
    output_docs = []

    for event in events:
        body = json.loads(event.get_body().decode('utf-8'))

        # Enrich the event with processing metadata
        document = {
            "id": str(uuid.uuid4()),
            "userId": body.get("userId"),
            "action": body.get("action"),
            "originalTimestamp": body.get("timestamp"),
            "processedAt": event.enqueued_time.isoformat(),
            "partitionKey": body.get("userId"),
            "source": "event-hubs-processor"
        }
        output_docs.append(func.Document.from_dict(document))

    # Write all documents to Cosmos DB in one batch
    documents.set(output_docs)
    logging.info(f"Wrote {len(output_docs)} documents to Cosmos DB")
```

### Event Hub to Another Event Hub (Fan-out)

```python
@app.event_hub_message_trigger(
    arg_name="events",
    event_hub_name="raw-events",
    connection="SourceEventHubConnection",
    consumer_group="router"
)
@app.event_hub_output(
    arg_name="purchaseEvents",
    event_hub_name="purchase-events",
    connection="TargetEventHubConnection"
)
@app.event_hub_output(
    arg_name="loginEvents",
    event_hub_name="login-events",
    connection="TargetEventHubConnection"
)
def route_events(events: func.EventHubEvent,
                 purchaseEvents: func.Out[str],
                 loginEvents: func.Out[str]):
    """Route events to different Event Hubs based on action type."""
    purchase_batch = []
    login_batch = []

    for event in events:
        body = json.loads(event.get_body().decode('utf-8'))
        action = body.get("action")

        if action == "purchase":
            purchase_batch.append(json.dumps(body))
        elif action == "login":
            login_batch.append(json.dumps(body))

    if purchase_batch:
        purchaseEvents.set(json.dumps(purchase_batch))
    if login_batch:
        loginEvents.set(json.dumps(login_batch))
```

## Error Handling and Retries

Event Hub trigger functions do not have built-in retry for individual events. If your function throws an exception, the entire batch fails and is retried. This means you need to handle errors carefully:

```python
@app.event_hub_message_trigger(
    arg_name="events",
    event_hub_name="user-events",
    connection="EventHubConnectionString",
    consumer_group="functions-processor"
)
def process_with_error_handling(events: func.EventHubEvent):
    """Process events with per-event error handling to prevent batch failures."""
    failed_events = []

    for event in events:
        try:
            body = json.loads(event.get_body().decode('utf-8'))
            # Process the event
            process_single_event(body)
        except json.JSONDecodeError:
            # Log and skip malformed events
            logging.error(f"Malformed JSON in event: {event.get_body()}")
        except Exception as e:
            # Log the error but continue processing other events
            logging.error(f"Failed to process event: {e}")
            failed_events.append({
                "body": event.get_body().decode('utf-8'),
                "error": str(e),
                "partition": event.partition_key,
                "sequence": event.sequence_number
            })

    if failed_events:
        # Send failed events to a dead letter queue or storage for later review
        logging.warning(f"{len(failed_events)} events failed processing")
        send_to_dead_letter(failed_events)
```

## Scaling Behavior

Azure Functions scales based on the Event Hub partition count and event backlog:

- **Maximum instances**: Equal to the number of partitions. If your Event Hub has 16 partitions, Functions scales up to 16 instances.
- **Scale triggers**: The runtime monitors the backlog (difference between latest event and last checkpoint). If the backlog grows, more instances are added.
- **Scale down**: When the backlog is caught up, instances are removed.

For the Consumption plan, this happens automatically. For the Premium plan, you can set minimum and maximum instance counts:

```json
{
    "functionAppScaleLimit": 16,
    "minimumElasticInstanceCount": 2
}
```

## Monitoring and Diagnostics

### Application Insights Integration

Enable Application Insights for your Function App to get detailed telemetry:

```python
import logging

@app.event_hub_message_trigger(
    arg_name="events",
    event_hub_name="user-events",
    connection="EventHubConnectionString",
    consumer_group="functions-processor"
)
def monitored_processor(events: func.EventHubEvent):
    """Process events with detailed logging for monitoring."""
    batch_size = len(events)
    logging.info(f"Processing batch of {batch_size} events")

    # Track custom metrics
    import time
    start_time = time.time()

    for event in events:
        body = json.loads(event.get_body().decode('utf-8'))
        process_single_event(body)

    duration = time.time() - start_time
    logging.info(f"Batch processing completed: {batch_size} events in {duration:.2f}s "
                 f"({batch_size/duration:.0f} events/sec)")
```

### Key Metrics to Monitor

In Azure Monitor, watch these metrics:

- **Function execution count**: How many batches are being processed
- **Function execution duration**: How long each batch takes
- **Function failures**: Failed invocations that need investigation
- **Event Hub incoming messages**: The rate of events arriving
- **Consumer lag**: The difference between the latest event and the last checkpoint

## Summary

Azure Functions with Event Hubs triggers provide a serverless way to process streaming events. The runtime handles partition assignment, checkpointing, and auto-scaling, so you focus on your processing logic. Use batch processing with appropriate error handling to maximize throughput and resilience. Configure the host.json settings for your specific latency and throughput requirements, and set up monitoring through Application Insights to keep your event processing pipeline healthy in production.
