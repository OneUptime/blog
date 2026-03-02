# How to Install and Configure ALSA on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ALSA, Audio, Sound, Linux Kernel

Description: A guide to installing and configuring ALSA (Advanced Linux Sound Architecture) on Ubuntu, including device management, mixer settings, module configuration, and testing audio output.

---

ALSA (Advanced Linux Sound Architecture) is the kernel-level audio subsystem on Linux. It's what actually talks to your sound hardware. PulseAudio, PipeWire, and JACK all sit on top of ALSA. Understanding ALSA helps you diagnose audio problems at the lowest level and configure audio hardware that higher-level sound servers may not automatically detect.

## How ALSA Fits in the Stack

```
Applications (VLC, Firefox, etc.)
        |
PulseAudio / PipeWire / JACK  (sound servers)
        |
ALSA (kernel audio subsystem)
        |
Physical sound hardware (sound cards, USB audio devices)
```

When PulseAudio or PipeWire isn't running, applications with ALSA support can still produce sound directly through ALSA.

## ALSA Packages

```bash
# Core ALSA utilities (usually pre-installed)
sudo apt-get install -y alsa-utils alsa-base

# ALSA tools for advanced debugging
sudo apt-get install -y alsa-tools alsa-tools-gui

# Development libraries if compiling ALSA applications
sudo apt-get install -y libasound2-dev

# ALSA plugins for additional format support
sudo apt-get install -y libasound2-plugins
```

## Listing Sound Devices

```bash
# List all ALSA sound cards
aplay -l

# Expected output:
# **** List of PLAYBACK Hardware Devices ****
# card 0: PCH [HDA Intel PCH], device 0: ALC887-VD Analog [ALC887-VD Analog]
# card 1: HDMI [HDA Intel HDMI], device 3: HDMI 0 [HDMI 0]

# List recording devices
arecord -l

# Show all devices (playback and capture combined)
aplay -L  # Long format with device names

# Show raw PCM device names for use in configs
cat /proc/asound/cards
cat /proc/asound/devices
```

## Testing Audio Output

```bash
# Play a test tone (440Hz sine wave for 3 seconds)
speaker-test -t sine -f 440 -l 1

# Test all speakers (stereo, surround, etc.)
speaker-test -c 2  # stereo
speaker-test -c 6  # 5.1 surround

# Play a WAV file through ALSA directly
aplay /usr/share/sounds/alsa/Front_Center.wav

# Play through a specific card and device
aplay -D hw:0,0 /usr/share/sounds/alsa/Front_Center.wav

# Test a specific card by index
aplay -D plughw:1,0 test.wav  # plughw allows format conversion
```

## ALSA Mixer: alsamixer

The interactive mixer for controlling volume and mute states:

```bash
# Open the ALSA mixer TUI
alsamixer

# Key bindings:
# F1: Help
# F6: Select sound card
# Arrow keys: Navigate channels
# Up/Down: Adjust volume
# M: Mute/unmute
# Space: Toggle
# Esc: Exit

# Open for a specific card
alsamixer -c 0  # card 0
alsamixer -c 1  # card 1

# Start in capture mode
alsamixer -V capture
```

## amixer: Command-Line Mixer

```bash
# List all mixer controls
amixer

# List controls for a specific card
amixer -c 0

# Get current state of a control
amixer get Master
amixer get PCM
amixer get Capture

# Set master volume to 80%
amixer set Master 80%

# Set volume by dB
amixer set Master -6dB

# Mute master
amixer set Master mute

# Unmute master
amixer set Master unmute

# Toggle mute
amixer set Master toggle

# Set capture (microphone) volume
amixer set Capture 70%

# Enable capture
amixer set Capture cap
```

## Saving and Restoring ALSA Settings

ALSA doesn't persist mixer settings across reboots by default without alsa-utils:

```bash
# Save current mixer settings
sudo alsactl store

# Restore saved settings
sudo alsactl restore

# Restore settings for a specific card
sudo alsactl restore 0

# Settings are stored in:
cat /var/lib/alsa/asound.state

# The alsa-restore service handles this automatically on Ubuntu
systemctl status alsa-restore
```

## ALSA Configuration File

The main ALSA configuration file is `/etc/asound.conf` (system-wide) or `~/.asoundrc` (per-user):

### Setting a Default Sound Card

```bash
# Find card and device numbers
aplay -l
# Note the card number (e.g., card 1 for USB audio)

# Set default card globally
sudo tee /etc/asound.conf << 'EOF'
# Set card 1 as default (adjust to your card number)
defaults.pcm.card 1
defaults.ctl.card 1
EOF
```

### Per-User Default

```bash
cat > ~/.asoundrc << 'EOF'
# Set USB audio device as default
defaults.pcm.card 1
defaults.ctl.card 1
EOF
```

### Software Volume Control (dmix)

The `dmix` plugin allows multiple applications to share an ALSA device (when PulseAudio is not running):

```bash
cat > ~/.asoundrc << 'EOF'
# Define a virtual device using dmix for software mixing
pcm.!default {
    type plug
    slave.pcm "dmix"
}

pcm.dmix {
    type dmix
    ipc_key 1024
    slave {
        pcm "hw:0,0"
        rate 48000
        channels 2
        period_size 1024
        buffer_size 8192
    }
}
EOF
```

### Format Conversion Plugin

Use the `plug` plugin to handle format mismatches between apps and hardware:

```bash
cat > ~/.asoundrc << 'EOF'
pcm.!default {
    type plug
    slave {
        pcm "hw:0,0"
        rate 48000     # Force 48kHz output
        format S16_LE  # Force 16-bit little-endian
    }
}
EOF
```

## Kernel Module Configuration

ALSA loads kernel modules for your sound hardware. Configuration files control how these modules behave:

```bash
# View current ALSA module options
cat /proc/asound/modules

# Configure module options
sudo nano /etc/modprobe.d/alsa-base.conf

# Common options for Intel HDA (High Definition Audio):
# options snd-hda-intel model=auto  # Auto-detect headphone jack
# options snd-hda-intel model=generic  # Generic configuration
# options snd-hda-intel index=0  # Set card priority
# options snd-hda-intel probe_mask=1  # Only probe first codec

# Force sound card order (if you want USB audio to be card 0)
echo "options snd-usb-audio index=0" | sudo tee /etc/modprobe.d/usb-audio.conf
echo "options snd-hda-intel index=1" | sudo tee -a /etc/modprobe.d/usb-audio.conf
```

After changing module options:

```bash
# Reload audio modules
sudo alsa force-reload

# Or manually
sudo modprobe -r snd-hda-intel
sudo modprobe snd-hda-intel
```

## Configuring HDMI Audio Output

HDMI audio often has multiple devices per card:

```bash
# List HDMI devices
aplay -l | grep HDMI

# Test each HDMI output
aplay -D plughw:1,3 /usr/share/sounds/alsa/Front_Center.wav  # card 1, device 3
aplay -D plughw:1,7 /usr/share/sounds/alsa/Front_Center.wav  # card 1, device 7

# Set HDMI as default
sudo tee /etc/asound.conf << 'EOF'
defaults.pcm.card 1
defaults.pcm.device 3
defaults.ctl.card 1
EOF
```

## Recording Audio with arecord

```bash
# List recording devices
arecord -l

# Record from default microphone (5 seconds, stereo, 44100Hz, 16-bit)
arecord -d 5 -c 2 -r 44100 -f S16_LE test.wav

# Record from a specific device
arecord -D hw:0,0 -d 5 -c 1 -r 44100 -f S16_LE mono.wav

# Monitor recording level (VU meter)
arecord -vvv -f dat /dev/null
```

## ALSA Debugging

```bash
# Check ALSA version
cat /proc/asound/version

# Full ALSA device dump
cat /proc/asound/pcm

# Check for ALSA errors
dmesg | grep -i alsa

# Verbose aplay output for debugging
aplay -v /usr/share/sounds/alsa/Front_Center.wav

# Test raw hardware access
aplay -D hw:0,0 --dump-hw-params /usr/share/sounds/alsa/Front_Center.wav

# Check if a device is in use
fuser /dev/snd/*
```

## USB Audio Devices

```bash
# Check if USB audio is detected
lsusb | grep -i audio

# Find the ALSA card for USB device
cat /proc/asound/cards | grep USB

# Test USB audio
aplay -D plughw:USB test.wav

# Make USB audio the default (see module configuration above)
```

## ALSA Alongside PulseAudio

When PulseAudio is running, it takes over ALSA devices. To use ALSA tools directly while PulseAudio is running, either stop PulseAudio or use the ALSA-PulseAudio bridge:

```bash
# Stop PulseAudio temporarily
pulseaudio --kill

# Test ALSA directly
aplay /usr/share/sounds/alsa/Front_Center.wav

# Restart PulseAudio
pulseaudio --start

# Or use ALSA's PulseAudio plugin to send ALSA output through PulseAudio
# This is handled by libasound2-plugins automatically for most apps
```

Understanding ALSA at this level lets you debug audio problems that look mysterious at the PulseAudio or PipeWire level. When you can produce sound with `aplay` but not with your application, the problem is in the layers above ALSA.
