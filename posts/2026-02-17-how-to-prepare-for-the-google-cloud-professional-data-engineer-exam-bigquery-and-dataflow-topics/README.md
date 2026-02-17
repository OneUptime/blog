# How to Prepare for the Google Cloud Professional Data Engineer Exam BigQuery and Dataflow Topics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Certification, Professional Data Engineer, BigQuery, Dataflow, Data Engineering

Description: Study guide for BigQuery and Dataflow topics on the Google Cloud Professional Data Engineer certification exam with practical examples and key concepts to master.

---

BigQuery and Dataflow are the two most heavily tested services on the Google Cloud Professional Data Engineer (PDE) exam. Together, they cover a massive portion of the exam content - BigQuery for analytics and warehousing, Dataflow for stream and batch processing. If you understand these two services deeply, you have a strong foundation for passing the exam.

This guide covers what you need to know about each service, the common exam scenarios, and how to practice effectively.

## BigQuery Core Concepts

### Architecture

BigQuery separates storage and compute. This is fundamental - you pay for storage separately from queries. Data is stored in Capacitor columnar format and distributed across Google's infrastructure. When you run a query, BigQuery assigns compute slots dynamically.

Key implications:
- You can store petabytes of data cheaply and only pay for the compute when you query it
- Different teams can query the same data without affecting each other's performance
- You can use external data sources (Cloud Storage, Bigtable) without importing data

### Partitioning and Clustering

This is one of the most tested BigQuery topics. Know the difference:

**Partitioning** divides a table into segments based on a column value (usually a date). Queries that filter on the partition column only scan relevant partitions.

```sql
-- Create a partitioned table by ingestion time
CREATE TABLE my_dataset.events
(
  event_id STRING,
  event_type STRING,
  user_id STRING,
  event_data JSON,
  created_at TIMESTAMP
)
PARTITION BY DATE(created_at)
OPTIONS(
  -- Expire partitions older than 90 days
  partition_expiration_days=90,
  -- Require partition filter in queries to prevent full table scans
  require_partition_filter=true
);
```

**Clustering** sorts data within partitions by up to four columns. This improves query performance for filters and aggregations on those columns.

```sql
-- Create a table that is both partitioned and clustered
CREATE TABLE my_dataset.events_optimized
(
  event_id STRING,
  event_type STRING,
  user_id STRING,
  region STRING,
  event_data JSON,
  created_at TIMESTAMP
)
PARTITION BY DATE(created_at)
CLUSTER BY event_type, region
-- Queries filtering by event_type and region will be much faster
;
```

Exam tip: If a question asks how to reduce query costs for a large table, the answer is almost always partitioning plus clustering.

### Pricing Models

**On-demand pricing**: You pay per TB of data scanned. Good for unpredictable workloads. Currently $6.25 per TB scanned.

**Capacity pricing (editions)**: You buy dedicated compute slots. Good for predictable, heavy workloads. Available as Standard, Enterprise, and Enterprise Plus editions.

Know when to recommend each:
- Small team, occasional queries: On-demand
- Large organization, heavy usage: Capacity pricing with autoscaling
- Compliance requirements needing dedicated resources: Enterprise edition with reservations

### Materialized Views

Materialized views precompute and cache query results. BigQuery automatically refreshes them and uses them to optimize queries even when you do not reference them directly.

```sql
-- Create a materialized view for a common aggregation
CREATE MATERIALIZED VIEW my_dataset.daily_user_events
AS
SELECT
  DATE(created_at) as event_date,
  user_id,
  COUNT(*) as event_count,
  COUNT(DISTINCT event_type) as distinct_events
FROM my_dataset.events
GROUP BY event_date, user_id;
```

### Data Loading

Know the different ways to get data into BigQuery:

- **Batch loading**: Load from Cloud Storage files (CSV, JSON, Avro, Parquet, ORC). Free for batch loads.
- **Streaming inserts**: Real-time data ingestion via the streaming API. Charged per row.
- **BigQuery Data Transfer Service**: Scheduled transfers from SaaS applications and other sources.
- **Storage Write API**: Recommended replacement for streaming inserts with exactly-once semantics.

```bash
# Load a CSV file from Cloud Storage into BigQuery
bq load \
  --source_format=CSV \
  --autodetect \
  my_dataset.my_table \
  gs://my-bucket/data/*.csv
```

### Access Control

BigQuery has dataset-level, table-level, and column-level access controls:

```sql
-- Grant column-level access using policy tags
-- First, create a policy tag taxonomy in Data Catalog
-- Then apply it to sensitive columns

-- Row-level security
CREATE ROW ACCESS POLICY region_filter
ON my_dataset.sales
GRANT TO ("group:us-team@company.com")
FILTER USING (region = "US");
```

## Dataflow Core Concepts

### Apache Beam Model

Dataflow is a managed service for running Apache Beam pipelines. You need to understand the Beam programming model:

- **PCollection**: A distributed dataset (like a list of elements)
- **PTransform**: An operation that transforms PCollections (Map, Filter, GroupByKey, etc.)
- **Pipeline**: The complete data processing graph
- **Runner**: The engine that executes the pipeline (Dataflow is one runner)

### Batch vs. Streaming

Beam uses the same programming model for both batch and streaming. The difference is in the data source:

```python
# batch_pipeline.py - Read from a file and write to BigQuery
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--temp_location=gs://my-bucket/temp',
])

# Batch pipeline: reads bounded data from a file
with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        | 'ReadCSV' >> beam.io.ReadFromText('gs://my-bucket/data.csv')
        | 'ParseRows' >> beam.Map(parse_csv_row)
        | 'FilterValid' >> beam.Filter(lambda row: row['amount'] > 0)
        | 'WriteToBQ' >> beam.io.WriteToBigQuery(
            'my_dataset.processed_data',
            schema='user_id:STRING,amount:FLOAT,timestamp:TIMESTAMP',
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
        )
    )
```

```python
# streaming_pipeline.py - Read from Pub/Sub and write to BigQuery
import apache_beam as beam

options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--streaming',  # Enable streaming mode
    '--temp_location=gs://my-bucket/temp',
])

# Streaming pipeline: reads unbounded data from Pub/Sub
with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        | 'ReadPubSub' >> beam.io.ReadFromPubSub(
            topic='projects/my-project/topics/events'
        )
        | 'ParseJSON' >> beam.Map(json.loads)
        | 'AddTimestamp' >> beam.Map(add_event_timestamp)
        # Window the data into 5-minute intervals
        | 'Window' >> beam.WindowInto(
            beam.window.FixedWindows(300)  # 5 minutes
        )
        | 'CountPerUser' >> beam.CombinePerKey(sum)
        | 'WriteToBQ' >> beam.io.WriteToBigQuery(
            'my_dataset.user_event_counts',
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
        )
    )
```

### Windowing

Windowing is a critical streaming concept for the exam. Know the types:

- **Fixed windows**: Non-overlapping intervals of fixed size (every 5 minutes)
- **Sliding windows**: Overlapping intervals (5-minute windows every 1 minute)
- **Session windows**: Windows that close after a gap in activity (per user, with a 30-minute gap timeout)
- **Global window**: A single window for all data (default for batch)

### Watermarks and Late Data

In streaming, data can arrive late. The watermark tracks the progress of event time. Know these concepts:

- **Watermark**: An estimate of when all data up to a certain event time has arrived
- **Allowed lateness**: How long after the watermark to accept late data
- **Triggers**: When to emit results (on watermark, on each element, periodically)

```python
# Handle late data with allowed lateness and triggers
(
    events
    | 'Window' >> beam.WindowInto(
        beam.window.FixedWindows(300),
        # Allow data up to 1 hour late
        allowed_lateness=beam.utils.timestamp.Duration(seconds=3600),
        # Emit results at watermark and again when late data arrives
        trigger=beam.trigger.AfterWatermark(
            late=beam.trigger.AfterCount(1)
        ),
        accumulation_mode=beam.trigger.AccumulationMode.ACCUMULATING,
    )
)
```

### Dataflow Flex Templates

Flex Templates let you package and run Dataflow pipelines as container images. This is the recommended approach for production:

```bash
# Build a Flex Template
gcloud dataflow flex-template build \
  gs://my-bucket/templates/my-pipeline.json \
  --image-gcr-path=us-central1-docker.pkg.dev/my-project/templates/my-pipeline:latest \
  --sdk-language=PYTHON \
  --flex-template-base-image=PYTHON3 \
  --py-path=. \
  --env=FLEX_TEMPLATE_PYTHON_PY_FILE=main.py

# Run the template
gcloud dataflow flex-template run my-job \
  --template-file-gcs-location=gs://my-bucket/templates/my-pipeline.json \
  --region=us-central1 \
  --parameters=input_topic=projects/my-project/topics/events
```

## Common Exam Scenarios

### Scenario 1: ETL Pipeline Design

"Process CSV files uploaded to Cloud Storage, transform the data, and load into BigQuery."

Answer: Dataflow batch pipeline triggered by a Cloud Function on Cloud Storage upload events. Or use BigQuery load jobs for simple transformations.

### Scenario 2: Real-time Analytics

"Process click-stream data in real-time, aggregate per-user metrics in 5-minute windows, and store results in BigQuery."

Answer: Pub/Sub for ingestion, Dataflow streaming pipeline with fixed windowing, write to BigQuery using the Storage Write API.

### Scenario 3: Cost Optimization

"A team runs expensive BigQuery queries on a 10 TB table but only ever filters on the last 7 days of data."

Answer: Partition the table by date and add `require_partition_filter=true`. Cluster by the most common filter columns. This reduces scanned data from 10 TB to whatever 7 days of data amounts to.

### Scenario 4: Exactly-Once Processing

"Ensure each event is processed exactly once in a streaming pipeline, even if there are retries."

Answer: Use Dataflow with the Pub/Sub I/O connector, which provides exactly-once processing guarantees. Use Dataflow's built-in deduplication with message IDs.

## Study Tips

1. **Run actual pipelines**: The exam tests practical understanding. Write and run a batch pipeline and a streaming pipeline on Dataflow.
2. **Practice BigQuery SQL**: Know window functions, STRUCT and ARRAY types, and how to write efficient queries.
3. **Understand the cost model**: Know when partitioning, clustering, and materialized views reduce costs.
4. **Focus on streaming concepts**: Windowing, watermarks, and late data handling appear in multiple questions.
5. **Know the data lifecycle**: From ingestion (Pub/Sub, Cloud Storage) through processing (Dataflow) to storage (BigQuery) and visualization (Looker Studio).

## Wrapping Up

BigQuery and Dataflow form the core of the GCP data engineering stack, and mastering them is essential for the PDE exam. For BigQuery, focus on partitioning, clustering, pricing models, and access control. For Dataflow, understand the Apache Beam model, windowing concepts, and the difference between batch and streaming pipelines. Practice with real pipelines and real queries - the exam tests practical knowledge, not just theoretical understanding.
