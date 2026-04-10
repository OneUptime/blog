# How to Stream Redis Data to Apache Druid

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Apache Druid, Streaming, Analytics, Real-Time

Description: Stream time-series events from Redis Streams to Apache Druid for real-time OLAP analytics, using a Kafka bridge or a custom ingestion connector.

---

Apache Druid is a real-time analytics database optimized for time-series data and fast OLAP queries. Redis Streams capture high-velocity events in real time, but Druid is where you analyze them at scale. Bridging Redis to Druid enables sub-second analytics over freshly ingested data.

## Architecture

```text
Redis Stream (events:raw)
        |
   Bridge Consumer
  (Redis -> Kafka)
        |
  Apache Kafka Topic
        |
  Druid Kafka Ingestion
        |
   Druid Datasource
        |
  Analytics Queries
```

## Option 1: Redis to Kafka Bridge

The most reliable path uses Kafka as an intermediate:

```python
import redis
import json
from kafka import KafkaProducer

r = redis.Redis(host="redis.internal", port=6379, decode_responses=True)
producer = KafkaProducer(
    bootstrap_servers=["kafka:9092"],
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
    acks="all",
    linger_ms=5,
    batch_size=65536,
)

def bridge_redis_to_kafka(stream: str, group: str, consumer: str, topic: str):
    # Create consumer group if not exists
    try:
        r.xgroup_create(stream, group, id="0", mkstream=True)
    except redis.ResponseError:
        pass  # Group already exists

    last_id = ">"
    while True:
        results = r.xreadgroup(
            groupname=group,
            consumername=consumer,
            streams={stream: last_id},
            count=500,
            block=1000,
        )
        for stream_name, messages in results:
            for msg_id, data in messages:
                event = json.loads(data.get("data", "{}"))
                event["_redis_msg_id"] = msg_id
                producer.send(topic, value=event)
                r.xack(stream_name, group, msg_id)

        producer.flush()

bridge_redis_to_kafka("events:raw", "druid-bridge", "bridge-1", "druid-events")
```

## Configuring Druid Kafka Ingestion

Create a Druid ingestion spec:

```json
{
  "type": "kafka",
  "spec": {
    "dataSchema": {
      "dataSource": "redis_events",
      "timestampSpec": {
        "column": "timestamp",
        "format": "iso"
      },
      "dimensionsSpec": {
        "dimensions": ["user_id", "action", "url", "country"]
      },
      "metricsSpec": [
        {"type": "count", "name": "event_count"}
      ],
      "granularitySpec": {
        "type": "uniform",
        "segmentGranularity": "HOUR",
        "queryGranularity": "MINUTE"
      }
    },
    "ioConfig": {
      "type": "kafka",
      "consumerProperties": {
        "bootstrap.servers": "kafka:9092"
      },
      "topic": "druid-events",
      "inputFormat": {
        "type": "json"
      }
    },
    "tuningConfig": {
      "type": "kafka",
      "maxRowsInMemory": 100000,
      "maxRowsPerSegment": 5000000
    }
  }
}
```

Submit to Druid:

```bash
curl -X POST http://druid-overlord:8090/druid/indexer/v1/supervisor \
  -H "Content-Type: application/json" \
  -d @druid-kafka-spec.json
```

## Option 2: Direct Redis to Druid (Polling)

For simpler setups without Kafka, poll Redis and push to Druid's HTTP endpoint:

```python
import json
import requests

def push_batch_to_druid(events: list):
    # Druid HTTP input source for batch ingestion
    payload = {
        "type": "index_parallel",
        "spec": {
            "dataSchema": {
                "dataSource": "redis_events",
                "timestampSpec": {
                    "column": "timestamp",
                    "format": "iso"
                },
                "dimensionsSpec": {
                    "dimensions": ["user_id", "action", "url", "country"]
                },
                "granularitySpec": {
                    "type": "uniform",
                    "segmentGranularity": "HOUR",
                    "queryGranularity": "MINUTE"
                }
            },
            "ioConfig": {
                "type": "index_parallel",
                "inputSource": {
                    "type": "inline",
                    "data": "\n".join(json.dumps(e) for e in events)
                },
                "inputFormat": {"type": "json"}
            },
            "tuningConfig": {
                "type": "index_parallel"
            }
        }
    }
    response = requests.post(
        "http://druid-overlord:8090/druid/indexer/v1/task",
        json=payload
    )
    return response.json()
```

## Querying Real-Time Data in Druid

```sql
SELECT
  TIME_FLOOR(__time, 'PT1M') AS minute,
  action,
  COUNT(*) AS event_count
FROM redis_events
WHERE __time >= CURRENT_TIMESTAMP - INTERVAL '1' HOUR
GROUP BY 1, 2
ORDER BY 1 DESC
```

## Summary

Bridging Redis Streams to Apache Druid enables real-time OLAP analytics over freshly captured event data. The recommended path routes events through Kafka as an intermediate, using Druid's Kafka supervisor for reliable, scalable ingestion. For lower-volume use cases, direct polling from Redis to Druid's HTTP endpoint avoids the Kafka dependency while still delivering near-real-time analytics.
