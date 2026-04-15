# How to Build an SQS to ClickHouse Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQS, AWS, Pipeline, Streaming

Description: Build a reliable SQS to ClickHouse ingestion pipeline using the S3Queue engine or a custom consumer to ingest messages from Amazon SQS at scale.

---

Amazon SQS is a popular message queue for event-driven AWS architectures. Ingesting SQS messages into ClickHouse requires a consumer application since ClickHouse does not have a native SQS table engine. This guide shows how to build a reliable pipeline using a lightweight consumer service.

## Architecture

```text
SQS Queue
    |
    v
Consumer Service (Python/Go)
    |-- Batch receive messages
    |-- Transform/validate
    |-- Batch insert to ClickHouse
    |-- Delete messages from SQS
```

## Python Consumer Implementation

```python
import os
import boto3
import json
import clickhouse_connect
from typing import List

sqs = boto3.client('sqs', region_name='us-east-1')
ch = clickhouse_connect.get_client(
    host='clickhouse.internal',
    port=8443,
    secure=True,
    username='etl_service',
    password=os.environ['CLICKHOUSE_PASSWORD']
)

QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789/events-queue'
BATCH_SIZE = 10  # SQS max per receive

def process_batch(messages: List[dict]) -> List[list]:
    rows = []
    for msg in messages:
        try:
            body = json.loads(msg['Body'])
            rows.append([
                body['timestamp'],
                int(body['user_id']),
                body['event_type'],
                json.dumps(body.get('data', {}))
            ])
        except (KeyError, ValueError, json.JSONDecodeError):
            # Log malformed message, don't re-queue
            pass
    return rows

def insert_to_clickhouse(rows: List[list]):
    if not rows:
        return
    ch.insert('events', rows, column_names=['event_time', 'user_id', 'event_type', 'payload'])

def delete_messages(messages: List[dict]):
    for i in range(0, len(messages), 10):
        batch = messages[i:i + 10]
        entries = [
            {'Id': str(j), 'ReceiptHandle': msg['ReceiptHandle']}
            for j, msg in enumerate(batch)
        ]
        sqs.delete_message_batch(QueueUrl=QUEUE_URL, Entries=entries)

def run_consumer():
    while True:
        response = sqs.receive_message(
            QueueUrl=QUEUE_URL,
            MaxNumberOfMessages=BATCH_SIZE,
            WaitTimeSeconds=20  # Long polling
        )
        messages = response.get('Messages', [])
        if not messages:
            continue

        rows = process_batch(messages)
        insert_to_clickhouse(rows)
        delete_messages(messages)
```

## Batching for Efficiency

SQS's 10-message limit per receive call is too small for efficient ClickHouse inserts. Buffer multiple SQS batches before inserting:

```python
import time

BUFFER_MAX_SIZE = 10000
BUFFER_MAX_SECONDS = 5

buffer = []
last_flush = time.time()

def should_flush():
    return len(buffer) >= BUFFER_MAX_SIZE or \
           time.time() - last_flush >= BUFFER_MAX_SECONDS

while True:
    messages = receive_batch()
    buffer.extend(messages)

    if should_flush() and buffer:
        rows = process_batch(buffer)
        insert_to_clickhouse(rows)
        delete_messages(buffer)
        buffer.clear()
        last_flush = time.time()
```

## Using S3 as a Buffer

For high-throughput scenarios, route SQS messages to S3 via Kinesis Firehose, then use ClickHouse's S3Queue engine to ingest:

```sql
CREATE TABLE sqs_events_via_s3 (
    event_time DateTime,
    user_id UInt64,
    event_type String,
    payload String
) ENGINE = S3Queue(
    'https://s3.amazonaws.com/events-bucket/*.json',
    'JSONEachRow'
)
SETTINGS
    mode = 'ordered',
    s3queue_max_processed_files_before_commit = 100;
```

## Monitoring Queue Depth

```bash
# Check SQS queue depth
aws sqs get-queue-attributes \
    --queue-url "$QUEUE_URL" \
    --attribute-names ApproximateNumberOfMessages \
    ApproximateNumberOfMessagesNotVisible
```

Alert when `ApproximateNumberOfMessages` exceeds a threshold indicating consumer lag.

## Handling SQS Visibility Timeout

Set the visibility timeout to slightly longer than your maximum processing time:

```bash
# Set 60 second visibility timeout
aws sqs set-queue-attributes \
    --queue-url "$QUEUE_URL" \
    --attributes VisibilityTimeout=60
```

If processing takes longer than the timeout, the message becomes visible again and may be processed twice - design for idempotency in your ClickHouse table.

## Summary

An SQS to ClickHouse pipeline uses a consumer service that long-polls SQS, buffers messages into efficient batches of 5,000-50,000 rows, inserts to ClickHouse, and only then deletes messages from SQS. Use S3Queue as an alternative for very high-throughput scenarios where buffering through S3 is more efficient than polling SQS directly.
