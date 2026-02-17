# How to Monitor Streaming Pipeline Lag and Backlog in Dataflow Using Custom Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Monitoring, Streaming, Custom Metrics, Cloud Monitoring, Apache Beam

Description: Learn how to implement custom metrics in Dataflow streaming pipelines to monitor processing lag, backlog depth, and throughput with actionable alerts.

---

A streaming pipeline is only useful if it is keeping up with the data. When your Dataflow job falls behind - processing events from 10 minutes ago while new events keep arriving - you have a problem that built-in metrics might not surface clearly. Dataflow provides system metrics like CPU utilization and element count, but those do not tell you the full story. Custom metrics let you track what actually matters: how old is the data you are processing, how deep is the backlog, and where is the bottleneck.

This guide shows how to implement custom metrics in your Dataflow streaming pipeline and set up meaningful alerts.

## Understanding Lag vs Backlog

Two terms that often get confused:

**System lag** is the time between when an event occurred and when it was processed. If a transaction happened at 2:00 PM and your pipeline processes it at 2:00:30 PM, the lag is 30 seconds.

**Backlog** is the number of unprocessed messages waiting in Pub/Sub. If 50,000 messages are sitting in the subscription, that is your backlog.

Both matter, but they tell you different things. High lag with low backlog might mean each message takes too long to process. Low lag with growing backlog means throughput is not keeping pace with incoming volume.

## Built-in Metrics to Start With

Before writing custom metrics, make sure you are monitoring the built-in ones.

```bash
# Key Dataflow metrics available in Cloud Monitoring
# dataflow.googleapis.com/job/system_lag - current system lag in seconds
# dataflow.googleapis.com/job/data_watermark_age - watermark staleness
# dataflow.googleapis.com/job/elapsed_time - total job runtime
# pubsub.googleapis.com/subscription/oldest_unacked_message_age - oldest message in backlog
# pubsub.googleapis.com/subscription/num_undelivered_messages - backlog size
```

Create a monitoring dashboard with these metrics:

```bash
# Create a dashboard using the gcloud CLI
gcloud monitoring dashboards create --config-from-file=pipeline-dashboard.json
```

## Implementing Custom Metrics in Apache Beam

Apache Beam provides a `Metrics` API that integrates with Cloud Monitoring. You can create counters, distributions, and gauges.

### Tracking Processing Lag

The most useful custom metric is the time between event creation and processing.

```python
# Custom DoFn that tracks processing lag
import apache_beam as beam
from apache_beam.metrics import Metrics
from datetime import datetime, timezone

class TrackProcessingLag(beam.DoFn):
    """Measures the lag between event time and processing time."""

    def __init__(self):
        # Distribution tracks min, max, mean, and count
        self.lag_distribution = Metrics.distribution(
            'pipeline_health', 'processing_lag_ms'
        )
        # Counter for events processed
        self.events_processed = Metrics.counter(
            'pipeline_health', 'events_processed'
        )
        # Counter for late events (more than 5 minutes old)
        self.late_events = Metrics.counter(
            'pipeline_health', 'late_events'
        )

    def process(self, element):
        # Calculate the lag between event time and current time
        event_time = datetime.fromisoformat(
            element['timestamp'].replace('Z', '+00:00')
        )
        now = datetime.now(timezone.utc)
        lag_ms = int((now - event_time).total_seconds() * 1000)

        # Record the lag in the distribution metric
        self.lag_distribution.update(lag_ms)
        self.events_processed.inc()

        # Track late events separately
        if lag_ms > 300000:  # More than 5 minutes
            self.late_events.inc()

        # Pass the element through with lag information attached
        element['_processing_lag_ms'] = lag_ms
        yield element
```

### Tracking Throughput Per Window

```python
# Track throughput within fixed time windows
class MeasureThroughput(beam.DoFn):
    """Counts elements per window for throughput monitoring."""

    def __init__(self):
        self.window_element_count = Metrics.distribution(
            'pipeline_health', 'elements_per_window'
        )

    def process(self, element, window=beam.DoFn.WindowParam):
        # Each element increments the window count
        self.window_element_count.update(1)
        yield element
```

### Tracking Stage-Specific Processing Time

```python
# Track how long each processing stage takes
import time

class TimedTransform(beam.DoFn):
    """Wraps a transform and tracks its execution time."""

    def __init__(self, stage_name):
        self.stage_name = stage_name
        self.processing_time = Metrics.distribution(
            'stage_timing', f'{stage_name}_duration_ms'
        )
        self.errors = Metrics.counter(
            'stage_errors', f'{stage_name}_errors'
        )

    def process(self, element):
        start = time.monotonic()
        try:
            # Your actual processing logic here
            result = self.transform(element)
            yield result
        except Exception as e:
            self.errors.inc()
            raise
        finally:
            duration_ms = int((time.monotonic() - start) * 1000)
            self.processing_time.update(duration_ms)

    def transform(self, element):
        """Override this method with your actual transform logic."""
        return element
```

## Integrating Custom Metrics into the Pipeline

Here is how to wire these metrics into a complete pipeline:

```python
# streaming_pipeline.py - Pipeline with comprehensive monitoring
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, StandardOptions
import json

def run():
    options = PipelineOptions()
    options.view_as(StandardOptions).streaming = True

    with beam.Pipeline(options=options) as p:
        # Read from Pub/Sub
        raw = (
            p
            | "Read" >> beam.io.ReadFromPubSub(
                subscription="projects/MY_PROJECT/subscriptions/events-sub"
            )
        )

        # Parse and track processing lag
        parsed = (
            raw
            | "Parse" >> beam.Map(lambda msg: json.loads(msg.decode('utf-8')))
            | "TrackLag" >> beam.ParDo(TrackProcessingLag())
        )

        # Process with stage timing
        enriched = (
            parsed
            | "Enrich" >> beam.ParDo(TimedEnrichment('enrichment'))
        )

        scored = (
            enriched
            | "Score" >> beam.ParDo(TimedScoring('scoring'))
        )

        # Write to BigQuery with throughput tracking
        (
            scored
            | "TrackThroughput" >> beam.ParDo(MeasureThroughput())
            | "Write" >> beam.io.WriteToBigQuery(
                table='MY_PROJECT:analytics.events',
                write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
            )
        )

if __name__ == '__main__':
    run()
```

## Viewing Custom Metrics in Cloud Monitoring

Custom Beam metrics appear in Cloud Monitoring under the `custom.googleapis.com/dataflow/` namespace. You can query them using MQL (Monitoring Query Language):

```
# MQL query for average processing lag
fetch dataflow_job
| metric 'custom.googleapis.com/dataflow/pipeline_health/processing_lag_ms'
| align delta(1m)
| group_by [resource.job_name], [mean(value.distribution_value.mean)]
```

## Setting Up Alerts

Create alerts for the metrics that matter most.

### Alert on High Processing Lag

```bash
# Create an alert policy for processing lag exceeding 5 minutes
gcloud monitoring policies create \
  --display-name="High Pipeline Lag" \
  --condition-display-name="Processing lag > 5 minutes" \
  --condition-filter='resource.type="dataflow_job" AND metric.type="custom.googleapis.com/dataflow/pipeline_health/processing_lag_ms"' \
  --condition-threshold-value=300000 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels=CHANNEL_ID
```

### Alert on Growing Backlog

```bash
# Alert when Pub/Sub backlog age exceeds 10 minutes
gcloud monitoring policies create \
  --display-name="Growing Pipeline Backlog" \
  --condition-display-name="Oldest unacked message > 10 min" \
  --condition-filter='resource.type="pubsub_subscription" AND metric.type="pubsub.googleapis.com/subscription/oldest_unacked_message_age"' \
  --condition-threshold-value=600 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels=CHANNEL_ID
```

### Alert on Error Rate

```bash
# Alert when error rate exceeds 1% of processed events
gcloud monitoring policies create \
  --display-name="High Pipeline Error Rate" \
  --condition-display-name="Error rate > 1%" \
  --condition-filter='resource.type="dataflow_job" AND metric.type="custom.googleapis.com/dataflow/stage_errors"' \
  --condition-threshold-value=100 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=60s \
  --notification-channels=CHANNEL_ID
```

## Troubleshooting Common Lag Issues

When alerts fire, here is how to diagnose the problem.

**Lag increasing steadily**: The pipeline is not keeping up with input volume. Check if autoscaling is working and whether you have hit a worker limit. Increase `max_num_workers`.

**Lag spikes then recovers**: Usually caused by temporary input bursts. Autoscaling should handle this, but you might need to set a higher minimum worker count.

**Lag is high but backlog is low**: Individual message processing is slow. Check your stage timing metrics to find the bottleneck. Often it is an external API call or a slow database lookup.

**Backlog growing with steady lag**: The pipeline is processing at a consistent rate, but input volume exceeds that rate. You need more workers or more efficient processing.

## Wrapping Up

Custom metrics bridge the gap between knowing your pipeline is running and knowing it is running well. The built-in Dataflow metrics give you the infrastructure view, while custom metrics give you the application view. Track processing lag, throughput per stage, and error rates. Set alerts on the metrics that indicate real problems. When an alert fires, the stage-level timing metrics will point you to the bottleneck. This combination of observability and alerting is what turns a streaming pipeline from a black box into a system you can confidently operate in production.
