# How to Configure FFmpeg for Video Transcoding on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, FFmpeg, Video, Transcoding, Multimedia

Description: A practical guide to installing FFmpeg on Ubuntu and configuring it for efficient video transcoding, format conversion, and batch processing workflows.

---

FFmpeg is the backbone of most video processing pipelines. It handles encoding, decoding, filtering, muxing, and streaming for hundreds of formats and codecs. Getting it configured properly on Ubuntu - choosing the right build, enabling hardware acceleration, and structuring transcoding commands - makes a significant difference in both output quality and processing speed.

## Installing FFmpeg on Ubuntu

The quickest path is the Ubuntu repository package:

```bash
# Install FFmpeg from the official Ubuntu repositories
sudo apt update
sudo apt install ffmpeg -y

# Verify the installation and check available codecs
ffmpeg -version
ffmpeg -codecs 2>/dev/null | grep -i h264
```

The repository version may lag behind the current release. For the latest features (AV1 hardware encoding, newer codec support), install from a PPA:

```bash
# Add the jonathonf PPA for a more current FFmpeg build
sudo add-apt-repository ppa:jonathonf/ffmpeg-4 -y
sudo apt update
sudo apt install ffmpeg -y
```

Alternatively, download a static build from John Van Sickle's builds for a zero-dependency binary:

```bash
# Download and install a static FFmpeg build
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar -xf ffmpeg-release-amd64-static.tar.xz
sudo cp ffmpeg-*-amd64-static/ffmpeg /usr/local/bin/
sudo cp ffmpeg-*-amd64-static/ffprobe /usr/local/bin/
```

## Understanding FFmpeg Syntax

Every FFmpeg command follows this pattern:

```
ffmpeg [global options] [input options] -i input [output options] output
```

The order matters. Options placed before `-i` apply to the input. Options placed after apply to the output.

## Basic Format Conversion

```bash
# Convert MP4 to MKV (remux without re-encoding - very fast)
ffmpeg -i input.mp4 -c copy output.mkv

# Convert AVI to MP4 with H.264 video and AAC audio
ffmpeg -i input.avi -c:v libx264 -c:a aac output.mp4

# Convert MOV to WebM (VP9 + Opus - good for web delivery)
ffmpeg -i input.mov -c:v libvpx-vp9 -b:v 0 -crf 33 -c:a libopus output.webm
```

## H.264 Encoding with CRF Mode

Constant Rate Factor (CRF) produces the best quality-to-size ratio for offline transcoding:

```bash
# High-quality H.264 encode with CRF 18 (lower = better quality, larger file)
ffmpeg -i input.mp4 \
    -c:v libx264 \
    -preset slow \       # Slower preset = better compression at same quality
    -crf 18 \            # 18-28 is typical; 23 is default
    -c:a aac \
    -b:a 192k \
    output_hq.mp4

# Standard web delivery quality
ffmpeg -i input.mp4 \
    -c:v libx264 \
    -preset medium \
    -crf 23 \
    -c:a aac \
    -b:a 128k \
    -movflags +faststart \  # Move moov atom to start for streaming
    output_web.mp4
```

## Scaling and Resolution Changes

```bash
# Scale to 1280x720 while preserving aspect ratio
ffmpeg -i input.mp4 \
    -vf "scale=1280:720" \
    -c:v libx264 -crf 22 \
    -c:a copy \
    output_720p.mp4

# Scale to width 1280, auto-calculate height (maintaining aspect ratio)
ffmpeg -i input.mp4 \
    -vf "scale=1280:-1" \
    -c:v libx264 -crf 22 \
    -c:a copy \
    output_1280w.mp4

# Scale to fit within 1920x1080 box, padding with black bars if needed
ffmpeg -i input.mp4 \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 -crf 22 \
    -c:a copy \
    output_letterboxed.mp4
```

## Generating Multiple Output Resolutions

Producing adaptive bitrate ladder outputs from a single source:

```bash
#!/bin/bash
# transcode_ladder.sh - Create multi-bitrate outputs from one source

INPUT="$1"
BASENAME=$(basename "$INPUT" | sed 's/\.[^.]*$//')

# 1080p output
ffmpeg -i "$INPUT" \
    -c:v libx264 -preset medium -crf 20 \
    -vf "scale=1920:1080" \
    -c:a aac -b:a 192k \
    "${BASENAME}_1080p.mp4"

# 720p output
ffmpeg -i "$INPUT" \
    -c:v libx264 -preset medium -crf 22 \
    -vf "scale=1280:720" \
    -c:a aac -b:a 128k \
    "${BASENAME}_720p.mp4"

# 480p output
ffmpeg -i "$INPUT" \
    -c:v libx264 -preset medium -crf 24 \
    -vf "scale=854:480" \
    -c:a aac -b:a 96k \
    "${BASENAME}_480p.mp4"

echo "Transcoding complete for $INPUT"
```

## Enabling Hardware Acceleration

Software encoding is CPU-bound. Hardware encoders on supported GPUs are dramatically faster.

### NVIDIA NVENC

```bash
# Check NVENC availability
ffmpeg -encoders 2>/dev/null | grep nvenc

# H.264 encoding with NVENC
ffmpeg -i input.mp4 \
    -c:v h264_nvenc \
    -preset p4 \          # p1 (fastest) to p7 (best quality)
    -cq 23 \              # Constant quality mode
    -c:a copy \
    output_nvenc.mp4

# HEVC (H.265) encoding with NVENC
ffmpeg -i input.mp4 \
    -c:v hevc_nvenc \
    -preset p4 \
    -cq 28 \
    -c:a copy \
    output_hevc_nvenc.mp4
```

### Intel Quick Sync (QSV)

```bash
# Install VAAPI and QSV support
sudo apt install -y intel-media-va-driver-non-free vainfo

# H.264 encoding with Quick Sync
ffmpeg -i input.mp4 \
    -c:v h264_qsv \
    -global_quality 23 \
    -c:a copy \
    output_qsv.mp4
```

### AMD VAAPI

```bash
# Verify VAAPI device
vainfo

# H.264 encoding with VAAPI
ffmpeg -vaapi_device /dev/dri/renderD128 \
    -i input.mp4 \
    -vf "format=nv12,hwupload" \
    -c:v h264_vaapi \
    -qp 23 \
    -c:a copy \
    output_vaapi.mp4
```

## Batch Transcoding with a Shell Script

```bash
#!/bin/bash
# batch_transcode.sh - Transcode all MKV files in a directory to H.264 MP4

INPUT_DIR="$1"
OUTPUT_DIR="${2:-./output}"

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Find all MKV files and transcode them
find "$INPUT_DIR" -name "*.mkv" | while read -r file; do
    filename=$(basename "$file" .mkv)
    output="${OUTPUT_DIR}/${filename}.mp4"

    echo "Processing: $file"

    ffmpeg -i "$file" \
        -c:v libx264 \
        -preset medium \
        -crf 22 \
        -c:a aac \
        -b:a 128k \
        -movflags +faststart \
        "$output" \
        && echo "Done: $output" \
        || echo "FAILED: $file"
done

echo "Batch transcoding complete"
```

Run it:

```bash
chmod +x batch_transcode.sh
./batch_transcode.sh /path/to/input /path/to/output
```

## Useful Filters for Post-Processing

```bash
# Add a watermark/logo overlay in the top-right corner
ffmpeg -i input.mp4 -i logo.png \
    -filter_complex "overlay=W-w-10:10" \
    -c:v libx264 -crf 22 \
    -c:a copy \
    output_watermarked.mp4

# Speed up video 2x (and adjust audio accordingly)
ffmpeg -i input.mp4 \
    -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" \
    -map "[v]" -map "[a]" \
    -c:v libx264 -crf 22 \
    output_2x.mp4

# Crop to 16:9 from center
ffmpeg -i input.mp4 \
    -vf "crop=in_w:in_w*(9/16):(in_w-in_w)/2:(in_h-in_w*(9/16))/2" \
    -c:v libx264 -crf 22 \
    -c:a copy \
    output_cropped.mp4

# Denoise video (good for webcam or low-light footage)
ffmpeg -i input.mp4 \
    -vf "hqdn3d=4:4:3:3" \
    -c:v libx264 -crf 20 \
    -c:a copy \
    output_denoised.mp4
```

## Inspecting Files with FFprobe

FFprobe is FFmpeg's analysis companion:

```bash
# Show detailed stream information in JSON
ffprobe -v quiet -print_format json -show_streams input.mp4

# Get just video duration and resolution
ffprobe -v quiet \
    -select_streams v:0 \
    -show_entries stream=width,height,duration,r_frame_rate \
    -of default=noprint_wrappers=1 \
    input.mp4

# Check audio sample rate and channels
ffprobe -v quiet \
    -select_streams a:0 \
    -show_entries stream=sample_rate,channels,codec_name \
    -of default=noprint_wrappers=1 \
    input.mp4
```

## Monitoring Encoding Progress

FFmpeg outputs progress to stderr by default. For scripts, parse the progress log:

```bash
# Write progress to a file for monitoring
ffmpeg -i input.mp4 \
    -c:v libx264 -crf 22 \
    -c:a aac \
    -progress /tmp/ffmpeg_progress.log \
    output.mp4 &

# Monitor progress in another terminal
tail -f /tmp/ffmpeg_progress.log | grep -E "frame|fps|speed"
```

FFmpeg's flexibility makes it the right tool for virtually any video processing task on Ubuntu. The key is understanding the filter chain and codec option system, which lets you chain together complex transformations in a single pass.
