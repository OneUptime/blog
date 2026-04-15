# How to Stream Data from Google Pub/Sub to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Google Pub/Sub, GCP, Streaming, Data Pipeline, Integration

Description: Stream messages from Google Cloud Pub/Sub into ClickHouse using a subscriber application or via Pub/Sub to Kafka bridge.

---

Google Cloud Pub/Sub is a fully-managed messaging service. Streaming Pub/Sub data into ClickHouse requires a subscriber application, since ClickHouse does not natively support Pub/Sub. This guide covers three practical approaches.

## Option 1: Python Subscriber with Batch Inserts

The most direct approach is a Python subscriber that buffers messages and inserts them into ClickHouse in batches:

```python
from google.cloud import pubsub_v1
import clickhouse_driver
import json

project_id = "my-gcp-project"
subscription_id = "events-sub"

subscriber = pubsub_v1.SubscriberClient()
subscription_path = subscriber.subscription_path(project_id, subscription_id)

ch_client = clickhouse_driver.Client(host='localhost')
buffer = []

def callback(message):
    data = json.loads(message.data.decode('utf-8'))
    buffer.append({
        'event_time': data['timestamp'],
        'event_type': data['type'],
        'user_id': int(data['user_id'])
    })
    message.ack()

    if len(buffer) >= 1000:
        ch_client.execute('INSERT INTO events (event_time, event_type, user_id) VALUES', buffer)
        buffer.clear()

streaming_pull_future = subscriber.subscribe(subscription_path, callback=callback)
streaming_pull_future.result()
```

Create the target table:

```sql
CREATE TABLE events (
    event_time DateTime,
    event_type LowCardinality(String),
    user_id UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_type, event_time);
```

## Option 2: Pub/Sub to Kafka Bridge

If you use Kafka elsewhere, route Pub/Sub through a Kafka sink connector and use the ClickHouse Kafka engine:

```bash
# Deploy Pub/Sub to Kafka connector
gcloud pubsub subscriptions create kafka-bridge-sub \
  --topic=events \
  --push-endpoint=http://kafka-bridge/
```

Then configure the Kafka engine in ClickHouse:

```sql
CREATE TABLE pubsub_events_queue (
    event_time DateTime,
    event_type String,
    user_id UInt32
) ENGINE = Kafka()
SETTINGS
    kafka_broker_list = 'kafka-broker:9092',
    kafka_topic_list = 'pubsub-events',
    kafka_group_name = 'clickhouse-consumer',
    kafka_format = 'JSONEachRow';

CREATE MATERIALIZED VIEW pubsub_to_events TO events AS
SELECT * FROM pubsub_events_queue;
```

## Option 3: Dataflow Pipeline

For high-scale GCP deployments, use a Dataflow pipeline to read from Pub/Sub and write to ClickHouse:

```python
import json
import apache_beam as beam
from apache_beam.io.gcp.pubsub import ReadFromPubSub
import requests

class WriteToClickHouse(beam.DoFn):
    def __init__(self, clickhouse_url):
        self.clickhouse_url = clickhouse_url

    def process(self, element):
        row = f"{element['timestamp']}\t{element['type']}\t{element['user_id']}"
        requests.post(
            f"{self.clickhouse_url}/?query=INSERT+INTO+events+FORMAT+TabSeparated",
            data=row
        )

with beam.Pipeline(runner='DataflowRunner') as p:
    (p
     | 'Read from Pub/Sub' >> ReadFromPubSub(subscription='projects/my-project/subscriptions/events-sub')
     | 'Parse JSON' >> beam.Map(json.loads)
     | 'Write to ClickHouse' >> beam.ParDo(WriteToClickHouse('http://clickhouse:8123'))
    )
```

## Dead Letter Queue Handling

For messages that fail to insert, push them to a dead letter topic:

```sql
-- Check for insertion errors
SELECT *
FROM system.query_log
WHERE type = 'ExceptionWhileProcessing'
  AND event_time > now() - INTERVAL 1 HOUR
ORDER BY event_time DESC;
```

## Monitor Pub/Sub Lag

```bash
gcloud pubsub subscriptions describe events-sub --format="value(pushConfig,ackDeadlineSeconds)"
```

## Summary

Google Pub/Sub integration with ClickHouse is best accomplished via a Python subscriber with batched inserts for simplicity, a Kafka bridge for Kafka-centric architectures, or a Dataflow pipeline for high-throughput GCP-native deployments. Buffer messages before inserting to maximize ClickHouse write efficiency.
