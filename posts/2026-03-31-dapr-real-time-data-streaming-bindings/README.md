# How to Build Real-Time Data Streaming with Dapr Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Streaming, Real-Time, Kafka

Description: Learn how to build real-time data streaming pipelines using Dapr input and output bindings to connect disparate data sources and sinks.

---

Dapr bindings provide a consistent interface for connecting to external systems - databases, message queues, cloud services, and more - without tightly coupling your code to specific SDKs. For real-time streaming, input bindings trigger your service when new data arrives, while output bindings let you write to downstream systems.

## Understanding Dapr Bindings vs Pub/Sub

- **Bindings**: Connect to external systems (Kafka, RabbitMQ, AWS SQS, Azure Event Hubs, HTTP endpoints, cron triggers).
- **Pub/Sub**: Dapr-managed topic-based messaging with guaranteed delivery semantics.

Use bindings when you need to integrate with existing infrastructure or non-Dapr systems.

## Configure a Kafka Input Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-stream
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka-broker:9092
  - name: topics
    value: sensor-readings
  - name: consumerGroup
    value: stream-processor
  - name: initialOffset
    value: newest
  - name: authType
    value: "none"
```

## Handle Incoming Stream Data

Dapr calls your service when new data arrives on the binding:

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route('/kafka-stream', methods=['POST'])
def handle_sensor_reading():
    binding_event = request.json
    reading = json.loads(binding_event['data'])

    # Process the reading
    processed = {
        "sensorId": reading["id"],
        "temperature": reading["temp"],
        "fahrenheit": reading["temp"] * 9/5 + 32,
        "alert": reading["temp"] > 80
    }

    # Forward to output binding
    return jsonify({
        "to": ["processed-readings"],
        "data": processed
    }), 200
```

## Configure Output Binding

Write processed data to a different Kafka topic or another system:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: processed-readings
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka-broker:9092
  - name: publishTopic
    value: processed-sensor-data
```

## Invoke Output Bindings Programmatically

You can also write to output bindings from application code:

```javascript
const { DaprClient } = require('@dapr/dapr');
const client = new DaprClient();

async function writeToStream(data) {
  await client.binding.send('processed-readings', 'create', data, {
    partitionKey: data.sensorId
  });
}
```

## Stream from Multiple Sources

Use multiple input bindings to aggregate from different sources:

```yaml
# Azure Event Hub input
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: eventhub-stream
spec:
  type: bindings.azure.eventhubs
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: azure-secrets
      key: eventhub-connection
  - name: consumerGroup
    value: stream-aggregator
```

Register both routes in your handler:

```python
@app.route('/kafka-stream', methods=['POST'])
def handle_kafka():
    return process_reading(request.json), 200

@app.route('/eventhub-stream', methods=['POST'])
def handle_eventhub():
    return process_reading(request.json), 200
```

## Add a Cron Binding for Periodic Aggregation

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aggregate-cron
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 30s"
```

```python
@app.route('/aggregate-cron', methods=['POST'])
def aggregate():
    # Compute rolling averages from Dapr state
    flush_aggregates_to_output()
    return '', 200
```

## Summary

Dapr bindings enable real-time streaming pipelines by providing a unified interface to Kafka, Event Hubs, and other messaging systems. Input bindings trigger your service when new data arrives, output bindings write processed results downstream, and the binding chain pattern lets you build multi-stage processing without coupling your code to any specific broker SDK. Combine with cron bindings to add periodic aggregation steps.
