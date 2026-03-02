# How to Record Screen on Ubuntu with OBS Studio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OBS Studio, Screen Recording, Streaming, Video

Description: Step-by-step guide to installing and configuring OBS Studio on Ubuntu for screen recording and live streaming, including scenes, sources, encoding settings, and audio capture.

---

OBS Studio (Open Broadcaster Software) is the go-to tool for screen recording and live streaming on Linux. It's free, open-source, and powerful enough for professional use. On Ubuntu, OBS works with both X11 and Wayland, though the setup differs slightly between them. This guide covers installation, basic configuration, and practical recording setups.

## Installation

### From Official PPA (Recommended)

The OBS Project maintains an official PPA with the latest releases:

```bash
# Add the OBS Studio PPA
sudo add-apt-repository ppa:obsproject/obs-studio -y
sudo apt-get update

# Install OBS with dependencies
sudo apt-get install -y obs-studio

# Verify installation
obs --version
```

### From Ubuntu Repository

```bash
# May be an older version
sudo apt-get install -y obs-studio
```

### From Flatpak (Good for Wayland Support)

```bash
sudo apt-get install -y flatpak
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install flathub com.obsproject.Studio
flatpak run com.obsproject.Studio
```

## X11 vs Wayland Considerations

On X11, OBS has full access to screen capture through Xshm. On Wayland, screen capture requires PipeWire:

```bash
# Check which display server you're using
echo $XDG_SESSION_TYPE  # outputs "x11" or "wayland"

# For Wayland, install PipeWire support
sudo apt-get install -y \
    pipewire \
    libpipewire-0.3-dev \
    xdg-desktop-portal \
    xdg-desktop-portal-gnome  # for GNOME
    # or xdg-desktop-portal-kde for KDE

# Verify PipeWire is running
systemctl --user status pipewire
```

## First Launch and Configuration

When OBS starts for the first time, the Auto-Configuration Wizard runs. Let it detect your system settings. You can also run it later from Tools -> Auto-Configuration Wizard.

```bash
# Launch OBS
obs
```

The main window shows:
- **Preview**: What will be recorded/streamed
- **Scenes panel**: Named collections of sources
- **Sources panel**: Individual elements in the current scene
- **Audio Mixer**: Volume and mute controls for audio sources
- **Controls**: Start/stop recording and streaming

## Creating a Scene for Screen Recording

### Step 1: Create a Scene

In the Scenes panel, click the + button and name it (e.g., "Desktop Recording").

### Step 2: Add a Screen Capture Source

In the Sources panel, click + and select:

**On X11:**
- Choose "Screen Capture (XSHM)" or "Window Capture (Xcomposite)"
- Select the display or window to capture

**On Wayland:**
- Choose "Screen Capture (PipeWire)"
- A portal dialog will open to select the screen/window
- Allow the capture in the dialog

### Step 3: Add Audio Sources

To capture system audio and microphone:

```
Sources panel -> + -> Audio Output Capture
Name: "Desktop Audio"
Device: Default (or select specific output)

Sources panel -> + -> Audio Input Capture
Name: "Microphone"
Device: Default (or select your microphone)
```

### Step 4: Adjust Layout

Drag and resize sources in the preview window. Hold Alt while dragging the edges to crop a source.

## Output Settings for Recording

Go to Settings (gear icon or File -> Settings):

### Video Settings

```
Settings -> Video:
- Base (Canvas) Resolution: 1920x1080 (match your display)
- Output (Scaled) Resolution: 1920x1080 (or 1280x720 for smaller files)
- Downscale Filter: Lanczos (best quality)
- Common FPS Values: 30 or 60
```

### Output Settings

```
Settings -> Output -> Output Mode: Advanced

Recording tab:
- Type: Standard
- Recording Path: /home/user/Videos/Recordings
- Recording Format: mkv (safer) or mp4
- Encoder: see below
- Audio Track: Track 1
```

### Choosing an Encoder

```
Software encoders (works everywhere, uses CPU):
- x264: Best compatibility, adjustable quality
  - Rate Control: CRF
  - CRF: 18-23 (lower = better quality, larger file)
  - Preset: veryfast to medium

Hardware encoders (much faster, uses GPU):
- NVENC H.264: For NVIDIA GPUs
  - Rate Control: CQP
  - CQ Level: 18-23
- VA-API H.264: Intel/AMD hardware encoding
  - Rate Control: CQP
- AMD AMF H.264: For AMD GPUs
```

To enable VA-API (hardware encoding for Intel/AMD):

```bash
# Install VA-API drivers
sudo apt-get install -y vainfo libva-dev

# For Intel
sudo apt-get install -y intel-media-va-driver

# For AMD
sudo apt-get install -y mesa-va-drivers

# Verify
vainfo
```

## Audio Mixer Configuration

The Audio Mixer panel shows levels for each audio source. Configure proper levels:

```bash
# In OBS Audio Mixer:
# - Desktop Audio: keep around -12dB to -6dB
# - Microphone: keep peaks around -6dB
# - Avoid red (clipping) at 0dB

# Right-click any source in Audio Mixer:
# - Filters: add noise gate, compressor, or EQ
# - Advanced Audio Properties: set delay/sync
```

### Adding Audio Filters

For microphone, add these filters (right-click source -> Filters):

1. **Noise Suppression**: Reduces background noise
2. **Noise Gate**: Mutes mic when below threshold (silence between speech)
3. **Compressor**: Evens out volume spikes

```
Noise Gate settings:
- Close Threshold: -40 dB
- Open Threshold: -35 dB
- Attack: 25ms, Hold: 200ms, Release: 150ms
```

## Recording Keyboard Shortcuts

Set hotkeys so you don't have to click during recordings:

```
Settings -> Hotkeys:
- Start Recording: Ctrl+Alt+R
- Stop Recording: Ctrl+Alt+S (or same key to toggle)
- Pause Recording: Ctrl+Alt+P
- Screenshot: Ctrl+Alt+F (via OBS plugin)
```

## Optimizing Recording Quality

### For Tutorial/Screencasts

```
Encoder: x264
Rate Control: CRF
CRF: 23
Preset: veryfast
Profile: main
Audio: AAC 192kbps, 48000Hz
FPS: 30
```

### For Gaming/High Motion

```
Encoder: NVENC H.264 (if NVIDIA) or x264
Rate Control: CQP (NVENC) or CRF (x264)
CQ Level/CRF: 18-20
Preset: Performance (NVENC) or fast (x264)
FPS: 60
```

### For Small File Size

```
Encoder: x264
Rate Control: CRF
CRF: 28-32
Preset: slow (better compression at same quality)
Downscale to: 1280x720
FPS: 30
```

## Advanced: Recording Multiple Audio Tracks

Record audio sources to separate tracks for flexible post-editing:

```
Settings -> Output -> Recording -> Audio Track: enable tracks 1-3

Then in Edit -> Advanced Audio Properties:
- Desktop Audio: Track 1 + Track 2
- Microphone: Track 1 + Track 3

This records the mix on Track 1, desktop-only on Track 2,
microphone-only on Track 3
```

## Streaming Configuration

OBS is also used for live streaming. Configure for common platforms:

```
Settings -> Stream:
- Service: Twitch / YouTube / Custom RTMP
- Server: select nearest server
- Stream Key: paste from your streaming platform

Settings -> Output -> Streaming:
- Encoder: NVENC H.264 (or x264)
- Bitrate: 3500-6000 kbps for 1080p60
- Keyframe Interval: 2 seconds
```

## Useful OBS Plugins

```bash
# Install OBS plugin support
sudo apt-get install -y obs-plugins

# Popular plugins (install from GitHub releases or source):
# obs-backgroundremoval: AI background removal
# obs-vkcapture: Better Vulkan/DirectX game capture on Linux
# waveform: Real-time audio visualization
# obs-move-transition: Smooth scene transitions

# For Wayland game capture:
sudo apt-get install -y obs-vkcapture
```

## Troubleshooting

### Black screen on display capture (Wayland)

```bash
# Ensure PipeWire and XDG portal are running
systemctl --user status xdg-desktop-portal
systemctl --user restart xdg-desktop-portal

# Restart OBS
# When adding Screen Capture (PipeWire), approve the portal dialog
```

### High CPU usage during recording

```bash
# Switch to hardware encoding (NVENC, VA-API, AMF)
# Reduce encoding preset to "veryfast" or "ultrafast" for x264

# Check CPU usage during recording
top -p $(pgrep obs)

# Reduce canvas/output resolution if needed
```

### Audio out of sync

```bash
# In OBS: Edit -> Advanced Audio Properties
# Add a fixed delay to the video track to match audio
# Or add delay to microphone if video is ahead

# Typical fix: add 200-400ms delay to video capture source
# via right-click -> Filters -> Video Delay
```

### OBS shows low FPS during recording

```bash
# Check if GPU is being used
nvidia-smi  # for NVIDIA
vainfo       # for VA-API

# Enable hardware encoding in settings
# Close other GPU-intensive applications while recording
# Reduce output FPS from 60 to 30
```

OBS on Ubuntu with hardware encoding delivers excellent recording quality with minimal performance impact. Once your scene setup and encoding settings are dialed in, the actual recording workflow becomes quick and repeatable.
