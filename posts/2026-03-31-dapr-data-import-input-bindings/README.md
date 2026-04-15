# How to Implement Data Import with Dapr Input Bindings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Input Binding, Data Import, Integration, Microservice

Description: Learn how to trigger data imports from external sources like S3, Kafka, and HTTP webhooks using Dapr input bindings.

---

Data import workflows receive data from external systems - file uploads, message queue events, webhook callbacks - and process it into your application's data model. Dapr input bindings trigger your service when new data arrives from any configured source, replacing event-loop polling with push-based delivery.

## How Input Bindings Work

When data arrives on a configured source (a file in S3, a message on Kafka, a cron tick), Dapr calls a matching endpoint in your service:

```text
External Source -> Dapr Sidecar (Input Binding) -> POST /binding-name -> Your Service
```

Your service responds with 200 to acknowledge, or non-2xx to trigger retry.

## SQS Trigger for S3 File Imports

The S3 binding (`bindings.aws.s3`) is output-only and does not support input triggers. To react to new S3 file uploads, configure S3 event notifications to send to an SQS queue, then use a Dapr SQS input binding to receive those events:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-import
spec:
  type: bindings.aws.sqs
  version: v1
  metadata:
  - name: queueNameOrUrl
    value: s3-import-notifications
  - name: region
    value: us-east-1
  - name: direction
    value: input
```

Handle S3 file import events delivered via SQS:

```python
from flask import Flask, request
from dapr.clients import DaprClient
import boto3
import csv
import io
import json

app = Flask(__name__)

@app.route('/s3-import', methods=['POST'])
def handle_s3_import():
    event = request.json
    # Parse S3 event notification from SQS message
    s3_event = json.loads(event['data'])
    s3_record = s3_event['Records'][0]['s3']
    bucket = s3_record['bucket']['name']
    key = s3_record['object']['key']

    # Download and process the file
    s3 = boto3.client('s3')
    response = s3.get_object(Bucket=bucket, Key=key)
    content = response['Body'].read().decode('utf-8')

    records = parse_import_file(content, key)
    import_records(records)

    return '', 200

def parse_import_file(content: str, filename: str) -> list:
    if filename.endswith('.csv'):
        reader = csv.DictReader(io.StringIO(content))
        return list(reader)
    elif filename.endswith('.json'):
        return json.loads(content)
    else:
        raise ValueError(f"Unsupported format: {filename}")
```

## Kafka Input Binding for Stream Imports

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-import
spec:
  type: bindings.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
  - name: topics
    value: external-data-feed
  - name: consumerGroup
    value: data-importer
  - name: direction
    value: input
```

```python
@app.route('/kafka-import', methods=['POST'])
def handle_kafka_import():
    event = request.json
    record = json.loads(event['data'])

    # Upsert into local database
    upsert_record(record)

    # Publish to internal topic for downstream processing
    with DaprClient() as client:
        client.publish_event('pubsub', 'imported-records', record)

    return '', 200
```

## HTTP Webhook Import

Accept webhook callbacks from external partners. The HTTP binding (`bindings.http`) is output-only, so webhooks are received directly by your application's HTTP server without a Dapr binding component:

```python
@app.route('/webhook-import', methods=['POST'])
def handle_webhook():
    payload = request.json['data']

    # Validate webhook signature
    signature = request.headers.get('X-Hub-Signature-256', '')
    if not verify_signature(payload, signature):
        return 'Invalid signature', 403

    # Process webhook data
    process_webhook_event(payload)
    return '', 200
```

## Cron-Based File Import

Use a cron binding to poll for files periodically:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: import-cron
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 1h"  # Every hour
```

```python
@app.route('/import-cron', methods=['POST'])
def scheduled_import():
    # Check for new files to import
    pending_files = list_pending_import_files()

    for file_path in pending_files:
        process_import_file(file_path)
        mark_file_imported(file_path)

    return '', 200
```

## Track Import Status with Dapr State

```python
def import_records(records: list):
    with DaprClient() as client:
        import_id = generate_import_id()
        client.save_state('statestore', f'import:{import_id}', json.dumps({
            "status": "in_progress",
            "total": len(records),
            "processed": 0
        }))

        for i, record in enumerate(records):
            upsert_record(record)

            client.save_state('statestore', f'import:{import_id}', json.dumps({
                "status": "in_progress",
                "total": len(records),
                "processed": i + 1
            }))

        client.save_state('statestore', f'import:{import_id}', json.dumps({
            "status": "completed",
            "total": len(records),
            "processed": len(records)
        }))
```

## Summary

Dapr input bindings eliminate polling loops by pushing data arrival events directly to your service endpoint. Configure SQS, Kafka, or cron bindings to trigger your import handler automatically. Your handler focuses on parsing and loading logic while Dapr handles source connectivity and retry on failure. Track import progress in Dapr state for operational visibility.
