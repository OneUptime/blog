# How to Implement ETL Pipelines with Dapr Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, ETL, Binding, Data Pipeline, Integration

Description: Learn how to build ETL pipelines using Dapr input and output bindings to extract from sources, transform data, and load to destinations.

---

ETL (Extract, Transform, Load) pipelines move data between systems - from databases to data warehouses, from files to APIs, or from message queues to storage. Dapr bindings abstract the connector layer, letting you focus on transformation logic while Dapr handles protocol-specific communication.

## ETL Architecture with Dapr Bindings

```text
Source System -> Input Binding -> Transform Service -> Output Binding -> Target System
  (Kafka, S3,                                                           (PostgreSQL,
   MySQL CDC,                                                            Redis, S3,
   HTTP webhook)                                                         BigQuery)
```

## Configure Input Binding (Extract)

Extract from a Kafka topic:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: source-kafka
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
  - name: topics
    value: raw-events
  - name: consumerGroup
    value: etl-pipeline
  - name: initialOffset
    value: oldest
```

## Configure Output Binding (Load)

Write to PostgreSQL:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: target-postgres
spec:
  type: bindings.postgresql
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: db-secrets
      key: postgres-url
```

## Transform Service

The transform service receives data from the input binding, applies business logic, and writes to the output binding:

```python
from flask import Flask, request, jsonify
from dapr.clients import DaprClient
import json
import base64

app = Flask(__name__)

@app.route('/source-kafka', methods=['POST'])
def handle_extract():
    binding_data = request.json

    # Decode base64 if needed
    raw = binding_data.get('data', '')
    if isinstance(raw, str):
        try:
            decoded = base64.b64decode(raw).decode('utf-8')
            event = json.loads(decoded)
        except Exception:
            event = json.loads(raw)
    else:
        event = raw

    # Transform
    transformed = transform_event(event)

    if transformed is None:
        return '', 200  # Skip this record

    # Load to target
    with DaprClient() as client:
        client.invoke_binding(
            binding_name='target-postgres',
            operation='exec',
            binding_metadata={
                "sql": "INSERT INTO events (id, type, payload, created_at) VALUES ($1, $2, $3, $4)",
                "params": json.dumps([
                    transformed['id'],
                    transformed['type'],
                    json.dumps(transformed['payload']),
                    transformed['createdAt']
                ])
            }
        )

    return '', 200

def transform_event(event: dict):
    # Filter out test events
    if event.get('source') == 'test':
        return None

    return {
        'id': event['eventId'],
        'type': event['type'].lower().replace(' ', '_'),
        'payload': {
            k: v for k, v in event.items()
            if k not in ('eventId', 'type', 'source', 'rawTimestamp')
        },
        'createdAt': event.get('rawTimestamp', '2026-03-31T00:00:00Z')
    }

app.run(port=5000)
```

## Multi-Destination Load

Write to multiple targets using multiple output bindings:

```python
with DaprClient() as client:
    # Primary: PostgreSQL
    client.invoke_binding('target-postgres', 'exec', sql_data)

    # Secondary: Redis cache for recent events
    client.invoke_binding(
        binding_name='target-redis',
        operation='create',
        data=json.dumps(transformed),
        binding_metadata={
            "key": f"event:{transformed['id']}"
        }
    )

    # Audit: S3 archive
    client.invoke_binding(
        binding_name='target-s3',
        operation='create',
        data=json.dumps(transformed),
        binding_metadata={
            "key": f"events/{transformed['createdAt'][:10]}/{transformed['id']}.json"
        }
    )
```

## Add Data Quality Checks

```python
def validate_transformed(record: dict) -> list:
    errors = []
    if not record.get('id'):
        errors.append("Missing id")
    if record.get('type') not in VALID_EVENT_TYPES:
        errors.append(f"Unknown type: {record.get('type')}")
    return errors
```

## Summary

Dapr bindings simplify ETL pipelines by abstracting source and destination connectivity behind a uniform API. Input bindings trigger your transform service when new data arrives from Kafka, cron schedules, or HTTP webhooks. Output bindings write results to any target system with a single API call. The transform service owns only the business logic - mapping, filtering, and enrichment - while Dapr handles all protocol-specific communication.
