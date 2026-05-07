# How to Use Audio Devices in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Audio, PulseAudio, PipeWire, ALSA, Container

Description: A practical guide to enabling audio input and output in Podman containers using ALSA, PulseAudio, and PipeWire, with examples for recording, playback, and real-time audio processing.

---

> Enabling audio in Podman containers lets you build containerized media applications, voice processing pipelines, and audio testing environments with full speaker and microphone access.

Audio in containers is not as straightforward as file-based workloads because audio hardware requires real-time communication between the container and the host's sound system. Linux uses several audio subsystems -- ALSA at the kernel level, and PulseAudio or PipeWire as userspace sound servers. Podman can integrate with all of these to provide containers with audio input and output capabilities. This guide covers each approach and provides practical examples for common audio use cases.

---

## Linux Audio Stack Overview

Understanding the Linux audio stack helps you choose the right approach:

1. **ALSA (Advanced Linux Sound Architecture)** - The kernel-level audio subsystem that provides direct hardware access through device files in `/dev/snd/`.
2. **PulseAudio** - A userspace sound server that manages audio routing, mixing, and access control. Communicates via a Unix socket.
3. **PipeWire** - The modern replacement for PulseAudio that also handles video. Provides PulseAudio compatibility through a compatibility layer.

```bash
# Check which audio system your host uses

# For PulseAudio
pactl info 2>/dev/null | head -5

# For PipeWire
pw-cli info all 2>/dev/null | head -5

# List ALSA devices
aplay -l 2>/dev/null
arecord -l 2>/dev/null

# List audio device files
ls -la /dev/snd/
# Example output:
# crw-rw----+ 1 root audio 116,  1 Mar 18 08:00 controlC0
# crw-rw----+ 1 root audio 116, 33 Mar 18 08:00 pcmC0D0c  (capture)
# crw-rw----+ 1 root audio 116, 32 Mar 18 08:00 pcmC0D0p  (playback)
# crw-rw----+ 1 root audio 116,  0 Mar 18 08:00 timer
```

## Method 1: ALSA Direct Device Access

The simplest method is passing ALSA device files directly into the container. This provides low-latency access but bypasses the sound server.

```bash
# Pass all ALSA devices to the container
podman run --rm -it \
  --device /dev/snd:/dev/snd \
  fedora:latest \
  bash -c "dnf install -y alsa-utils && aplay -l"

# Play a test tone using ALSA
podman run --rm -it \
  --device /dev/snd:/dev/snd \
  --group-add keep-groups \
  fedora:latest \
  bash -c "dnf install -y alsa-utils && speaker-test -t sine -f 440 -l 1"

# Record audio using ALSA (5 seconds of recording)
podman run --rm -it \
  --device /dev/snd:/dev/snd \
  --group-add keep-groups \
  -v /tmp/audio-output:/output:Z \
  fedora:latest \
  bash -c "dnf install -y alsa-utils && arecord -d 5 -f cd /output/recording.wav"
```

### User Permissions for ALSA

```bash
# Add your user to the audio group for rootless access
sudo usermod -aG audio $USER
# Log out and back in

# Verify group membership
groups | grep audio
```

## Method 2: PulseAudio Socket Sharing

PulseAudio uses a Unix socket for communication. By sharing this socket with the container, you get full audio routing through the host's sound server.

```bash
# Find the PulseAudio socket location
echo $XDG_RUNTIME_DIR/pulse/native
# Usually: /run/user/1000/pulse/native

# Run a container with PulseAudio access
podman run --rm -it \
  -v /run/user/$(id -u)/pulse/native:/run/user/1000/pulse/native \
  -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
  fedora:latest \
  bash -c "dnf install -y pulseaudio-utils && pactl info"

# Play audio through PulseAudio
podman run --rm -it \
  -v /run/user/$(id -u)/pulse/native:/run/user/1000/pulse/native \
  -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
  fedora:latest \
  bash -c "dnf install -y pulseaudio-utils sox && \
           sox -n -r 44100 -c 2 /tmp/test.wav synth 1 sine 440 && \
           paplay /tmp/test.wav"
```

### Sharing PulseAudio Cookie for Authentication

Some PulseAudio configurations require an authentication cookie:

```bash
# Share the PulseAudio cookie along with the socket
podman run --rm -it \
  -v /run/user/$(id -u)/pulse/native:/run/user/1000/pulse/native \
  -v $HOME/.config/pulse/cookie:/root/.config/pulse/cookie:ro \
  -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
  -e PULSE_COOKIE=/root/.config/pulse/cookie \
  fedora:latest \
  bash -c "dnf install -y pulseaudio-utils && pactl list sinks short"
```

## Method 3: PipeWire Integration

PipeWire is the default audio system on modern Linux distributions like Fedora and Ubuntu 22.10+. It provides PulseAudio compatibility, so the PulseAudio socket method often works. For native PipeWire access:

```bash
# Share the PipeWire socket
podman run --rm -it \
  -v /run/user/$(id -u)/pipewire-0:/run/user/1000/pipewire-0 \
  -v /run/user/$(id -u)/pulse/native:/run/user/1000/pulse/native \
  -e XDG_RUNTIME_DIR=/run/user/1000 \
  -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
  fedora:latest \
  bash -c "dnf install -y pipewire-utils pulseaudio-utils && \
           pw-cli info all >/dev/null && pactl info"
```

## Practical Example: Audio Recording and Processing

```bash
# Create an audio processing script
mkdir -p /tmp/audio-demo
cat > /tmp/audio-demo/process_audio.py << 'EOF'
import subprocess
import sys
import os

def record_audio(filename, duration=5, sample_rate=44100):
    """Record audio using arecord (ALSA)."""
    print(f"Recording {duration} seconds of audio...")
    cmd = [
        "arecord",
        "-d", str(duration),
        "-f", "cd",           # CD quality (16-bit, 44100 Hz, stereo)
        "-r", str(sample_rate),
        "-t", "wav",
        filename
    ]
    subprocess.run(cmd, check=True)
    print(f"Saved recording to {filename}")

def get_audio_info(filename):
    """Get information about an audio file."""
    cmd = ["soxi", filename]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(result.stdout)
    else:
        # Fallback: use file command
        result = subprocess.run(["file", filename], capture_output=True, text=True)
        print(result.stdout)

def convert_audio(input_file, output_file, sample_rate=16000):
    """Convert audio to a different format using sox."""
    print(f"Converting {input_file} to {output_file} at {sample_rate} Hz...")
    cmd = [
        "sox", input_file,
        "-r", str(sample_rate),    # Resample
        "-c", "1",                  # Convert to mono
        "-b", "16",                 # 16-bit depth
        output_file
    ]
    subprocess.run(cmd, check=True)
    print(f"Converted audio saved to {output_file}")

if __name__ == "__main__":
    output_dir = "/output"
    os.makedirs(output_dir, exist_ok=True)

    raw_file = os.path.join(output_dir, "raw_recording.wav")
    processed_file = os.path.join(output_dir, "processed_recording.wav")

    # Record audio
    record_audio(raw_file, duration=3)

    # Show audio info
    print("\nOriginal file info:")
    get_audio_info(raw_file)

    # Convert to mono 16kHz (common for speech processing)
    convert_audio(raw_file, processed_file, sample_rate=16000)

    print("\nProcessed file info:")
    get_audio_info(processed_file)

    print("\nAudio processing complete!")
EOF

# Build a container image with audio tools
cat > /tmp/audio-demo/Containerfile << 'EOF'
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    alsa-utils \
    sox \
    libsox-fmt-all \
    pulseaudio-utils \
    python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY process_audio.py .

CMD ["python3", "process_audio.py"]
EOF

# Build the audio processing image
podman build -t audio-processor:latest -f /tmp/audio-demo/Containerfile /tmp/audio-demo/

# Run with ALSA device access
podman run --rm -it \
  --device /dev/snd:/dev/snd \
  --group-add keep-groups \
  -v /tmp/audio-output:/output:Z \
  audio-processor:latest
```

## Text-to-Speech in a Container

```bash
# Run text-to-speech with audio output via PulseAudio
podman run --rm -it \
  -v /run/user/$(id -u)/pulse/native:/run/user/1000/pulse/native \
  -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y espeak-ng pulseaudio-utils && \
           espeak-ng 'Hello from inside a Podman container'"
```

## Running Audio Streaming Tools in a Container

```bash
# Run an FFmpeg container with audio input for streaming
podman run --rm -it \
  --device /dev/snd:/dev/snd \
  -p 8000:8000 \
  -v /run/user/$(id -u)/pulse/native:/run/user/1000/pulse/native \
  -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y ffmpeg pulseaudio-utils && \
           echo 'Audio streaming container ready. Use ffmpeg to stream.'"
```

## Combining ALSA and PulseAudio

For maximum compatibility, you can provide both ALSA and PulseAudio access:

```bash
# Full audio access with both ALSA and PulseAudio
podman run --rm -it \
  --device /dev/snd:/dev/snd \
  -v /run/user/$(id -u)/pulse/native:/run/user/1000/pulse/native \
  -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
  --group-add keep-groups \
  ubuntu:22.04 \
  bash -c "apt-get update && apt-get install -y alsa-utils pulseaudio-utils && \
           echo '=== ALSA devices ===' && aplay -l && \
           echo '=== PulseAudio info ===' && pactl info"
```

## Troubleshooting

```bash
# No sound output
# Check if PulseAudio/PipeWire is running on the host
systemctl --user status pulseaudio 2>/dev/null || \
systemctl --user status pipewire 2>/dev/null

# Permission denied on /dev/snd/*
# Verify the user is in the audio group
groups | grep audio
# Check device permissions
ls -la /dev/snd/

# PulseAudio connection refused
# Verify the socket exists
ls -la /run/user/$(id -u)/pulse/native

# Check if the socket path is correct inside the container
podman run --rm -it \
  -v /run/user/$(id -u)/pulse/native:/run/user/1000/pulse/native \
  -e PULSE_SERVER=unix:/run/user/1000/pulse/native \
  fedora:latest \
  bash -c "ls -la /run/user/1000/pulse/native"

# ALSA device busy (another application is using it)
# PulseAudio may hold exclusive access to ALSA devices
# Use the PulseAudio socket method instead of direct ALSA access

# SELinux blocking audio access
sudo setsebool -P container_use_devices=true
```

## Conclusion

Audio in Podman containers is achievable through three main approaches: direct ALSA device passthrough for low-latency access, PulseAudio socket sharing for integration with the host sound server, and PipeWire socket sharing for modern Linux distributions. The PulseAudio socket method is generally the most flexible as it does not require exclusive device access and works well with rootless Podman. For production deployments, combine the socket sharing approach with proper volume mounts and environment variables to create containers that can record, play, and process audio seamlessly.
