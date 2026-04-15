# How to Sync DynamoDB Data to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, DynamoDB, AWS, Sync, DynamoDB Streams, Data Pipeline

Description: Sync DynamoDB tables to ClickHouse using DynamoDB Streams, Lambda, or AWS Glue for real-time and batch analytics pipelines.

---

Amazon DynamoDB is a fully-managed NoSQL database. Syncing DynamoDB data to ClickHouse enables SQL-based analytics and aggregations that are impractical or expensive in DynamoDB itself.

## Option 1: DynamoDB Streams with Lambda

Enable DynamoDB Streams on your table:

```bash
aws dynamodb update-table \
  --table-name orders \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES
```

Deploy a Lambda function triggered by the stream:

```python
import boto3
import json
import urllib.request
from decimal import Decimal

def lambda_handler(event, context):
    rows = []
    for record in event['Records']:
        if record['eventName'] in ('INSERT', 'MODIFY'):
            item = boto3.dynamodb.types.TypeDeserializer().deserialize(
                {'M': record['dynamodb']['NewImage']}
            )
            rows.append({
                'order_id': item.get('order_id', ''),
                'user_id': int(item.get('user_id', 0)),
                'status': item.get('status', ''),
                'total': float(item.get('total', 0)),
                'created_at': item.get('created_at', '')
            })

    if rows:
        body = '\n'.join(json.dumps(r, default=str) for r in rows)
        url = "http://clickhouse-host:8123/?query=INSERT+INTO+orders+FORMAT+JSONEachRow"
        req = urllib.request.Request(url, data=body.encode())
        urllib.request.urlopen(req)

    return {'statusCode': 200}
```

## Option 2: DynamoDB Streams via Kinesis to ClickHouse

Route DynamoDB Streams through Kinesis for better scalability:

```bash
aws dynamodb enable-kinesis-streaming-destination \
  --table-name orders \
  --stream-arn arn:aws:kinesis:us-east-1:123456789:stream/orders-stream
```

Then use a Kinesis consumer Lambda or Kinesis Firehose to forward to ClickHouse.

## Option 3: AWS Glue Batch Export

Use AWS Glue to export DynamoDB tables to S3, then load into ClickHouse:

```python
# Glue job
datasource = glueContext.create_dynamic_frame.from_catalog(
    database="dynamodb_tables",
    table_name="orders"
)

datasource.toDF().write.parquet("s3://my-bucket/exports/orders/")
```

Then load from S3:

```sql
INSERT INTO orders
SELECT *
FROM s3('https://s3.amazonaws.com/my-bucket/exports/orders/*.parquet', 'ACCESS_KEY', 'SECRET_KEY', 'Parquet');
```

## Create the ClickHouse Target Table

```sql
CREATE TABLE orders (
    order_id String,
    user_id UInt32,
    status LowCardinality(String),
    total Decimal(18, 4),
    created_at DateTime,
    _deleted UInt8 DEFAULT 0
) ENGINE = ReplacingMergeTree()
ORDER BY order_id
PARTITION BY toYYYYMM(created_at);
```

## Handle DynamoDB Deletes

DynamoDB Streams include delete events. Mark deleted records in ClickHouse:

```python
elif record['eventName'] == 'REMOVE':
    old_item = boto3.dynamodb.types.TypeDeserializer().deserialize(
        {'M': record['dynamodb']['OldImage']}
    )
    rows.append({
        'order_id': old_item.get('order_id', ''),
        'user_id': int(old_item.get('user_id', 0)),
        'status': old_item.get('status', ''),
        'total': float(old_item.get('total', 0)),
        'created_at': old_item.get('created_at', ''),
        '_deleted': 1
    })
```

Query with delete filtering:

```sql
SELECT *
FROM orders
FINAL
WHERE _deleted = 0
  AND created_at >= today() - 30
LIMIT 100;
```

## Summary

DynamoDB data syncs to ClickHouse via Lambda consumers on DynamoDB Streams for real-time pipelines, Kinesis routing for scalable event delivery, or Glue batch exports for large initial loads. Use `ReplacingMergeTree` to handle upserts and deletes, and query with `FINAL` for accurate analytical results.
