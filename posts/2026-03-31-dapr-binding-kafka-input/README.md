# How to Set Up Dapr Binding with Kafka as Input Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Kafka, Input Binding, Event Streaming

Description: Configure a Dapr Kafka input binding to trigger your application when messages arrive on Kafka topics, with support for consumer groups, SASL auth, and partition metadata.

---

## Overview

A Dapr Kafka input binding watches one or more Kafka topics and triggers your application's HTTP endpoint when messages arrive. Unlike Dapr pub/sub, bindings are a lower-level integration that is useful for consuming from existing Kafka topics you do not own, or for simple trigger-based architectures.

## Input Binding vs Pub/Sub

| Feature | Input Binding | Pub/Sub |
|---------|--------------|---------|
| Topics managed by Dapr | No | Yes |
| CloudEvents envelope | No | Yes |
| Message routing | No | Yes |
| Multiple topics per component | Single topic | One topic per subscription |
| Use case | Consume existing topics | Dapr-native messaging |

## Prerequisites

- Apache Kafka running
- Dapr CLI initialized

## Starting Kafka Locally

```bash
docker run -d \
  --name kafka \
  -p 9092:9092 \
  -e KAFKA_CFG_PROCESS_ROLES=broker,controller \
  -e KAFKA_CFG_NODE_ID=0 \
  -e KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka:9093 \
  -e KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
  -e KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e ALLOW_PLAINTEXT_LISTENER=yes \
  bitnami/kafka:3.6
```

Create a test topic:

```bash
docker exec kafka kafka-topics.sh \
  --create \
  --topic sensor-readings \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1
```

## Configuring the Kafka Input Binding

```yaml
# kafka-input-binding.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sensor-readings
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "localhost:9092"
  - name: topics
    value: "sensor-readings"
  - name: consumerGroup
    value: "sensor-processor-group"
  - name: initialOffset
    value: "newest"
  - name: authType
    value: "none"
  - name: direction
    value: "input"
```

Place it in components directory:

```bash
cp kafka-input-binding.yaml ~/.dapr/components/
```

### With SASL Authentication

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sensor-readings
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-broker:9092"
  - name: topics
    value: "sensor-readings"
  - name: consumerGroup
    value: "sensor-processor-group"
  - name: authType
    value: "password"
  - name: saslUsername
    secretKeyRef:
      name: kafka-credentials
      key: username
  - name: saslPassword
    secretKeyRef:
      name: kafka-credentials
      key: password
  - name: saslMechanism
    value: "SHA-256"
  - name: direction
    value: "input"
```

## Handling Kafka Binding Events

The endpoint name must match the binding component name:

### Python

```python
# sensor_processor.py
from flask import Flask, request, jsonify
import json
from datetime import datetime

app = Flask(__name__)

@app.route('/sensor-readings', methods=['POST'])
def handle_sensor_reading():
    """Called by Dapr when a message arrives on the Kafka topic."""
    body = request.get_json()

    # The raw Kafka message is in body["data"]
    # Metadata contains partition, offset, key, topic, timestamp
    data = body.get("data")
    metadata = body.get("metadata", {})

    print(f"Message received:")
    print(f"  Topic: {metadata.get('topic')}")
    print(f"  Partition: {metadata.get('partition')}")
    print(f"  Offset: {metadata.get('offset')}")
    print(f"  Key: {metadata.get('key')}")
    print(f"  Timestamp: {metadata.get('timestamp')}")

    # Parse the sensor data
    try:
        if isinstance(data, str):
            sensor = json.loads(data)
        else:
            sensor = data

        print(f"Sensor {sensor.get('sensorId')}: "
              f"temp={sensor.get('temperature')}, "
              f"humidity={sensor.get('humidity')}")

        process_reading(sensor)
        return jsonify({"status": "processed"}), 200

    except Exception as e:
        print(f"Failed to process sensor reading: {e}")
        return jsonify({"error": str(e)}), 500

def process_reading(sensor):
    """Persist and alert if threshold exceeded."""
    if sensor.get("temperature", 0) > 80:
        print(f"ALERT: High temperature on sensor {sensor['sensorId']}")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
```

Start with Dapr:

```bash
dapr run \
  --app-id sensor-processor \
  --app-port 5001 \
  --dapr-http-port 3500 \
  -- python sensor_processor.py
```

### Node.js

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/sensor-readings', (req, res) => {
  const { data, metadata } = req.body;

  // Parse message
  let sensor;
  try {
    sensor = typeof data === 'string' ? JSON.parse(data) : data;
  } catch {
    sensor = data;
  }

  console.log(`Message from partition ${metadata?.partition}, offset ${metadata?.offset}`);
  console.log('Sensor data:', sensor);

  // Process
  if (sensor.temperature > 80) {
    console.warn(`High temp alert: sensor ${sensor.sensorId}`);
  }

  res.status(200).send();
});

app.listen(3001, () => console.log('Listening on :3001'));
```

### Go

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

type SensorReading struct {
    SensorID    string  `json:"sensorId"`
    Temperature float64 `json:"temperature"`
    Humidity    float64 `json:"humidity"`
}

type KafkaEvent struct {
    Data     json.RawMessage   `json:"data"`
    Metadata map[string]string `json:"metadata"`
}

func sensorHandler(w http.ResponseWriter, r *http.Request) {
    var event KafkaEvent
    json.NewDecoder(r.Body).Decode(&event)

    fmt.Printf("Message from partition=%s offset=%s\n",
        event.Metadata["partition"],
        event.Metadata["offset"])

    var reading SensorReading
    json.Unmarshal(event.Data, &reading)
    fmt.Printf("Sensor %s: temp=%.1f humidity=%.1f\n",
        reading.SensorID, reading.Temperature, reading.Humidity)

    if reading.Temperature > 80 {
        fmt.Printf("HIGH TEMP ALERT: %s\n", reading.SensorID)
    }

    w.WriteHeader(http.StatusOK)
}

func main() {
    http.HandleFunc("/sensor-readings", sensorHandler)
    log.Fatal(http.ListenAndServe(":3001", nil))
}
```

## Binding Event Metadata

Kafka input binding events include the following metadata:

```json
{
  "data": "{...message payload...}",
  "metadata": {
    "key": "sensor-001",
    "offset": "42",
    "partition": "1",
    "topic": "sensor-readings",
    "timestamp": "2026-03-31T10:00:00Z"
  }
}
```

## Publishing Test Messages

Produce test messages with the Kafka CLI:

```bash
docker exec -it kafka kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic sensor-readings \
  --property "parse.key=true" \
  --property "key.separator=:"
```

Type messages in `key:value` format:

```yaml
sensor-001:{"sensorId":"sensor-001","temperature":72.5,"humidity":45.2}
sensor-002:{"sensorId":"sensor-002","temperature":85.1,"humidity":60.0}
```

## Consuming from Multiple Partitions

Dapr creates one consumer per sidecar. For parallel processing, run multiple app instances with the same consumer group:

```bash
# Instance 1
dapr run --app-id sensor-processor --app-port 5001 -- python sensor_processor.py &

# Instance 2
dapr run --app-id sensor-processor --app-port 5002 --dapr-http-port 3502 -- python sensor_processor.py --port 5002
```

Kafka distributes partitions across the consumer group automatically.

## Summary

The Dapr Kafka input binding triggers your application HTTP endpoint when messages arrive on configured Kafka topics. It supports consumer groups, SASL authentication, TLS, and provides message metadata (partition, offset, key, timestamp) alongside the payload. This approach requires no Kafka SDK in your application and works identically with other supported input binding sources.
