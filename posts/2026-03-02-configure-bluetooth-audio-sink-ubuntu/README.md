# How to Configure Bluetooth Audio Sink on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bluetooth, Audio, PulseAudio, PipeWire

Description: Learn how to configure Bluetooth audio sink on Ubuntu using PulseAudio and PipeWire, including A2DP profile setup, volume control, and codec selection.

---

Getting Bluetooth audio working properly on Ubuntu requires configuring both the Bluetooth stack (BlueZ) and the audio server (PulseAudio or PipeWire). While the GUI makes this easy on desktop Ubuntu, understanding the underlying components lets you configure it headlessly and troubleshoot when things break.

## Understanding Bluetooth Audio Profiles

Bluetooth audio uses two main profiles:
- **A2DP (Advanced Audio Distribution Profile)**: High-quality stereo audio, for listening to music. Sink = device receives audio from computer.
- **HSP/HFP (Headset/Hands-Free Profile)**: Lower quality, bidirectional audio for calls. Includes microphone support.

When you connect Bluetooth headphones, they support both profiles. Ubuntu defaults to one, and you may need to switch manually.

## Choosing Your Audio Server

Ubuntu 22.04+ ships with PipeWire as the default audio server. Ubuntu 20.04 uses PulseAudio. Check which one is running:

```bash
# Check if PipeWire is running
systemctl --user status pipewire

# Check if PulseAudio is running
systemctl --user status pulseaudio

# Check what's handling audio
pactl info | grep "Server Name"
# Shows: PulseAudio or PipeWire (through PulseAudio compatibility)
```

## Setting Up Bluetooth Audio with PulseAudio

### Install Required Packages

```bash
# Install PulseAudio with Bluetooth support
sudo apt update
sudo apt install pulseaudio pulseaudio-module-bluetooth -y

# Restart PulseAudio to load the Bluetooth module
pulseaudio --kill
pulseaudio --start

# Verify the Bluetooth module is loaded
pactl list modules | grep bluetooth
```

### Pair and Connect a Bluetooth Speaker

First, pair the device using bluetoothctl (see the pairing guide), then:

```bash
# After pairing, connect the device
bluetoothctl connect AA:BB:CC:DD:EE:FF

# List available audio sinks (output devices)
pactl list sinks short

# Output example:
# 0 alsa_output.pci-0000_00_1f.3.analog-stereo  ...  RUNNING
# 1 bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink  ...  IDLE

# Set the Bluetooth speaker as the default sink
pactl set-default-sink bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink

# Or move all current playback streams to the Bluetooth speaker
# First get the stream indexes
pactl list sink-inputs short
# Then move each stream
pactl move-sink-input 0 bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink
```

### Setting Volume

```bash
# Set volume to 70% on the Bluetooth sink
pactl set-sink-volume bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink 70%

# Set volume to a specific level (65536 = 100%)
pactl set-sink-volume bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink 45875

# Mute/unmute
pactl set-sink-mute bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink 1  # mute
pactl set-sink-mute bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink 0  # unmute

# Toggle mute
pactl set-sink-mute bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink toggle
```

## Setting Up Bluetooth Audio with PipeWire

PipeWire includes Bluetooth support built-in through `pipewire-pulse` (PulseAudio compatibility layer):

```bash
# Install PipeWire with Bluetooth support
sudo apt install pipewire pipewire-pulse pipewire-audio-client-libraries \
    wireplumber libspa-0.2-bluetooth -y

# Restart PipeWire
systemctl --user restart pipewire pipewire-pulse wireplumber

# Verify PipeWire is managing Bluetooth audio
pw-cli list-objects | grep bluez
```

### Managing Devices with wpctl (WirePlumber Control)

WirePlumber is the session manager for PipeWire:

```bash
# List all audio sinks
wpctl status

# List sinks with IDs
wpctl status | grep -A 20 "Sinks:"

# Set Bluetooth sink as default (use the ID from wpctl status)
wpctl set-default 45  # Replace 45 with your sink ID

# Set volume (1.0 = 100%)
wpctl set-volume 45 0.7  # 70%

# Mute/unmute
wpctl set-mute 45 1  # mute
wpctl set-mute 45 0  # unmute
wpctl set-mute 45 toggle
```

## Switching Between A2DP and HFP Profiles

When you need to switch audio profiles (e.g., from music to calls):

### With PulseAudio

```bash
# List card profiles for the Bluetooth device
pactl list cards | grep -A 30 "bluez_card"

# Set A2DP profile (high quality audio output)
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF a2dp_sink

# Set HFP profile (headset with microphone)
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF headset_head_unit

# Or HSP profile
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF headset-head-unit
```

### With PipeWire/wpctl

```bash
# List device cards and their profiles
wpctl status

# Use pw-cli to list available profiles for a device
pw-cli enum-params $(pw-cli ls | grep bluez | head -1 | awk '{print $1}') 12

# Or use pactl (PulseAudio compatibility still works)
pactl list cards | grep -E "Name:|active profile:|a2dp|hfp"
```

## Configuring Codecs

Modern Bluetooth audio supports various codecs that affect quality and latency:

| Codec | Quality | Latency | Notes |
|-------|---------|---------|-------|
| SBC | Good | Higher | Mandatory, always available |
| AAC | Better | Medium | Apple devices use this |
| aptX | Better | Low | Qualcomm devices |
| LDAC | Excellent | Higher | Sony devices, high bandwidth |
| LC3 | Excellent | Low | Bluetooth LE Audio standard |

```bash
# Install codecs for PipeWire
sudo apt install libfreeaptx0 -y  # aptX support
sudo apt install libldac -y 2>/dev/null || true  # LDAC support

# Check available codecs for a connected device
# With PipeWire, use the pw-cli
pw-cli dump short Node | grep bluez

# In PulseAudio, check pactl output
pactl list cards | grep "codec\|a2dp"
```

## Making Bluetooth Audio Connection Automatic

Configure BlueZ to auto-connect audio devices:

```bash
# In /etc/bluetooth/main.conf, ensure AutoEnable is set
sudo sed -i 's/#AutoEnable=false/AutoEnable=true/' /etc/bluetooth/main.conf

# For PulseAudio, configure auto-switching to Bluetooth when device connects
cat << 'EOF' | sudo tee /etc/pulse/default.pa.d/bluetooth-auto-switch.pa
# Load Bluetooth discovery module with automatic profile switching
load-module module-bluetooth-policy auto_switch=2
load-module module-bluetooth-discover
EOF

# Restart PulseAudio
pulseaudio --kill && pulseaudio --start
```

For PipeWire, auto-switching is handled by WirePlumber configuration:

```bash
# Check WirePlumber Bluetooth configuration
cat /usr/share/wireplumber/bluetooth.lua.d/*.lua 2>/dev/null || \
cat /usr/share/wireplumber/scripts/bluetooth/*.lua 2>/dev/null | head -50

# To modify, copy to user config directory
mkdir -p ~/.config/wireplumber/bluetooth.lua.d/
# Then edit the copied file to adjust auto-switch behavior
```

## Persistent Default Sink Configuration

Make the Bluetooth audio device the default even after reconnecting:

```bash
# For PulseAudio - save default sink persistently
# Create or edit ~/.config/pulse/default.pa
mkdir -p ~/.config/pulse
cat << 'EOF' >> ~/.config/pulse/default.pa

# Set Bluetooth speaker as default sink when it connects
.ifexists module-bluetooth-policy.so
load-module module-bluetooth-policy auto_switch=2
.endif
EOF

# Or set it in the system config
echo "set-default-sink bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink" >> ~/.config/pulse/default.pa
```

## Troubleshooting Bluetooth Audio

```bash
# No audio from Bluetooth speaker despite connection
# Check if A2DP profile is active
pactl list cards | grep "active profile"
# If showing "off" or "headset", switch to a2dp_sink
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF a2dp_sink

# Audio stutter or poor quality
# Check for other processes using WiFi/Bluetooth simultaneously
# 2.4GHz WiFi and Bluetooth use the same frequency band
# Disable WiFi temporarily to test
sudo nmcli radio wifi off
# If audio improves, the issue is WiFi/Bluetooth coexistence

# "Failed to connect" for audio profile
# Restart both services
sudo systemctl restart bluetooth
systemctl --user restart pulseaudio

# Check logs for codec negotiation failures
journalctl -u bluetooth -n 50 | grep -i "a2dp\|codec\|connect"

# PipeWire Bluetooth module not loading
systemctl --user status wireplumber
journalctl --user -u wireplumber -n 50 | grep -i bluetooth
```

## Command-Line Audio Playback

Once the Bluetooth sink is configured, play audio:

```bash
# Play a file through the Bluetooth speaker using paplay
paplay /path/to/audio.wav --device=bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink

# Play using mpg123 (MP3 playback)
sudo apt install mpg123 -y
mpg123 /path/to/music.mp3

# Stream from internet to Bluetooth speaker
sudo apt install mplayer -y
mplayer http://stream.radio.example.com/audio.mp3
```

Bluetooth audio on Ubuntu is well-supported with both PulseAudio and PipeWire. The key steps are: pair the device, ensure the correct audio profile is selected, and configure the system to use it as the default sink.
