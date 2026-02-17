# How to Implement Late-Arriving Fact Handling in BigQuery Streaming Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Streaming, Late Data, Data Pipeline, Dataflow

Description: Learn practical strategies for handling late-arriving facts in BigQuery streaming pipelines, including deduplication, upsert patterns, and reconciliation approaches.

---

In a perfect world, data arrives in order and on time. In the real world, events show up late - sometimes minutes, sometimes hours, sometimes days. A mobile app buffers events while offline. A third-party API retries a webhook. A batch export from a partner system delivers yesterday's transactions this morning. If your pipeline assumes data arrives in order, late facts will either get dropped or corrupt your analytics.

This guide covers how to handle late-arriving facts in BigQuery streaming pipelines, with concrete patterns you can implement today.

## The Problem with Late Data

Consider an e-commerce analytics pipeline. Orders flow through Pub/Sub into Dataflow and land in BigQuery. Your daily revenue dashboard reads from BigQuery. On February 15th, a batch of orders from February 14th arrives because the payment processor had a temporary outage and replayed events.

If your pipeline simply appends these records, your February 15th metrics get inflated. If your pipeline deduplicates on order ID and ignores duplicates, the late records get dropped and your February 14th metrics are too low.

Neither outcome is acceptable. You need a strategy that correctly attributes late-arriving facts to the right time period.

## Strategy 1: Append-Only with Deduplication at Query Time

The simplest approach is to write everything to BigQuery and handle deduplication in your queries.

```sql
-- Deduplicated view that handles late-arriving facts
CREATE OR REPLACE VIEW `analytics.orders_deduped` AS
SELECT
  order_id,
  -- Use the LAST value based on processing time for mutable fields
  ARRAY_AGG(customer_id ORDER BY processed_at DESC LIMIT 1)[OFFSET(0)] AS customer_id,
  ARRAY_AGG(order_total ORDER BY processed_at DESC LIMIT 1)[OFFSET(0)] AS order_total,
  ARRAY_AGG(order_status ORDER BY processed_at DESC LIMIT 1)[OFFSET(0)] AS order_status,
  -- Use the FIRST value for immutable fields like creation time
  MIN(order_timestamp) AS order_timestamp,
  MAX(processed_at) AS last_updated,
  COUNT(*) AS version_count
FROM `analytics.orders_raw`
GROUP BY order_id
```

This approach has trade-offs:

**Pros:** Simple pipeline, no data loss, full audit trail
**Cons:** Higher query costs (scanning duplicates), more complex queries, eventual consistency

To manage costs, create a materialized view or scheduled query that deduplicates periodically:

```sql
-- Scheduled query that materializes deduplicated data daily
CREATE OR REPLACE TABLE `analytics.orders_current`
PARTITION BY DATE(order_timestamp)
CLUSTER BY customer_id
AS
SELECT
  order_id,
  ARRAY_AGG(o ORDER BY processed_at DESC LIMIT 1)[OFFSET(0)].*
FROM `analytics.orders_raw` o
GROUP BY order_id
```

## Strategy 2: MERGE (Upsert) Pattern

If you want the target table to always reflect the latest state, use BigQuery's MERGE statement via a staging pattern.

The pipeline writes incoming records to a staging table. A scheduled query then merges them into the main table.

```sql
-- Merge late-arriving facts into the main orders table
MERGE `analytics.orders` AS target
USING (
  -- Deduplicate the staging table itself first
  SELECT * FROM (
    SELECT *,
      ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY event_timestamp DESC) AS rn
    FROM `analytics.orders_staging`
    WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY)
  )
  WHERE rn = 1
) AS source
ON target.order_id = source.order_id
WHEN MATCHED AND source.event_timestamp > target.event_timestamp THEN
  UPDATE SET
    order_status = source.order_status,
    order_total = source.order_total,
    updated_at = source.event_timestamp
WHEN NOT MATCHED THEN
  INSERT (order_id, customer_id, order_total, order_status, order_timestamp, updated_at)
  VALUES (source.order_id, source.customer_id, source.order_total,
          source.order_status, source.order_timestamp, source.event_timestamp)
```

Schedule this to run every few minutes for near-real-time updates:

```bash
# Create a scheduled query for the merge operation
bq query --use_legacy_sql=false --schedule="every 5 minutes" \
  --display_name="Merge staging to orders" \
  --destination_table="" \
  "$(cat merge_orders.sql)"
```

## Strategy 3: Handle Late Data in Dataflow

Dataflow's windowing system has built-in support for late data through allowed lateness and accumulation modes.

```python
# Dataflow pipeline with late data handling
import apache_beam as beam
from apache_beam.transforms.window import FixedWindows
from apache_beam.transforms.trigger import (
    AfterWatermark,
    AfterProcessingTime,
    AccumulationMode,
    Repeatedly,
    AfterCount,
)

# Allow late data up to 24 hours after the window closes
windowed = (
    events
    | "Window" >> beam.WindowInto(
        FixedWindows(3600),  # 1-hour windows
        trigger=AfterWatermark(
            # Fire early results every 30 seconds
            early=AfterProcessingTime(30),
            # Fire again when late data arrives
            late=Repeatedly(AfterCount(1)),
        ),
        # ACCUMULATING mode means late firings include all data in the window
        accumulation_mode=AccumulationMode.ACCUMULATING,
        # Accept late data for up to 24 hours
        allowed_lateness=86400,
    )
)
```

With accumulating mode, each firing includes all data seen so far for that window. The downstream BigQuery write needs to handle this by replacing the previous result for that window:

```python
class WriteWithUpsert(beam.DoFn):
    """Write windowed aggregates to BigQuery using streaming buffer."""
    def process(self, element, window=beam.DoFn.WindowParam):
        window_start = window.start.to_utc_datetime().isoformat()
        window_end = window.end.to_utc_datetime().isoformat()

        key, aggregate = element

        row = {
            'window_key': f"{key}_{window_start}",
            'metric_key': key,
            'window_start': window_start,
            'window_end': window_end,
            'value': aggregate,
            'updated_at': datetime.utcnow().isoformat(),
        }
        yield row
```

## Strategy 4: Correction Events

For complex scenarios, emit correction events when late data changes previously published results.

```python
class EmitCorrections(beam.DoFn):
    """Compare new aggregates with previously published values."""
    def process(self, element, previous_values):
        key, new_value = element
        old_value = previous_values.get(key, None)

        if old_value is not None and old_value != new_value:
            # Emit a correction event
            correction = {
                'key': key,
                'old_value': old_value,
                'new_value': new_value,
                'correction_timestamp': datetime.utcnow().isoformat(),
                'delta': new_value - old_value,
            }
            yield beam.pvalue.TaggedOutput('corrections', correction)

        # Always emit the current value
        yield (key, new_value)
```

This is useful for financial systems where you need an audit trail of every change to a reported number.

## BigQuery Table Design for Late Data

How you design your BigQuery tables affects how well they handle late data.

### Use Event Time Partitioning

Partition on event time, not ingestion time. This ensures late-arriving data lands in the correct partition.

```sql
-- Table partitioned by event time
CREATE TABLE `analytics.orders`
(
  order_id STRING,
  customer_id STRING,
  order_total FLOAT64,
  order_status STRING,
  order_timestamp TIMESTAMP,
  processed_at TIMESTAMP
)
PARTITION BY DATE(order_timestamp)
CLUSTER BY customer_id
OPTIONS (
  -- Keep 90 days of partitions
  partition_expiration_days = 90,
  -- Require partition filter for queries
  require_partition_filter = true
)
```

### Add Metadata Columns

Always include columns that help you track when data arrived and how many times it was updated.

```sql
-- Essential metadata columns for late data handling
ALTER TABLE `analytics.orders`
ADD COLUMN IF NOT EXISTS version_number INT64,
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_late_arrival BOOLEAN
```

## Monitoring Late Data

Set up monitoring to understand how much late data your pipeline handles.

```sql
-- Monitor late data volume by delay duration
SELECT
  DATE(order_timestamp) AS event_date,
  CASE
    WHEN TIMESTAMP_DIFF(processed_at, order_timestamp, MINUTE) <= 5 THEN 'on_time'
    WHEN TIMESTAMP_DIFF(processed_at, order_timestamp, MINUTE) <= 60 THEN 'slightly_late'
    WHEN TIMESTAMP_DIFF(processed_at, order_timestamp, HOUR) <= 24 THEN 'late'
    ELSE 'very_late'
  END AS lateness_bucket,
  COUNT(*) AS record_count,
  AVG(TIMESTAMP_DIFF(processed_at, order_timestamp, MINUTE)) AS avg_delay_minutes
FROM `analytics.orders_raw`
WHERE processed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY event_date, lateness_bucket
ORDER BY event_date DESC, lateness_bucket
```

If you see a high volume of late data, investigate the upstream source. Sometimes fixing the root cause is easier than building elaborate compensation logic.

## Wrapping Up

Late-arriving facts are a reality of distributed systems. The right strategy depends on your requirements. For dashboards where eventual accuracy is fine, append-only with query-time deduplication is simplest. For operational tables that need to reflect current state, the MERGE pattern works well. For systems that need audit trails of corrections, emit explicit correction events. Whichever approach you choose, design your BigQuery tables with event-time partitioning and metadata columns from the start. Retrofitting late data handling into an existing pipeline is much harder than building it in from day one.
