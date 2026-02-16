# How to Set Up Consumer Groups in Azure Event Hubs for Parallel Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Event Hubs, Consumer Groups, Parallel Processing, Event Streaming, Azure Cloud, Message Processing, Scalability

Description: Learn how to configure and use consumer groups in Azure Event Hubs to enable multiple independent consumers reading the same event stream in parallel.

---

When you have an event stream in Azure Event Hubs, you typically need multiple systems reading from it. Your real-time analytics pipeline needs the data. Your fraud detection system needs the same data. Your archival process needs it too. Each of these consumers needs to read the complete stream independently, at its own pace, without interfering with each other. That is exactly what consumer groups are for.

A consumer group is a view of the entire Event Hub. Each consumer group maintains its own position (offset) in the stream, so multiple consumer groups can read the same events independently. Within a single consumer group, multiple consumer instances can share the work of reading from different partitions, giving you parallelism for a single workload.

In this post, we will set up consumer groups, configure parallel consumers within a group, and handle the common patterns and pitfalls.

## Consumer Groups Explained

Think of an Event Hub as a river of events. A consumer group is like a camera pointed at the river - it sees all the water (events) flowing by. You can have multiple cameras (consumer groups), each with its own independent view. Each camera can be at a different position - one might be watching in real time while another is reviewing footage from an hour ago.

The default consumer group, `$Default`, is created automatically with every Event Hub. You should avoid using it for production workloads because any application that connects without specifying a consumer group will use `$Default`, potentially causing conflicts.

## Creating Consumer Groups

Create dedicated consumer groups for each logical consumer of your event stream:

```bash
# Create consumer groups for different processing pipelines
# Each consumer group gets an independent view of the full event stream

# Consumer group for the real-time analytics pipeline
az eventhubs eventhub consumer-group create \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --eventhub-name user-events \
  --name analytics-pipeline

# Consumer group for the fraud detection system
az eventhubs eventhub consumer-group create \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --eventhub-name user-events \
  --name fraud-detection

# Consumer group for archival to long-term storage
az eventhubs eventhub consumer-group create \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --eventhub-name user-events \
  --name archive-pipeline

# Consumer group for the search indexing service
az eventhubs eventhub consumer-group create \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --eventhub-name user-events \
  --name search-indexer
```

List existing consumer groups:

```bash
# List all consumer groups for an Event Hub
az eventhubs eventhub consumer-group list \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --eventhub-name user-events \
  --output table
```

## Limits on Consumer Groups

The number of consumer groups you can create depends on your tier:

- **Basic tier**: 1 consumer group (just `$Default`)
- **Standard tier**: 20 consumer groups per Event Hub
- **Premium tier**: 100 consumer groups per Event Hub
- **Dedicated tier**: 1000 consumer groups per Event Hub

If you need more consumer groups than your tier allows, consider upgrading your tier or redesigning your architecture to share consumer groups between compatible workloads.

## Parallel Processing Within a Consumer Group

Within a single consumer group, you can run multiple consumer instances that share the work of reading from partitions. The Event Hubs SDK handles partition assignment automatically through a process called "partition ownership."

### Using the EventProcessorClient

The `EventProcessorClient` (available in Python, Java, .NET, and JavaScript SDKs) handles partition distribution, checkpointing, and failover automatically:

```python
from azure.eventhub import EventHubConsumerClient
from azure.eventhub.extensions.checkpointstorageblob import BlobCheckpointStore

# Set up checkpoint storage in Azure Blob Storage
# Checkpoints track each consumer's position in the stream
checkpoint_store = BlobCheckpointStore.from_connection_string(
    conn_str="DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=your-key",
    container_name="eventhub-checkpoints"
)

# Create a consumer client for the analytics pipeline
# Multiple instances of this code can run simultaneously
# The SDK automatically distributes partitions across instances
consumer = EventHubConsumerClient.from_connection_string(
    conn_str="Endpoint=sb://my-eventhubs-namespace.servicebus.windows.net/;SharedAccessKeyName=listen-policy;SharedAccessKey=your-key",
    consumer_group="analytics-pipeline",
    eventhub_name="user-events",
    checkpoint_store=checkpoint_store
)

def on_event(partition_context, event):
    """Process a single event from the assigned partition."""
    # Extract the event data
    body = event.body_as_str()
    partition_id = partition_context.partition_id

    # Process the event (your business logic here)
    print(f"Partition {partition_id}: {body}")

    # Checkpoint every 10 events to track progress
    # If this consumer crashes, it resumes from the last checkpoint
    if event.sequence_number % 10 == 0:
        partition_context.update_checkpoint(event)

def on_error(partition_context, error):
    """Handle errors during event processing."""
    if partition_context:
        print(f"Error on partition {partition_context.partition_id}: {error}")
    else:
        print(f"General error: {error}")

# Start receiving events
# This call blocks and processes events until stopped
with consumer:
    consumer.receive(
        on_event=on_event,
        on_error=on_error,
        starting_position="-1"  # Start from the beginning
    )
```

### How Partition Distribution Works

When you run multiple instances of the consumer code above (using the same consumer group and checkpoint store), the SDK automatically distributes partitions:

- **2 instances, 8 partitions**: Each instance gets 4 partitions
- **4 instances, 8 partitions**: Each instance gets 2 partitions
- **8 instances, 8 partitions**: Each instance gets 1 partition
- **10 instances, 8 partitions**: 8 instances get 1 partition each, 2 instances sit idle

This distribution is handled by the checkpoint store - instances claim ownership of partitions and rebalance when instances join or leave.

## Checkpoint Store Configuration

The checkpoint store is critical for reliable consumer group processing. It persists two things:

1. **Partition ownership**: Which consumer instance owns which partitions
2. **Checkpoints**: The last successfully processed event position for each partition

Azure Blob Storage is the most common checkpoint store. Create a dedicated container for checkpoints:

```bash
# Create a storage account and container for checkpoints
az storage account create \
  --name ehcheckpointstore \
  --resource-group my-resource-group \
  --location eastus \
  --sku Standard_LRS

# Create a separate container for each consumer group
# This keeps checkpoint data organized
az storage container create \
  --name analytics-pipeline-checkpoints \
  --account-name ehcheckpointstore

az storage container create \
  --name fraud-detection-checkpoints \
  --account-name ehcheckpointstore
```

## .NET Consumer Example

Here is the equivalent consumer setup in C#:

```csharp
using Azure.Messaging.EventHubs;
using Azure.Messaging.EventHubs.Consumer;
using Azure.Messaging.EventHubs.Processor;
using Azure.Storage.Blobs;

// Create checkpoint store clients
var storageClient = new BlobContainerClient(
    "DefaultEndpointsProtocol=https;AccountName=ehcheckpointstore;AccountKey=your-key",
    "analytics-pipeline-checkpoints"
);

// Create the processor - handles partition distribution automatically
var processor = new EventProcessorClient(
    storageClient,
    "analytics-pipeline",  // consumer group name
    "Endpoint=sb://my-eventhubs-namespace.servicebus.windows.net/;SharedAccessKeyName=listen-policy;SharedAccessKey=your-key",
    "user-events"
);

// Register event handlers
processor.ProcessEventAsync += async (ProcessEventArgs args) =>
{
    // Process the event
    string eventBody = args.Data.EventBody.ToString();
    string partitionId = args.Partition.PartitionId;

    Console.WriteLine($"Partition {partitionId}: {eventBody}");

    // Checkpoint periodically
    await args.UpdateCheckpointAsync();
};

processor.ProcessErrorAsync += async (ProcessErrorEventArgs args) =>
{
    Console.WriteLine($"Error on partition {args.PartitionId}: {args.Exception.Message}");
};

// Start processing - runs until cancelled
await processor.StartProcessingAsync();

// Wait for a cancellation signal
Console.ReadKey();
await processor.StopProcessingAsync();
```

## Consumer Group Design Patterns

### One Consumer Group Per Application

The simplest and most common pattern. Each application or service that reads from the Event Hub gets its own consumer group:

```
Event Hub: user-events
  |-- Consumer Group: analytics-pipeline (Stream Analytics job)
  |-- Consumer Group: fraud-detection (Azure Functions)
  |-- Consumer Group: archive (Event Hubs Capture or custom archiver)
  |-- Consumer Group: search-indexer (Custom service updating Elasticsearch)
```

### Scaling Within a Consumer Group

When a single consumer cannot keep up with the event rate, scale out by running more instances within the same consumer group:

```
Consumer Group: analytics-pipeline
  |-- Instance 1: Partitions 0, 1, 2, 3
  |-- Instance 2: Partitions 4, 5, 6, 7
  |-- Instance 3: Partitions 8, 9, 10, 11
  |-- Instance 4: Partitions 12, 13, 14, 15
```

If Instance 2 crashes, its partitions (4, 5, 6, 7) get redistributed to the remaining instances.

### Consumer Lag Monitoring

Monitor how far behind each consumer group is:

```python
from azure.eventhub import EventHubConsumerClient

# Create an admin client to check partition info
consumer = EventHubConsumerClient.from_connection_string(
    conn_str="your-connection-string",
    consumer_group="analytics-pipeline",
    eventhub_name="user-events"
)

# Get partition properties to check the latest sequence numbers
partition_ids = consumer.get_partition_ids()
for partition_id in partition_ids:
    props = consumer.get_partition_properties(partition_id)
    print(f"Partition {partition_id}:")
    print(f"  Last enqueued sequence: {props.last_enqueued_sequence_number}")
    print(f"  Last enqueued time: {props.last_enqueued_time_utc}")

consumer.close()
```

Compare the last enqueued sequence number with the checkpoint position to calculate consumer lag. Set up alerts when the lag exceeds an acceptable threshold.

## Common Pitfalls

**Using $Default for production**: Always create dedicated consumer groups. The $Default group is shared by any client that does not specify a group.

**Too many consumers per group**: If you have more consumer instances than partitions, the extras sit idle. Scale your instances to match your partition count.

**Not checkpointing**: Without checkpoints, a restarting consumer re-reads all events from the beginning (or the current position, depending on configuration). Checkpoint regularly.

**Checkpoint too frequently**: Checkpointing on every event adds overhead. Batch checkpoints every N events or every N seconds.

**Shared checkpoint containers**: Use separate checkpoint containers (or at least separate paths) for different consumer groups to avoid confusion.

## Summary

Consumer groups in Azure Event Hubs enable multiple independent applications to read the same event stream without interfering with each other. Create a dedicated consumer group for each logical consumer, use the EventProcessorClient SDK for automatic partition distribution and failover, and maintain checkpoint stores for reliable position tracking. The combination of consumer groups (for independent views) and partition-based parallelism within each group gives you the flexibility to scale your event processing both horizontally and across multiple use cases.
