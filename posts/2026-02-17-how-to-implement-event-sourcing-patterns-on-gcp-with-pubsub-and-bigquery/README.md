# How to Implement Event Sourcing Patterns on GCP with Pub/Sub and BigQuery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, BigQuery, Event Sourcing, Event-Driven Architecture

Description: Learn how to implement event sourcing patterns on Google Cloud Platform using Pub/Sub for event ingestion and BigQuery for persistent event storage and replay.

---

Event sourcing is one of those architectural patterns that sounds complicated until you actually build it. Instead of storing the current state of your data, you store every change as an immutable event. Need to know the state at any point in time? Just replay the events up to that moment. On GCP, Pub/Sub and BigQuery form a natural pairing for this pattern - Pub/Sub handles the real-time event flow while BigQuery stores the complete event history.

I have been working with event sourcing on GCP for a while now, and the combination works surprisingly well. Let me walk you through how to set it up properly.

## Why Event Sourcing on GCP

Traditional CRUD systems overwrite data. When you update a user's email address, the old one is gone. Event sourcing keeps everything - "UserCreated", "EmailUpdated", "ProfilePhotoChanged" - as separate, timestamped records. This gives you a complete audit trail, the ability to rebuild state at any point in time, and natural compatibility with event-driven microservices.

GCP fits this pattern well because Pub/Sub already acts as a durable message bus with at-least-once delivery, and BigQuery can handle petabytes of append-only event data without breaking a sweat.

## Designing Your Event Schema

Before writing any code, define a consistent event structure. Every event should carry enough context to be self-describing.

Here is a sample event schema that works well in practice:

```json
{
  "event_id": "evt_abc123",
  "event_type": "OrderPlaced",
  "aggregate_type": "Order",
  "aggregate_id": "order_456",
  "version": 1,
  "timestamp": "2026-02-17T10:30:00Z",
  "data": {
    "customer_id": "cust_789",
    "items": [
      {"product_id": "prod_001", "quantity": 2, "price": 29.99}
    ],
    "total": 59.98
  },
  "metadata": {
    "correlation_id": "req_xyz",
    "caused_by": "user_action",
    "source_service": "order-service"
  }
}
```

The `aggregate_id` and `version` fields are critical. They let you reconstruct the state of any single entity by replaying its events in order.

## Setting Up the Pub/Sub Event Bus

First, create the Pub/Sub topic and subscription for your events.

```bash
# Create the main event topic
gcloud pubsub topics create domain-events

# Create a subscription for the BigQuery sink
gcloud pubsub subscriptions create domain-events-bq-sub \
  --topic=domain-events \
  --ack-deadline=60

# Create a subscription for real-time consumers
gcloud pubsub subscriptions create domain-events-processor-sub \
  --topic=domain-events \
  --ack-deadline=30 \
  --enable-message-ordering \
  --message-filter='attributes.aggregate_type="Order"'
```

Message ordering is important here. When you enable it and use the `aggregate_id` as the ordering key, Pub/Sub guarantees events for the same aggregate arrive in order.

## Publishing Events with Ordering Keys

Here is how to publish events from your application with proper ordering:

```python
from google.cloud import pubsub_v1
import json
import uuid
from datetime import datetime

# Initialize publisher with batching settings tuned for event sourcing
publisher = pubsub_v1.PublisherClient(
    publisher_options=pubsub_v1.types.PublisherOptions(
        enable_message_ordering=True,
    ),
)
topic_path = publisher.topic_path("my-project", "domain-events")

def publish_event(aggregate_type, aggregate_id, event_type, data, version):
    """Publish a domain event to Pub/Sub with ordering guarantees."""
    event = {
        "event_id": str(uuid.uuid4()),
        "event_type": event_type,
        "aggregate_type": aggregate_type,
        "aggregate_id": aggregate_id,
        "version": version,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": data,
    }

    # Use aggregate_id as ordering key so events for the same
    # entity are delivered in sequence
    future = publisher.publish(
        topic_path,
        json.dumps(event).encode("utf-8"),
        ordering_key=aggregate_id,
        aggregate_type=aggregate_type,
        event_type=event_type,
    )
    return future.result()

# Example: publish an order placed event
publish_event(
    aggregate_type="Order",
    aggregate_id="order_456",
    event_type="OrderPlaced",
    data={"customer_id": "cust_789", "total": 59.98},
    version=1,
)
```

## Creating the BigQuery Event Store

Set up a BigQuery table that acts as your permanent event store. Partition by timestamp and cluster by aggregate type and ID for efficient queries.

```sql
-- Create a dataset for event sourcing
CREATE SCHEMA IF NOT EXISTS `my-project.event_store`;

-- Create the events table with partitioning and clustering
-- for efficient time-range and aggregate-specific queries
CREATE TABLE `my-project.event_store.events` (
  event_id STRING NOT NULL,
  event_type STRING NOT NULL,
  aggregate_type STRING NOT NULL,
  aggregate_id STRING NOT NULL,
  version INT64 NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  data JSON,
  metadata JSON,
  ingestion_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(timestamp)
CLUSTER BY aggregate_type, aggregate_id
OPTIONS (
  description='Immutable event store for domain events',
  require_partition_filter=true
);
```

## Streaming Events from Pub/Sub to BigQuery

Use a Dataflow pipeline or a Pub/Sub BigQuery subscription to stream events into BigQuery. The simplest approach is using a Pub/Sub BigQuery subscription directly.

```bash
# Create a BigQuery subscription that writes directly to the event store
gcloud pubsub subscriptions create domain-events-bq-direct \
  --topic=domain-events \
  --bigquery-table=my-project:event_store.events \
  --use-topic-schema \
  --write-metadata
```

For more control over the data transformation, use a Dataflow streaming pipeline:

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
import json

def parse_event(message):
    """Parse the Pub/Sub message into a BigQuery row."""
    event = json.loads(message.data.decode("utf-8"))
    return {
        "event_id": event["event_id"],
        "event_type": event["event_type"],
        "aggregate_type": event["aggregate_type"],
        "aggregate_id": event["aggregate_id"],
        "version": event["version"],
        "timestamp": event["timestamp"],
        "data": json.dumps(event.get("data", {})),
        "metadata": json.dumps(event.get("metadata", {})),
    }

# Build the streaming pipeline
options = PipelineOptions(
    streaming=True,
    project="my-project",
    region="us-central1",
    temp_location="gs://my-bucket/temp",
)

with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        | "ReadFromPubSub" >> beam.io.ReadFromPubSub(
            topic="projects/my-project/topics/domain-events"
        )
        | "ParseEvents" >> beam.Map(parse_event)
        | "WriteToBigQuery" >> beam.io.WriteToBigQuery(
            "my-project:event_store.events",
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
            insert_retry_strategy=beam.io.gcp.bigquery_tools.RetryStrategy.RETRY_ON_TRANSIENT_ERROR,
        )
    )
```

## Replaying Events to Rebuild State

The real power of event sourcing shows when you need to reconstruct state. Query BigQuery to replay events for any aggregate.

```sql
-- Reconstruct the full event history for a specific order
-- ordered by version to get the correct sequence
SELECT
  event_type,
  version,
  timestamp,
  JSON_VALUE(data, '$.total') AS order_total,
  JSON_VALUE(data, '$.status') AS order_status,
  data
FROM `my-project.event_store.events`
WHERE aggregate_type = 'Order'
  AND aggregate_id = 'order_456'
  AND timestamp >= '2026-01-01'
ORDER BY version ASC;
```

For building materialized views from events, use scheduled queries in BigQuery:

```sql
-- Create a materialized current-state view from events
-- This runs as a scheduled query to keep the view fresh
CREATE OR REPLACE TABLE `my-project.event_store.order_current_state` AS
WITH latest_events AS (
  SELECT
    aggregate_id,
    ARRAY_AGG(
      STRUCT(event_type, version, data, timestamp)
      ORDER BY version ASC
    ) AS event_history
  FROM `my-project.event_store.events`
  WHERE aggregate_type = 'Order'
    AND timestamp >= '2026-01-01'
  GROUP BY aggregate_id
)
SELECT
  aggregate_id AS order_id,
  event_history[SAFE_OFFSET(ARRAY_LENGTH(event_history) - 1)].event_type AS last_event,
  event_history[SAFE_OFFSET(0)].timestamp AS created_at,
  event_history[SAFE_OFFSET(ARRAY_LENGTH(event_history) - 1)].timestamp AS updated_at,
  ARRAY_LENGTH(event_history) AS total_events
FROM latest_events;
```

## Handling Idempotency and Deduplication

Since Pub/Sub provides at-least-once delivery, you need to handle duplicate events. BigQuery makes this straightforward with a deduplication query.

```sql
-- Deduplicate events using event_id as the unique key
-- Run this periodically to clean up any duplicates
MERGE `my-project.event_store.events` AS target
USING (
  SELECT event_id, MIN(ingestion_time) AS first_ingestion
  FROM `my-project.event_store.events`
  WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
  GROUP BY event_id
  HAVING COUNT(*) > 1
) AS dupes
ON target.event_id = dupes.event_id
  AND target.ingestion_time > dupes.first_ingestion
WHEN MATCHED THEN DELETE;
```

## Monitoring Your Event Store

Set up monitoring to track event throughput and detect anomalies:

```bash
# Create an alert policy for Pub/Sub message backlog
gcloud monitoring policies create \
  --display-name="Event backlog alert" \
  --condition-display-name="High unacked messages" \
  --condition-filter='resource.type="pubsub_subscription" AND metric.type="pubsub.googleapis.com/subscription/num_undelivered_messages"' \
  --condition-threshold-value=10000 \
  --condition-threshold-duration=300s
```

## Wrapping Up

Event sourcing on GCP with Pub/Sub and BigQuery gives you a scalable, cost-effective architecture. Pub/Sub handles the real-time fan-out to multiple consumers while BigQuery stores the complete event history for replay, analysis, and auditing. The key things to remember are: use ordering keys on Pub/Sub for per-aggregate ordering, partition your BigQuery event table by timestamp, and always plan for deduplication since at-least-once delivery means you will occasionally get duplicate events. Once the foundation is in place, adding new event consumers or building new projections from your event history becomes straightforward.
