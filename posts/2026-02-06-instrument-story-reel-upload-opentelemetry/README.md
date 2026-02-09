# How to Instrument Story and Reel Upload, Processing, and Distribution Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Story Upload, Video Processing, Media Pipeline

Description: Instrument story and reel upload, transcoding, and distribution pipelines with OpenTelemetry to track processing time and failures.

Stories and reels are the primary content format on modern social media platforms. When a user uploads a 15-second reel, the backend needs to receive the file, validate it, transcode it into multiple resolutions and formats, generate thumbnails, run content moderation, and distribute it to the CDN. This entire pipeline needs to complete in seconds, not minutes. OpenTelemetry tracing across every stage gives you the visibility to meet that bar.

## Setting Up Tracing

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(
    OTLPSpanExporter(endpoint="http://otel-collector:4317")
))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("media.pipeline")
meter = metrics.get_meter("media.pipeline")
```

## Tracing the Upload and Ingestion Phase

The upload is the first step. The client sends the raw video file and the backend needs to validate and store it before processing begins.

```python
def handle_media_upload(upload_id: str, user_id: str, media_type: str, file_data: bytes):
    with tracer.start_as_current_span("media.upload") as span:
        span.set_attribute("upload.id", upload_id)
        span.set_attribute("user.id", user_id)
        span.set_attribute("media.type", media_type)  # story or reel
        span.set_attribute("upload.size_bytes", len(file_data))

        # Validate the file format and size
        with tracer.start_as_current_span("media.upload.validate") as val_span:
            validation = validate_media_file(file_data, media_type)
            val_span.set_attribute("validation.format", validation.detected_format)
            val_span.set_attribute("validation.codec", validation.codec)
            val_span.set_attribute("validation.duration_seconds", validation.duration)
            val_span.set_attribute("validation.resolution", f"{validation.width}x{validation.height}")
            val_span.set_attribute("validation.passed", validation.passed)

            if not validation.passed:
                val_span.add_event("validation_failed", {
                    "reason": validation.rejection_reason
                })
                return UploadResult(success=False, reason=validation.rejection_reason)

        # Store the raw file in object storage
        with tracer.start_as_current_span("media.upload.store_raw") as store_span:
            storage_key = store_raw_media(upload_id, file_data)
            store_span.set_attribute("storage.bucket", "raw-media")
            store_span.set_attribute("storage.key", storage_key)
            store_span.set_attribute("storage.upload_duration_ms",
                                     store_span.end_time - store_span.start_time if hasattr(store_span, 'end_time') else 0)

        # Enqueue the transcoding job
        with tracer.start_as_current_span("media.upload.enqueue_transcode"):
            job_id = enqueue_transcode_job(upload_id, storage_key, validation)
            span.set_attribute("transcode.job_id", job_id)

        return UploadResult(success=True, upload_id=upload_id, job_id=job_id)
```

## Tracing the Transcoding Pipeline

Transcoding is the most compute-intensive part. A single upload gets transcoded into multiple output profiles (different resolutions, bitrates, and formats).

```python
def process_transcode_job(job_id: str, upload_id: str, source_key: str):
    with tracer.start_as_current_span("media.transcode") as span:
        span.set_attribute("transcode.job_id", job_id)
        span.set_attribute("upload.id", upload_id)

        # Define output profiles based on content type
        profiles = get_transcode_profiles()  # e.g., 1080p, 720p, 480p, 360p
        span.set_attribute("transcode.profile_count", len(profiles))

        output_keys = []
        for profile in profiles:
            with tracer.start_as_current_span("media.transcode.encode") as encode_span:
                encode_span.set_attribute("profile.name", profile.name)
                encode_span.set_attribute("profile.resolution", profile.resolution)
                encode_span.set_attribute("profile.bitrate_kbps", profile.bitrate)
                encode_span.set_attribute("profile.codec", profile.codec)

                result = run_ffmpeg_encode(source_key, profile)
                encode_span.set_attribute("encode.duration_seconds", result.encode_time)
                encode_span.set_attribute("encode.output_size_bytes", result.output_size)
                encode_span.set_attribute("encode.speed_ratio", result.speed_ratio)

                output_keys.append(result.output_key)

        # Generate thumbnails
        with tracer.start_as_current_span("media.transcode.thumbnails") as thumb_span:
            thumbnails = generate_thumbnails(source_key, count=3)
            thumb_span.set_attribute("thumbnails.generated", len(thumbnails))

        # Run content moderation on the processed video
        with tracer.start_as_current_span("media.transcode.moderate") as mod_span:
            moderation = run_media_moderation(source_key)
            mod_span.set_attribute("moderation.safe", moderation.is_safe)
            mod_span.set_attribute("moderation.categories_flagged", len(moderation.flags))

            if not moderation.is_safe:
                mod_span.add_event("content_flagged", {
                    "flags": str(moderation.flags)
                })

        span.set_attribute("transcode.outputs_created", len(output_keys))
        span.set_attribute("transcode.moderation_passed", moderation.is_safe)
        return TranscodeResult(outputs=output_keys, thumbnails=thumbnails, safe=moderation.is_safe)
```

## Tracing CDN Distribution

After transcoding, the processed files need to be distributed to CDN edge nodes for fast playback.

```python
def distribute_to_cdn(upload_id: str, transcode_result):
    with tracer.start_as_current_span("media.distribute") as span:
        span.set_attribute("upload.id", upload_id)
        span.set_attribute("outputs.count", len(transcode_result.outputs))

        # Push to CDN origin
        with tracer.start_as_current_span("media.distribute.cdn_push") as cdn_span:
            cdn_result = push_to_cdn_origin(transcode_result.outputs)
            cdn_span.set_attribute("cdn.provider", "cloudfront")
            cdn_span.set_attribute("cdn.origin_push_duration_ms", cdn_result.duration_ms)
            cdn_span.set_attribute("cdn.files_distributed", cdn_result.files_count)

        # Generate the playback manifest (HLS/DASH)
        with tracer.start_as_current_span("media.distribute.generate_manifest") as manifest_span:
            manifest = generate_playback_manifest(transcode_result.outputs)
            manifest_span.set_attribute("manifest.format", "HLS")
            manifest_span.set_attribute("manifest.variants", len(manifest.variants))

        # Update the media record in the database to mark it as ready
        with tracer.start_as_current_span("media.distribute.mark_ready"):
            mark_media_ready(upload_id, manifest.url)
            span.set_attribute("media.playback_url", manifest.url)

        span.set_attribute("distribution.complete", True)
```

## Pipeline Metrics

```python
upload_duration = meter.create_histogram(
    "media.upload.duration_ms",
    description="Time from upload start to raw file stored",
    unit="ms"
)

transcode_duration = meter.create_histogram(
    "media.transcode.duration_seconds",
    description="Total transcoding time per upload",
    unit="s"
)

end_to_end_processing = meter.create_histogram(
    "media.pipeline.end_to_end_seconds",
    description="Total time from upload to CDN availability",
    unit="s"
)

transcode_failures = meter.create_counter(
    "media.transcode.failures",
    description="Failed transcoding jobs"
)
```

## Why This Matters

Users expect their story or reel to be viewable within seconds of uploading. When the pipeline is slow, users think the upload failed and try again, creating duplicate content and wasted compute. With OpenTelemetry tracing the full pipeline, you can see exactly which profile took the longest to encode, whether the CDN push was slow, or whether moderation added unexpected delay. That granularity is what lets you optimize the pipeline from minutes to seconds.
