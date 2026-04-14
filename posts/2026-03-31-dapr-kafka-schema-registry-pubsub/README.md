# How to Configure Kafka Schema Registry with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kafka, Schema Registry, Avro, Pub/Sub, Data Quality, Microservice

Description: Integrate Confluent Schema Registry with Dapr Kafka pub/sub to enforce message schemas, ensure compatibility, and prevent breaking changes.

---

## Overview

Kafka Schema Registry centralizes schema management for Kafka topics, preventing producers from publishing messages that would break consumers. While Dapr's Kafka pub/sub component itself works with JSON by default, you can integrate Schema Registry by handling serialization in your application layer before publishing through Dapr. This guide covers the patterns for schema enforcement in Dapr-based Kafka systems.

## Architecture Overview

```json
[App] --> [Avro Serialize] --> [Dapr Publish] --> [Kafka Topic]
                                                         |
[App] <-- [Avro Deserialize] <-- [Dapr Subscribe] <------
```

Your application handles Avro serialization; Dapr handles routing and delivery.

## Setting Up Schema Registry

```bash
# Using Confluent Platform
docker run -d --name schema-registry \
  -p 8081:8081 \
  -e SCHEMA_REGISTRY_HOST_NAME=schema-registry \
  -e SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS=kafka:9092 \
  confluentinc/cp-schema-registry:7.5.0
```

## Defining an Avro Schema

```json
{
  "type": "record",
  "name": "OrderEvent",
  "namespace": "com.example.events",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "total", "type": "double"},
    {"name": "status", "type": {
      "type": "enum",
      "name": "OrderStatus",
      "symbols": ["CREATED", "SHIPPED", "DELIVERED"]
    }}
  ]
}
```

Register the schema:

```bash
curl -X POST http://localhost:8081/subjects/order-events-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"OrderEvent\",...}"}'
```

## Dapr Component (Standard Kafka Config)

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
  namespace: default
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "kafka:9092"
    - name: consumerGroup
      value: "order-processor"
    - name: authType
      value: "none"
```

## Publishing with Avro Serialization (Python)

```python
import io
import struct
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
import requests
import base64

SCHEMA_REGISTRY_URL = "http://schema-registry:8081"
DAPR_URL = "http://localhost:3500"

schema_client = SchemaRegistryClient({"url": SCHEMA_REGISTRY_URL})

def publish_order(order_data):
    # Serialize with schema ID prefix (Confluent wire format)
    schema_id = 1
    avro_bytes = serialize_avro(order_data, schema_id)

    # Encode as base64 for JSON transport through Dapr
    payload = {"data": base64.b64encode(avro_bytes).decode()}

    requests.post(
        f"{DAPR_URL}/v1.0/publish/kafka-pubsub/order-events?metadata.rawPayload=true",
        json=payload,
        headers={"Content-Type": "application/json"}
    )
```

## Subscribing with Avro Deserialization

```python
from flask import Flask, request
import base64

app = Flask(__name__)

@app.route('/order-events', methods=['POST'])
def handle_order():
    event = request.json
    raw = event.get('data', '')

    # Decode base64
    avro_bytes = base64.b64decode(raw)

    # Deserialize using schema registry
    order = deserialize_avro(avro_bytes)
    print(f"Order: {order['orderId']} - {order['status']}")
    return '', 200
```

## Schema Compatibility Checking

```bash
# Check if a new schema is backward compatible
curl -X POST http://localhost:8081/compatibility/subjects/order-events-value/versions/latest \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{...new schema...}"}'

# Response: {"is_compatible": true}
```

Set global compatibility level:

```bash
curl -X PUT http://localhost:8081/config \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"compatibility": "BACKWARD"}'
```

## Summary

Dapr's Kafka pub/sub component does not natively integrate with Schema Registry, but you can layer Avro serialization in your application code before publishing through Dapr. Serialize messages to Avro bytes, encode as base64 for JSON transport, and deserialize on the consumer side. Use Schema Registry's compatibility checks in your CI pipeline to catch breaking changes before deployment.
