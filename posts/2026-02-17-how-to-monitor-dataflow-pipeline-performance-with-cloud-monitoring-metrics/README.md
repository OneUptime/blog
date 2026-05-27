# How to Monitor Dataflow Pipeline Performance with Cloud Monitoring Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataflow, Cloud Monitoring, Observability, Streaming

Description: Set up comprehensive monitoring for Google Cloud Dataflow pipelines using Cloud Monitoring metrics, custom dashboards, and alerting policies for production reliability.

---

Running a Dataflow pipeline without proper monitoring is flying blind. You might not notice that your pipeline is falling behind until the backlog is hours deep, or that worker utilization is at 95% until the pipeline crashes. Monitoring gives you visibility into pipeline health so you can catch issues early and optimize performance.

Google Cloud Monitoring integrates tightly with Dataflow, providing dozens of built-in metrics plus the ability to create custom metrics from your pipeline code. Let me show you how to set up monitoring that actually helps you operate pipelines in production.

## Key Dataflow Metrics

Dataflow exports metrics to Cloud Monitoring automatically. Here are the ones that matter most for daily operations.

**System lag** is the single most important metric for streaming pipelines. It reports the current maximum time that an element has been processing or waiting to be processed. A system lag of 30 seconds means at least one element has spent about 30 seconds in the pipeline or waiting in the source. If this number keeps growing, your pipeline cannot keep up with the input rate.

**Backlog bytes** shows the known unprocessed input for a stage, in bytes. For Pub/Sub sources, Dataflow also exposes Pub/Sub-specific metrics such as pulled-but-unacknowledged message ages. A growing backlog combined with stable throughput means you need more workers.

**Data freshness** measures the difference between processing time and event time for processed elements. Dataflow shows the maximum data freshness value at a point in time, so it helps you spot worst-case event-time delays.

**Current vCPUs** and worker metrics such as active or target worker instances show your resource usage. These help you understand cost and capacity.

**Elements produced** at each step gives you throughput numbers. If a particular step shows low throughput, that is your bottleneck.

## Creating a Monitoring Dashboard

Build a custom dashboard that shows all critical metrics at a glance.

```bash
# Create a dashboard using gcloud (dashboard definition in JSON)

gcloud monitoring dashboards create \
  --config-from-file=dataflow-dashboard.json
```

Here is a dashboard configuration that covers the essential metrics.

```json
{
  "displayName": "Dataflow Pipeline Monitoring",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "System Lag",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"dataflow_job\" AND metric.type=\"dataflow.googleapis.com/job/system_lag\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MAX"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Backlog Bytes",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"dataflow_job\" AND metric.type=\"dataflow.googleapis.com/job/backlog_bytes\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MAX"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Elements Processed per Second",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"dataflow_job\" AND metric.type=\"dataflow.googleapis.com/job/elements_produced_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 4,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Current vCPUs",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"dataflow_job\" AND metric.type=\"dataflow.googleapis.com/job/current_num_vcpus\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
```

## Setting Up Alerts

Dashboards are great for investigation, but you need alerts to be notified of problems proactively.

```bash
# Create an alert for high system lag
gcloud monitoring policies create \
  --display-name="Dataflow High System Lag" \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --condition-display-name="System lag above 5 minutes" \
  --condition-filter='resource.type="dataflow_job" AND metric.type="dataflow.googleapis.com/job/system_lag"' \
  --duration=300s \
  --if="> 300" \
  --combiner=OR
```

I recommend these alert thresholds as a starting point.

| Metric | Warning Threshold | Critical Threshold |
|--------|------------------|--------------------|
| System lag | 2 minutes | 10 minutes |
| Backlog bytes | 100 MB | 1 GB |
| Data freshness | 5 minutes | 30 minutes |
| Aggregated worker utilization | 80% for 10 min | 95% for 5 min |

Adjust these based on your SLAs and the characteristics of your pipeline.

## Custom Metrics from Pipeline Code

Built-in metrics cover infrastructure health, but you also need application-level metrics. Apache Beam provides a metrics API for this.

```java
// Define and use custom metrics in your pipeline code
public class ProcessEventsFn extends DoFn<String, Event> {

    // Counter: tracks total number of events processed by type
    private final Counter validEvents = Metrics.counter("pipeline", "valid_events");
    private final Counter invalidEvents = Metrics.counter("pipeline", "invalid_events");

    // Distribution: tracks processing latency
    private final Distribution processLatency = Metrics.distribution(
        "pipeline", "process_latency_ms");

    @ProcessElement
    public void processElement(ProcessContext c) {
        long startTime = System.currentTimeMillis();
        String raw = c.element();

        try {
            Event event = parseEvent(raw);
            validEvents.inc();
            c.output(event);
        } catch (Exception e) {
            invalidEvents.inc();
        }

        // Record how long processing took
        long latency = System.currentTimeMillis() - startTime;
        processLatency.update(latency);
    }
}
```

Dataflow reports Beam `Counter` and `Distribution` metrics to Cloud Monitoring. They appear as Dataflow user metrics such as `dataflow.googleapis.com/job/user_counter`, with labels for the metric name and transform. For backward compatibility, Dataflow also publishes them under the `custom.googleapis.com/dataflow/` namespace. You can chart them on dashboards and create alerts just like built-in metrics.

## Monitoring Per-Step Performance

Dataflow tracks metrics per pipeline step, which helps identify bottlenecks.

```bash
# List service metrics for a specific job, filtered by transform
gcloud beta dataflow metrics list JOB_ID \
  --region=us-central1 \
  --source=service \
  --transform=STEP_NAME \
  --format="table(name.name, name.context.step, scalar)"
```

Look for steps where throughput drops significantly compared to upstream steps. That step is likely your bottleneck. Common causes include:

- External API calls without batching
- Large side inputs being accessed per element
- Complex serialization/deserialization
- GroupByKey operations with hot keys

## Log-Based Metrics

Sometimes you need metrics from log messages. Cloud Logging lets you create metrics from log entries.

```bash
# Create a metric that counts error log entries from Dataflow workers
gcloud logging metrics create dataflow_worker_errors \
  --description="Count of error-level log messages from Dataflow workers" \
  --log-filter='resource.type="dataflow_step" AND severity="ERROR"'
```

This creates a metric you can alert on. If your workers suddenly start logging many errors, something has changed in the input data or downstream services.

## Monitoring Pipeline Freshness with External Probes

For critical pipelines, I set up external monitoring that checks whether fresh data is landing in the output.

```python
# Cloud Function that checks BigQuery for fresh data
from google.cloud import bigquery
from google.cloud import monitoring_v3
import time

def check_data_freshness(request):
    """Check if fresh data is arriving in BigQuery."""
    client = bigquery.Client()

    # Query for the most recent record
    query = """
    SELECT MAX(ingestion_timestamp) as latest
    FROM `project.dataset.events`
    WHERE DATE(ingestion_timestamp) = CURRENT_DATE()
    """
    result = list(client.query(query).result())
    latest = result[0].latest

    if latest is None:
        freshness_seconds = 9999
    else:
        freshness_seconds = time.time() - latest.timestamp()

    # Write custom metric to Cloud Monitoring
    monitoring_client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/my-project"

    series = monitoring_v3.TimeSeries()
    series.metric.type = "custom.googleapis.com/pipeline/output_freshness_seconds"
    series.resource.type = "global"
    series.resource.labels["project_id"] = "my-project"

    point = monitoring_v3.Point()
    point.value.double_value = freshness_seconds
    now = time.time()
    point.interval.end_time.seconds = int(now)
    series.points = [point]

    monitoring_client.create_time_series(
        request={"name": project_name, "time_series": [series]}
    )

    return f"Output freshness: {freshness_seconds:.0f} seconds"
```

Schedule this function to run every minute with Cloud Scheduler. If the freshness metric exceeds your threshold, you know the pipeline is either stalled or dropping data, even if the Dataflow job itself reports as healthy.

## Building a Monitoring Runbook

Metrics and alerts are only useful if your team knows how to respond. Here is a basic runbook structure.

For high system lag: Check if traffic spiked (look at Pub/Sub publish rate). Check if autoscaling is working (look at worker count). Check if a downstream service is slow (look at per-step latency). Consider manually scaling up workers.

For growing backlog: Similar to system lag, but also check if the pipeline has stalled entirely. Look for error logs. Check if the pipeline job is still in RUNNING state.

For high error rates: Check the dead letter queue for patterns. Look at worker logs for stack traces. Check if upstream data format changed.

Good monitoring is what separates a pipeline that runs reliably in production from one that needs constant babysitting. Invest the time upfront to set up dashboards, alerts, and runbooks, and your future self will thank you.
