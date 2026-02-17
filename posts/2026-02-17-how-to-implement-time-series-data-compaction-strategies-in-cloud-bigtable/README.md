# How to Implement Time-Series Data Compaction Strategies in Cloud Bigtable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Bigtable, Time-Series, Data Compaction, NoSQL

Description: Learn how to implement effective time-series data compaction strategies in Cloud Bigtable to reduce storage costs and improve query performance for large-scale monitoring workloads.

---

Time-series data is everywhere - monitoring metrics, IoT sensor readings, financial tick data, and application logs all generate massive volumes of timestamped records. Cloud Bigtable handles these workloads well, but without a thoughtful compaction strategy, your storage costs will balloon and read performance will degrade over time.

This guide walks through practical strategies for compacting time-series data in Bigtable, drawing from real production patterns I have seen work across different use cases.

## Why Compaction Matters for Time-Series Data

Most time-series workloads share a common pattern: recent data gets queried at high resolution, while older data is only useful in aggregate form. You probably need per-second metrics from the last hour, per-minute metrics from the last day, and per-hour or per-day metrics from last month.

Without compaction, you are paying to store every raw data point forever. On a system ingesting 100,000 metrics per second, that is roughly 8.6 billion data points per day. Over a year, that adds up to over 3 trillion rows in Bigtable.

Compaction lets you roll up older data into coarser granularities while keeping recent data at full resolution.

## Designing Your Row Key for Compaction

The row key design is the foundation of any Bigtable compaction strategy. You need to encode both the metric identity and the time granularity into the key.

Here is a row key structure that supports multiple granularities:

```python
# Row key format: <metric_id>#<granularity>#<reverse_timestamp>
# Using reverse timestamps ensures recent data sorts first within each metric

import struct
import time

def create_row_key(metric_id, granularity, timestamp):
    # Reverse the timestamp so newer entries come first in range scans
    max_ts = 9999999999999  # far future timestamp in milliseconds
    reverse_ts = max_ts - timestamp

    # Granularity codes: 'r' = raw, 'm' = minute, 'h' = hour, 'd' = day
    return f"{metric_id}#{granularity}#{reverse_ts}".encode()
```

This structure lets you read any granularity for a given metric with a simple prefix scan. It also keeps data for the same metric physically co-located on disk, which improves read performance.

## Setting Up Garbage Collection Policies

Bigtable has built-in garbage collection policies that you should configure per column family. These automatically remove old cell versions or expired data without manual intervention.

```python
from google.cloud import bigtable
from google.cloud.bigtable import column_family
import datetime

def configure_gc_policies(instance_id, table_id):
    client = bigtable.Client(admin=True)
    instance = client.instance(instance_id)
    table = instance.table(table_id)

    # Raw data column family - keep only 7 days
    raw_cf = table.column_family("raw")
    raw_cf.gc_rule = column_family.MaxAgeGCRule(
        datetime.timedelta(days=7)
    )
    raw_cf.update()

    # Minute-aggregated data - keep 30 days
    minute_cf = table.column_family("minute")
    minute_cf.gc_rule = column_family.MaxAgeGCRule(
        datetime.timedelta(days=30)
    )
    minute_cf.update()

    # Hour-aggregated data - keep 1 year
    hour_cf = table.column_family("hour")
    hour_cf.gc_rule = column_family.MaxAgeGCRule(
        datetime.timedelta(days=365)
    )
    hour_cf.update()

    # Daily aggregated data - keep forever (no GC rule)
    # This is your long-term historical record
```

The garbage collection runs automatically during Bigtable's internal compaction process. You do not need to trigger it manually, though there can be a delay between when data becomes eligible for collection and when it is actually removed.

## Building the Compaction Pipeline

The compaction pipeline reads raw data, aggregates it, writes the results at a coarser granularity, and lets the garbage collection policy clean up the originals. Dataflow is a natural fit for this.

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from google.cloud.bigtable import row_filters

def run_compaction_pipeline(project_id, instance_id, table_id):
    """Compact raw data into minute-level aggregates."""

    options = PipelineOptions([
        f'--project={project_id}',
        '--runner=DataflowRunner',
        '--region=us-central1',
        '--temp_location=gs://my-bucket/temp',
    ])

    with beam.Pipeline(options=options) as pipeline:
        # Read raw data from the last processing window
        raw_data = (
            pipeline
            | 'ReadFromBigtable' >> beam.io.ReadFromBigtable(
                project_id=project_id,
                instance_id=instance_id,
                table_id=table_id,
                row_set=create_row_set_for_window(),
                filter_=row_filters.ColumnQualifierRegexFilter(b'raw')
            )
        )

        # Group by metric and minute window
        grouped = (
            raw_data
            | 'ExtractKeyAndValue' >> beam.Map(extract_metric_and_value)
            | 'WindowIntoMinutes' >> beam.WindowInto(
                beam.window.FixedWindows(60)  # 60-second windows
            )
            | 'GroupByMetric' >> beam.GroupByKey()
        )

        # Compute aggregates for each group
        aggregated = (
            grouped
            | 'ComputeAggregates' >> beam.Map(compute_aggregates)
        )

        # Write aggregated results back to Bigtable
        aggregated | 'WriteToBigtable' >> beam.io.WriteToBigtable(
            project_id=project_id,
            instance_id=instance_id,
            table_id=table_id,
        )

def compute_aggregates(element):
    """Compute min, max, avg, count, sum for a metric window."""
    metric_id, values = element
    return {
        'metric_id': metric_id,
        'min': min(values),
        'max': max(values),
        'avg': sum(values) / len(values),
        'count': len(values),
        'sum': sum(values),
    }
```

## Scheduling Compaction Jobs

You need to run compaction at regular intervals. Cloud Scheduler paired with Cloud Functions works well for triggering the Dataflow jobs.

```python
# Cloud Function triggered by Cloud Scheduler
# Runs every 5 minutes for raw-to-minute compaction
# Runs every hour for minute-to-hour compaction
# Runs once daily for hour-to-day compaction

from google.cloud import dataflow_v1beta3

def trigger_compaction(event, context):
    """Trigger the appropriate compaction Dataflow job."""
    compaction_type = event.get('compaction_type', 'raw_to_minute')

    # Template parameters vary by compaction level
    templates = {
        'raw_to_minute': {
            'template': 'gs://my-bucket/templates/raw-to-minute',
            'window_hours': 1,  # process last hour of raw data
        },
        'minute_to_hour': {
            'template': 'gs://my-bucket/templates/minute-to-hour',
            'window_hours': 24,
        },
        'hour_to_day': {
            'template': 'gs://my-bucket/templates/hour-to-day',
            'window_hours': 168,  # one week lookback
        },
    }

    config = templates[compaction_type]
    # Launch the Dataflow job from template
    launch_dataflow_from_template(config)
```

## Handling Late-Arriving Data

In real systems, data does not always arrive in order. Sensors go offline and batch-upload readings later, network delays cause out-of-order delivery, and backfill jobs inject historical data.

Your compaction pipeline needs to handle this gracefully:

```python
def should_recompact(metric_id, window_start, window_end, table):
    """Check if new raw data has arrived for an already-compacted window."""
    # Read raw data count for this window
    row_key_start = create_row_key(metric_id, 'r', window_end)
    row_key_end = create_row_key(metric_id, 'r', window_start)

    rows = table.read_rows(
        start_key=row_key_start,
        end_key=row_key_end,
        filter_=row_filters.CellsColumnLimitFilter(1)
    )

    raw_count = sum(1 for _ in rows)

    # Read existing aggregate to compare counts
    agg_key = create_row_key(metric_id, 'm', window_start)
    agg_row = table.read_row(agg_key)

    if agg_row:
        existing_count = int(agg_row.cells['minute'][b'count'][0].value)
        # Recompact if raw count differs from what we previously aggregated
        return raw_count != existing_count

    return raw_count > 0
```

## Monitoring Your Compaction Process

You should track several metrics to make sure compaction is working correctly. Set up monitoring for storage usage trends per column family, compaction job success and failure rates, the lag between raw data arrival and compaction completion, and any data discrepancies between granularity levels.

```python
from google.cloud import monitoring_v3

def report_compaction_metrics(project_id, metrics_processed, compaction_type):
    """Report custom compaction metrics to Cloud Monitoring."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/bigtable/compaction_records"
    series.metric.labels["compaction_type"] = compaction_type
    series.resource.type = "global"

    # Record the number of metrics processed in this compaction run
    point = monitoring_v3.Point()
    point.value.int64_value = metrics_processed
    now = time.time()
    point.interval.end_time.seconds = int(now)
    series.points = [point]

    client.create_time_series(name=project_name, time_series=[series])
```

## Cost Optimization Tips

A few practical tips for keeping costs down. First, use column families strategically - separate raw and aggregated data into different column families so garbage collection policies apply cleanly. Second, consider using Bigtable's replication features to serve read-heavy analytical queries from a separate cluster, leaving your primary cluster optimized for writes. Third, batch your compaction writes - Bigtable performs best with mutations batched into groups of around 100.

Implementing a multi-tier compaction strategy in Cloud Bigtable takes some upfront design work, but the payoff is significant. You will see storage costs drop by 90% or more for older data while maintaining fast access to recent high-resolution metrics. The combination of smart row key design, garbage collection policies, and scheduled Dataflow pipelines gives you a robust, production-ready system for managing time-series data at scale.
