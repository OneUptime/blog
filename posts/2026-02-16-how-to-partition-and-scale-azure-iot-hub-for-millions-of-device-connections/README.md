# How to Partition and Scale Azure IoT Hub for Millions of Device Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure IoT Hub, Scaling, Partitioning, IoT, Device Connections, Throughput, Event Hubs

Description: Learn how to partition and scale Azure IoT Hub to handle millions of concurrent device connections with optimal throughput and message processing.

---

When your IoT deployment grows from hundreds of devices to millions, the way you configure and scale your IoT Hub becomes critical. Message throughput, connection limits, partition counts, and routing decisions all affect whether your system handles the load smoothly or buckles under pressure. This guide covers how to properly size and partition Azure IoT Hub for large-scale deployments, including the decisions you need to make early because they cannot be changed later.

## Understanding IoT Hub Scaling Fundamentals

Azure IoT Hub scales along two dimensions:

- **Tier**: Basic (B1, B2, B3) or Standard (S1, S2, S3). Standard tier supports all features including device twins, direct methods, and cloud-to-device messaging. Basic tier only supports device-to-cloud messaging.
- **Units**: You can have multiple units of the same tier. Each unit adds capacity for messages per day and concurrent device connections.

Here are the key limits per unit:

| Tier | Messages/day | Device connections | D2C throughput |
|------|-------------|-------------------|----------------|
| S1   | 400,000     | 1,000             | 1 MB/min       |
| S2   | 6,000,000   | 1,000             | 16 MB/min      |
| S3   | 300,000,000 | 1,000             | 800 MB/min     |

These are per-unit limits. If you need 10,000 concurrent connections, you need at least 10 S1 units (or any tier - the connection limit scales linearly with units).

## Choosing the Right Tier and Unit Count

For a million-device deployment, here is how I think about sizing:

**Connection math**: If all million devices connect simultaneously, you need at least 1,000 units of any tier (since each unit supports 1,000 concurrent connections). In practice, not all devices connect at the same time. If your devices connect once an hour and stay connected for 5 minutes, your concurrent connections peak at about 83,000 (1,000,000 / 12). That requires roughly 83 S1 units.

**Message math**: If each device sends one message every 5 minutes, that is 288,000,000 messages per day. S1 handles 400,000 messages per unit per day, so you need 720 S1 units. S2 handles 6 million per unit, so you need 48 S2 units. S3 handles 300 million per unit, so you need 1 S3 unit.

The math usually works out in favor of higher tiers for large deployments. One S3 unit is much cheaper than 720 S1 units.

```bash
# Create an IoT Hub with the right tier for a large deployment
RESOURCE_GROUP="rg-iot-production"
IOT_HUB_NAME="iot-production-hub"

# S3 tier with 2 units for redundancy and headroom
az iot hub create \
    --name $IOT_HUB_NAME \
    --resource-group $RESOURCE_GROUP \
    --location eastus \
    --sku S3 \
    --unit 2 \
    --partition-count 32
```

## Partitioning Strategy

IoT Hub uses partitions for its built-in Event Hub-compatible endpoint. The partition count is set at creation time and **cannot be changed later**. This is the most important decision you make when creating the hub.

### Why Partition Count Matters

Each partition is a unit of parallelism for downstream message processing. If you have 4 partitions, you can have at most 4 concurrent consumer processes reading messages. If you have 32 partitions, you can have up to 32 concurrent consumers.

For a million-device deployment, you want maximum parallelism. The maximum partition count is 32 for paid tiers and 8 for the free tier.

```bash
# You MUST set partition count at creation time
# It cannot be changed later, so choose carefully
az iot hub create \
    --name $IOT_HUB_NAME \
    --resource-group $RESOURCE_GROUP \
    --sku S3 \
    --unit 2 \
    --partition-count 32
```

**Always set partition count to 32 for production hubs.** There is no cost penalty for more partitions, and you cannot increase it later. I have seen teams create a hub with 4 partitions, hit a processing bottleneck six months later, and have to create a new hub and migrate all devices.

### How Messages Are Distributed Across Partitions

By default, IoT Hub distributes messages across partitions using a round-robin algorithm. You can control the partition assignment by setting a partition key when sending messages:

```python
# Device-side: Send a message with a specific partition key
# Messages with the same partition key go to the same partition
# This preserves ordering for messages from the same device
from azure.iot.device import Message

msg = Message("{'temperature': 22.5, 'humidity': 45}")
msg.content_encoding = "utf-8"
msg.content_type = "application/json"

# Setting the partition key ensures all messages from this device
# go to the same partition, maintaining order
msg.custom_properties["iothub-partition-key"] = device_id

await client.send_message(msg)
```

Using the device ID as the partition key ensures that all messages from a single device are processed in order. This matters for time-series data where ordering is important.

## Scaling the Message Processing Backend

With 32 partitions, you need a backend that can process messages from all partitions concurrently. Azure Event Hubs SDKs handle this with the EventProcessorClient:

```python
# message_processor.py
# Process IoT Hub messages at scale using Event Processor
import asyncio
import os
from azure.eventhub.aio import EventHubConsumerClient
from azure.eventhub.extensions.checkpointstoreblob.aio import BlobCheckpointStore

# IoT Hub Event Hub-compatible endpoint
EVENTHUB_CONNECTION = os.environ["IOTHUB_EVENTHUB_CONNECTION"]
EVENTHUB_NAME = os.environ["IOTHUB_EVENTHUB_NAME"]
STORAGE_CONNECTION = os.environ["CHECKPOINT_STORAGE_CONNECTION"]
CHECKPOINT_CONTAINER = "iot-checkpoints"

# Track processing metrics
message_count = 0
partition_counts = {}

async def on_event_batch(partition_context, events):
    """Process a batch of events from a single partition."""
    global message_count

    for event in events:
        # Parse the device message
        device_id = event.system_properties.get(b"iothub-connection-device-id", b"").decode()
        body = event.body_as_str()

        # Process the message (store in database, trigger alerts, etc.)
        # In production, batch these operations for efficiency
        message_count += 1

        partition_id = partition_context.partition_id
        partition_counts[partition_id] = partition_counts.get(partition_id, 0) + 1

    # Checkpoint after processing the batch
    # This saves our position so we do not reprocess on restart
    await partition_context.update_checkpoint()

    if message_count % 10000 == 0:
        print(f"Processed {message_count} messages. Partition distribution: {partition_counts}")


async def on_error(partition_context, error):
    """Handle processing errors."""
    if partition_context:
        print(f"Error on partition {partition_context.partition_id}: {error}")
    else:
        print(f"General error: {error}")


async def main():
    """Start the event processor."""
    # Blob checkpoint store for tracking processing position
    checkpoint_store = BlobCheckpointStore.from_connection_string(
        STORAGE_CONNECTION, CHECKPOINT_CONTAINER
    )

    # Create the consumer client
    # The $Default consumer group works but create a dedicated one for production
    client = EventHubConsumerClient.from_connection_string(
        EVENTHUB_CONNECTION,
        consumer_group="$Default",
        eventhub_name=EVENTHUB_NAME,
        checkpoint_store=checkpoint_store,
    )

    async with client:
        print("Starting event processor with automatic partition balancing...")
        # receive_batch processes events in batches for better throughput
        await client.receive_batch(
            on_event_batch=on_event_batch,
            on_error=on_error,
            max_batch_size=100,
            max_wait_time=5,  # seconds
        )


if __name__ == "__main__":
    asyncio.run(main())
```

### Scaling the Processor

Run multiple instances of the processor and they will automatically distribute partitions among themselves. With 32 partitions, you can run up to 32 processor instances:

```yaml
# kubernetes-deployment.yaml
# Deploy multiple processor instances for parallel partition processing
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iot-message-processor
spec:
  replicas: 8  # Each instance handles ~4 partitions
  selector:
    matchLabels:
      app: iot-processor
  template:
    metadata:
      labels:
        app: iot-processor
    spec:
      containers:
        - name: processor
          image: myregistry.azurecr.io/iot-processor:latest
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1"
              memory: "1Gi"
          env:
            - name: IOTHUB_EVENTHUB_CONNECTION
              valueFrom:
                secretKeyRef:
                  name: iot-secrets
                  key: eventhub-connection
```

## Message Routing for Throughput

IoT Hub message routing can add latency. For maximum throughput:

- Use the built-in Event Hub endpoint for raw message processing
- Only add custom routes for messages that need different handling (e.g., alerts)
- Avoid routing queries that require parsing the message body (body-based queries are slower than property-based queries)

```bash
# Create a route for alert messages based on a message property
# This is faster than parsing the message body
az iot hub message-route create \
    --hub-name $IOT_HUB_NAME \
    --route-name alert-route \
    --source DeviceMessages \
    --endpoint-name alerts-endpoint \
    --condition "alertLevel = 'critical'" \
    --enabled true
```

## Monitoring IoT Hub at Scale

At scale, monitoring becomes essential:

```bash
# Set up alerts for throttling
az monitor metrics alert create \
    --name "IoTHub-Throttling" \
    --resource-group $RESOURCE_GROUP \
    --scopes "/subscriptions/<sub-id>/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.Devices/IotHubs/$IOT_HUB_NAME" \
    --condition "total d2c.telemetry.egress.dropped > 100" \
    --window-size 5m \
    --evaluation-frequency 1m
```

Key metrics to watch:
- **d2c.telemetry.ingress.allProtocol** - Total messages received
- **d2c.telemetry.egress.dropped** - Messages dropped due to throttling
- **connectedDeviceCount** - Current connected devices
- **dailyMessageQuotaUsed** - How close you are to the daily message limit

## Summary

Scaling Azure IoT Hub for millions of devices requires careful upfront planning. Set the partition count to 32 (the maximum) when creating the hub because it cannot be changed later. Choose the right tier based on your message volume and connection patterns - higher tiers are usually more cost-effective at scale. On the processing side, use the EventProcessorClient with multiple instances to consume messages in parallel across all partitions. Monitor throttling metrics closely and scale up units before you hit limits. The decisions you make at hub creation time (especially partition count) will determine your scalability ceiling for the life of that hub.
