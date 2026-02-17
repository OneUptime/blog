# How to Choose Between Batch and Streaming Modes in Google Cloud Dataflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Apache Beam, Batch Processing, Stream Processing, Architecture

Description: Learn when to use batch versus streaming mode in Google Cloud Dataflow and understand the tradeoffs in cost, latency, and complexity.

---

When you start building data pipelines on Dataflow, one of the first decisions you face is whether to run in batch mode or streaming mode. Both use the same Apache Beam programming model, but they behave very differently in terms of latency, cost, complexity, and error handling. Choosing the wrong mode can mean paying too much for processing you do not need, or building something more complex than necessary.

In this post, I will break down the differences between batch and streaming in Dataflow, help you decide which one fits your use case, and cover the gray area where either could work.

## Batch Mode Fundamentals

Batch mode processes a bounded dataset - a fixed amount of data with a clear beginning and end. Think of it as "process this file" or "process today's data." The pipeline starts, reads all the input data, processes it, writes the output, and stops.

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

# A batch pipeline reads from a bounded source
options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--temp_location=gs://my-bucket/temp/',
])

with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        # Bounded source: reads all files matching the pattern
        | 'ReadFiles' >> beam.io.ReadFromText('gs://my-bucket/data/2026-02-16/*.json')
        | 'ParseJSON' >> beam.Map(json.loads)
        | 'TransformData' >> beam.Map(transform_function)
        | 'WriteToBQ' >> beam.io.WriteToBigQuery(
            table='my_project:analytics.daily_summary',
            write_disposition=beam.io.BigQueryDisposition.WRITE_TRUNCATE
        )
    )
```

Batch pipelines are simpler to reason about. You know exactly how much data will be processed, the pipeline has a clear finish time, and if something goes wrong, you can just rerun it. Dataflow optimizes batch pipelines for throughput - it spins up workers, processes data as fast as possible, and shuts down.

## Streaming Mode Fundamentals

Streaming mode processes an unbounded dataset - data that arrives continuously without a defined end. The pipeline starts and keeps running indefinitely, processing new data as it arrives. The most common source for streaming pipelines on GCP is Pub/Sub.

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

# A streaming pipeline reads from an unbounded source
options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--temp_location=gs://my-bucket/temp/',
    '--streaming',  # Enable streaming mode
])

with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        # Unbounded source: continuously reads from Pub/Sub
        | 'ReadPubSub' >> beam.io.ReadFromPubSub(
            topic='projects/my-project/topics/events'
        )
        | 'ParseJSON' >> beam.Map(json.loads)
        | 'TransformData' >> beam.Map(transform_function)
        | 'WriteToBQ' >> beam.io.WriteToBigQuery(
            table='my_project:analytics.realtime_events',
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND
        )
    )
```

Streaming pipelines are always on. Workers stay running to handle incoming data with low latency. This comes with higher costs because you are paying for compute even during quiet periods.

## When to Choose Batch

Batch processing is the right choice in several common scenarios.

Periodic data loads. If you receive data files daily, hourly, or on any fixed schedule, batch is natural. You trigger the pipeline when new data arrives, it processes the batch, and it stops.

Historical reprocessing. When you need to reprocess months of historical data because of a schema change or bug fix, batch is the only practical option. You can process terabytes of data efficiently and pay only for the processing time.

Cost-sensitive workloads. Batch is almost always cheaper than streaming for the same volume of data. Workers spin up only when needed and shut down when done. There is no idle compute.

Late data tolerance. If your use case can handle data being a few hours old, batch is simpler and cheaper than streaming. Many analytics and reporting workloads fall into this category.

## When to Choose Streaming

Streaming is the right choice when latency matters.

Real-time dashboards. If users expect to see data within seconds of it being generated, streaming is necessary. Batch latency measured in minutes or hours will not work.

Event-driven architectures. When downstream systems need to react to events as they happen, like sending a notification when a threshold is crossed, streaming provides the low latency required.

Continuous data sources. If your data source is naturally streaming, like IoT sensors, application logs, or user activity events via Pub/Sub, a streaming pipeline is the natural fit.

Fraud detection and alerting. Use cases that require immediate action based on incoming data need streaming. You cannot wait for a batch run to detect a fraudulent transaction.

## The Cost Difference

Let me be concrete about costs. A batch pipeline that processes 1 TB of data might run for 30 minutes using 10 workers. You pay for 5 worker-hours. A streaming pipeline that handles the same 1 TB but spread over 24 hours needs workers running all day. Even with autoscaling, you might pay for 48 or more worker-hours.

```python
# Streaming pipeline with autoscaling to manage costs
options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--streaming',
    # Autoscaling configuration to reduce costs during low traffic
    '--autoscaling_algorithm=THROUGHPUT_BASED',
    '--max_num_workers=20',
    '--num_workers=2',  # Start with minimal workers
])
```

Autoscaling helps, but streaming will still cost more than batch for equivalent data volumes because of the always-on nature.

## The Complexity Difference

Streaming introduces concepts that batch does not need to worry about.

Windowing. In streaming, you need to decide how to group data for aggregation. Do you aggregate over 1-minute windows? 5-minute windows? Sliding windows? This concept does not exist in batch because all the data is available at once.

```python
import apache_beam as beam
from apache_beam import window

# Streaming pipeline with windowing
with beam.Pipeline(options=streaming_options) as pipeline:
    (
        pipeline
        | 'ReadPubSub' >> beam.io.ReadFromPubSub(topic='projects/my-project/topics/events')
        | 'ParseJSON' >> beam.Map(json.loads)
        # Window events into 5-minute intervals
        | 'Window' >> beam.WindowInto(window.FixedWindows(300))  # 300 seconds
        | 'CountPerWindow' >> beam.combiners.Count.PerElement()
        | 'WriteToBQ' >> beam.io.WriteToBigQuery(
            table='my_project:analytics.event_counts_5min'
        )
    )
```

Late data handling. In streaming, data can arrive after the window it belongs to has already been processed. You need to decide how to handle this - drop it, reprocess the window, or accumulate results.

```python
# Handle late data with allowed lateness
(
    pipeline
    | 'ReadPubSub' >> beam.io.ReadFromPubSub(topic='projects/my-project/topics/events')
    | 'AddTimestamps' >> beam.Map(lambda x: beam.window.TimestampedValue(x, x['timestamp']))
    | 'Window' >> beam.WindowInto(
        window.FixedWindows(300),
        # Allow data up to 1 hour late
        allowed_lateness=3600,
        # Accumulate results when late data arrives
        accumulation_mode=beam.trigger.AccumulationMode.ACCUMULATING
    )
)
```

Exactly-once semantics. Ensuring each record is processed exactly once is harder in streaming than batch. Dataflow provides exactly-once guarantees, but your downstream sinks also need to handle potential duplicates.

## The Hybrid Approach: Micro-Batch

Sometimes the best answer is neither pure batch nor pure streaming but a middle ground. Running batch pipelines very frequently (every 5-15 minutes) gives you relatively low latency with the simplicity and cost benefits of batch.

```bash
# Schedule a batch pipeline to run every 15 minutes using Cloud Scheduler
gcloud scheduler jobs create http micro-batch-pipeline \
  --schedule="*/15 * * * *" \
  --uri="https://dataflow.googleapis.com/v1b3/projects/my-project/locations/us-central1/templates:launch" \
  --http-method=POST \
  --message-body='{
    "jobName": "micro-batch-events",
    "parameters": {
      "inputPath": "gs://my-bucket/incoming/",
      "outputTable": "my_project:analytics.events"
    },
    "environment": {
      "tempLocation": "gs://my-bucket/temp/"
    }
  }' \
  --oauth-service-account-email=dataflow-sa@my-project.iam.gserviceaccount.com
```

This pattern works well when you need data freshness of 15-30 minutes but do not need true real-time.

## Decision Framework

Here is a simple decision framework.

If data freshness of hours is acceptable and cost is a priority, use batch. If data freshness of seconds is required and you have a naturally streaming source, use streaming. If data freshness of minutes is acceptable and you want to keep things simple, use micro-batch (frequent batch runs). If you are unsure, start with batch and move to streaming only when latency requirements demand it.

The biggest mistake I see teams make is defaulting to streaming when batch would be perfectly adequate. Streaming pipelines are harder to build, harder to debug, harder to maintain, and more expensive to run. Unless you have a clear latency requirement that batch cannot meet, start simple.

## Wrapping Up

The choice between batch and streaming in Dataflow comes down to latency requirements, cost tolerance, and complexity appetite. Batch is simpler, cheaper, and sufficient for most analytical workloads. Streaming is necessary when you need real-time processing but comes with added complexity and cost. The Apache Beam model makes it possible to switch between them without rewriting your pipeline logic, so you can start with batch and migrate to streaming if your requirements change.
