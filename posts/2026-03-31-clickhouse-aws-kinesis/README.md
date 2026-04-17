# How to Use ClickHouse with AWS Kinesis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, AWS, Kinesis, Streaming, Data Engineering

Description: Learn how to ingest data from AWS Kinesis Data Streams into ClickHouse using Lambda, Kinesis Firehose, and custom consumer applications with the ClickHouse HTTP API.

---

> ClickHouse does not have a native Kinesis engine, but several patterns using Lambda, Firehose, and custom consumers make the integration straightforward.

AWS Kinesis is the managed streaming service at the core of many AWS data pipelines. While ClickHouse lacks a native Kinesis table engine, you can connect the two systems through several well-established patterns: Kinesis Data Firehose with an HTTP endpoint, Lambda consumers, or a dedicated Kinesis consumer application that writes to ClickHouse in bulk. This guide covers all three approaches.

---

## Architecture Overview

Choose the right pattern for your use case.

```text
Pattern 1: Firehose -> S3 -> ClickHouse S3 table function (batch, lowest cost)
Pattern 2: Kinesis -> Lambda -> ClickHouse HTTP API (low latency, serverless)
Pattern 3: Kinesis -> Consumer App -> ClickHouse HTTP (high throughput, full control)
```

## Setting Up the Kinesis Stream

Create the stream and put records to test with.

```bash
# Create a Kinesis stream with 4 shards
aws kinesis create-stream \
  --stream-name analytics-events \
  --shard-count 4 \
  --region us-east-1

# Wait for the stream to become active
aws kinesis wait stream-exists \
  --stream-name analytics-events \
  --region us-east-1

# Describe the stream
aws kinesis describe-stream-summary \
  --stream-name analytics-events \
  --region us-east-1

# Put a test record
aws kinesis put-record \
  --stream-name analytics-events \
  --partition-key "user-42" \
  --data '{"event_id":"abc123","user_id":42,"event_type":"page_view","ts":"2026-03-31T12:00:00Z"}' \
  --region us-east-1
```

## Creating the ClickHouse Table

Create the destination table for Kinesis data.

```sql
CREATE TABLE kinesis_events
(
    event_id    UUID,
    user_id     UInt64,
    event_type  LowCardinality(String),
    page        String,
    ts          DateTime64(3),
    shard_id    String,
    sequence_nr String,
    received_at DateTime DEFAULT now()
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (event_type, user_id, ts)
TTL received_at + INTERVAL 90 DAY;
```

## Pattern 1 - Kinesis Firehose to S3 then ClickHouse

Use Firehose to land data in S3 and query it with ClickHouse.

```bash
# Create a Firehose delivery stream to S3
aws firehose create-delivery-stream \
  --delivery-stream-name analytics-to-s3 \
  --delivery-stream-type KinesisStreamAsSource \
  --kinesis-stream-source-configuration \
    KinesisStreamARN=arn:aws:kinesis:us-east-1:123456789012:stream/analytics-events,\
RoleARN=arn:aws:iam::123456789012:role/firehose-role \
  --extended-s3-destination-configuration \
    RoleARN=arn:aws:iam::123456789012:role/firehose-role,\
BucketARN=arn:aws:s3:::my-analytics-bucket,\
Prefix=kinesis-events/dt=!{timestamp:yyyy-MM-dd}/,\
ErrorOutputPrefix=kinesis-errors/,\
BufferingHints={SizeInMBs=128,IntervalInSeconds=300},\
CompressionFormat=GZIP \
  --region us-east-1
```

```sql
-- Query S3 files landed by Firehose
SELECT
    JSONExtractString(raw, 'event_id')   AS event_id,
    JSONExtractUInt(raw, 'user_id')      AS user_id,
    JSONExtractString(raw, 'event_type') AS event_type,
    parseDateTimeBestEffort(
        JSONExtractString(raw, 'ts')
    )                                    AS ts
FROM s3(
    'https://my-analytics-bucket.s3.amazonaws.com/kinesis-events/dt=2026-03-31/*.gz',
    'ACCESS_KEY',
    'SECRET_KEY',
    'JSONAsString',
    'raw String'
)
LIMIT 100;

-- Insert from S3 into the main table
INSERT INTO kinesis_events
SELECT
    toUUID(JSONExtractString(raw, 'event_id'))   AS event_id,
    JSONExtractUInt(raw, 'user_id')              AS user_id,
    JSONExtractString(raw, 'event_type')         AS event_type,
    JSONExtractString(raw, 'page')               AS page,
    parseDateTimeBestEffort(
        JSONExtractString(raw, 'ts')
    )                                            AS ts,
    ''                                           AS shard_id,
    ''                                           AS sequence_nr
FROM s3(
    'https://my-analytics-bucket.s3.amazonaws.com/kinesis-events/dt=2026-03-31/*.gz',
    'ACCESS_KEY',
    'SECRET_KEY',
    'JSONAsString',
    'raw String'
);
```

## Pattern 2 - Lambda Consumer

Write a Lambda function that consumes Kinesis records and POSTs to ClickHouse.

```python
import json
import base64
import urllib.request
import urllib.parse

CLICKHOUSE_URL  = "https://clickhouse.example.com:8443"
CLICKHOUSE_DB   = "default"
CLICKHOUSE_USER = "default"
CLICKHOUSE_PASS = "password"

def lambda_handler(event, context):
    rows = []

    for record in event['Records']:
        payload = base64.b64decode(record['kinesis']['data']).decode('utf-8')
        try:
            data = json.loads(payload)
            rows.append({
                'event_id':    data.get('event_id', ''),
                'user_id':     int(data.get('user_id', 0)),
                'event_type':  data.get('event_type', ''),
                'page':        data.get('page', ''),
                'ts':          data.get('ts', ''),
                'shard_id':    record['kinesis']['partitionKey'],
                'sequence_nr': record['kinesis']['sequenceNumber']
            })
        except (json.JSONDecodeError, ValueError):
            print(f"Bad record: {payload[:200]}")
            continue

    if not rows:
        return {'statusCode': 200, 'body': 'No valid records'}

    # Build the INSERT query
    ndjson = '\n'.join(json.dumps(r) for r in rows)
    query  = (
        f"INSERT INTO kinesis_events "
        f"(event_id, user_id, event_type, page, ts, shard_id, sequence_nr) "
        f"FORMAT JSONEachRow"
    )

    url  = f"{CLICKHOUSE_URL}/?query={urllib.parse.quote(query)}"
    auth = base64.b64encode(
        f"{CLICKHOUSE_USER}:{CLICKHOUSE_PASS}".encode()
    ).decode()

    req = urllib.request.Request(
        url,
        data=ndjson.encode(),
        headers={
            'Authorization': f'Basic {auth}',
            'Content-Type':  'application/x-ndjson',
            'X-ClickHouse-Database': CLICKHOUSE_DB
        },
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        if resp.status != 200:
            raise RuntimeError(f"ClickHouse returned {resp.status}")

    print(f"Inserted {len(rows)} rows")
    return {'statusCode': 200, 'body': f'Inserted {len(rows)} rows'}
```

```bash
# Create the Lambda function
aws lambda create-function \
  --function-name kinesis-to-clickhouse \
  --runtime python3.12 \
  --role arn:aws:iam::123456789012:role/lambda-kinesis-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://function.zip \
  --timeout 60 \
  --memory-size 256

# Add Kinesis trigger
aws lambda create-event-source-mapping \
  --function-name kinesis-to-clickhouse \
  --event-source-arn arn:aws:kinesis:us-east-1:123456789012:stream/analytics-events \
  --batch-size 500 \
  --starting-position LATEST \
  --bisect-batch-on-function-error \
  --maximum-retry-attempts 3
```

## Pattern 3 - Dedicated Consumer Application

For high throughput, use the Kinesis SDK directly with bulk inserts.

```python
import boto3
import json
import time
import clickhouse_connect

kinesis    = boto3.client('kinesis', region_name='us-east-1')
ch_client  = clickhouse_connect.get_client(
    host='localhost', port=8123,
    username='default', password='password'
)

STREAM_NAME = 'analytics-events'
BATCH_SIZE  = 10000


def get_shard_iterators():
    stream = kinesis.describe_stream(StreamName=STREAM_NAME)
    shards = stream['StreamDescription']['Shards']
    iterators = []
    for shard in shards:
        resp = kinesis.get_shard_iterator(
            StreamName=STREAM_NAME,
            ShardId=shard['ShardId'],
            ShardIteratorType='LATEST'
        )
        iterators.append(resp['ShardIterator'])
    return iterators


def consume_and_insert():
    iterators = get_shard_iterators()
    buffer = []

    while True:
        new_iterators = []
        for iterator in iterators:
            resp = kinesis.get_records(ShardIterator=iterator, Limit=1000)
            for record in resp['Records']:
                try:
                    data = json.loads(record['Data'])
                    buffer.append([
                        data.get('event_id', ''),
                        int(data.get('user_id', 0)),
                        data.get('event_type', ''),
                        data.get('page', ''),
                        data.get('ts', ''),
                        record['PartitionKey'],
                        record['SequenceNumber']
                    ])
                except (json.JSONDecodeError, ValueError):
                    pass

            next_it = resp.get('NextShardIterator')
            if next_it:
                new_iterators.append(next_it)

        if len(buffer) >= BATCH_SIZE:
            ch_client.insert(
                'kinesis_events',
                buffer,
                column_names=[
                    'event_id', 'user_id', 'event_type',
                    'page', 'ts', 'shard_id', 'sequence_nr'
                ]
            )
            print(f'Inserted {len(buffer)} rows')
            buffer.clear()

        iterators = new_iterators
        time.sleep(0.5)


if __name__ == '__main__':
    consume_and_insert()
```

## Querying Kinesis Data in ClickHouse

Analyze events after they arrive.

```sql
-- Event volume by type over the last hour
SELECT
    event_type,
    count()               AS total,
    count(DISTINCT user_id) AS unique_users
FROM kinesis_events
WHERE received_at >= now() - INTERVAL 1 HOUR
GROUP BY event_type
ORDER BY total DESC;

-- Shard distribution (to spot hot shards)
SELECT
    shard_id,
    count() AS messages,
    min(ts)  AS first_ts,
    max(ts)  AS last_ts
FROM kinesis_events
WHERE received_at >= now() - INTERVAL 1 HOUR
GROUP BY shard_id
ORDER BY messages DESC;
```

## Summary

Connecting ClickHouse to Kinesis requires choosing the right pattern for your latency and throughput requirements. Firehose-to-S3 is the lowest-cost batch approach. Lambda is ideal for low-latency serverless ingestion with moderate throughput. A dedicated consumer application using the Python KCL or direct GetRecords calls gives the highest throughput and full control. In all cases, write to ClickHouse in bulk using INSERT with batches of thousands of rows to maximize efficiency.
