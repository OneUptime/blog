# How to Partition and Scale Azure IoT Hub for Millions of Device Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure IoT Hub, Scaling, Partitioning, IoT, Device Connections, Throughput, Event Hub

Description: Learn how to partition and scale Azure IoT Hub to handle millions of concurrent device connections with optimal throughput and message processing.

---

When your IoT deployment grows from hundreds of devices to millions, the way you configure and scale your IoT Hub becomes critical. Message throughput, connection limits, partition counts, and routing decisions all affect whether your system handles the load smoothly or buckles under pressure. This guide covers how to properly size and partition Azure IoT Hub for large-scale deployments, including the decisions you need to make early because they cannot be changed later.

## Understanding IoT Hub Scaling Fundamentals

Azure IoT Hub scales along two dimensions:

- **Tier**: Basic (B1, B2, B3) or Standard (S1, S2, S3). Standard tier supports all features including device twins, direct methods, and cloud-to-device messaging. Basic tier only supports device-to-cloud messaging.
- **Units**: You can have multiple units of the same tier. Each unit adds capacity for messages per day and operation throttles such as device-to-cloud sends and new device connections.

Here are the key limits per unit:

| Tier | Messages/day | D2C send throttle | New device connection throttle |
|------|-------------|-------------------|--------------------------------|
| S1   | 400,000     | Higher of 100/sec per hub or 12/sec/unit | Higher of 100/sec per hub or 12/sec/unit |
| S2   | 6,000,000   | 120/sec/unit      | 120/sec/unit |
| S3   | 300,000,000 | 6,000/sec/unit    | 6,000/sec/unit |

The daily message quota scales with units. The connection limit to plan around here is the rate at which new device connections are established, not the total number of simultaneously connected devices. A single IoT hub can register up to 1,000,000 device and module identities.

## Choosing the Right Tier and Unit Count

For a million-device deployment, here is how I think about sizing:

**Connection math**: If all million devices reconnect at the same time, you need to plan for the new connection rate, not a fixed concurrent connection-per-unit limit. A single S1 unit allows at least 100 new connections per second, so connecting 1,000,000 devices from a cold start takes at least 10,000 seconds, or about 2.8 hours. If your devices reconnect once an hour and spread reconnects evenly, the average new connection rate is about 278 per second (1,000,000 / 3,600). That requires roughly 24 S1 units, 3 S2 units, or 1 S3 unit for the connection rate alone.

**Message math**: If each device sends one message every 5 minutes, that is 288,000,000 messages per day. S1 handles 400,000 messages per unit per day, so you need 720 S1 units. S2 handles 6 million per unit, so you need 48 S2 units. S3 handles 300 million per unit, so you need 1 S3 unit.

The math usually works out in favor of higher tiers for large deployments. One S3 unit is much cheaper than 720 S1 units.

```bash
# Create an IoT Hub with the right tier for a large deployment

RESOURCE_GROUP="rg-iot-production"
IOT_HUB_NAME="iot-production-hub"

# S3 tier with 2 units for additional quota and throttle headroom
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

For a million-device deployment, you want maximum parallelism. The maximum partition count for basic and standard tier hubs is 32.

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

IoT Hub does not allow arbitrary partitioning for device-to-cloud messages. Device-to-cloud messages are partitioned based on the originating `deviceId`, which keeps messages from a single device on the same partition and preserves per-device ordering at the Event Hub-compatible endpoint.

```python
# Device-side: Send a JSON telemetry message
# IoT Hub partitions device-to-cloud messages by the originating deviceId
from azure.iot.device import Message

msg = Message('{"temperature": 22.5, "humidity": 45}')
msg.content_encoding = "utf-8"
msg.content_type = "application/json"

await client.send_message(msg)
```

This built-in device ID partitioning is useful for time-series data where ordering from a single device is important.

## Scaling the Message Processing Backend

With 32 partitions, you need a backend that can process messages from all partitions concurrently. Azure Event Hubs SDKs handle this with the EventHubConsumerClient:

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

    # Checkpoint after processing the batch.
    # This saves our position so we do not reprocess on restart.
    if events:
        await partition_context.update_checkpoint(events[-1])

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
- Prefer application properties for simple routing flags. Body-based queries require a valid JSON body and the correct content type and encoding properties.

```bash
# Create a route for alert messages based on a message property
# This avoids parsing the message body in the route condition
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
    --condition "total d2c.telemetry.ingress.sendThrottle > 100" \
    --window-size 5m \
    --evaluation-frequency 1m
```

Key metrics to watch:
- **d2c.telemetry.ingress.allProtocol** - Total messages received
- **d2c.telemetry.ingress.sendThrottle** - Throttling errors due to device throughput limits
- **d2c.telemetry.egress.dropped** - Routed messages dropped because endpoints are dead
- **connectedDeviceCount** - Current connected devices
- **dailyMessageQuotaUsed** - How close you are to the daily message limit

## Summary

Scaling Azure IoT Hub for millions of devices requires careful upfront planning. Set the partition count to 32 (the maximum for basic and standard tier hubs) when creating the hub because it cannot be changed later. Choose the right tier based on your message volume and connection patterns - higher tiers are usually more cost-effective at scale. On the processing side, use the EventHubConsumerClient with multiple instances to consume messages in parallel across all partitions. Monitor throttling metrics closely and scale up units before you hit limits. The decisions you make at hub creation time (especially partition count) will determine your scalability ceiling for the life of that hub.
