# How to Create HLS and DASH Output Formats with Google Cloud Transcoder API Job Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Transcoder API, HLS, DASH, Video Streaming

Description: Create reusable job templates in Google Cloud Transcoder API to produce both HLS and DASH streaming formats with consistent encoding settings.

---

If you transcode videos regularly, you do not want to specify the full encoding configuration for every job. Job templates in Transcoder API let you define encoding profiles once and reuse them across all your transcoding jobs. This ensures consistent output quality and simplifies your application code.

In this guide, I will create job templates that produce both HLS and DASH output simultaneously, covering the most common streaming scenarios.

## HLS vs DASH

**HLS** (HTTP Live Streaming) was created by Apple and is supported natively on iOS, macOS, and Safari. It uses `.m3u8` playlist files and `.ts` segments (or `.fmp4` with CMAF).

**DASH** (Dynamic Adaptive Streaming over HTTP) is an international standard supported by Chrome, Firefox, Edge, and Android. It uses `.mpd` manifest files and `.m4s` segments.

For maximum compatibility, you should produce both formats. The good news is that with CMAF (Common Media Application Format), you can use the same video segments for both HLS and DASH, saving encoding time and storage.

## Prerequisites

- GCP project with Transcoder API enabled
- Python 3.8+ with the Transcoder API client library
- Cloud Storage bucket for output

```bash
pip install google-cloud-video-transcoder
```

## Step 1: Create an HLS Job Template

```python
# templates.py - Creates reusable job templates for HLS and DASH

from google.cloud.video import transcoder_v1
from google.cloud.video.transcoder_v1 import types
from google.protobuf import duration_pb2

client = transcoder_v1.TranscoderServiceClient()

def create_hls_template(project_id, location):
    """Creates a job template that produces HLS output with
    three quality renditions. This template can be reused for
    any video that needs HLS encoding."""

    parent = f"projects/{project_id}/locations/{location}"

    config = types.JobConfig()

    # Define video streams at different bitrates
    streams = [
        {"key": "v-1080p", "height": 1080, "width": 1920, "bitrate": 5000000,
         "profile": "high", "fps": 30},
        {"key": "v-720p", "height": 720, "width": 1280, "bitrate": 2500000,
         "profile": "main", "fps": 30},
        {"key": "v-480p", "height": 480, "width": 854, "bitrate": 1000000,
         "profile": "main", "fps": 30},
        {"key": "v-360p", "height": 360, "width": 640, "bitrate": 500000,
         "profile": "baseline", "fps": 30},
    ]

    elementary_streams = []
    for s in streams:
        es = types.ElementaryStream()
        es.key = s["key"]
        es.video_stream = types.VideoStream()
        es.video_stream.h264 = types.VideoStream.H264CodecSettings()
        es.video_stream.h264.height_pixels = s["height"]
        es.video_stream.h264.width_pixels = s["width"]
        es.video_stream.h264.bitrate_bps = s["bitrate"]
        es.video_stream.h264.frame_rate = s["fps"]
        es.video_stream.h264.profile = s["profile"]
        # GOP duration of 2 seconds aligns segments cleanly
        es.video_stream.h264.gop_duration = "2s"
        elementary_streams.append(es)

    # Audio stream - AAC stereo
    audio_es = types.ElementaryStream()
    audio_es.key = "audio-stereo"
    audio_es.audio_stream = types.AudioStream()
    audio_es.audio_stream.codec = "aac"
    audio_es.audio_stream.bitrate_bps = 128000
    audio_es.audio_stream.channel_count = 2
    audio_es.audio_stream.sample_rate_hertz = 48000
    elementary_streams.append(audio_es)

    # Low-quality audio for the lowest video rendition
    audio_low = types.ElementaryStream()
    audio_low.key = "audio-low"
    audio_low.audio_stream = types.AudioStream()
    audio_low.audio_stream.codec = "aac"
    audio_low.audio_stream.bitrate_bps = 64000
    audio_low.audio_stream.channel_count = 2
    audio_low.audio_stream.sample_rate_hertz = 44100
    elementary_streams.append(audio_low)

    config.elementary_streams = elementary_streams

    # Create mux streams that package video and audio together
    mux_streams = []
    for s in streams:
        mux = types.MuxStream()
        mux.key = f"hls-{s['key']}"
        mux.container = "ts"  # MPEG-TS segments for HLS
        audio_key = "audio-low" if s["height"] <= 360 else "audio-stereo"
        mux.elementary_streams = [s["key"], audio_key]
        mux.segment_settings = types.SegmentSettings()
        mux.segment_settings.segment_duration = "4s"
        mux_streams.append(mux)

    config.mux_streams = mux_streams

    # Create the HLS master playlist
    manifest = types.Manifest()
    manifest.file_name = "manifest.m3u8"
    manifest.type_ = types.Manifest.ManifestType.HLS
    manifest.mux_streams = [f"hls-{s['key']}" for s in streams]
    config.manifests = [manifest]

    # Create the template
    template = types.JobTemplate()
    template.config = config

    response = client.create_job_template(
        parent=parent,
        job_template=template,
        job_template_id="hls-abr-standard",
    )
    print(f"Created HLS template: {response.name}")
    return response
```

## Step 2: Create a DASH Job Template

```python
def create_dash_template(project_id, location):
    """Creates a job template that produces DASH output with
    fragmented MP4 segments. DASH is the standard for non-Apple platforms."""

    parent = f"projects/{project_id}/locations/{location}"

    config = types.JobConfig()

    # Same video quality ladder as HLS
    streams = [
        {"key": "v-1080p", "height": 1080, "width": 1920, "bitrate": 5000000,
         "profile": "high", "fps": 30},
        {"key": "v-720p", "height": 720, "width": 1280, "bitrate": 2500000,
         "profile": "main", "fps": 30},
        {"key": "v-480p", "height": 480, "width": 854, "bitrate": 1000000,
         "profile": "main", "fps": 30},
    ]

    elementary_streams = []
    for s in streams:
        es = types.ElementaryStream()
        es.key = s["key"]
        es.video_stream = types.VideoStream()
        es.video_stream.h264 = types.VideoStream.H264CodecSettings()
        es.video_stream.h264.height_pixels = s["height"]
        es.video_stream.h264.width_pixels = s["width"]
        es.video_stream.h264.bitrate_bps = s["bitrate"]
        es.video_stream.h264.frame_rate = s["fps"]
        es.video_stream.h264.profile = s["profile"]
        es.video_stream.h264.gop_duration = "2s"
        elementary_streams.append(es)

    # Audio stream
    audio_es = types.ElementaryStream()
    audio_es.key = "audio-aac"
    audio_es.audio_stream = types.AudioStream()
    audio_es.audio_stream.codec = "aac"
    audio_es.audio_stream.bitrate_bps = 128000
    audio_es.audio_stream.channel_count = 2
    audio_es.audio_stream.sample_rate_hertz = 48000
    elementary_streams.append(audio_es)

    config.elementary_streams = elementary_streams

    # DASH uses fragmented MP4 instead of MPEG-TS
    mux_streams = []
    for s in streams:
        mux = types.MuxStream()
        mux.key = f"dash-{s['key']}"
        mux.container = "fmp4"  # Fragmented MP4 for DASH
        mux.elementary_streams = [s["key"], "audio-aac"]
        mux.segment_settings = types.SegmentSettings()
        mux.segment_settings.segment_duration = "4s"
        mux_streams.append(mux)

    config.mux_streams = mux_streams

    # DASH manifest (MPD file)
    manifest = types.Manifest()
    manifest.file_name = "manifest.mpd"
    manifest.type_ = types.Manifest.ManifestType.DASH
    manifest.mux_streams = [f"dash-{s['key']}" for s in streams]
    config.manifests = [manifest]

    template = types.JobTemplate()
    template.config = config

    response = client.create_job_template(
        parent=parent,
        job_template=template,
        job_template_id="dash-abr-standard",
    )
    print(f"Created DASH template: {response.name}")
    return response
```

## Step 3: Create a Dual-Format Template

For maximum compatibility, create a template that produces both HLS and DASH from the same encoding pass:

```python
def create_dual_format_template(project_id, location):
    """Creates a template that outputs both HLS and DASH from a single
    encoding pass. Uses CMAF-compatible fMP4 segments that work with both."""

    parent = f"projects/{project_id}/locations/{location}"
    config = types.JobConfig()

    # Video renditions
    renditions = [
        {"key": "v-1080", "h": 1080, "w": 1920, "bps": 5000000, "p": "high"},
        {"key": "v-720", "h": 720, "w": 1280, "bps": 2500000, "p": "main"},
        {"key": "v-480", "h": 480, "w": 854, "bps": 1000000, "p": "main"},
    ]

    elementary_streams = []
    for r in renditions:
        es = types.ElementaryStream()
        es.key = r["key"]
        es.video_stream = types.VideoStream()
        es.video_stream.h264 = types.VideoStream.H264CodecSettings()
        es.video_stream.h264.height_pixels = r["h"]
        es.video_stream.h264.width_pixels = r["w"]
        es.video_stream.h264.bitrate_bps = r["bps"]
        es.video_stream.h264.frame_rate = 30
        es.video_stream.h264.profile = r["p"]
        es.video_stream.h264.gop_duration = "2s"
        elementary_streams.append(es)

    # Audio
    audio = types.ElementaryStream()
    audio.key = "audio"
    audio.audio_stream = types.AudioStream()
    audio.audio_stream.codec = "aac"
    audio.audio_stream.bitrate_bps = 128000
    audio.audio_stream.channel_count = 2
    audio.audio_stream.sample_rate_hertz = 48000
    elementary_streams.append(audio)

    config.elementary_streams = elementary_streams

    # Use fMP4 mux streams - compatible with both HLS and DASH
    mux_streams = []
    for r in renditions:
        mux = types.MuxStream()
        mux.key = f"mux-{r['key']}"
        mux.container = "fmp4"
        mux.elementary_streams = [r["key"], "audio"]
        mux.segment_settings = types.SegmentSettings()
        mux.segment_settings.segment_duration = "4s"
        mux_streams.append(mux)

    config.mux_streams = mux_streams

    # Generate both HLS and DASH manifests pointing to the same segments
    hls_manifest = types.Manifest()
    hls_manifest.file_name = "manifest.m3u8"
    hls_manifest.type_ = types.Manifest.ManifestType.HLS
    hls_manifest.mux_streams = [f"mux-{r['key']}" for r in renditions]

    dash_manifest = types.Manifest()
    dash_manifest.file_name = "manifest.mpd"
    dash_manifest.type_ = types.Manifest.ManifestType.DASH
    dash_manifest.mux_streams = [f"mux-{r['key']}" for r in renditions]

    config.manifests = [hls_manifest, dash_manifest]

    template = types.JobTemplate()
    template.config = config

    response = client.create_job_template(
        parent=parent,
        job_template=template,
        job_template_id="dual-format-abr",
    )
    print(f"Created dual-format template: {response.name}")
    return response
```

## Step 4: Use Templates to Create Jobs

With templates defined, creating transcoding jobs is simple:

```python
def transcode_with_template(project_id, location, template_id, input_uri, output_uri):
    """Creates a transcoding job using a predefined template.
    This is the typical way to trigger transcoding in production."""

    client = transcoder_v1.TranscoderServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    job = types.Job()
    job.input_uri = input_uri
    job.output_uri = output_uri
    job.template_id = template_id

    response = client.create_job(parent=parent, job=job)
    print(f"Job created: {response.name}")
    return response

# Transcode a video using the dual-format template
job = transcode_with_template(
    project_id="your-project",
    location="us-central1",
    template_id="dual-format-abr",
    input_uri="gs://your-input-bucket/video.mp4",
    output_uri="gs://your-output-bucket/transcoded/video/",
)
```

## Step 5: List and Manage Templates

```python
def list_templates(project_id, location):
    """Lists all job templates in the project."""
    client = transcoder_v1.TranscoderServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    templates = client.list_job_templates(parent=parent)
    for template in templates:
        print(f"  Template: {template.name}")
        config = template.config
        # Count renditions
        video_count = sum(
            1 for es in config.elementary_streams if es.video_stream.ByteSize() > 0
        )
        manifest_count = len(config.manifests)
        print(f"    Video renditions: {video_count}")
        print(f"    Manifests: {manifest_count}")

def delete_template(project_id, location, template_id):
    """Deletes a job template that is no longer needed."""
    client = transcoder_v1.TranscoderServiceClient()
    name = f"projects/{project_id}/locations/{location}/jobTemplates/{template_id}"
    client.delete_job_template(name=name)
    print(f"Deleted template: {template_id}")
```

## Template Best Practices

- **Name templates descriptively**: Use names like `hls-1080p-3tier` or `dash-4k-premium` so it is clear what each template produces.
- **Version templates**: When you update encoding settings, create a new template version rather than modifying the existing one. This preserves reproducibility.
- **Keep segment duration consistent**: 4 seconds is a good default. Shorter segments reduce start-up latency but increase manifest size and CDN cache miss rates.
- **Align GOP size with segment duration**: Set `gop_duration` equal to or a divisor of `segment_duration` for clean segment boundaries.

## Wrapping Up

Job templates turn Transcoder API from a flexible but verbose API into a simple "transcode this video" call. Define your quality profiles once, then reuse them across your entire video library. The dual-format template approach with CMAF segments is particularly efficient because you encode the video once and serve it through both HLS and DASH, covering every platform your viewers might use.
