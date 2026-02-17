# How to Transcode Video Files for Adaptive Bitrate Streaming Using Google Cloud Transcoder API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Transcoder API, Video Streaming, Adaptive Bitrate, Media

Description: Use Google Cloud Transcoder API to convert video files into adaptive bitrate streaming formats like HLS and DASH for smooth playback across devices.

---

Adaptive bitrate streaming (ABR) is what makes video playback smooth across different network conditions and devices. Instead of serving a single video file, you create multiple versions at different quality levels and let the player switch between them based on available bandwidth. Google Cloud Transcoder API handles this conversion - you give it a source video and it produces all the renditions, manifests, and segments needed for HLS or DASH streaming.

In this guide, I will show you how to set up Transcoder API, create transcoding jobs with multiple quality levels, and configure the output for production streaming.

## How Adaptive Bitrate Streaming Works

When you upload a 4K source video, ABR encoding produces several versions:

- 4K at 16 Mbps for high-bandwidth connections
- 1080p at 5 Mbps for typical broadband
- 720p at 2.5 Mbps for moderate connections
- 480p at 1 Mbps for mobile on LTE
- 360p at 0.5 Mbps for poor connections

Each version is split into small segments (typically 2-6 seconds). The video player starts with a low-quality segment, then switches up or down based on measured bandwidth.

## Prerequisites

- GCP project with the Transcoder API enabled
- A Cloud Storage bucket for input and output files
- Source video files in the bucket
- Python 3.8+ with the Transcoder API client library

```bash
# Enable the Transcoder API
gcloud services enable transcoder.googleapis.com

# Install the client library
pip install google-cloud-video-transcoder

# Create storage buckets for input and output
gsutil mb -l us-central1 gs://your-video-input-bucket
gsutil mb -l us-central1 gs://your-video-output-bucket
```

## Step 1: Upload a Source Video

```bash
# Upload your source video to Cloud Storage
gsutil cp my-video.mp4 gs://your-video-input-bucket/sources/
```

## Step 2: Create a Basic Transcoding Job

Here is a straightforward transcoding job that produces HLS output with multiple quality levels:

```python
# transcode.py - Creates an adaptive bitrate transcoding job

from google.cloud.video import transcoder_v1
from google.cloud.video.transcoder_v1 import types

def create_abr_job(project_id, location, input_uri, output_uri):
    """Creates a transcoding job that produces adaptive bitrate HLS output.

    Args:
        project_id: GCP project ID
        location: Processing region (e.g., us-central1)
        input_uri: GCS path to the source video
        output_uri: GCS path for the transcoded output
    """

    client = transcoder_v1.TranscoderServiceClient()
    parent = f"projects/{project_id}/locations/{location}"

    job = types.Job()
    job.input_uri = input_uri
    job.output_uri = output_uri

    # Define the job configuration with multiple output streams
    job_config = types.JobConfig()

    # Input stream - references the source video
    input_stream = types.Input()
    input_stream.key = "input0"
    input_stream.uri = input_uri
    job_config.inputs = [input_stream]

    # Define video streams at different quality levels
    # Each stream targets a different bitrate and resolution

    # 1080p stream - high quality
    video_1080 = types.ElementaryStream()
    video_1080.key = "video-1080p"
    video_1080.video_stream = types.VideoStream()
    video_1080.video_stream.h264 = types.VideoStream.H264CodecSettings()
    video_1080.video_stream.h264.height_pixels = 1080
    video_1080.video_stream.h264.width_pixels = 1920
    video_1080.video_stream.h264.bitrate_bps = 5000000  # 5 Mbps
    video_1080.video_stream.h264.frame_rate = 30
    video_1080.video_stream.h264.gop_duration = "2s"
    video_1080.video_stream.h264.profile = "high"

    # 720p stream - standard quality
    video_720 = types.ElementaryStream()
    video_720.key = "video-720p"
    video_720.video_stream = types.VideoStream()
    video_720.video_stream.h264 = types.VideoStream.H264CodecSettings()
    video_720.video_stream.h264.height_pixels = 720
    video_720.video_stream.h264.width_pixels = 1280
    video_720.video_stream.h264.bitrate_bps = 2500000  # 2.5 Mbps
    video_720.video_stream.h264.frame_rate = 30
    video_720.video_stream.h264.gop_duration = "2s"
    video_720.video_stream.h264.profile = "main"

    # 480p stream - low quality for mobile
    video_480 = types.ElementaryStream()
    video_480.key = "video-480p"
    video_480.video_stream = types.VideoStream()
    video_480.video_stream.h264 = types.VideoStream.H264CodecSettings()
    video_480.video_stream.h264.height_pixels = 480
    video_480.video_stream.h264.width_pixels = 854
    video_480.video_stream.h264.bitrate_bps = 1000000  # 1 Mbps
    video_480.video_stream.h264.frame_rate = 30
    video_480.video_stream.h264.gop_duration = "2s"
    video_480.video_stream.h264.profile = "main"

    # Audio stream - single quality for all renditions
    audio_stream = types.ElementaryStream()
    audio_stream.key = "audio-aac"
    audio_stream.audio_stream = types.AudioStream()
    audio_stream.audio_stream.codec = "aac"
    audio_stream.audio_stream.bitrate_bps = 128000  # 128 kbps
    audio_stream.audio_stream.channel_count = 2
    audio_stream.audio_stream.sample_rate_hertz = 48000

    job_config.elementary_streams = [
        video_1080, video_720, video_480, audio_stream
    ]

    # Define mux streams that combine video and audio
    mux_1080 = types.MuxStream()
    mux_1080.key = "hls-1080p"
    mux_1080.container = "ts"
    mux_1080.elementary_streams = ["video-1080p", "audio-aac"]
    mux_1080.segment_settings = types.SegmentSettings()
    mux_1080.segment_settings.segment_duration = "4s"

    mux_720 = types.MuxStream()
    mux_720.key = "hls-720p"
    mux_720.container = "ts"
    mux_720.elementary_streams = ["video-720p", "audio-aac"]
    mux_720.segment_settings = types.SegmentSettings()
    mux_720.segment_settings.segment_duration = "4s"

    mux_480 = types.MuxStream()
    mux_480.key = "hls-480p"
    mux_480.container = "ts"
    mux_480.elementary_streams = ["video-480p", "audio-aac"]
    mux_480.segment_settings = types.SegmentSettings()
    mux_480.segment_settings.segment_duration = "4s"

    job_config.mux_streams = [mux_1080, mux_720, mux_480]

    # Generate HLS manifest
    manifest = types.Manifest()
    manifest.file_name = "master.m3u8"
    manifest.type_ = types.Manifest.ManifestType.HLS
    manifest.mux_streams = ["hls-1080p", "hls-720p", "hls-480p"]

    job_config.manifests = [manifest]

    job.config = job_config

    # Submit the transcoding job
    response = client.create_job(parent=parent, job=job)
    print(f"Job created: {response.name}")
    print(f"State: {response.state.name}")
    return response

# Create the transcoding job
job = create_abr_job(
    project_id="your-project",
    location="us-central1",
    input_uri="gs://your-video-input-bucket/sources/my-video.mp4",
    output_uri="gs://your-video-output-bucket/output/my-video/",
)
```

## Step 3: Monitor Job Progress

```python
from google.cloud.video import transcoder_v1
import time

def wait_for_job(project_id, location, job_id):
    """Polls the transcoding job until it completes or fails."""

    client = transcoder_v1.TranscoderServiceClient()
    job_name = f"projects/{project_id}/locations/{location}/jobs/{job_id}"

    while True:
        job = client.get_job(name=job_name)
        state = job.state.name

        if state == "SUCCEEDED":
            print("Transcoding completed successfully")
            print(f"Output: {job.output_uri}")
            return job
        elif state == "FAILED":
            print(f"Transcoding failed: {job.error}")
            return job
        else:
            print(f"Job state: {state}")
            time.sleep(10)
```

## Step 4: Serve the Output

Once transcoding completes, the output bucket contains all the HLS segments and the master manifest. You can serve these through Cloud CDN for global delivery:

```bash
# List the output files
gsutil ls gs://your-video-output-bucket/output/my-video/

# Make the output publicly readable (or use signed URLs)
gsutil -m acl ch -r -u AllUsers:R gs://your-video-output-bucket/output/my-video/

# The master playlist URL would be:
# https://storage.googleapis.com/your-video-output-bucket/output/my-video/master.m3u8
```

## Step 5: Automate with Pub/Sub Notifications

Set up automatic transcoding when new videos are uploaded:

```bash
# Enable notifications on the input bucket
gsutil notification create -t video-upload-notifications \
  -f json -e OBJECT_FINALIZE \
  gs://your-video-input-bucket
```

Create a Cloud Function that triggers transcoding:

```python
# auto_transcode/main.py - Automatically transcodes uploaded videos

import json
import functions_framework

@functions_framework.cloud_event
def auto_transcode(cloud_event):
    """Triggers transcoding when a new video is uploaded to the input bucket."""

    data = cloud_event.data
    bucket = data["bucket"]
    name = data["name"]

    # Only process video files in the sources directory
    if not name.startswith("sources/"):
        return
    if not name.lower().endswith((".mp4", ".mov", ".mkv", ".avi")):
        return

    # Generate output path from the input filename
    base_name = name.split("/")[-1].rsplit(".", 1)[0]
    input_uri = f"gs://{bucket}/{name}"
    output_uri = f"gs://your-video-output-bucket/output/{base_name}/"

    # Create the transcoding job
    job = create_abr_job(
        project_id="your-project",
        location="us-central1",
        input_uri=input_uri,
        output_uri=output_uri,
    )
    print(f"Started transcoding job for {name}: {job.name}")
```

## Pricing Considerations

Transcoder API charges based on the output duration and resolution:

- SD output (up to 720p): a few cents per minute
- HD output (up to 1080p): slightly more per minute
- 4K output: the most expensive tier

Each output rendition is charged separately, so a job producing three quality levels costs roughly three times a single-rendition job. For high-volume use cases, consider using job templates to standardize configurations and avoid re-encoding the same content.

## Wrapping Up

Transcoder API takes the heavy lifting out of video encoding. You define the quality ladder, submit the job, and get production-ready HLS or DASH output in your Cloud Storage bucket. Combined with Cloud CDN for delivery, you have a complete video streaming infrastructure without managing any encoding servers. The API handles codec selection, bitrate optimization, and manifest generation, so you can focus on the application layer.
