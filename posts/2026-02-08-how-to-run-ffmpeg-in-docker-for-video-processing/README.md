# How to Run FFmpeg in Docker for Video Processing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, FFmpeg, Video Processing, Media, Transcoding, Streaming, Automation

Description: Use FFmpeg inside Docker containers to transcode, compress, and process video files without installing codecs on your host machine.

---

FFmpeg is the Swiss Army knife of video and audio processing. It handles transcoding, compression, format conversion, streaming, and dozens of other media operations. Installing FFmpeg with all its codecs and dependencies on a host machine can be messy, especially when different projects need different versions. Docker packages FFmpeg with exactly the codecs you need into an isolated, portable container.

## Why Run FFmpeg in Docker?

FFmpeg depends on numerous codec libraries: libx264, libx265, libvpx, libopus, and many more. Each codec has its own version requirements and build flags. On a shared server, updating one codec can break another project. Docker sidesteps this entirely by giving each project its own FFmpeg installation with the exact codec versions it needs.

Docker also makes it easy to process videos at scale. Spin up multiple containers to transcode files in parallel, then tear them down when the work is done.

## Using the Official FFmpeg Image

The simplest approach uses the linuxserver or jrottenberg FFmpeg images:

```bash
# Transcode a video from MKV to MP4 using the jrottenberg/ffmpeg image
docker run --rm \
  -v $(pwd)/media:/media \
  jrottenberg/ffmpeg:4.4-ubuntu \
  -i /media/input.mkv \
  -c:v libx264 \
  -preset medium \
  -crf 23 \
  -c:a aac \
  -b:a 128k \
  /media/output.mp4
```

This mounts your local `media/` directory into the container. FFmpeg reads the input file, transcodes it, and writes the output back to the same mounted directory.

## Building a Custom FFmpeg Image

For more control over codecs and tools, build your own image:

```dockerfile
# Dockerfile - Custom FFmpeg build with common codecs and tools
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    mediainfo \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /media

ENTRYPOINT ["ffmpeg"]
```

For a more feature-rich build with the latest version:

```dockerfile
# Dockerfile - FFmpeg from static build with all codecs included
FROM alpine:3.19 AS base

# Download the static FFmpeg build that includes all common codecs
RUN apk add --no-cache wget && \
    wget -O /tmp/ffmpeg.tar.xz https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz && \
    tar -xf /tmp/ffmpeg.tar.xz -C /tmp && \
    mv /tmp/ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/ && \
    mv /tmp/ffmpeg-*-amd64-static/ffprobe /usr/local/bin/ && \
    rm -rf /tmp/*

WORKDIR /media

ENTRYPOINT ["ffmpeg"]
```

## Common Video Processing Tasks

Here are practical FFmpeg commands wrapped in Docker for everyday video tasks.

Compress a video for web delivery:

```bash
# Compress video with H.264 encoding optimized for web streaming
docker run --rm -v $(pwd)/media:/media jrottenberg/ffmpeg:4.4-ubuntu \
  -i /media/raw-video.mp4 \
  -c:v libx264 \
  -preset slow \
  -crf 22 \
  -c:a aac \
  -b:a 128k \
  -movflags +faststart \
  /media/web-video.mp4
```

The `-movflags +faststart` flag moves the metadata to the beginning of the file, which allows browsers to start playing the video before it fully downloads.

Extract audio from a video:

```bash
# Extract the audio track as a standalone MP3 file
docker run --rm -v $(pwd)/media:/media jrottenberg/ffmpeg:4.4-ubuntu \
  -i /media/video.mp4 \
  -vn \
  -acodec libmp3lame \
  -ab 192k \
  /media/audio.mp3
```

Generate a thumbnail from a specific timestamp:

```bash
# Capture a single frame at the 30-second mark as a JPEG thumbnail
docker run --rm -v $(pwd)/media:/media jrottenberg/ffmpeg:4.4-ubuntu \
  -i /media/video.mp4 \
  -ss 00:00:30 \
  -vframes 1 \
  -q:v 2 \
  /media/thumbnail.jpg
```

Create a thumbnail grid (contact sheet):

```bash
# Generate a 4x4 grid of thumbnails sampled evenly across the video
docker run --rm -v $(pwd)/media:/media jrottenberg/ffmpeg:4.4-ubuntu \
  -i /media/video.mp4 \
  -vf "select='not(mod(n,300))',scale=320:180,tile=4x4" \
  -frames:v 1 \
  /media/contact-sheet.jpg
```

## Batch Processing with a Shell Script

Process all videos in a directory:

```bash
#!/bin/bash
# scripts/batch-transcode.sh - Transcode all MP4 files to web-optimized format

INPUT_DIR="./media/raw"
OUTPUT_DIR="./media/processed"

mkdir -p "$OUTPUT_DIR"

# Loop through every MP4 file in the input directory
for file in "$INPUT_DIR"/*.mp4; do
  filename=$(basename "$file")
  echo "Processing: $filename"

  docker run --rm \
    -v "$(pwd)/media:/media" \
    jrottenberg/ffmpeg:4.4-ubuntu \
    -i "/media/raw/$filename" \
    -c:v libx264 \
    -preset medium \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \
    "/media/processed/$filename"

  echo "Done: $filename"
done

echo "Batch transcoding complete."
```

## Docker Compose for a Video Processing Pipeline

For automated processing, set up a pipeline with Docker Compose:

```yaml
# docker-compose.yml - Video processing pipeline with watch directory
version: "3.8"

services:
  transcoder:
    image: jrottenberg/ffmpeg:4.4-ubuntu
    volumes:
      - ./media/input:/input
      - ./media/output:/output
      - ./scripts:/scripts
    entrypoint: ["/bin/bash"]
    # Watch the input directory and process new files
    command:
      - /scripts/watch-and-transcode.sh
    restart: unless-stopped

  probe:
    # Service for getting video file metadata
    image: jrottenberg/ffmpeg:4.4-ubuntu
    volumes:
      - ./media:/media
    entrypoint: ["ffprobe"]
    profiles:
      - tools
```

The watch script:

```bash
#!/bin/bash
# scripts/watch-and-transcode.sh - Monitors input directory for new video files

INPUT_DIR="/input"
OUTPUT_DIR="/output"
PROCESSED_DIR="/input/processed"

mkdir -p "$PROCESSED_DIR"

echo "Watching ${INPUT_DIR} for new video files..."

while true; do
  # Find video files that have not been processed yet
  for file in "$INPUT_DIR"/*.{mp4,mkv,avi,mov}; do
    [ -f "$file" ] || continue

    filename=$(basename "$file")
    output_name="${filename%.*}.mp4"

    echo "[$(date)] Processing: $filename"

    ffmpeg -i "$file" \
      -c:v libx264 -preset medium -crf 23 \
      -c:a aac -b:a 128k \
      -movflags +faststart \
      -y "${OUTPUT_DIR}/${output_name}"

    # Move the original file to the processed directory
    mv "$file" "${PROCESSED_DIR}/${filename}"
    echo "[$(date)] Complete: $output_name"
  done

  # Check for new files every 10 seconds
  sleep 10
done
```

## HLS Streaming Output

Generate HLS (HTTP Live Streaming) segments for adaptive bitrate streaming:

```bash
# Convert a video to HLS format with multiple quality levels
docker run --rm -v $(pwd)/media:/media jrottenberg/ffmpeg:4.4-ubuntu \
  -i /media/source.mp4 \
  -c:v libx264 -preset fast -crf 22 \
  -c:a aac -b:a 128k \
  -hls_time 6 \
  -hls_playlist_type vod \
  -hls_segment_filename /media/hls/segment_%03d.ts \
  /media/hls/playlist.m3u8
```

## Getting Video Information

Use ffprobe to inspect video files:

```bash
# Display video file metadata in JSON format
docker run --rm -v $(pwd)/media:/media --entrypoint ffprobe \
  jrottenberg/ffmpeg:4.4-ubuntu \
  -v quiet \
  -print_format json \
  -show_format \
  -show_streams \
  /media/video.mp4
```

## Resource Management

Video transcoding is CPU-intensive. Limit container resources to prevent a transcoding job from starving other services:

```yaml
# Resource limits for the transcoder container
services:
  transcoder:
    image: jrottenberg/ffmpeg:4.4-ubuntu
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
        reservations:
          cpus: "1.0"
          memory: 512M
```

## Wrapping Up

FFmpeg in Docker gives you a portable, version-controlled media processing toolkit. You avoid codec installation headaches, get reproducible transcoding results, and can scale processing by running multiple containers in parallel. Whether you need a one-off format conversion or a full video processing pipeline with a watch directory, Docker keeps the setup clean and the results consistent.
