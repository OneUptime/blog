# How to Use Dataflow Prime for Dynamic Worker Resource Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow Prime, Apache Beam, Cost Optimization, Data Pipeline

Description: Learn how to use Dataflow Prime to dynamically allocate worker resources for your pipelines, reducing costs through right-sizing and vertical autoscaling.

---

Standard Dataflow gives you horizontal autoscaling - it adds or removes worker VMs based on pipeline backlog. But every worker has the same machine type, which means you pick a size that works for the most demanding stage of your pipeline and pay for that everywhere. Dataflow Prime changes this by introducing vertical autoscaling and support for per-step resource configuration through right fitting. Each stage of your pipeline can use different worker resources, especially memory and GPUs.

I switched a few pipelines from standard Dataflow to Dataflow Prime and saw cost reductions between 30% and 50%, mainly because stages that only needed 1 GB of memory were no longer running on machines with 16 GB. The savings add up fast for pipelines that run continuously or process large batch jobs daily.

## What Dataflow Prime Does Differently

In standard Dataflow, you pick a machine type (like n1-standard-4) and all workers use that configuration. If one stage needs a lot of memory for a large GroupByKey and another stage just does simple map operations, both stages run on the same oversized machines.

Dataflow Prime decouples resource allocation from fixed machine types. Instead of specifying machine types, you specify resource hints at the pipeline or step level. Dataflow Prime then allocates the requested memory and accelerator resources for each step, packing work onto shared infrastructure more efficiently.

## Enabling Dataflow Prime

To use Dataflow Prime, enable the Cloud Autoscaling API and specify the Prime service option in your pipeline options:

```python
# pipeline_options.py

# Configure a pipeline to use Dataflow Prime
from apache_beam.options.pipeline_options import PipelineOptions

options = PipelineOptions(
    runner="DataflowRunner",
    project="my-project",
    region="us-central1",
    temp_location="gs://my-bucket/temp",
    staging_location="gs://my-bucket/staging",
    # Enable Dataflow Prime
    dataflow_service_options=["enable_prime"],
    # No need to specify machine type - Prime handles it
)
```

From the command line:

```bash
# Launch a pipeline with Dataflow Prime enabled
python my_pipeline.py \
  --runner=DataflowRunner \
  --project=my-project \
  --region=us-central1 \
  --temp_location=gs://my-bucket/temp \
  --dataflow_service_options=enable_prime
```

## Setting Resource Hints

Resource hints tell Dataflow Prime how much memory or which accelerator resources a particular step needs. You can set hints at the step level for fine-grained control.

```python
# resource_hints.py
# Pipeline with per-step resource hints for Dataflow Prime
import apache_beam as beam
import json
from apache_beam.options.pipeline_options import PipelineOptions

options = PipelineOptions(
    runner="DataflowRunner",
    project="my-project",
    region="us-central1",
    temp_location="gs://my-bucket/temp",
    dataflow_service_options=["enable_prime"],
)

with beam.Pipeline(options=options) as pipeline:
    # Reading step - minimal resources needed
    raw_data = (
        pipeline
        | "ReadFromGCS" >> beam.io.ReadFromText(
            "gs://my-bucket/input/*.jsonl"
        ).with_resource_hints(min_ram="512MB")
    )

    # Parsing step - lightweight, does not need much memory
    parsed = (
        raw_data
        | "ParseJSON" >> beam.Map(json.loads)
            .with_resource_hints(min_ram="1GB")
    )

    # Heavy aggregation step - needs more memory for the GroupByKey
    aggregated = (
        parsed
        | "KeyByUser" >> beam.Map(lambda x: (x["user_id"], x))
        | "GroupByUser" >> beam.GroupByKey()
            .with_resource_hints(min_ram="8GB")
        | "ComputeAggregates" >> beam.Map(compute_user_stats)
            .with_resource_hints(min_ram="4GB")
    )

    # Write step - minimal resources
    (
        aggregated
        | "FormatOutput" >> beam.Map(json.dumps)
        | "WriteToBQ" >> beam.io.WriteToBigQuery(
            "my-project:dataset.table",
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
        ).with_resource_hints(min_ram="2GB")
    )
```

## Accelerator Resource Hints

For steps that benefit from hardware accelerators, you can request GPUs:

```python
# gpu_hints.py
# Request GPU resources for ML inference steps
import apache_beam as beam
import json

class MLInference(beam.DoFn):
    """DoFn that runs ML model inference on each element."""

    def setup(self):
        """Load the model onto the GPU during worker setup."""
        import tensorflow as tf
        self.model = tf.saved_model.load("gs://my-models/latest/")

    def process(self, element):
        prediction = self.model(element["features"])
        element["prediction"] = prediction.numpy().tolist()
        yield element

with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        | "ReadInput" >> beam.io.ReadFromPubSub(topic="projects/my-project/topics/events")
        | "ParseJSON" >> beam.Map(json.loads)
        # Request GPU for the inference step
        | "RunInference" >> beam.ParDo(MLInference())
            .with_resource_hints(
                min_ram="16GB",
                accelerator="type:nvidia-tesla-t4;count:1;install-nvidia-driver"
            )
        | "WriteResults" >> beam.io.WriteToBigQuery("my-project:dataset.predictions")
    )
```

## Vertical Autoscaling in Action

Dataflow Prime automatically adjusts worker memory based on actual usage. If a step starts using more memory than initially allocated, Prime can replace workers with workers that have a larger memory allocation. Here is how to monitor this:

```python
# monitoring.py
# Check resource utilization of a Dataflow Prime job
from datetime import datetime, timedelta, timezone

from google.cloud import monitoring_v3
from google.protobuf.timestamp_pb2 import Timestamp


def get_resource_metrics(project_id, job_id):
    """Retrieve CPU and allocated-memory metrics for a Dataflow job."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    now = datetime.now(timezone.utc)
    start = Timestamp()
    start.FromDatetime(now - timedelta(hours=1))
    end = Timestamp()
    end.FromDatetime(now)

    interval = monitoring_v3.TimeInterval(start_time=start, end_time=end)
    metric_types = [
        "dataflow.googleapis.com/job/aggregated_worker_utilization",
        "dataflow.googleapis.com/job/memory_capacity",
    ]

    for metric_type in metric_types:
        results = client.list_time_series(
            request={
                "name": project_name,
                "filter": (
                    f'metric.type = "{metric_type}" '
                    f'AND metric.labels.job_id = "{job_id}"'
                ),
                "interval": interval,
                "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            }
        )

        for series in results:
            for point in series.points:
                print(f"{metric_type}: {point.value}")

get_resource_metrics("my-project", "2026-02-17_12345")
```

## Comparing Costs: Standard vs Prime

Use the Dataflow monitoring page or the billing API to compare costs between standard and Prime runs of the same pipeline:

```bash
# List recent Dataflow jobs and their resource consumption
gcloud dataflow jobs list \
  --region=us-central1 \
  --status=terminated \
  --format="table(id, name, currentState, createTime)" \
  --limit=10

# Get detailed metrics for a specific job
gcloud beta dataflow metrics list JOB_ID \
  --region=us-central1 \
  --source=service
```

You can also estimate savings by analyzing your current pipeline's resource usage:

```python
# cost_analysis.py
# Analyze resource usage to estimate Prime savings
from google.cloud import monitoring_v3
from datetime import datetime, timedelta, timezone
from google.protobuf.timestamp_pb2 import Timestamp


def analyze_worker_utilization(project_id, job_id):
    """Analyze CPU and allocated memory for a Dataflow job."""
    client = monitoring_v3.MetricServiceClient()
    project_name = f"projects/{project_id}"

    now = datetime.now(timezone.utc)
    start = Timestamp()
    start.FromDatetime(now - timedelta(hours=24))
    end = Timestamp()
    end.FromDatetime(now)

    interval = monitoring_v3.TimeInterval(start_time=start, end_time=end)

    # Query CPU utilization
    results = client.list_time_series(
        request={
            "name": project_name,
            "filter": (
                'metric.type = "dataflow.googleapis.com/job/aggregated_worker_utilization" '
                f'AND metric.labels.job_id = "{job_id}"'
            ),
            "interval": interval,
            "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
        }
    )

    for series in results:
        for point in series.points:
            print(f"CPU utilization: {point.value}")

analyze_worker_utilization("my-project", "2026-02-17_12345")
```

## Best Practices for Dataflow Prime

Here are patterns that help you get the most out of Prime:

```python
# best_practices.py
# Pipeline structured for optimal Dataflow Prime resource usage
import apache_beam as beam

def build_optimized_pipeline(pipeline):
    """Build a pipeline with clear stage separation for Prime optimization."""

    # Separate light and heavy processing into distinct steps
    # so Prime can allocate different resources to each

    # Light step: parsing and filtering
    filtered = (
        pipeline
        | "Read" >> beam.io.ReadFromPubSub(
            subscription="projects/my-project/subscriptions/input"
        )
        | "Parse" >> beam.Map(parse_message)
            .with_resource_hints(min_ram="512MB")
        | "Filter" >> beam.Filter(is_valid_event)
            .with_resource_hints(min_ram="512MB")
    )

    # Medium step: enrichment with side input lookup
    enriched = (
        filtered
        | "Enrich" >> beam.ParDo(
            EnrichWithLookup(),
            lookup_table=beam.pvalue.AsDict(lookup_pcoll),
        ).with_resource_hints(min_ram="4GB")
    )

    # Heavy step: windowed aggregation
    aggregated = (
        enriched
        | "Window" >> beam.WindowInto(beam.window.FixedWindows(300))
        | "Key" >> beam.Map(lambda x: (x["category"], x))
        | "Group" >> beam.GroupByKey()
            .with_resource_hints(min_ram="16GB")
        | "Aggregate" >> beam.Map(compute_aggregates)
            .with_resource_hints(min_ram="2GB")
    )

    # Light step: writing results
    (
        aggregated
        | "Format" >> beam.Map(format_output)
        | "Write" >> beam.io.WriteToBigQuery(
            "my-project:dataset.aggregated_events"
        ).with_resource_hints(min_ram="1GB")
    )
```

## Streaming Pipeline with Prime

Dataflow Prime works especially well for streaming pipelines where different stages have very different resource needs. For streaming pipelines, enable streaming right fitting when you want resource hints to create separate worker pools:

```python
# streaming_prime.py
# Streaming pipeline optimized for Dataflow Prime
import apache_beam as beam
import json
from apache_beam.options.pipeline_options import PipelineOptions

options = PipelineOptions(
    runner="DataflowRunner",
    project="my-project",
    region="us-central1",
    temp_location="gs://my-bucket/temp",
    streaming=True,
    dataflow_service_options=["enable_prime"],
    experiments=["enable_streaming_rightfitting"],
    # Prime handles autoscaling, but you can set bounds
    autoscaling_algorithm="THROUGHPUT_BASED",
    max_num_workers=20,
)

with beam.Pipeline(options=options) as pipeline:
    events = (
        pipeline
        | "ReadPubSub" >> beam.io.ReadFromPubSub(
            topic="projects/my-project/topics/clickstream"
        ).with_resource_hints(min_ram="512MB")
        | "Decode" >> beam.Map(lambda msg: json.loads(msg.decode()))
    )

    # Branch 1: Real-time metrics (lightweight)
    (
        events
        | "WindowForMetrics" >> beam.WindowInto(beam.window.FixedWindows(60))
        | "CountEvents" >> beam.combiners.Count.PerElement()
            .with_resource_hints(min_ram="1GB")
        | "WriteMetrics" >> beam.io.WriteToBigQuery(
            "my-project:dataset.realtime_metrics"
        )
    )

    # Branch 2: Session analysis (memory-heavy)
    (
        events
        | "WindowForSessions" >> beam.WindowInto(
            beam.window.Sessions(1800)  # 30-minute session gap
        ).with_resource_hints(min_ram="8GB")
        | "KeyByUser" >> beam.Map(lambda x: (x["user_id"], x))
        | "GroupSessions" >> beam.GroupByKey()
            .with_resource_hints(min_ram="16GB")
        | "AnalyzeSessions" >> beam.Map(analyze_session)
        | "WriteSessions" >> beam.io.WriteToBigQuery(
            "my-project:dataset.user_sessions"
        )
    )
```

## Summary

Dataflow Prime replaces fixed machine types with dynamic resource allocation. Enable it with the `enable_prime` service option and add resource hints to your pipeline steps using `with_resource_hints()`. The key to maximizing cost savings is structuring your pipeline so that light processing and heavy aggregation are in separate steps, allowing Prime to allocate small resources to simple transforms and large resources only where needed. For streaming pipelines with mixed workloads, enable streaming right fitting so different branches can use separate worker pools. Monitor your jobs through the Dataflow console to see the actual resource usage and verify the cost savings compared to standard Dataflow runs.
