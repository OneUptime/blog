# How to Use Dapr MQTT3 Binding for IoT Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, MQTT, IoT, Microservice

Description: Learn how to configure the Dapr MQTT3 binding to receive sensor data from IoT devices and publish commands back to connected hardware.

---

## MQTT and IoT with Dapr

MQTT is the standard protocol for IoT device communication. The Dapr MQTT3 binding lets microservices subscribe to device telemetry and publish commands without managing MQTT client connections directly.

## Start a Local MQTT Broker

```bash
docker run -d \
  --name mosquitto \
  -p 1883:1883 \
  -p 9001:9001 \
  eclipse-mosquitto:latest
```

## Configure the MQTT3 Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-binding
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
  - name: url
    value: mqtt://localhost:1883
  - name: topic
    value: sensors/temperature
  - name: retain
    value: "false"
  - name: cleanSession
    value: "true"
  - name: consumerID
    value: dapr-iot-client
```

## Receive IoT Data (Input Binding)

Dapr calls your application endpoint each time a message is published to the configured topic:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/mqtt-binding", async (req, res) => {
  // req.body contains the MQTT payload
  const payload = req.body;
  console.log("Sensor reading:", payload);

  // Parse sensor data
  const reading = {
    deviceId: payload.deviceId,
    temperature: payload.value,
    unit: payload.unit,
    timestamp: new Date().toISOString(),
  };

  // Store to time-series database
  await storeSensorReading(reading);

  // Trigger alert if threshold exceeded
  if (reading.temperature > 80) {
    await sendAlert(reading);
  }

  res.sendStatus(200);
});

app.listen(3000);
```

## Publish Commands to Devices (Output Binding)

Send a command back to a device topic:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/mqtt-binding \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "command": "set-threshold",
      "value": 75,
      "deviceId": "sensor-42"
    },
    "metadata": {
      "topic": "devices/sensor-42/commands"
    }
  }'
```

## Handle Multiple Device Topics

Use wildcard topics to subscribe to all sensors:

```yaml
metadata:
- name: topic
  value: sensors/+/temperature  # + matches single level
```

Or subscribe to all subtopics:

```yaml
metadata:
- name: topic
  value: sensors/#  # # matches all remaining levels
```

## Secure MQTT with TLS

```yaml
metadata:
- name: url
  value: mqtts://broker.iot.example.com:8883
- name: caCert
  value: |
    -----BEGIN CERTIFICATE-----
    <CA certificate PEM content>
    -----END CERTIFICATE-----
- name: clientCert
  value: |
    -----BEGIN CERTIFICATE-----
    <client certificate PEM content>
    -----END CERTIFICATE-----
- name: clientKey
  value: |
    -----BEGIN RSA PRIVATE KEY-----
    <client private key PEM content>
    -----END RSA PRIVATE KEY-----
```

## Processing Pipeline Example

```python
@app.route("/mqtt-binding", methods=["POST"])
def handle_telemetry():
    data = request.json
    device_id = data.get("deviceId")
    readings = data.get("readings", {})

    # Aggregate and forward to analytics
    for metric, value in readings.items():
        publish_metric(device_id, metric, value)

    return "", 200
```

## Summary

The Dapr MQTT3 binding enables microservices to receive IoT telemetry as input triggers and send device commands as output operations. Configure the broker URL and topic in the component YAML. Wildcard topics allow subscribing to entire device fleets without changing application code.
