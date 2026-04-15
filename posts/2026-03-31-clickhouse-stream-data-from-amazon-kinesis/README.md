# How to Stream Data from Amazon Kinesis to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Amazon Kinesis, AWS, Streaming, Data Pipeline, Lambda

Description: Stream records from Amazon Kinesis Data Streams into ClickHouse using Lambda, Firehose, or a dedicated consumer application.

---

Amazon Kinesis Data Streams is a real-time streaming service on AWS. Getting data from Kinesis into ClickHouse requires a consumer application, since ClickHouse does not have a native Kinesis engine. This guide covers three approaches.

## Option 1: Kinesis Firehose to S3 to ClickHouse

The simplest path is to use Amazon Data Firehose to write data to S3, then read it into ClickHouse using the S3 table function:

```sql
-- Read latest Parquet files from S3
SELECT *
FROM s3(
    'https://s3.amazonaws.com/my-bucket/kinesis-output/2025/01/01/*.parquet',
    'ACCESS_KEY', 'SECRET_KEY',
    'Parquet'
)
LIMIT 100;

-- Load into ClickHouse table
INSERT INTO events
SELECT
    toDateTime(event_time) AS event_time,
    event_type,
    user_id
FROM s3(
    'https://s3.amazonaws.com/my-bucket/kinesis-output/2025/01/01/*.parquet',
    'ACCESS_KEY', 'SECRET_KEY',
    'Parquet'
);
```

## Option 2: AWS Lambda Consumer

Deploy a Lambda function triggered by Kinesis to forward records to ClickHouse:

```python
import base64
import json
import urllib.request

CLICKHOUSE_URL = "http://clickhouse-host:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow"

def lambda_handler(event, context):
    rows = []
    for record in event['Records']:
        payload = base64.b64decode(record['kinesis']['data']).decode('utf-8')
        rows.append(json.loads(payload))

    if rows:
        body = '\n'.join(json.dumps(r) for r in rows)
        req = urllib.request.Request(CLICKHOUSE_URL, data=body.encode())
        urllib.request.urlopen(req)

    return {'statusCode': 200}
```

## Option 3: Dedicated Consumer with KCL

Use the Kinesis Client Library (KCL) for a robust consumer with checkpointing:

```python
from amazon_kclpy import kcl
import json
import clickhouse_driver

class EventsProcessor(kcl.RecordProcessorBase):
    def __init__(self):
        self.ch = clickhouse_driver.Client(host='localhost')
        self.buffer = []

    def process_records(self, process_records_input):
        for record in process_records_input.records:
            data = json.loads(record.binary_data.decode())
            self.buffer.append(data)

        if len(self.buffer) >= 500:
            self.ch.execute('INSERT INTO events VALUES', self.buffer)
            self.buffer = []
            process_records_input.checkpointer.checkpoint()
```

## Kinesis to Kafka via MSK

If you already use Amazon MSK (Managed Kafka), route Kinesis events through a Kinesis-to-Kafka bridge and then use the ClickHouse Kafka engine:

```bash
# Use Kafka Connect Kinesis source connector
kafka-topics --create --topic kinesis-events --bootstrap-server msk-broker:9092
```

```sql
CREATE TABLE kinesis_events_queue (
    data String
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'msk-broker:9092',
    kafka_topic_list = 'kinesis-events',
    kafka_group_name = 'clickhouse-group',
    kafka_format = 'JSONEachRow';
```

## Monitor Ingestion

Check ingestion lag and errors in ClickHouse:

```sql
SELECT
    event_time,
    query,
    read_rows,
    written_rows
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query LIKE '%INSERT INTO events%'
ORDER BY event_time DESC
LIMIT 10;
```

## Summary

Kinesis-to-ClickHouse integration works through Firehose with S3 staging for batch loads, Lambda for serverless micro-batch processing, or a dedicated KCL consumer for low-latency streaming. The Kinesis-to-Kafka bridge via MSK is a good option if you want to reuse the native ClickHouse Kafka engine.
