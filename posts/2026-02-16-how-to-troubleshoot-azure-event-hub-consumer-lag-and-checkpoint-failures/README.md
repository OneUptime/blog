# How to Troubleshoot Azure Event Hub Consumer Lag and Checkpoint Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Event Hubs, Streaming, Consumer Lag, Checkpointing, Event Processing, Troubleshooting

Description: Diagnose and fix Azure Event Hub consumer lag and checkpoint failures that cause message processing delays and data loss in streaming workloads.

---

Azure Event Hubs is a high-throughput event streaming platform, but its simplicity is deceptive. When everything is configured correctly, it handles millions of events per second without breaking a sweat. When something goes wrong, especially with consumer lag or checkpointing, you get a cascading mess of delayed processing, duplicate events, and confused downstream systems.

I have debugged Event Hub consumer issues in production systems processing hundreds of thousands of events per second. The problems usually come down to a few common categories: slow consumers, checkpoint failures, partition ownership conflicts, and throughput throttling.

## Understanding Consumer Lag

Consumer lag is the difference between the latest event in a partition and the event your consumer is currently processing. A small amount of lag is normal and expected. But when lag keeps growing, it means your consumers cannot keep up with the event production rate.

To monitor consumer lag, you need to compare the sequence number of the last enqueued event in each partition with the sequence number of the last checkpointed event.

```bash
# Check the last enqueued sequence number for each partition
# This tells you how far ahead the event stream is
az eventhubs eventhub show \
  --resource-group myResourceGroup \
  --namespace-name myEventHubNamespace \
  --name myEventHub \
  --query "partitionIds" -o tsv
```

In Application Insights or your monitoring system, track these metrics:
- **Incoming events per second** (producer rate)
- **Outgoing events per second** (consumer rate)
- **Consumer lag per partition** (the gap)

If incoming consistently exceeds outgoing, lag grows unbounded. You need to either speed up your consumers or add more partitions and consumer instances.

## Slow Consumer Diagnosis

The most common cause of consumer lag is slow event processing. Each consumer processes events sequentially within a partition. If processing one event takes 100ms and you receive 100 events per second on that partition, you are right at the edge. Any spike in processing time or event rate and lag starts building.

Profile your event processing code. Common bottlenecks include:

**Synchronous database writes.** If you write each event to a database synchronously, the database round-trip time dominates processing time.

```python
# Slow: Synchronous processing of each event individually
# Each database call adds ~10-50ms of latency
async def process_events(partition_context, events):
    for event in events:
        data = json.loads(event.body_as_str())
        # This blocks on each insert - very slow
        await database.insert_one(data)
    await partition_context.update_checkpoint(events[-1])

# Fast: Batch processing with bulk database writes
# Process all events in the batch together
async def process_events(partition_context, events):
    batch = []
    for event in events:
        data = json.loads(event.body_as_str())
        batch.append(data)

    # Single bulk write for the entire batch
    if batch:
        await database.insert_many(batch)
    await partition_context.update_checkpoint(events[-1])
```

**External API calls during processing.** Calling an external API for each event adds network latency. Batch these calls or use an async pattern.

**Complex transformations.** Heavy computation like JSON parsing of large payloads, data enrichment with multiple lookups, or complex business logic can slow down processing. Consider offloading heavy computation to a separate service and using Event Hubs only for buffering and dispatch.

## Checkpoint Failures

Checkpointing records your consumer's progress so that if it restarts, it knows where to resume. Azure Event Hubs checkpoints are stored in Azure Blob Storage (for the EventProcessorClient) or a similar checkpoint store.

When checkpointing fails, your consumer does not record its progress. On restart, it reprocesses events from the last successful checkpoint, causing duplicates.

Common checkpoint failure causes:

**Storage account connectivity.** The checkpoint store requires network access to Azure Blob Storage. If the storage account has firewall rules, make sure your consumer's network (or managed identity) has access.

```bash
# Check if the storage account has network restrictions
az storage account show \
  --resource-group myResourceGroup \
  --name mycheckpointstore \
  --query "networkRuleSet.defaultAction" -o tsv

# If the output is "Deny", your consumer needs to be in an allowed network
# Or add the consumer's IP/VNet to the storage account's network rules
```

**Concurrent checkpoint conflicts.** If two consumer instances think they own the same partition, their checkpoints can conflict. This happens during partition rebalancing when ownership is transitioning between instances.

**Storage throttling.** If your checkpoint store processes too many operations per second, Azure Storage can throttle requests. This is rare with Event Hubs because checkpoint updates are relatively infrequent, but it can happen if you are checkpointing after every single event instead of after each batch.

## Partition Ownership Issues

The EventProcessorClient distributes partitions across consumer instances automatically. When you add or remove instances, partitions are rebalanced. During rebalancing, you might see temporary issues.

**Partition stealing.** When a new consumer instance joins, it "steals" partitions from existing instances. The old instance needs to release the partition gracefully. If the old instance is stuck (perhaps processing a large batch), ownership transfer stalls.

**Load imbalance.** If you have 8 partitions and 3 consumer instances, two instances get 3 partitions each and one gets 2. If the partitions have uneven event volumes, some instances may be overloaded while others are idle.

Monitor the partition ownership distribution:

```python
# Python: Log partition ownership for debugging
# This helps identify load imbalance across consumer instances
from azure.eventhub.aio import EventHubConsumerClient

async def on_partition_initialize(partition_context):
    print(f"Partition {partition_context.partition_id} initialized on this instance")

async def on_partition_close(partition_context, reason):
    print(f"Partition {partition_context.partition_id} closed. Reason: {reason}")

client = EventHubConsumerClient.from_connection_string(
    conn_str="your-connection-string",
    consumer_group="$Default",
    eventhub_name="myEventHub",
    checkpoint_store=checkpoint_store
)

async with client:
    await client.receive(
        on_event=process_events,
        on_partition_initialize=on_partition_initialize,
        on_partition_close=on_partition_close,
        starting_position="-1"
    )
```

## Throughput Unit Throttling

Event Hubs throttles operations when you exceed the capacity of your provisioned throughput units (TUs). Each TU provides 1 MB/s ingress and 2 MB/s egress.

Symptoms of throttling:
- ServerBusy errors (error code 50002)
- Increasing consumer lag despite healthy consumers
- Producers getting back-pressure errors

```bash
# Check current throughput unit configuration
az eventhubs namespace show \
  --resource-group myResourceGroup \
  --name myEventHubNamespace \
  --query "{sku:sku.name, capacity:sku.capacity, isAutoInflateEnabled:isAutoInflateEnabled, maximumThroughputUnits:maximumThroughputUnits}" \
  -o json
```

If you are hitting TU limits, you have two options:

1. Enable auto-inflate, which automatically increases TUs based on demand up to a configured maximum
2. Upgrade to Event Hubs Premium or Dedicated tiers, which provide more capacity per processing unit

```bash
# Enable auto-inflate to automatically scale throughput units
az eventhubs namespace update \
  --resource-group myResourceGroup \
  --name myEventHubNamespace \
  --enable-auto-inflate true \
  --maximum-throughput-units 20
```

## Consumer Group Best Practices

Each consumer group maintains its own partition offsets independently. If you have multiple applications reading from the same Event Hub, each should use its own consumer group.

The default consumer group ($Default) is fine for a single consumer application, but do not share it between different applications. If two different applications use $Default, they compete for partition ownership and one will get starved.

```bash
# Create a dedicated consumer group for each consuming application
az eventhubs eventhub consumer-group create \
  --resource-group myResourceGroup \
  --namespace-name myEventHubNamespace \
  --eventhub-name myEventHub \
  --name "analytics-consumer"

az eventhubs eventhub consumer-group create \
  --resource-group myResourceGroup \
  --namespace-name myEventHubNamespace \
  --eventhub-name myEventHub \
  --name "audit-consumer"
```

## Recovery from Large Lag

If consumer lag has grown to millions of events and you need to catch up, you have a few strategies:

1. **Scale out consumers.** Add more consumer instances, up to the number of partitions. Each partition can only be processed by one instance within a consumer group.

2. **Increase batch size.** Process more events per batch to amortize per-batch overhead.

3. **Skip to latest.** If the old events are no longer relevant, reset the consumer position to the latest event and accept the data loss. This is a business decision.

4. **Parallel processing within batches.** Process events within a batch concurrently if the events are independent of each other.

Consumer lag and checkpoint failures in Event Hubs are almost always caused by either slow processing, connectivity issues with the checkpoint store, or throughput throttling. Instrument your consumers with detailed metrics, and you will be able to identify and fix issues before they become customer-visible problems.
