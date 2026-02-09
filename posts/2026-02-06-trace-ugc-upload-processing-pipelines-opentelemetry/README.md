# How to Trace User-Generated Content Upload and Processing Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, UGC, Content Pipeline, Distributed Tracing

Description: Trace user-generated content from upload through processing and publication using OpenTelemetry distributed tracing.

User-generated content platforms process millions of uploads daily. Each piece of content, whether it is a photo, video, or text post, goes through a pipeline of validation, processing, moderation, and publishing steps. When a user uploads a video and it takes 20 minutes to appear on their profile, you need to know why. OpenTelemetry distributed tracing connects every step of that journey into a single, queryable trace.

## The UGC Processing Pipeline

A standard UGC pipeline looks like this:

1. User uploads content through the API
2. File is stored in temporary staging
3. Content type detection and validation
4. Virus/malware scanning
5. Media processing (resize images, transcode video, extract thumbnails)
6. Content moderation (AI and/or human review)
7. Metadata indexing and search update
8. CDN distribution
9. Notification to the user that their content is live

## Starting the Trace at Upload

The upload API endpoint creates the root span. This is the single trace that ties everything together.

```python
from opentelemetry import trace, metrics, context
from opentelemetry.trace.propagation import set_span_in_context
import time
import uuid

tracer = trace.get_tracer("ugc.pipeline", "1.0.0")
meter = metrics.get_meter("ugc.metrics", "1.0.0")

upload_size = meter.create_histogram(
    name="ugc.upload.size",
    description="Size of uploaded content",
    unit="bytes",
)

pipeline_duration = meter.create_histogram(
    name="ugc.pipeline.duration",
    description="Total pipeline duration from upload to published",
    unit="s",
)

stage_counter = meter.create_counter(
    name="ugc.pipeline.stage.completed",
    description="Number of completions per pipeline stage",
)

pipeline_failures = meter.create_counter(
    name="ugc.pipeline.failures",
    description="Number of pipeline failures by stage and reason",
)


def handle_upload(request, user_id):
    """Handle an incoming UGC upload."""
    with tracer.start_as_current_span("ugc.upload") as span:
        content_id = str(uuid.uuid4())
        file_data = request.files["content"]
        content_type = detect_content_type(file_data)

        span.set_attribute("content.id", content_id)
        span.set_attribute("user.id", user_id)
        span.set_attribute("content.type", content_type)
        span.set_attribute("content.size_bytes", file_data.content_length)
        span.set_attribute("content.original_filename", file_data.filename)

        upload_size.record(file_data.content_length, {
            "content_type": content_type,
        })

        # Store in staging area
        staging_path = store_in_staging(file_data, content_id)
        span.set_attribute("staging.path", staging_path)

        # Create the pipeline job with trace context for propagation
        job = {
            "content_id": content_id,
            "user_id": user_id,
            "content_type": content_type,
            "staging_path": staging_path,
            "uploaded_at": time.time(),
            "trace_context": serialize_trace_context(),
        }

        # Enqueue the processing job
        pipeline_queue.enqueue(job)

        return {
            "content_id": content_id,
            "status": "processing",
        }
```

## The Processing Worker

The worker picks up jobs from the queue and runs through each stage sequentially.

```python
def process_content(job):
    """Run the full UGC processing pipeline."""
    ctx = deserialize_trace_context(job["trace_context"])
    content_id = job["content_id"]
    content_type = job["content_type"]

    with tracer.start_as_current_span("ugc.pipeline.process", context=ctx) as span:
        pipeline_start = time.time()
        span.set_attribute("content.id", content_id)
        span.set_attribute("content.type", content_type)

        attrs = {"content_type": content_type}

        try:
            # Stage 1: Validate the content
            with tracer.start_as_current_span("ugc.validate") as val_span:
                validation = validate_content(
                    job["staging_path"], content_type
                )
                val_span.set_attribute("validation.passed", validation.passed)
                val_span.set_attribute("validation.format", validation.detected_format)

                if not validation.passed:
                    pipeline_failures.add(1, {**attrs, "stage": "validate",
                        "reason": validation.failure_reason})
                    notify_user_failure(job["user_id"], content_id,
                        "Content validation failed")
                    return

                stage_counter.add(1, {**attrs, "stage": "validate"})

            # Stage 2: Virus scan
            with tracer.start_as_current_span("ugc.virus_scan") as scan_span:
                scan_result = virus_scan(job["staging_path"])
                scan_span.set_attribute("scan.clean", scan_result.is_clean)
                scan_span.set_attribute("scan.engine", scan_result.engine)

                if not scan_result.is_clean:
                    pipeline_failures.add(1, {**attrs, "stage": "virus_scan",
                        "reason": "malware_detected"})
                    quarantine_content(content_id, job["staging_path"])
                    return

                stage_counter.add(1, {**attrs, "stage": "virus_scan"})

            # Stage 3: Media processing
            processed = process_media(content_id, job["staging_path"], content_type)

            # Stage 4: Content moderation
            moderation = moderate_ugc(content_id, processed, content_type)

            if moderation.decision == "rejected":
                pipeline_failures.add(1, {**attrs, "stage": "moderation",
                    "reason": moderation.reason})
                notify_user_failure(job["user_id"], content_id,
                    "Content does not meet community guidelines")
                return

            if moderation.decision == "pending_review":
                span.set_attribute("moderation.status", "pending_human_review")
                # Pipeline pauses here; human review will resume it
                return

            # Stage 5: Index and distribute
            with tracer.start_as_current_span("ugc.index") as idx_span:
                index_content(content_id, processed.metadata)
                idx_span.set_attribute("index.fields", len(processed.metadata))
                stage_counter.add(1, {**attrs, "stage": "index"})

            with tracer.start_as_current_span("ugc.distribute") as dist_span:
                cdn_urls = distribute_to_cdn(content_id, processed.output_files)
                dist_span.set_attribute("cdn.file_count", len(cdn_urls))
                stage_counter.add(1, {**attrs, "stage": "distribute"})

            # Stage 6: Publish and notify
            with tracer.start_as_current_span("ugc.publish") as pub_span:
                publish_content(content_id, cdn_urls, processed.metadata)
                notify_user_published(job["user_id"], content_id)
                pub_span.set_attribute("publish.status", "live")
                stage_counter.add(1, {**attrs, "stage": "publish"})

            total_duration = time.time() - pipeline_start
            pipeline_duration.record(total_duration, attrs)
            span.set_attribute("pipeline.total_duration_s", total_duration)

        except Exception as e:
            span.record_exception(e)
            pipeline_failures.add(1, {**attrs, "stage": "unknown",
                "reason": "exception"})
            notify_user_failure(job["user_id"], content_id,
                "An error occurred processing your content")
            raise
```

## Media Processing with Per-Format Tracing

The media processing stage does different things based on content type. Each operation gets its own span.

```python
def process_media(content_id, staging_path, content_type):
    """Process media files into delivery formats."""
    with tracer.start_as_current_span("ugc.media_process") as span:
        span.set_attribute("content.type", content_type)
        output_files = []

        if content_type == "image":
            # Generate multiple sizes
            sizes = [
                ("thumbnail", 150, 150),
                ("preview", 600, 600),
                ("full", 1920, 1080),
            ]
            for name, width, height in sizes:
                with tracer.start_as_current_span(f"ugc.resize.{name}") as r_span:
                    output = resize_image(staging_path, width, height)
                    r_span.set_attribute("output.size_bytes", output.size)
                    output_files.append(output)

            # Extract EXIF data, strip GPS for privacy
            with tracer.start_as_current_span("ugc.strip_metadata"):
                strip_location_metadata(staging_path)

        elif content_type == "video":
            # Transcode to streaming formats
            with tracer.start_as_current_span("ugc.transcode") as tc_span:
                renditions = transcode_video(staging_path, [
                    {"resolution": "1080p", "bitrate": "5000k"},
                    {"resolution": "720p", "bitrate": "2500k"},
                    {"resolution": "480p", "bitrate": "1000k"},
                ])
                tc_span.set_attribute("renditions.count", len(renditions))
                output_files.extend(renditions)

            # Generate thumbnail from first few seconds
            with tracer.start_as_current_span("ugc.generate_thumbnail"):
                thumbnail = extract_video_thumbnail(staging_path)
                output_files.append(thumbnail)

        stage_counter.add(1, {
            "content_type": content_type,
            "stage": "media_process",
        })

        return ProcessedContent(output_files=output_files)
```

## What Your Dashboard Should Show

- **Upload volume by content type**: Understand your traffic mix. Video uploads are far more expensive to process.
- **Pipeline duration distribution**: p50 and p95, segmented by content type. Set expectations: image pipelines should complete in seconds, video in minutes.
- **Per-stage duration breakdown**: Stacked chart showing where time is spent. Transcoding dominates for video; moderation can be the bottleneck if the AI sends too many items to human review.
- **Failure rate by stage and reason**: Validation failures are user errors; transcoding failures might be infrastructure issues.
- **Queue depth**: If the processing queue is growing, you need more workers.

## Alerting

- Pipeline duration p95 exceeding your target (e.g., 5 minutes for images, 30 minutes for video)
- Failure rate above 3% in any 15-minute window
- Queue depth growing for more than 10 minutes consecutively
- Any stage showing zero completions for more than 5 minutes (possible worker crash)

The key benefit of tracing the full pipeline is that you can look up any individual content item by its ID and see exactly where it is, how long each stage took, and why it might have failed. This turns support tickets from guesswork into precise diagnosis.
