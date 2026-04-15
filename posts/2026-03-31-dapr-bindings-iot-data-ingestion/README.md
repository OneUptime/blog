# How to Use Dapr Bindings for IoT Data Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, IoT, MQTT, Data Ingestion

Description: Learn how to use Dapr input bindings to ingest IoT sensor data from MQTT brokers and cloud IoT services, and process it in real time with microservices.

---

## Dapr as an IoT Data Ingestion Layer

IoT deployments generate continuous streams of sensor data from thousands of devices. Dapr input bindings provide a clean way to consume this data in microservices without coupling your business logic to MQTT clients, cloud IoT SDKs, or message broker specifics.

## Ingesting Data from an MQTT Broker

Dapr supports MQTT v3.1.1 as an input binding. Configure the component to subscribe to a topic:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: iot-sensor-data
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
    - name: url
      value: "tcp://mqtt-broker:1883"
    - name: topic
      value: "sensors/+/telemetry"
    - name: consumerID
      value: "dapr-ingestion-service"
    - name: retain
      value: "false"
    - name: cleanSession
      value: "true"
```

For TLS-enabled MQTT brokers:

```yaml
    - name: url
      value: "tls://mqtt-broker:8883"
    - name: caCert
      secretKeyRef:
        name: mqtt-certs
        key: ca.crt
    - name: clientCert
      secretKeyRef:
        name: mqtt-certs
        key: client.crt
    - name: clientKey
      secretKeyRef:
        name: mqtt-certs
        key: client.key
```

## Processing Sensor Data

When the MQTT broker delivers a message, Dapr triggers your app endpoint:

```javascript
const express = require("express");
const { DaprClient } = require("@dapr/dapr");

const app = express();
app.use(express.json());
const client = new DaprClient();

app.post("/iot-sensor-data", async (req, res) => {
  const payload = req.body;
  const topic = req.headers["x-mqtt-topic"] || "";

  // Parse device ID from topic: sensors/{device_id}/telemetry
  const deviceId = topic.split("/")[1];

  const reading = {
    deviceId,
    timestamp: new Date().toISOString(),
    temperature: payload.temp,
    humidity: payload.humidity,
    batteryLevel: payload.battery,
    signalStrength: payload.rssi,
  };

  // Validate reading
  if (reading.temperature < -40 || reading.temperature > 150) {
    console.warn(`Anomalous temperature from device ${deviceId}:`, reading.temperature);
  }

  // Store to time-series database via output binding
  await client.binding.send("timeseries-db", "create", reading);

  // Alert if battery is critical
  if (reading.batteryLevel < 10) {
    await client.binding.send("alert-queue", "create", {
      type: "LOW_BATTERY",
      deviceId,
      batteryLevel: reading.batteryLevel,
    });
  }

  res.status(200).send("OK");
});

app.listen(3000);
```

## Ingesting from AWS IoT Core

AWS IoT Core integrates with SQS/SNS. Use the SQS input binding to receive device messages:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aws-iot-queue
spec:
  type: bindings.aws.sqs
  version: v1
  metadata:
    - name: queueName
      value: "iot-device-telemetry"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secrets
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secrets
        key: secretKey
```

## Aggregating Readings Before Storage

To reduce write load, aggregate readings over a time window:

```javascript
const buffer = new Map();
const FLUSH_INTERVAL_MS = 5000;

function bufferReading(reading) {
  if (!buffer.has(reading.deviceId)) {
    buffer.set(reading.deviceId, []);
  }
  buffer.get(reading.deviceId).push(reading);
}

async function flushBuffer() {
  for (const [deviceId, readings] of buffer.entries()) {
    if (readings.length === 0) continue;

    const avg = {
      deviceId,
      window: FLUSH_INTERVAL_MS,
      avgTemperature: readings.reduce((s, r) => s + r.temperature, 0) / readings.length,
      avgHumidity: readings.reduce((s, r) => s + r.humidity, 0) / readings.length,
      readingCount: readings.length,
      windowStart: readings[0].timestamp,
      windowEnd: readings[readings.length - 1].timestamp,
    };

    await client.binding.send("timeseries-db", "create", avg);
    buffer.set(deviceId, []);
  }
}

setInterval(flushBuffer, FLUSH_INTERVAL_MS);
```

## Summary

Dapr input bindings provide a clean abstraction layer for IoT data ingestion, supporting MQTT, AWS IoT Core via SQS, and other message brokers. By implementing a simple HTTP endpoint and using output bindings for downstream storage, you can build efficient IoT data pipelines that are easy to test locally and deploy to Kubernetes.
