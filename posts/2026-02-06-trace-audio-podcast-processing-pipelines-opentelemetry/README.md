# How to Trace Audio and Podcast Processing Pipelines (Upload, Transcode, Distribute) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Audio Processing, Podcasting, Distributed Tracing

Description: Trace your entire audio and podcast processing pipeline from upload through transcoding to distribution with OpenTelemetry.

Podcast and audio platforms process thousands of uploads daily. Each file goes through a multi-stage pipeline: upload, validation, transcoding to multiple formats, loudness normalization, metadata extraction, thumbnail generation, and distribution to CDN and RSS feeds. When something goes wrong or slows down, you need to trace the exact path of a specific audio file through all of these stages. OpenTelemetry distributed tracing makes this possible.

## The Audio Processing Pipeline

A typical pipeline looks like this:

1. Creator uploads a raw audio file (WAV, FLAC, or high-bitrate MP3)
2. Server validates the file format and duration
3. Audio is transcoded to delivery formats (128kbps MP3, 64kbps AAC, etc.)
4. Loudness normalization is applied (EBU R128 or similar)
5. Metadata is extracted and indexed (ID3 tags, duration, chapters)
6. Waveform visualization is generated
7. Files are distributed to CDN and RSS feed is updated

## Starting the Trace at Upload

The upload handler creates the root span that all downstream processing will attach to.

```python
from opentelemetry import trace, metrics
import time

tracer = trace.get_tracer("audio.pipeline", "1.0.0")
meter = metrics.get_meter("audio.pipeline.metrics", "1.0.0")

upload_duration = meter.create_histogram(
    name="audio.upload.duration",
    description="Time to complete file upload",
    unit="s",
)

pipeline_duration = meter.create_histogram(
    name="audio.pipeline.total_duration",
    description="Total time from upload start to distribution complete",
    unit="s",
)

stage_duration = meter.create_histogram(
    name="audio.pipeline.stage_duration",
    description="Duration of each pipeline stage",
    unit="s",
)


def handle_upload(request):
    """Handle an incoming audio file upload."""
    with tracer.start_as_current_span("audio.upload") as span:
        start = time.time()

        file_data = request.files["audio"]
        episode_id = request.form["episode_id"]
        podcast_id = request.form["podcast_id"]

        span.set_attribute("episode.id", episode_id)
        span.set_attribute("podcast.id", podcast_id)
        span.set_attribute("upload.filename", file_data.filename)
        span.set_attribute("upload.size_bytes", file_data.content_length)

        # Save the raw file to object storage
        raw_path = save_to_storage(file_data, episode_id)
        span.set_attribute("storage.raw_path", raw_path)

        elapsed = time.time() - start
        upload_duration.record(elapsed, {"podcast_id": podcast_id})

        # Enqueue the processing job with trace context
        enqueue_processing_job({
            "episode_id": episode_id,
            "podcast_id": podcast_id,
            "raw_path": raw_path,
            "trace_context": get_serialized_context(),
        })

        return {"status": "processing", "episode_id": episode_id}
```

## Processing Worker: Validation and Transcoding

The async worker picks up the job and runs through each stage, creating child spans for each one.

```python
def process_audio_job(job):
    """Main processing worker that runs through all pipeline stages."""

    # Restore the trace context from the upload request
    ctx = deserialize_context(job["trace_context"])
    episode_id = job["episode_id"]
    podcast_id = job["podcast_id"]

    with tracer.start_as_current_span(
        "audio.pipeline.process", context=ctx
    ) as pipeline_span:
        pipeline_start = time.time()
        pipeline_span.set_attribute("episode.id", episode_id)

        # Stage 1: Validate the audio file
        with tracer.start_as_current_span("audio.validate") as val_span:
            stage_start = time.time()
            info = validate_audio(job["raw_path"])
            val_span.set_attribute("audio.format", info.format)
            val_span.set_attribute("audio.duration_s", info.duration)
            val_span.set_attribute("audio.sample_rate", info.sample_rate)
            val_span.set_attribute("audio.channels", info.channels)
            val_span.set_attribute("audio.bitrate_kbps", info.bitrate)

            stage_duration.record(
                time.time() - stage_start,
                {"stage": "validate", "podcast_id": podcast_id},
            )

        # Stage 2: Transcode to delivery formats
        output_paths = {}
        formats = [
            {"codec": "mp3", "bitrate": "128k"},
            {"codec": "mp3", "bitrate": "64k"},
            {"codec": "aac", "bitrate": "128k"},
            {"codec": "aac", "bitrate": "64k"},
            {"codec": "opus", "bitrate": "48k"},
        ]

        with tracer.start_as_current_span("audio.transcode") as tc_span:
            stage_start = time.time()
            tc_span.set_attribute("transcode.format_count", len(formats))

            for fmt in formats:
                with tracer.start_as_current_span(
                    f"audio.transcode.{fmt['codec']}_{fmt['bitrate']}"
                ) as fmt_span:
                    fmt_span.set_attribute("transcode.codec", fmt["codec"])
                    fmt_span.set_attribute("transcode.bitrate", fmt["bitrate"])

                    output_path = transcode_audio(
                        job["raw_path"], fmt["codec"], fmt["bitrate"]
                    )
                    output_paths[f"{fmt['codec']}_{fmt['bitrate']}"] = output_path

                    # Record output file size
                    output_size = get_file_size(output_path)
                    fmt_span.set_attribute("output.size_bytes", output_size)

            stage_duration.record(
                time.time() - stage_start,
                {"stage": "transcode", "podcast_id": podcast_id},
            )

        # Stage 3: Loudness normalization
        with tracer.start_as_current_span("audio.normalize") as norm_span:
            stage_start = time.time()
            for key, path in output_paths.items():
                measured_lufs = measure_loudness(path)
                norm_span.set_attribute(f"loudness.{key}.measured_lufs", measured_lufs)

                if abs(measured_lufs - TARGET_LUFS) > 0.5:
                    normalize_loudness(path, TARGET_LUFS)
                    norm_span.set_attribute(f"loudness.{key}.normalized", True)

            stage_duration.record(
                time.time() - stage_start,
                {"stage": "normalize", "podcast_id": podcast_id},
            )

        # Stage 4: Metadata extraction
        with tracer.start_as_current_span("audio.metadata") as meta_span:
            stage_start = time.time()
            metadata = extract_metadata(job["raw_path"])
            meta_span.set_attribute("metadata.has_chapters", len(metadata.chapters) > 0)
            meta_span.set_attribute("metadata.chapter_count", len(metadata.chapters))
            update_episode_metadata(episode_id, metadata)

            stage_duration.record(
                time.time() - stage_start,
                {"stage": "metadata", "podcast_id": podcast_id},
            )

        # Stage 5: Generate waveform visualization
        with tracer.start_as_current_span("audio.waveform") as wave_span:
            stage_start = time.time()
            waveform_path = generate_waveform(job["raw_path"], episode_id)
            wave_span.set_attribute("waveform.path", waveform_path)

            stage_duration.record(
                time.time() - stage_start,
                {"stage": "waveform", "podcast_id": podcast_id},
            )

        # Stage 6: Distribute to CDN and update RSS
        with tracer.start_as_current_span("audio.distribute") as dist_span:
            stage_start = time.time()

            cdn_urls = {}
            for key, path in output_paths.items():
                cdn_url = upload_to_cdn(path, episode_id, key)
                cdn_urls[key] = cdn_url

            dist_span.set_attribute("cdn.url_count", len(cdn_urls))

            # Update RSS feed with the new episode
            update_rss_feed(podcast_id, episode_id, cdn_urls, metadata)
            dist_span.set_attribute("rss.updated", True)

            stage_duration.record(
                time.time() - stage_start,
                {"stage": "distribute", "podcast_id": podcast_id},
            )

        # Record total pipeline duration
        total_elapsed = time.time() - pipeline_start
        pipeline_duration.record(total_elapsed, {"podcast_id": podcast_id})
        pipeline_span.set_attribute("pipeline.total_duration_s", total_elapsed)
```

## Tracking Pipeline Health Metrics

Beyond per-job traces, you need aggregate metrics for pipeline health.

```python
# Track jobs in each state
jobs_in_progress = meter.create_up_down_counter(
    name="audio.pipeline.jobs_in_progress",
    description="Number of audio processing jobs currently running",
)

jobs_completed = meter.create_counter(
    name="audio.pipeline.jobs_completed",
    description="Total completed audio processing jobs",
)

jobs_failed = meter.create_counter(
    name="audio.pipeline.jobs_failed",
    description="Total failed audio processing jobs",
)
```

## What to Monitor

Your dashboard should show:

- **Pipeline throughput**: Jobs completed per hour, broken down by podcast. Helps with capacity planning.
- **Per-stage latency breakdown**: A stacked bar chart showing how much time each stage takes. Transcoding usually dominates, but normalization can surprise you with long files.
- **Queue depth**: If jobs are piling up faster than workers can process them, you need more workers or faster processing.
- **Failure rate by stage**: Know which stage fails most often. Validation failures are usually bad input. Transcode failures might indicate codec bugs.

## Alerting

- Pipeline total duration exceeding your SLA (for example, 10 minutes for a 1-hour episode)
- Job failure rate above 2% in any 30-minute window
- Queue depth growing continuously for more than 15 minutes
- Any stage latency p95 exceeding twice its normal value

This level of tracing means that when a creator reports their episode is stuck, you can look up the exact trace by episode ID, see which stage it is in, and know immediately whether it is a transient issue or something that needs engineering attention.
