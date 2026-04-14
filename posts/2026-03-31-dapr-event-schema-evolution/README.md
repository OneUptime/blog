# How to Handle Event Schema Evolution with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Schema Evolution, Pub/Sub, Avro, Protobuf, Backward Compatibility

Description: Manage event schema evolution in Dapr pub/sub systems using schema registries, Avro, and safe migration patterns to avoid consumer breakage.

---

## Overview

Event schema evolution is the process of changing the structure of events published via Dapr pub/sub without breaking existing consumers. Unmanaged schema changes are a leading cause of production incidents in event-driven systems. This guide covers safe evolution patterns and tooling.

## Schema Evolution Rules

Safe changes (backward compatible):
- Adding optional fields with defaults
- Adding new enum values (in Avro, only if the reader schema specifies an enum default)
- Widening field types (int to long)

Unsafe changes (breaking):
- Removing required fields
- Renaming fields
- Changing field types incompatibly
- Reusing field names with different types

## Using Apache Avro with Schema Registry

Set up Confluent Schema Registry alongside Kafka:

```bash
docker run -d \
  --name schema-registry \
  -p 8081:8081 \
  -e SCHEMA_REGISTRY_HOST_NAME=schema-registry \
  -e SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS=kafka:9092 \
  confluentinc/cp-schema-registry:7.5.0
```

Register the initial schema:

```bash
curl -X POST http://schema-registry:8081/subjects/OrderPlaced-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"OrderPlaced\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"},{\"name\":\"customerId\",\"type\":\"string\"},{\"name\":\"total\",\"type\":\"double\"}]}"
  }'
```

## Avro Schema Definition

```json
{
  "type": "record",
  "name": "OrderPlaced",
  "namespace": "com.company.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "total", "type": "double"},
    {"name": "currency", "type": "string", "default": "USD"},
    {"name": "regionCode", "type": ["null", "string"], "default": null}
  ]
}
```

Register the evolved schema (v2 with new optional field):

```bash
curl -X POST http://schema-registry:8081/subjects/OrderPlaced-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"OrderPlaced\",\"namespace\":\"com.company.orders\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"},{\"name\":\"customerId\",\"type\":\"string\"},{\"name\":\"total\",\"type\":\"double\"},{\"name\":\"currency\",\"type\":\"string\",\"default\":\"USD\"},{\"name\":\"regionCode\",\"type\":[\"null\",\"string\"],\"default\":null}]}"
  }'

# Check compatibility before registering
curl -X POST http://schema-registry:8081/compatibility/subjects/OrderPlaced-value/versions/latest \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "..."}'
```

## Protobuf Schema Evolution

Using Protocol Buffers with field number preservation:

```protobuf
syntax = "proto3";
package orders;

message OrderPlaced {
  string order_id = 1;       // Never reuse field numbers
  string customer_id = 2;
  double total = 3;
  string currency = 4;       // Added in v2 - safe, optional in proto3
  string region_code = 5;    // Added in v2 - safe
  // NEVER: remove fields, change types, or reuse field numbers
}
```

## JSON Schema with Explicit Versioning

For JSON-based events in Dapr, use explicit versioning metadata:

```python
import dapr.clients as dapr
import json

CURRENT_SCHEMA_VERSION = "2.0"

def publish_order_event(order: dict):
    event = {
        "_schema": {
            "type": "OrderPlaced",
            "version": CURRENT_SCHEMA_VERSION,
            "producedBy": "order-service"
        },
        "orderId": order["id"],
        "customerId": order["customerId"],
        "total": order["total"],
        "currency": order.get("currency", "USD"),
        "regionCode": order.get("regionCode")
    }

    with dapr.DaprClient() as client:
        client.publish_event(
            pubsub_name="orders-pubsub",
            topic_name="OrderPlaced",
            data=json.dumps(event),
            data_content_type="application/json"
        )

def handle_order_event(event_data: dict):
    schema = event_data.get("_schema", {})
    version = schema.get("version", "1.0")

    if version == "1.0":
        return handle_v1_order(event_data)
    elif version == "2.0":
        return handle_v2_order(event_data)
    else:
        raise ValueError(f"Unsupported schema version: {version}")

def handle_v1_order(data: dict):
    print(f"Handling v1 order: {data['orderId']}")

def handle_v2_order(data: dict):
    region = data.get("regionCode", "UNKNOWN")
    print(f"Handling v2 order: {data['orderId']} from {region}")
```

## Testing Schema Compatibility in CI

```yaml
# .github/workflows/schema-check.yml
name: Schema Compatibility Check
on: [pull_request]

jobs:
  schema-compat:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Start Schema Registry
      run: |
        docker compose up -d schema-registry
        until curl -sf http://localhost:8081/subjects > /dev/null; do sleep 2; done
    - name: Check schema compatibility
      run: |
        # Register the baseline schema
        curl -sf -X POST http://localhost:8081/subjects/OrderPlaced-value/versions \
          -H "Content-Type: application/vnd.schemaregistry.v1+json" \
          -d @schemas/OrderPlaced-baseline.json
        # Check compatibility of the evolved schema against latest
        RESULT=$(curl -sf -X POST \
          http://localhost:8081/compatibility/subjects/OrderPlaced-value/versions/latest \
          -H "Content-Type: application/vnd.schemaregistry.v1+json" \
          -d @schemas/OrderPlaced-evolved.json)
        echo "$RESULT"
        echo "$RESULT" | jq -e '.is_compatible == true'
```

## Summary

Managing event schema evolution in Dapr systems requires combining technical tooling (Avro, Protobuf, or JSON Schema) with disciplined engineering practices (never remove fields, preserve field numbers). A schema registry provides a centralized governance point for compatibility checks before production deployment. Embedding schema version metadata in each event enables consumer-side routing to version-specific handlers during migration periods.
