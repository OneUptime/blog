# How to Monitor Streaming Pipeline Lag and Backlog

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Monitoring, Streaming, Custom Metric, Cloud Monitoring, Apache Beam

Description: Learn how to implement custom metrics in Dataflow streaming pipelines to monitor processing lag, backlog depth, and throughput with actionable alerts.

---

A streaming pipeline is only useful if it is keeping up with the data. When your Dataflow job falls behind - processing events from 10 minutes ago while new events keep arriving - you have a problem that built-in metrics might not surface clearly. Dataflow provides system metrics like CPU utilization and element count, but those do not tell you the full story. Custom metrics let you track what actually matters: how old is the data you are processing, how deep is the backlog, and where is the bottleneck.

This guide shows how to implement custom metrics in your Dataflow streaming pipeline and set up meaningful alerts.

## Understanding Lag vs Backlog

Two terms that often get confused:

**Processing lag** is the time between when an event occurred and when it was processed. If a transaction happened at 2:00 PM and your pipeline processes it at 2:00:30 PM, the lag is 30 seconds.

**Backlog** is the number of unprocessed messages waiting in Pub/Sub. If 50,000 messages are sitting in the subscription, that is your backlog.

Both matter, but they tell you different things. High lag with low backlog might mean each message takes too long to process. Low lag with growing backlog means throughput is not keeping pace with incoming volume.

## Built-in Metrics to Start With

Before writing custom metrics, make sure you are monitoring the built-in ones.

```bash
# Key Dataflow metrics available in Cloud Monitoring

# dataflow.googleapis.com/job/system_lag - max system lag across the pipeline in seconds
# dataflow.googleapis.com/job/data_watermark_age - data watermark lag in seconds
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

Apache Beam provides a `Metrics` API for counters, distributions, and gauges. When a Beam pipeline runs on Dataflow, Dataflow reports counters and distributions to Cloud Monitoring.

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

### Tracking Throughput

```python
# Track throughput as a counter that can be converted to a rate in Cloud Monitoring
class MeasureThroughput(beam.DoFn):
    """Counts processed elements for throughput monitoring."""

    def __init__(self):
        self.elements_processed = Metrics.counter(
            'pipeline_health', 'elements_processed'
        )

    def process(self, element):
        # Cloud Monitoring can chart the rate of this counter over time
        self.elements_processed.inc()
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
            | "Enrich" >> beam.ParDo(TimedTransform('enrichment'))
        )

        scored = (
            enriched
            | "Score" >> beam.ParDo(TimedTransform('scoring'))
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

Custom Beam metrics appear in Cloud Monitoring as `dataflow.googleapis.com/job/user_counter` with metric labels such as `metric_name` and `ptransform`. For backward compatibility, Dataflow also publishes them under the `custom.googleapis.com/dataflow/` namespace. Distribution metrics are exported as separate values with `_MAX`, `_MIN`, `_MEAN`, and `_COUNT` suffixes.

You can query the mean processing lag using PromQL:

```text
# PromQL query for average processing lag
avg(
  {
    "__name__"="dataflow.googleapis.com/job/user_counter",
    "monitored_resource"="dataflow_job",
    "metric_name"="processing_lag_ms_MEAN"
  }
)
```

## Setting Up Alerts

Create alerts for the metrics that matter most.

### Alert on High Processing Lag

```bash
# Create an alert policy for processing lag exceeding 5 minutes
gcloud monitoring policies create \
  --display-name="High Pipeline Lag" \
  --condition-display-name="Processing lag > 5 minutes" \
  --condition-filter='resource.type="dataflow_job" AND metric.type="dataflow.googleapis.com/job/user_counter" AND metric.label.metric_name="processing_lag_ms_MEAN"' \
  --if="> 300000" \
  --duration=300s \
  --notification-channels=CHANNEL_ID
```

### Alert on Growing Backlog

```bash
# Alert when Pub/Sub backlog age exceeds 10 minutes
gcloud monitoring policies create \
  --display-name="Growing Pipeline Backlog" \
  --condition-display-name="Oldest unacked message > 10 min" \
  --condition-filter='resource.type="pubsub_subscription" AND metric.type="pubsub.googleapis.com/subscription/oldest_unacked_message_age"' \
  --if="> 600" \
  --duration=300s \
  --notification-channels=CHANNEL_ID
```

### Alert on Error Count

```bash
# Alert when a stage reports any errors for more than 1 minute
gcloud monitoring policies create \
  --display-name="Dataflow Stage Errors" \
  --condition-display-name="Enrichment errors > 0" \
  --condition-filter='resource.type="dataflow_job" AND metric.type="dataflow.googleapis.com/job/user_counter" AND metric.label.metric_name="enrichment_errors"' \
  --if="> 0" \
  --duration=60s \
  --notification-channels=CHANNEL_ID
```

## Troubleshooting Common Lag Issues

When alerts fire, here is how to diagnose the problem.

**Lag increasing steadily**: The pipeline is not keeping up with input volume. Check if autoscaling is working and whether you have hit a worker limit. Increase `max_num_workers`.

**Lag spikes then recovers**: Usually caused by temporary input bursts. Autoscaling should handle this, but you might need to set a higher minimum worker count.

**Lag is high but backlog is low**: Individual message processing is slow. Check your stage timing metrics to find the bottleneck. Often it is an external API call or a slow database lookup.

**Backlog growing with steady lag**: The pipeline is processing at a consistent rate, but input volume exceeds that rate. You need more workers or more efficient processing.

## Wrapping Up

Custom metrics bridge the gap between knowing your pipeline is running and knowing it is running well. The built-in Dataflow metrics give you the infrastructure view, while custom metrics give you the application view. Track processing lag, throughput, and error counts. Set alerts on the metrics that indicate real problems. When an alert fires, the stage-level timing metrics will point you to the bottleneck. This combination of observability and alerting is what turns a streaming pipeline from a black box into a system you can confidently operate in production.
