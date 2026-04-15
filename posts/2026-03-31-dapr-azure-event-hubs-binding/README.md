# How to Use Dapr Azure Event Hubs Binding for Event Streaming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Event Hub, Binding, Stream Processing

Description: Learn how to configure the Dapr Azure Event Hubs binding to produce and consume high-throughput event streams for real-time data processing in microservices.

---

## What Is the Dapr Azure Event Hubs Binding?

Azure Event Hubs is a managed event streaming platform capable of ingesting millions of events per second. The Dapr Azure Event Hubs binding supports both output (publishing events) and input (consuming events) modes, abstracting the Kafka-compatible or AMQP connection management.

## Setting Up the Event Hubs Namespace

```bash
az eventhubs namespace create \
  --name my-eventhub-namespace \
  --resource-group my-rg \
  --location eastus \
  --sku Standard

az eventhubs eventhub create \
  --name telemetry-stream \
  --namespace-name my-eventhub-namespace \
  --resource-group my-rg \
  --partition-count 8 \
  --retention-time 72
```

## Configuring the Event Hubs Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: telemetry-stream
  namespace: default
spec:
  type: bindings.azure.eventhubs
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: eventhubs-secrets
        key: connectionString
    - name: eventHub
      value: "telemetry-stream"
    - name: storageAccountName
      value: "mycheckpointstore"
    - name: storageAccountKey
      secretKeyRef:
        name: eventhubs-secrets
        key: storageKey
    - name: storageContainerName
      value: "eventhubs-checkpoints"
    - name: consumerGroup
      value: "dapr-consumer"
```

```bash
kubectl create secret generic eventhubs-secrets \
  --from-literal=connectionString="Endpoint=sb://my-eventhub-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=..." \
  --from-literal=storageKey=<storage-account-key>
```

## Publishing Events to Event Hubs

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function publishTelemetry(deviceId, readings) {
  await client.binding.send(
    "telemetry-stream",
    "create",
    {
      deviceId,
      readings,
      timestamp: new Date().toISOString(),
      firmware: "v2.1.3",
    },
    {
      partitionKey: deviceId, // ensures ordering per device
    }
  );
}

// Publish a batch of device readings
const devices = ["sensor-01", "sensor-02", "sensor-03"];
await Promise.all(
  devices.map((deviceId) =>
    publishTelemetry(deviceId, {
      temperature: 22.5 + Math.random() * 5,
      humidity: 45 + Math.random() * 20,
      pressure: 1013.25,
    })
  )
);
```

## Consuming Events from Event Hubs

Dapr reads from the event hub and triggers your app endpoint:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/telemetry-stream", async (req, res) => {
  const event = req.body;

  const partitionId = req.headers["x-opt-partition-id"];
  const sequenceNumber = req.headers["x-opt-sequence-number"];
  const offset = req.headers["x-opt-offset"];

  console.log(`Event from partition ${partitionId}, seq #${sequenceNumber}`);

  try {
    // Process telemetry
    if (event.readings.temperature > 35) {
      await triggerTemperatureAlert(event.deviceId, event.readings.temperature);
    }

    await storeTelemetry(event);

    res.status(200).send("OK");
  } catch (err) {
    console.error("Failed to process event:", err);
    res.status(500).send(err.message);
  }
});

app.listen(3000);
```

## Checkpoint Management

Dapr uses Azure Blob Storage to store consumer checkpoints, ensuring that after a restart your consumer resumes from where it left off rather than reprocessing all events:

```bash
az storage container create \
  --name eventhubs-checkpoints \
  --account-name mycheckpointstore
```

## Scaling with Multiple Consumer Groups

Create separate consumer groups for independent downstream processors:

```bash
az eventhubs eventhub consumer-group create \
  --name analytics-processor \
  --eventhub-name telemetry-stream \
  --namespace-name my-eventhub-namespace \
  --resource-group my-rg

az eventhubs eventhub consumer-group create \
  --name alerting-service \
  --eventhub-name telemetry-stream \
  --namespace-name my-eventhub-namespace \
  --resource-group my-rg
```

Deploy separate Dapr apps pointing to different consumer groups so each receives all events independently.

## Summary

The Dapr Azure Event Hubs binding provides a clean abstraction for high-throughput event streaming. Use the output binding to publish events with partition keys for ordered delivery, and the input binding for consuming events with automatic checkpoint management via Azure Blob Storage. Multiple consumer groups enable independent downstream processors to read from the same event stream without interference.
