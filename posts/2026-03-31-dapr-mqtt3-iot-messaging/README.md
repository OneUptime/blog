# How to Configure MQTT3 for IoT Messaging with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MQTT, IoT, Pub/Sub, Edge Computing

Description: Configure Dapr pub/sub with MQTT3 using Eclipse Mosquitto as the broker to enable IoT device messaging in microservices architectures running on Kubernetes or edge nodes.

---

MQTT is the standard messaging protocol for IoT devices due to its lightweight footprint and publish-subscribe model. Dapr's MQTT3 pub/sub component bridges IoT device telemetry into your microservices architecture without custom broker code.

## Setting Up Eclipse Mosquitto

Deploy Mosquitto as the MQTT broker on Kubernetes:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mosquitto-config
data:
  mosquitto.conf: |
    listener 1883
    allow_anonymous true
    persistence true
    persistence_location /mosquitto/data/
    log_dest file /mosquitto/log/mosquitto.log
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mosquitto
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mosquitto
  template:
    metadata:
      labels:
        app: mosquitto
    spec:
      containers:
      - name: mosquitto
        image: eclipse-mosquitto:2.0
        ports:
        - containerPort: 1883
        volumeMounts:
        - name: config
          mountPath: /mosquitto/config
      volumes:
      - name: config
        configMap:
          name: mosquitto-config
---
apiVersion: v1
kind: Service
metadata:
  name: mosquitto
spec:
  selector:
    app: mosquitto
  ports:
  - port: 1883
    targetPort: 1883
```

## Dapr MQTT3 Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: iot-pubsub
  namespace: default
spec:
  type: pubsub.mqtt3
  version: v1
  metadata:
  - name: url
    value: "tcp://mosquitto.default.svc.cluster.local:1883"
  - name: qos
    value: "1"
  - name: retain
    value: "false"
  - name: cleanSession
    value: "false"
  - name: consumerID
    value: "dapr-iot-gateway"
```

`qos: 1` ensures at-least-once delivery, appropriate for sensor telemetry where occasional duplicates are acceptable.

## Publishing Device Telemetry

IoT devices publish to MQTT topics directly, and Dapr subscribes to forward events to microservices. For devices that use HTTP instead of MQTT, use a Python gateway:

```python
# iot_gateway.py
import json
import requests
import os
import paho.mqtt.client as mqtt

DAPR_PORT = os.getenv("DAPR_HTTP_PORT", "3500")
BROKER_HOST = os.getenv("MQTT_BROKER", "mosquitto")

def on_mqtt_message(client, userdata, msg):
    """Forward MQTT message to Dapr pub/sub."""
    payload = json.loads(msg.payload.decode())
    topic = msg.topic.replace("/", "-")  # Convert MQTT path to Dapr topic

    requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/publish/iot-pubsub/{topic}",
        headers={"Content-Type": "application/json"},
        json=payload
    )
    print(f"Forwarded {msg.topic}: {payload}")

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="dapr-gateway-bridge")
client.on_message = on_mqtt_message
client.connect(BROKER_HOST, 1883)
client.subscribe("sensors/#", qos=1)
client.loop_forever()
```

## Processing IoT Events in a Microservice

Subscribe to IoT topics and process the telemetry:

```javascript
// sensor-processor.js
const express = require('express');
const app = express();
app.use(express.json());

// Dapr subscription endpoint
app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: 'iot-pubsub',
      topic: 'sensors-temperature',
      route: '/temperature'
    },
    {
      pubsubname: 'iot-pubsub',
      topic: 'sensors-humidity',
      route: '/humidity'
    }
  ]);
});

app.post('/temperature', (req, res) => {
  const event = req.body;
  const reading = event.data;

  console.log(`Temperature from ${reading.device_id}: ${reading.value}C`);

  if (reading.value > 35) {
    // Trigger alert via Dapr service invocation
    console.log('High temperature alert!');
  }

  res.sendStatus(200);
});

app.post('/humidity', (req, res) => {
  const event = req.body;
  console.log(`Humidity: ${event.data.value}%`);
  res.sendStatus(200);
});

app.listen(3000, () => console.log('Sensor processor on port 3000'));
```

## MQTT Topic to Dapr Topic Mapping

MQTT uses `/` as a path separator. When using Dapr's MQTT3 component directly, configure topic mapping:

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: temperature-subscription
spec:
  pubsubname: iot-pubsub
  topic: sensors/temperature
  routes:
    default: /temperature
```

Note: MQTT wildcard subscriptions (`#`, `+`) are supported in the Dapr MQTT3 component for subscribing to device hierarchies.

## Summary

Dapr's MQTT3 pub/sub component connects IoT device telemetry to microservices using Eclipse Mosquitto as the broker. Configuring QoS level 1, clean session false for persistent subscriptions, and mapping MQTT topic paths to Dapr subscription routes creates a reliable bridge from IoT edge devices to cloud-native microservices processing pipelines.
