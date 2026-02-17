# How to Configure Partitions and Throughput Units in Azure Event Hubs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Event Hubs, Partitions, Throughput Units, Event Streaming, Scalability, Azure Cloud, Message Ingestion

Description: Learn how to properly configure partition counts and throughput units in Azure Event Hubs to handle your event streaming workload efficiently.

---

Azure Event Hubs is a high-throughput event ingestion service, but its performance characteristics depend heavily on how you configure two key settings: partition count and throughput units (TUs). Get these wrong and you end up with either throttled producers, underutilized capacity, or unexpectedly high costs. Get them right and Event Hubs can handle millions of events per second with consistent latency.

In this post, we will dig into how partitions and throughput units work, how to size them for your workload, and how to tune them as your needs change.

## Understanding Partitions

A partition is an ordered sequence of events within an Event Hub. Think of it as an independent log where events are appended in the order they arrive. Partitions are the fundamental unit of parallelism in Event Hubs.

Key properties of partitions:

- **Each partition is an independent sequence**: Events in different partitions have no ordering guarantee relative to each other.
- **Consumers read from partitions**: Each consumer instance typically reads from one or more partitions. More partitions means more potential parallelism for consumers.
- **Events are distributed across partitions**: By default, events are round-robin distributed. You can control this using partition keys.
- **Partition count is permanent**: Once set during Event Hub creation, the partition count cannot be changed later (for standard tier). This is the most important planning decision you will make.

### Choosing the Right Partition Count

The partition count determines the maximum number of parallel consumers you can have. Here is the formula to think about:

```
Max parallel consumers = Number of partitions
```

If you have 8 partitions, you can have at most 8 consumer instances (within a single consumer group) processing events in parallel. Additional consumers beyond the partition count will sit idle.

Consider these factors when choosing a partition count:

- **Current throughput needs**: How many events per second do you need to process?
- **Future growth**: Partition counts cannot be increased later (standard tier), so plan ahead.
- **Consumer parallelism**: How many consumer instances do you want running in parallel?
- **Ordering requirements**: Events with the same partition key always go to the same partition, maintaining order.

Here is how to create an Event Hub with a specific partition count:

```bash
# First, create the Event Hubs namespace
az eventhubs namespace create \
  --resource-group my-resource-group \
  --name my-eventhubs-namespace \
  --location eastus \
  --sku Standard \
  --capacity 2  # This sets throughput units

# Create an Event Hub with 16 partitions
az eventhubs eventhub create \
  --resource-group my-resource-group \
  --namespace-name my-eventhubs-namespace \
  --name user-events \
  --partition-count 16 \
  --message-retention 7
```

### Partition Key Strategy

When you send events with a partition key, Event Hubs hashes the key to determine which partition receives the event. All events with the same partition key go to the same partition, which guarantees ordering for that key.

```python
from azure.eventhub import EventHubProducerClient, EventData

# Create a producer client
producer = EventHubProducerClient.from_connection_string(
    conn_str="Endpoint=sb://my-eventhubs-namespace.servicebus.windows.net/;SharedAccessKeyName=send-policy;SharedAccessKey=your-key",
    eventhub_name="user-events"
)

# Send events with a partition key
# All events for the same user go to the same partition
# This guarantees ordering per user
event_data = EventData(b'{"action": "login", "user_id": "user-123"}')
event_batch = producer.create_batch(partition_key="user-123")
event_batch.add(event_data)
producer.send_batch(event_batch)
producer.close()
```

Choose your partition key carefully:

- **High cardinality keys** (like user ID) distribute events evenly across partitions
- **Low cardinality keys** (like country code) can create hot partitions where a few countries dominate traffic
- **No partition key** results in round-robin distribution, which gives the best throughput but no ordering guarantees

## Understanding Throughput Units

Throughput units (TUs) control the total capacity of your Event Hubs namespace. Each throughput unit provides:

- **Ingress**: 1 MB per second or 1000 events per second (whichever is hit first)
- **Egress**: 2 MB per second or 4096 events per second

These limits apply at the namespace level, shared across all Event Hubs in the namespace.

### Calculating Required Throughput Units

Here is a practical example. Suppose your workload has these characteristics:

- 5000 events per second ingress
- Average event size: 500 bytes
- 3 consumer groups reading the data

Calculate ingress TUs needed:

```
Events per second: 5000
Data per second: 5000 * 500 bytes = 2.5 MB/s

TUs needed for event rate: 5000 / 1000 = 5 TUs
TUs needed for data rate: 2.5 / 1 = 2.5 TUs (round up to 3)

Ingress TUs needed: max(5, 3) = 5 TUs
```

Calculate egress TUs needed:

```
Each consumer group reads the full stream:
Egress data: 2.5 MB/s * 3 consumer groups = 7.5 MB/s
TUs needed for egress: 7.5 / 2 = 3.75 (round up to 4)
```

Total TUs needed: max(5, 4) = 5 TUs. Add a buffer of 20-30% for spikes, so provision 6-7 TUs.

### Setting Throughput Units

```bash
# Update the namespace to 6 throughput units
az eventhubs namespace update \
  --resource-group my-resource-group \
  --name my-eventhubs-namespace \
  --capacity 6
```

## Auto-Inflate for Automatic Scaling

If your traffic is bursty, manually managing TUs is tedious. Auto-Inflate automatically scales up throughput units when you hit the current limit:

```bash
# Enable auto-inflate with a maximum of 20 TUs
az eventhubs namespace update \
  --resource-group my-resource-group \
  --name my-eventhubs-namespace \
  --capacity 2 \
  --enable-auto-inflate true \
  --maximum-throughput-units 20
```

Important notes about Auto-Inflate:

- It only scales **up**, never down. If traffic drops, you are still paying for the peak TU count until you manually reduce it.
- The scale-up happens within seconds when throttling is detected.
- Set a reasonable maximum to prevent unexpected costs.

## Premium and Dedicated Tiers

For workloads that need more than 40 TUs (the standard tier maximum) or need guaranteed isolation:

**Premium tier**: Uses Processing Units (PUs) instead of TUs. Each PU provides significantly more capacity than a TU, and resources are isolated to your namespace.

```bash
# Create a Premium tier namespace
az eventhubs namespace create \
  --resource-group my-resource-group \
  --name my-premium-namespace \
  --location eastus \
  --sku Premium \
  --capacity 1  # Processing Units
```

**Dedicated tier**: Provides a single-tenant cluster with capacity measured in Capacity Units (CUs). This is for extremely high-throughput scenarios.

In the Premium tier, partition counts can be increased after creation (up to 1024 partitions per Event Hub), which removes the most significant planning constraint of the Standard tier.

## Monitoring and Alerts

Set up monitoring to track how close you are to your capacity limits:

```bash
# Create an alert for throttled requests
# This fires when producers are being throttled due to insufficient TUs
az monitor metrics alert create \
  --name "eventhubs-throttling-alert" \
  --resource-group my-resource-group \
  --scopes "/subscriptions/{sub-id}/resourceGroups/my-resource-group/providers/Microsoft.EventHub/namespaces/my-eventhubs-namespace" \
  --condition "total ThrottledRequests > 0" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group my-action-group \
  --description "Event Hubs is throttling requests - consider adding throughput units"
```

Key metrics to monitor:

- **Incoming Requests / Outgoing Requests**: Total request volume
- **Incoming Messages / Outgoing Messages**: Event counts
- **Incoming Bytes / Outgoing Bytes**: Data volume
- **Throttled Requests**: Requests rejected due to capacity limits
- **Quota Exceeded Errors**: Hard limit violations

A healthy Event Hubs namespace should have zero throttled requests under normal load. If you see consistent throttling, add more TUs or enable Auto-Inflate.

## Relationship Between Partitions and Throughput Units

Partitions and TUs are independent but related concepts:

- **TUs control total namespace capacity**: The total ingress/egress bandwidth for all Event Hubs in the namespace
- **Partitions control parallelism**: How many consumers can process events simultaneously

You can have 32 partitions with 2 TUs - this means you can have 32 parallel consumers, but total throughput is limited to 2 MB/s ingress. Conversely, you can have 4 partitions with 20 TUs - high throughput but limited to 4 parallel consumers.

The ideal configuration balances both:

```
Partitions >= Expected number of parallel consumers
TUs >= (Peak ingress MB/s) with some headroom
```

## Practical Sizing Guidelines

Here is a quick reference for common scenarios:

| Scenario | Partitions | TUs | Notes |
|----------|-----------|-----|-------|
| Dev/Test | 2-4 | 1 | Minimum viable setup |
| Small production | 8-16 | 2-4 | Moderate event volume |
| Medium production | 16-32 | 4-10 | Thousands of events/sec |
| Large production | 32 | 10-20 | Tens of thousands of events/sec |
| Very large | 32+ (Premium) | Premium PUs | Hundreds of thousands of events/sec |

Start conservative and scale up based on monitoring data. It is better to add TUs (easy, instant) than to discover you need more partitions (impossible to change in Standard tier).

## Summary

Partitions and throughput units are the two levers you pull to tune Azure Event Hubs performance. Partitions control consumer parallelism and ordering guarantees - plan them carefully because they are permanent in the Standard tier. Throughput units control total namespace bandwidth - they can be adjusted dynamically and Auto-Inflate can handle bursts automatically. Monitor throttling metrics closely, size for your peak load with a 20-30% buffer, and consider the Premium tier if you need the flexibility to change partition counts or need more than 40 TUs of capacity.
