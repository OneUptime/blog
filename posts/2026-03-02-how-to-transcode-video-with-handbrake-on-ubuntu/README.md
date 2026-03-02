# How to Transcode Video with HandBrake on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, HandBrake, Video Transcoding, FFmpeg, Media

Description: Practical guide to using HandBrake on Ubuntu for video transcoding, covering GUI and command-line usage, preset selection, quality settings, and batch processing workflows.

---

HandBrake is a robust open-source video transcoder built on top of FFmpeg, x264, and x265. It handles almost any input format and produces compressed output suitable for devices, streaming, or archival. On Ubuntu, you can use either the GUI for one-off jobs or the command-line `HandBrakeCLI` for batch processing and automation.

## Installation

### From Flatpak (Recommended - Latest Version)

```bash
# Install Flatpak if not already installed
sudo apt-get install -y flatpak

# Add Flathub repository
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Install HandBrake
flatpak install flathub fr.handbrake.ghb

# Run HandBrake
flatpak run fr.handbrake.ghb
```

### From PPA

```bash
# Add HandBrake PPA
sudo add-apt-repository ppa:stebbins/handbrake-releases -y
sudo apt-get update

# Install GUI and CLI
sudo apt-get install -y handbrake handbrake-cli
```

### From Ubuntu Repository (May Be Outdated)

```bash
sudo apt-get install -y handbrake handbrake-cli
```

### Building from Source

```bash
# Install build dependencies
sudo apt-get install -y \
    build-essential git cmake ninja-build \
    libx264-dev libx265-dev libvpx-dev \
    libva-dev libgstreamer1.0-dev \
    libgtk-3-dev intltool \
    nasm yasm python3

# Clone source
git clone https://github.com/HandBrake/HandBrake.git
cd HandBrake

# Configure and build
./configure --launch-jobs=$(nproc) --launch
cd build && make -j$(nproc)
sudo make install
```

## Using the HandBrake GUI

Launch HandBrake and you'll see the main interface:

1. **Source**: Click "Open Source" to select a file or "Open Folder" for a video disc
2. **Destination**: Set the output file path
3. **Presets**: Pre-configured settings for common use cases

### Choosing a Preset

HandBrake's built-in presets cover most needs:

- **Fast 1080p30**: Good quality, quick encode. Suitable for most devices.
- **H.265 1080p 30**: Smaller files with H.265 codec. Requires more CPU.
- **Very Fast 1080p30**: Fastest encode, slightly larger file.
- **HQ 1080p60 Surround**: High quality with surround sound.
- **Production Max**: Near-lossless for editing workflows.

### Video Settings

In the "Video" tab:

```
Video Codec: H.264 (x264)  - best compatibility
             H.265 (x265)  - better compression, slower encode
             VP9            - open source, good for web

Framerate: Same as source (usually best)
Quality:   RF 18-22 for H.264 (lower = better, larger file)
           RF 20-28 for H.265

Encoder Preset: "Medium" balances speed and compression
                "Slow" or "Slower" for better compression at same quality
```

### Audio Settings

In the "Audio" tab, add audio tracks:

```
Codec: AAC (best compatibility) or AC3/EAC3 for surround
Bitrate: 160kbps for stereo, 384kbps for 5.1 surround
Sample Rate: Same as source
Mixdown: Stereo (for headphones/laptop), 5.1 (for home theater)
```

### Subtitles

In the "Subtitles" tab, import embedded subtitles from the source or add external SRT files. Choose "Burn In" to bake subtitles permanently into the video.

## HandBrakeCLI: Command-Line Usage

For scripting and batch operations, `HandBrakeCLI` is essential.

### Basic Syntax

```bash
HandBrakeCLI -i INPUT -o OUTPUT [options]
```

### Common Conversions

```bash
# Transcode with default settings (uses Fast 1080p30 preset)
HandBrakeCLI -i movie.mkv -o movie_encoded.mp4

# Use a built-in preset
HandBrakeCLI -i movie.mkv -o movie.mp4 --preset="Fast 1080p30"

# H.264 with specific quality
HandBrakeCLI -i input.mkv -o output.mp4 \
    -e x264 \
    -q 22 \
    --encoder-preset medium \
    -a 1 -E aac -B 160 -6 stereo \
    -f av_mp4

# H.265 encode (good for archival - smaller files)
HandBrakeCLI -i input.mkv -o output.mp4 \
    -e x265 \
    -q 26 \
    --encoder-preset medium \
    -a 1 -E aac -B 192 -6 stereo

# Copy video stream without re-encoding (passthrough)
HandBrakeCLI -i input.mkv -o output.mp4 \
    --video-copy-mask h264 \
    -e copy \
    -a 1 -E aac -B 160  # still encode audio
```

### Video Scaling and Cropping

```bash
# Scale to 720p
HandBrakeCLI -i input.mkv -o output.mp4 \
    --preset="Fast 720p30" \
    -w 1280 -l 720

# Auto-crop black bars and scale to 1080p
HandBrakeCLI -i input.mkv -o output.mp4 \
    --preset="HQ 1080p60 Surround" \
    --auto-anamorphic

# Custom crop (top:bottom:left:right pixels)
HandBrakeCLI -i input.mkv -o output.mp4 \
    --crop 20:20:0:0 \
    -q 22

# Disable cropping entirely
HandBrakeCLI -i input.mkv -o output.mp4 \
    --crop 0:0:0:0
```

### Audio Options

```bash
# Extract all audio tracks
HandBrakeCLI -i input.mkv -o output.mp4 \
    -a 1,2,3 \
    -E aac,copy:ac3,copy:dts \
    -B 160,384,0

# Normalize audio
HandBrakeCLI -i input.mkv -o output.mp4 \
    --normalize-mix stereo \
    -a 1 -E aac -B 160

# Add audio gain (+3dB)
HandBrakeCLI -i input.mkv -o output.mp4 \
    -a 1 -E aac -B 160 --audio-gain=3
```

### Subtitle Options

```bash
# Include subtitle track from source
HandBrakeCLI -i input.mkv -o output.mp4 \
    -s 1  # include subtitle track 1

# Burn subtitles into video
HandBrakeCLI -i input.mkv -o output.mp4 \
    --subtitle-burned=1

# Add external SRT subtitle file
HandBrakeCLI -i input.mkv -o output.mp4 \
    --srt-file "subtitle.srt" \
    --srt-lang eng
```

## Listing Presets

```bash
# List all available presets
HandBrakeCLI --preset-list

# List presets in a specific category
HandBrakeCLI --preset-list "Devices"
HandBrakeCLI --preset-list "Production"
HandBrakeCLI --preset-list "Web"
```

## Batch Processing Script

Process an entire directory of video files:

```bash
#!/bin/bash
# batch_transcode.sh - Convert all MKV files to H.265 MP4

INPUT_DIR="/home/user/Movies"
OUTPUT_DIR="/home/user/Encoded"
LOG_FILE="/home/user/transcode.log"

mkdir -p "$OUTPUT_DIR"

for input_file in "$INPUT_DIR"/*.mkv; do
    # Get filename without path and extension
    filename=$(basename "${input_file%.*}")
    output_file="$OUTPUT_DIR/${filename}.mp4"

    # Skip if output already exists
    if [ -f "$output_file" ]; then
        echo "Skipping (already exists): $filename" | tee -a "$LOG_FILE"
        continue
    fi

    echo "$(date '+%Y-%m-%d %H:%M:%S') Starting: $filename" | tee -a "$LOG_FILE"

    HandBrakeCLI \
        -i "$input_file" \
        -o "$output_file" \
        --preset="H.265 MKV 1080p30" \
        -q 26 \
        --encoder-preset medium \
        -a 1 -E aac -B 192 -6 stereo \
        2>>"$LOG_FILE"

    if [ $? -eq 0 ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') Completed: $filename" | tee -a "$LOG_FILE"
    else
        echo "$(date '+%Y-%m-%d %H:%M:%S') FAILED: $filename" | tee -a "$LOG_FILE"
    fi
done

echo "Batch complete. Check $LOG_FILE for details."
```

## Hardware-Accelerated Encoding

HandBrake supports hardware encoders for faster transcoding:

```bash
# List available hardware encoders
HandBrakeCLI --help 2>&1 | grep "nvenc\|vaapi\|qsv\|amf"

# NVIDIA NVENC (requires NVIDIA GPU and driver)
HandBrakeCLI -i input.mkv -o output.mp4 \
    -e nvenc_h264 \
    --encopts "rc-lookahead=0:b-adapt=0" \
    -q 22 \
    -a 1 -E aac -B 160

# VA-API (Intel/AMD on Linux)
HandBrakeCLI -i input.mkv -o output.mp4 \
    -e vce_h264 \
    -q 22 \
    -a 1 -E aac -B 160

# Intel QSV
HandBrakeCLI -i input.mkv -o output.mp4 \
    -e qsv_h264 \
    -q 22 \
    -a 1 -E aac -B 160
```

Hardware encoding is 5-10x faster but typically produces slightly larger files at the same quality setting compared to software x264/x265.

## Creating Custom Presets

Save your settings as a reusable preset via the GUI (Presets -> Save New Preset), or import a JSON preset:

```bash
# Export a preset from GUI to JSON
HandBrakeCLI --preset-export "My Custom Preset" -o my_preset.json

# Import and use a preset
HandBrakeCLI --preset-import-file my_preset.json \
    -i input.mkv -o output.mp4 \
    --preset="My Custom Preset"
```

## Troubleshooting

### "No title found" error

```bash
# Specify the title explicitly
HandBrakeCLI -i input.mkv -o output.mp4 --title 1

# List available titles first
HandBrakeCLI -i input.mkv --scan -t 0
```

### Slow encoding speed

```bash
# Check current speed
HandBrakeCLI -i input.mkv -o output.mp4 -q 22 2>&1 | grep "fps"

# Switch to hardware encoder or faster preset
HandBrakeCLI -i input.mkv -o output.mp4 -e x264 --encoder-preset ultrafast -q 23
```

### Output file is too large

Lower the quality value (higher RF number) or use a slower encoder preset (better compression):

```bash
# RF 28 for H.265 - significantly smaller files
HandBrakeCLI -i input.mkv -o output.mp4 -e x265 -q 28 --encoder-preset slow
```

HandBrake strikes a good balance between power and usability. For one-off conversions, the GUI's preset system handles most needs; for automated pipelines, `HandBrakeCLI` integrates cleanly into shell scripts.
