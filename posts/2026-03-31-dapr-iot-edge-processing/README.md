# How to Build IoT Edge Processing with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, IoT, Edge Computing, Pub/Sub, Binding

Description: Use Dapr bindings and pub/sub to build an IoT edge processing pipeline that ingests sensor data, filters events, and forwards alerts upstream.

---

## Architecture Overview

IoT edge nodes receive high-frequency sensor data and must process it locally before sending relevant events to the cloud. Dapr input bindings handle the ingestion layer, while pub/sub routes events to downstream processors.

## Configuring the MQTT Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mqtt-sensor-input
spec:
  type: bindings.mqtt3
  version: v1
  metadata:
  - name: url
    value: "mqtt://broker.local:1883"
  - name: topic
    value: "sensors/temperature"
  - name: consumerID
    value: "edge-processor"
```

## Writing the Edge Processing Service

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)
ALERT_THRESHOLD = 80.0

@app.route('/mqtt-sensor-input', methods=['POST'])
def process_sensor_data():
    payload = request.get_json()
    device_id = payload.get("deviceId")
    temperature = float(payload.get("temperature", 0))

    if temperature > ALERT_THRESHOLD:
        # Publish alert to upstream topic
        import requests
        requests.post(
            "http://localhost:3500/v1.0/publish/edge-pubsub/temperature-alerts",
            json={"deviceId": device_id, "temperature": temperature, "severity": "high"}
        )

    return jsonify({"status": "processed"}), 200

if __name__ == '__main__':
    app.run(port=6000)
```

## Configuring the Pub/Sub Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: edge-pubsub
spec:
  type: pubsub.mqtt3
  version: v1
  metadata:
  - name: url
    value: "mqtt://broker.local:1883"
  - name: consumerID
    value: "edge-alert-forwarder"
```

## Subscribing to Alerts at the Cloud Aggregator

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

type CloudEvent struct {
    Data Alert `json:"data"`
}

type Alert struct {
    DeviceID    string  `json:"deviceId"`
    Temperature float64 `json:"temperature"`
    Severity    string  `json:"severity"`
}

func alertHandler(w http.ResponseWriter, r *http.Request) {
    var event CloudEvent
    json.NewDecoder(r.Body).Decode(&event)
    alert := event.Data
    fmt.Printf("ALERT: Device %s reported %.1f C (severity: %s)\n",
        alert.DeviceID, alert.Temperature, alert.Severity)
    w.WriteHeader(http.StatusOK)
}

func subscribeHandler(w http.ResponseWriter, r *http.Request) {
    subs := []map[string]string{
        {"pubsubname": "edge-pubsub", "topic": "temperature-alerts", "route": "/alerts"},
    }
    json.NewEncoder(w).Encode(subs)
}

func main() {
    http.HandleFunc("/dapr/subscribe", subscribeHandler)
    http.HandleFunc("/alerts", alertHandler)
    http.ListenAndServe(":8080", nil)
}
```

## Dapr Sidecar Configuration for Edge Nodes

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: edge-processor
spec:
  selector:
    matchLabels:
      app: edge-processor
  template:
    metadata:
      labels:
        app: edge-processor
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "edge-processor"
        dapr.io/app-port: "6000"
    spec:
      containers:
      - name: edge-processor
        image: myregistry/edge-processor:latest
```

## Summary

Dapr simplifies IoT edge processing by abstracting MQTT brokers behind input bindings and routing alerts through pub/sub components. This lets you swap the underlying message broker without changing application code. The same pattern works at any scale, from a Raspberry Pi running a single-node K3s cluster to a full Kubernetes deployment.
