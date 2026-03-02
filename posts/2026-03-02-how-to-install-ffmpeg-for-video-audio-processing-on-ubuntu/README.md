# How to Install FFmpeg for Video/Audio Processing on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, FFmpeg, Video, Audio, Media Processing

Description: Guide to installing FFmpeg on Ubuntu and using it for common video and audio processing tasks including transcoding, format conversion, stream manipulation, and batch processing.

---

FFmpeg is the most widely used multimedia framework for video and audio processing. It handles encoding, decoding, transcoding, muxing, demuxing, streaming, filtering, and playing practically any media format. On Ubuntu, getting a full-featured FFmpeg installation requires either using the Ubuntu package (which may be outdated) or building from source with the codecs you need.

## Installation Options

### Option 1: Ubuntu Repository (Quickest)

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg

# Verify installation and check codecs
ffmpeg -version
ffmpeg -encoders | head -30
ffmpeg -decoders | head -30
```

The Ubuntu repository version may lack some proprietary codecs (like libfdk-aac for high-quality AAC encoding) due to licensing.

### Option 2: PPA (More Complete)

The `ppa:savoury1/ffmpeg4` or `ppa:mc3man/mpv-tests` PPAs often have newer FFmpeg builds with more codecs:

```bash
sudo add-apt-repository ppa:savoury1/ffmpeg4 -y
sudo apt-get update
sudo apt-get install -y ffmpeg

# Verify codec support
ffmpeg -encoders | grep aac  # check for more AAC encoder options
```

### Option 3: Static Build (Most Codecs, No Compilation)

FFmpeg static builds include almost all codecs in a single binary:

```bash
# Download from https://johnvansickle.com/ffmpeg/
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xJf ffmpeg-release-amd64-static.tar.xz
sudo mv ffmpeg-*-static/ffmpeg /usr/local/bin/
sudo mv ffmpeg-*-static/ffprobe /usr/local/bin/

ffmpeg -version
```

### Option 4: Build from Source (Maximum Control)

For custom codec combinations or the latest version:

```bash
# Install build dependencies
sudo apt-get install -y \
    build-essential nasm yasm cmake \
    libssl-dev libx264-dev libx265-dev libvpx-dev \
    libfdk-aac-dev libmp3lame-dev libopus-dev \
    libvorbis-dev libaom-dev libsvtav1-dev \
    libass-dev libfreetype6-dev libfontconfig1-dev \
    libva-dev libvdpau-dev libxcb-dev libxcb-shm0-dev

# Clone FFmpeg source
git clone https://git.ffmpeg.org/ffmpeg.git --depth 1
cd ffmpeg

# Configure with desired codecs
./configure \
    --prefix=/usr/local \
    --enable-gpl \
    --enable-nonfree \
    --enable-libx264 \
    --enable-libx265 \
    --enable-libvpx \
    --enable-libfdk-aac \
    --enable-libmp3lame \
    --enable-libopus \
    --enable-libvorbis \
    --enable-libaom \
    --enable-libass \
    --enable-libfreetype \
    --enable-vaapi \
    --enable-vdpau

# Compile (use all CPU cores)
make -j$(nproc)
sudo make install
```

## Basic Usage

### Getting File Information

```bash
# Inspect a media file
ffprobe video.mp4

# Get concise info
ffprobe -v quiet -print_format json -show_format -show_streams video.mp4

# Show just video stream info
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate,bit_rate -of default=noprint_wrappers=1 video.mp4
```

## Video Conversion and Transcoding

### Convert Format

```bash
# Convert MKV to MP4 (copy streams without re-encoding - fastest)
ffmpeg -i input.mkv -c copy output.mp4

# Convert AVI to H.264 MP4
ffmpeg -i input.avi -c:v libx264 -crf 23 -c:a aac -b:a 128k output.mp4

# Convert to H.265/HEVC (better compression, requires more CPU)
ffmpeg -i input.mp4 -c:v libx265 -crf 28 -c:a copy output_hevc.mp4

# Convert to VP9 (open source, good for web)
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus -b:a 128k output.webm

# Convert to AV1 (next-gen codec, slow encoding)
ffmpeg -i input.mp4 -c:v libaom-av1 -crf 30 -b:v 0 output.mkv
```

### Quality Control

```bash
# CRF (Constant Rate Factor): lower = better quality, larger file
# For x264: 18-28 is typical range (18=high quality, 28=smaller file)
ffmpeg -i input.mp4 -c:v libx264 -crf 18 -preset slow high_quality.mp4
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset fast small_file.mp4

# Target specific bitrate (two-pass encoding for precise file size)
# Pass 1: analyze
ffmpeg -i input.mp4 -c:v libx264 -b:v 2M -pass 1 -an -f null /dev/null
# Pass 2: encode
ffmpeg -i input.mp4 -c:v libx264 -b:v 2M -pass 2 -c:a aac -b:a 128k output.mp4
```

## Video Manipulation

### Trim and Cut

```bash
# Extract a segment (from 00:01:30 to 00:03:00)
ffmpeg -i input.mp4 -ss 00:01:30 -to 00:03:00 -c copy clip.mp4

# Cut 30 seconds starting at 2 minutes
ffmpeg -i input.mp4 -ss 00:02:00 -t 30 -c copy short_clip.mp4

# Fast seeking (seek before input for speed, slightly less precise)
ffmpeg -ss 00:10:00 -i input.mp4 -t 00:05:00 -c copy segment.mp4
```

### Resize and Scale

```bash
# Scale to 1280x720 (HD)
ffmpeg -i input.mp4 -vf "scale=1280:720" -c:a copy scaled.mp4

# Scale maintaining aspect ratio (fit within 1280 width)
ffmpeg -i input.mp4 -vf "scale=1280:-1" output.mp4

# Scale to 1080p with padding if needed
ffmpeg -i input.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" padded.mp4
```

### Other Video Operations

```bash
# Extract audio from video
ffmpeg -i video.mp4 -vn -c:a copy audio.aac

# Remove audio from video
ffmpeg -i video.mp4 -an -c:v copy no_audio.mp4

# Take a screenshot at specific time
ffmpeg -ss 00:01:30 -i video.mp4 -vframes 1 screenshot.jpg

# Extract all frames as images
ffmpeg -i video.mp4 -r 1 frames/%04d.png  # 1 frame per second

# Create a GIF from video segment
ffmpeg -i input.mp4 -ss 00:00:05 -t 5 -vf "fps=15,scale=480:-1:flags=lanczos" output.gif

# Speed up video 2x
ffmpeg -i input.mp4 -vf "setpts=0.5*PTS" -af "atempo=2.0" fast.mp4

# Slow down video to 0.5x
ffmpeg -i input.mp4 -vf "setpts=2.0*PTS" -af "atempo=0.5" slow.mp4
```

## Audio Processing

```bash
# Convert audio format
ffmpeg -i audio.flac audio.mp3
ffmpeg -i audio.wav -c:a aac -b:a 256k audio.aac

# Change sample rate
ffmpeg -i audio.wav -ar 44100 resampled.wav

# Normalize audio volume
ffmpeg -i audio.mp3 -af "loudnorm=I=-23:LRA=7:TP=-2" normalized.mp3

# Trim audio
ffmpeg -i audio.mp3 -ss 00:00:30 -to 00:02:00 clip.mp3

# Merge audio and video (where they are separate files)
ffmpeg -i video.mp4 -i audio.aac -c:v copy -c:a copy -shortest merged.mp4
```

## Batch Processing

Process multiple files with a shell loop:

```bash
#!/bin/bash
# Convert all AVI files in a directory to H.264 MP4

INPUT_DIR="/home/user/videos"
OUTPUT_DIR="/home/user/converted"

mkdir -p "$OUTPUT_DIR"

for input_file in "$INPUT_DIR"/*.avi; do
    filename=$(basename "${input_file%.*}")
    output_file="$OUTPUT_DIR/${filename}.mp4"

    echo "Converting: $input_file -> $output_file"

    ffmpeg -i "$input_file" \
        -c:v libx264 \
        -crf 23 \
        -preset medium \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        "$output_file" \
        -loglevel warning

    echo "Done: $filename"
done

echo "All conversions complete"
```

## Hardware-Accelerated Encoding

Use GPU hardware encoders for much faster encoding:

```bash
# NVIDIA NVENC (requires CUDA/NVIDIA driver)
ffmpeg -i input.mp4 -c:v h264_nvenc -preset slow -cq 23 output_nvenc.mp4

# AMD AMF (requires AMD GPU driver)
ffmpeg -i input.mp4 -c:v h264_amf -quality balanced output_amf.mp4

# Intel QSV (Quick Sync Video)
ffmpeg -i input.mp4 -c:v h264_qsv -global_quality 23 output_qsv.mp4

# VA-API (generic Linux hardware acceleration)
ffmpeg -hwaccel vaapi -hwaccel_device /dev/dri/renderD128 \
    -i input.mp4 -vf 'format=nv12,hwupload' \
    -c:v h264_vaapi -qp 24 output_vaapi.mp4

# List available hardware encoders
ffmpeg -encoders | grep -E "nvenc|vaapi|qsv|amf"
```

## Streaming

```bash
# Stream to RTMP (YouTube Live, Twitch)
ffmpeg -i input.mp4 \
    -c:v libx264 -preset veryfast -b:v 3000k \
    -c:a aac -b:a 128k \
    -f flv rtmp://live.twitch.tv/live/YOUR_STREAM_KEY

# Restream a file in real-time
ffmpeg -re -i input.mp4 -c copy -f flv rtmp://server/live/stream

# Create HLS stream for web delivery
ffmpeg -i input.mp4 \
    -c:v libx264 -crf 22 \
    -c:a aac -b:a 128k \
    -hls_time 10 \
    -hls_list_size 0 \
    -f hls output.m3u8
```

FFmpeg's capabilities extend far beyond these examples. The documentation at https://ffmpeg.org/documentation.html covers every filter, encoder, and option in depth.
