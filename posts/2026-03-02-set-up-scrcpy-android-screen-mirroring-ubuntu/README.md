# How to Set Up Scrcpy for Android Screen Mirroring on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Android, Scrcpy, Screen Mirroring, ADB

Description: Install and configure Scrcpy on Ubuntu to mirror and control your Android device's screen over USB or Wi-Fi with low latency and no root required.

---

Scrcpy (pronounced "screen copy") displays and controls an Android device from a Linux desktop. It streams the phone's screen at low latency over ADB without requiring root access or installing any app on the phone. You can click, type, scroll, and swipe using your mouse and keyboard as if you were holding the phone. It is particularly useful for app development, presentations, recording phone screens, and using the phone without picking it up.

## Prerequisites

- Ubuntu 18.04 or later
- An Android device with USB Debugging enabled
- USB cable (for initial setup; Wi-Fi works after)

## Enabling USB Debugging on Android

1. Open Settings > About Phone
2. Tap "Build Number" seven times - you will see "You are now a developer"
3. Go back to Settings > Developer Options
4. Toggle "USB Debugging" to enabled

## Installing Scrcpy on Ubuntu

### From Ubuntu Repositories

```bash
# Scrcpy is available in Ubuntu 20.04+ repositories

sudo apt update
sudo apt install scrcpy -y

# Verify the version
scrcpy --version
```

### From Snap (Latest Version)

```bash
# Install from Snap for the most recent release
sudo snap install scrcpy
```

### Building from Source (Most Current Release)

```bash
# Install build dependencies
sudo apt install -y \
    ffmpeg \
    libsdl2-2.0-0 \
    adb \
    wget \
    gcc \
    git \
    pkg-config \
    meson \
    ninja-build \
    libsdl2-dev \
    libavcodec-dev \
    libavdevice-dev \
    libavformat-dev \
    libavutil-dev \
    libswresample-dev \
    libusb-1.0-0 \
    libusb-1.0-0-dev

# Clone the repository
git clone https://github.com/Genymobile/scrcpy.git
cd scrcpy

# Build the server JAR and client binary
./install_release.sh
```

## Basic Usage

Connect your phone via USB and accept the USB debugging authorization prompt on the phone:

```bash
# Verify ADB sees the device
adb devices

# Launch scrcpy with default settings
scrcpy

# The phone screen appears in a window on your desktop
# Use mouse clicks and keyboard to control the phone
```

## Common Options and Flags

### Resolution and Bitrate

```bash
# Limit resolution to reduce CPU usage (good for older hardware)
scrcpy --max-size 1024

# Set video bitrate (default 8Mbps) - lower for slower connections
scrcpy --video-bit-rate 4M

# Combine resolution and bitrate limits
scrcpy --max-size 1024 --video-bit-rate 2M
```

### Display Options

```bash
# Start in fullscreen mode
scrcpy --fullscreen

# Keep the window always on top
scrcpy --always-on-top

# Show touches on screen (useful for presentations/recording)
scrcpy --show-touches

# Disable window decoration/title bar
scrcpy --window-borderless

# Set a custom window title
scrcpy --window-title "My Phone"

# Lock video orientation in degrees (0, 90, 180, 270)
scrcpy --orientation=0
```

### Screen Off Mode

```bash
# Keep the phone screen off while mirroring (saves phone battery)
scrcpy --turn-screen-off

# Turn screen off after connecting and keep it off
scrcpy --turn-screen-off --stay-awake
```

### Recording the Screen

```bash
# Record the mirrored screen to an MP4 file
scrcpy --record screen_recording.mp4

# Record without playback/control (background recording)
scrcpy --no-playback --record screen_recording.mp4

# Record in MKV format
scrcpy --record recording.mkv
```

### Audio Forwarding (Scrcpy 2.0+)

Audio forwarding is enabled by default on Android 11+ devices using the `opus` codec.

```bash
# Switch the audio codec (opus is default; aac, flac and raw are also supported)
scrcpy --audio-codec=aac

# Disable audio forwarding if you only need video
scrcpy --no-audio

# Record with audio (audio is captured by default)
scrcpy --record with_audio.mp4
```

## Wireless Mode over Wi-Fi

ADB wireless mode lets you use scrcpy without a USB cable after the initial setup:

```bash
# Connect the phone via USB first
adb devices

# Switch ADB to TCP mode on port 5555
adb tcpip 5555

# Get the phone's IP address
adb shell ip addr show wlan0 | grep inet | awk '{print $2}' | cut -d/ -f1

# Disconnect the USB cable
# Connect wirelessly (replace IP with your phone's IP)
adb connect 192.168.1.105:5555

# Verify the connection
adb devices

# Launch scrcpy over Wi-Fi
scrcpy
```

For Android 11+ without USB:

```bash
# On Android: Developer Options > Wireless Debugging > Pair device with code
# Note the pairing port and code displayed on the phone

adb pair 192.168.1.105:PAIRING_PORT
# Enter the 6-digit code when prompted

adb connect 192.168.1.105:5555
scrcpy
```

## Keyboard and Mouse Controls

Scrcpy maps your keyboard and mouse to phone input. The default modifier (referred to as MOD) is left Alt or left Super; you can switch it to Ctrl with `--shortcut-mod=lctrl`.

| Action | Keyboard Shortcut |
|---|---|
| Switch fullscreen | Alt+F (or F11) |
| Resize window to remove black borders | Alt+W |
| Resize window to 1:1 (pixel-perfect) | Alt+G |
| Quit | Alt+Q |
| Home button | Alt+H |
| Back button | Alt+B |
| App switcher | Alt+S |
| Volume up | Alt+Up |
| Volume down | Alt+Down |
| Power button | Alt+P |
| Turn device screen off (keep mirroring) | Alt+O |
| Copy from device | Alt+C |
| Paste to device | Alt+V |
| Expand notification panel | Alt+N |

Mouse right-click simulates the Android back button. Mouse scroll maps to scrolling on the phone.

## Clipboard Sharing

```bash
# Scrcpy automatically syncs clipboard in both directions
# Copy on Ubuntu, paste on Android and vice versa

# You can also push text directly to the phone clipboard from the command line
adb shell am broadcast \
    -a clipper.set \
    -e text "Text to paste on phone"
```

## Launching Specific Apps

```bash
# Open a specific app by package name after connecting
scrcpy &
sleep 2
adb shell am start -n com.android.chrome/com.google.android.apps.chrome.Main

# List installed packages
adb shell pm list packages | sort
```

## Multi-Device Handling

When multiple Android devices are connected:

```bash
# List all connected devices
adb devices

# Target a specific device by serial number
scrcpy --serial emulator-5554

# Or set via the ANDROID_SERIAL environment variable
export ANDROID_SERIAL=192.168.1.105:5555
scrcpy
```

## Creating a Launch Script

Put your preferred options into a script for quick launching:

```bash
#!/bin/bash
# launch_phone.sh - Start scrcpy with preferred settings

PHONE_IP="192.168.1.105"

# Reconnect ADB if needed
adb connect "${PHONE_IP}:5555" 2>/dev/null

# Launch scrcpy with custom settings
scrcpy \
    --max-size 1080 \
    --video-bit-rate 4M \
    --turn-screen-off \
    --stay-awake \
    --show-touches \
    --window-title "Phone Mirror"
```

```bash
chmod +x launch_phone.sh
./launch_phone.sh
```

## Troubleshooting

**"No devices/emulators found"**: Run `adb devices` to confirm the device is visible. If it shows "unauthorized," check the phone for a pairing prompt. If no devices appear at all, try a different USB cable.

**High latency over USB**: Latency over USB should be under 100ms. If higher, reduce the bitrate with `--video-bit-rate 2M` and the resolution with `--max-size 720`.

**Wi-Fi connection drops**: Keep the phone awake with `--stay-awake`. Also check that the phone's Wi-Fi power saving mode is not killing the ADB connection.

**Black screen after connecting**: Some apps (banking apps, DRM content) block screen capture. This is an Android restriction and cannot be bypassed without root.

**scrcpy crashes on startup**: Update to the latest version. The snap package typically has newer releases than the APT repositories.

Scrcpy is one of the most practical utilities for Android-to-desktop workflows. Zero installation on the phone side, no account required, and the latency is low enough to play casual games comfortably from the desktop.
