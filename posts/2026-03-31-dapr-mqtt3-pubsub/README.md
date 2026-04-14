# How to Configure Dapr with MQTT3 Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, MQTT, IoT, Pub/Sub, Messaging

Description: Learn how to configure Dapr with MQTT3 as a pub/sub broker, enabling IoT device communication and lightweight messaging for edge and embedded microservices.

---

## Overview

MQTT (Message Queuing Telemetry Transport) is a lightweight publish-subscribe protocol designed for constrained devices and low-bandwidth networks. MQTT3 (version 3.1.1) is the most widely supported version. Dapr's MQTT3 pub/sub component enables microservices to communicate with IoT devices, edge systems, and other MQTT-native applications through Dapr's standard pub/sub API.

## Prerequisites

- A running MQTT broker (Eclipse Mosquitto recommended)
- Dapr CLI and runtime installed
- mosquitto_pub and mosquitto_sub for testing

## Deploying Mosquitto on Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mosquitto
  namespace: default
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
        - containerPort: 9001
        volumeMounts:
        - name: config
          mountPath: /mosquitto/config
      volumes:
      - name: config
        configMap:
          name: mosquitto-config
---
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
---
apiVersion: v1
kind: Service
metadata:
  name: mosquitto
spec:
  selector:
    app: mosquitto
  ports:
  - name: mqtt
    port: 1883
    targetPort: 1883
```

Apply the Mosquitto deployment:

```bash
kubectl apply -f mosquitto.yaml
```

## Configuring the Dapr MQTT3 Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt3-pubsub
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
    value: "true"
  - name: consumerID
    value: "dapr-mqtt-client"
```

For TLS and authentication:

```yaml
  - name: url
    value: "ssl://mosquitto.default.svc.cluster.local:8883"
  - name: caCert
    secretKeyRef:
      name: mqtt-tls
      key: ca.crt
  - name: clientCert
    secretKeyRef:
      name: mqtt-tls
      key: client.crt
  - name: clientKey
    secretKeyRef:
      name: mqtt-tls
      key: client.key
```

QoS levels:
- `0`: At most once (fire-and-forget)
- `1`: At least once (recommended for reliability)
- `2`: Exactly once (highest overhead)

Apply the component:

```bash
kubectl apply -f mqtt3-pubsub.yaml
```

## Publishing IoT Events

Publish sensor data from a Dapr-enabled edge service:

```javascript
import { DaprClient } from "@dapr/dapr";

const client = new DaprClient();

// Publish temperature reading from IoT sensor
await client.pubsub.publish("mqtt3-pubsub", "sensors/factory-floor/temperature", {
  sensorId: "temp-sensor-07",
  location: "factory-floor-zone-3",
  temperature: 24.7,
  unit: "celsius",
  timestamp: new Date().toISOString(),
  batteryLevel: 82
});
```

## Subscribing to IoT Events

```javascript
import { DaprServer } from "@dapr/dapr";

const server = new DaprServer({ serverHost: "127.0.0.1", serverPort: "3001" });

// Subscribe using MQTT wildcard topic
await server.pubsub.subscribe(
  "mqtt3-pubsub",
  "sensors/+/temperature",
  async (reading) => {
    console.log(`${reading.sensorId}: ${reading.temperature}${reading.unit}`);

    if (reading.temperature > 35) {
      await triggerCoolingAlert(reading.location, reading.temperature);
    }
  }
);

await server.start();
```

## Testing with Mosquitto CLI

```bash
# Subscribe to all sensor topics
mosquitto_sub -h localhost -p 1883 -t "sensors/#" -v

# Publish a test message
mosquitto_pub -h localhost -p 1883 \
  -t "sensors/lab/temperature" \
  -m '{"sensorId":"test-01","temperature":22.3,"unit":"celsius"}'
```

## Summary

Dapr's MQTT3 pub/sub component bridges the gap between IoT devices and cloud microservices, enabling bidirectional communication through a lightweight protocol. By setting `qos: 1` for at-least-once delivery and using MQTT wildcard topics, you can build robust IoT data pipelines that ingest sensor data from thousands of devices through a single Dapr pub/sub subscription.
