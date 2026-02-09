# How to Monitor Video Transcoding Pipeline Performance (FFmpeg, MediaConvert) with OpenTelemetry Custom Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Video Transcoding, FFmpeg, MediaConvert

Description: Learn how to track video transcoding pipeline performance using OpenTelemetry custom metrics with FFmpeg and AWS MediaConvert.

Video transcoding is one of those backend processes that quietly consumes massive resources. When it breaks or slows down, users notice immediately because their content stops being available in the formats they need. Monitoring this pipeline with OpenTelemetry gives you visibility into every stage of the process, from file ingestion through final output delivery.

## Why Transcoding Pipelines Need Custom Metrics

Standard application metrics like CPU and memory usage only tell part of the story. For transcoding, you need domain-specific metrics: encoding speed relative to real-time, output quality scores, queue depth, and per-codec performance. OpenTelemetry custom metrics let you define these precisely.

## Setting Up the Meter Provider

First, configure OpenTelemetry in your transcoding service. This example uses Python, which is common in media processing orchestration layers.

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure the OTLP exporter pointing to your collector
exporter = OTLPMetricExporter(endpoint="http://otel-collector:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=10000)

# Create the meter provider with the reader
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

# Get a meter for the transcoding service
meter = metrics.get_meter("video.transcoding.service", version="1.0.0")
```

## Defining Transcoding-Specific Metrics

Here are the key metrics you should track for any transcoding pipeline.

```python
# Histogram for transcoding duration broken down by codec and resolution
transcode_duration = meter.create_histogram(
    name="transcoding.job.duration",
    description="Time taken to transcode a single video job",
    unit="s",
)

# Counter for completed and failed jobs
jobs_completed = meter.create_counter(
    name="transcoding.jobs.completed",
    description="Total number of transcoding jobs completed",
)

jobs_failed = meter.create_counter(
    name="transcoding.jobs.failed",
    description="Total number of transcoding jobs that failed",
)

# Gauge for current queue depth
queue_depth = meter.create_up_down_counter(
    name="transcoding.queue.depth",
    description="Number of jobs currently waiting in the transcode queue",
)

# Histogram for encoding speed ratio (1.0 means real-time)
encoding_speed = meter.create_histogram(
    name="transcoding.encoding.speed_ratio",
    description="Encoding speed as a ratio of real-time playback speed",
)
```

## Instrumenting an FFmpeg Transcoding Job

When wrapping FFmpeg calls, you can parse its progress output to feed metrics in real time.

```python
import subprocess
import time
import re

def transcode_with_ffmpeg(input_path, output_path, codec, resolution):
    """Run an FFmpeg transcode job and record OpenTelemetry metrics."""

    attributes = {
        "codec": codec,
        "resolution": resolution,
        "pipeline": "ffmpeg",
    }

    queue_depth.add(1, attributes)
    start_time = time.time()

    cmd = [
        "ffmpeg", "-i", input_path,
        "-c:v", codec,
        "-s", resolution,
        "-progress", "pipe:1",  # Output progress to stdout
        "-y", output_path
    ]

    try:
        process = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )

        # Parse FFmpeg progress output for speed metrics
        for line in process.stdout:
            if line.startswith("speed="):
                # FFmpeg reports speed like "speed=2.5x"
                speed_match = re.search(r"speed=(\d+\.?\d*)x", line)
                if speed_match:
                    speed_value = float(speed_match.group(1))
                    encoding_speed.record(speed_value, attributes)

        process.wait()
        duration = time.time() - start_time

        if process.returncode == 0:
            jobs_completed.add(1, attributes)
            transcode_duration.record(duration, attributes)
        else:
            jobs_failed.add(1, attributes)

    except Exception as e:
        jobs_failed.add(1, attributes)
        raise
    finally:
        queue_depth.add(-1, attributes)
```

## Tracking AWS MediaConvert Jobs

For cloud-based transcoding with AWS MediaConvert, you can poll job status and record metrics.

```python
import boto3

mediaconvert = boto3.client("mediaconvert", endpoint_url="https://abc123.mediaconvert.us-east-1.amazonaws.com")

def check_mediaconvert_job(job_id):
    """Poll a MediaConvert job and record its metrics."""
    response = mediaconvert.get_job(Id=job_id)
    job = response["Job"]

    attributes = {
        "pipeline": "mediaconvert",
        "queue": job.get("Queue", "default"),
        "status": job["Status"],
    }

    if job["Status"] == "COMPLETE":
        # Calculate duration from timestamps
        created = job["CreatedAt"]
        finished = job["Timing"]["FinishTime"]
        duration_seconds = (finished - created).total_seconds()

        transcode_duration.record(duration_seconds, attributes)
        jobs_completed.add(1, attributes)

        # Record output file sizes for bandwidth planning
        for output_group in job.get("OutputGroupDetails", []):
            for detail in output_group.get("OutputDetails", []):
                duration_ms = detail.get("DurationInMs", 0)
                if duration_ms > 0:
                    # Calculate effective encoding speed
                    ratio = (duration_ms / 1000.0) / duration_seconds
                    encoding_speed.record(ratio, attributes)

    elif job["Status"] == "ERROR":
        jobs_failed.add(1, attributes)
```

## Adding Output Quality Metrics

If you run quality checks (VMAF, PSNR, SSIM) after transcoding, record those too.

```python
quality_score = meter.create_histogram(
    name="transcoding.output.quality_score",
    description="Quality score of transcoded output (VMAF scale 0-100)",
)

def record_quality_check(vmaf_score, codec, resolution):
    quality_score.record(vmaf_score, {
        "codec": codec,
        "resolution": resolution,
        "metric_type": "vmaf",
    })
```

## Building Useful Dashboards

With these metrics flowing into your observability backend, build dashboards that answer operational questions:

- **Throughput**: Jobs completed per minute, segmented by codec and resolution. This tells you if your fleet is keeping up with demand.
- **Latency distribution**: The p50, p90, and p99 of `transcoding.job.duration` reveals whether a few outlier jobs are dragging your SLAs down.
- **Speed ratio trends**: If encoding speed drops below 1.0x consistently, you need more compute capacity or your encoding settings are too aggressive.
- **Failure rate by codec**: Some codecs are more error-prone. Track failure rates to know where to invest in resilience.
- **Queue depth over time**: A growing queue means your processing capacity is not matching ingest rate.

## Alerting Strategy

Set up alerts on these conditions:

- Queue depth exceeding a threshold for more than 5 minutes
- Failure rate jumping above 5% in any 10-minute window
- p99 transcode duration exceeding your SLA target
- Encoding speed ratio dropping below 0.5x (falling behind real-time)

These custom metrics give you the operational visibility that generic infrastructure monitoring simply cannot provide. The key is instrumenting at the domain level, where the concepts of codecs, resolutions, and encoding speeds actually mean something to your team.
