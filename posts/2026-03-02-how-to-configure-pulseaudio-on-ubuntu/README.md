# How to Configure PulseAudio on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PulseAudio, Audio, Sound Server, Configuration

Description: Comprehensive guide to configuring PulseAudio on Ubuntu, covering sink and source management, Bluetooth audio, equalizers, network audio, and fixing common audio issues.

---

PulseAudio has been the default sound server on Ubuntu for many years, sitting between ALSA (which talks to hardware) and applications. It handles mixing multiple audio streams, routing audio to different outputs, network audio, and Bluetooth. While Ubuntu 22.04 and later default to PipeWire, PulseAudio remains widely used and understanding it is valuable for both older systems and troubleshooting.

## Understanding PulseAudio Concepts

- **Sink**: An output device (speakers, headphones, HDMI audio)
- **Source**: An input device (microphone, line-in)
- **Sink Input**: An audio stream from an application going to a sink
- **Source Output**: A recording stream from a source to an application
- **Module**: PulseAudio plugin that adds functionality

## Basic Command-Line Tools

```bash
# Check PulseAudio status
pulseaudio --check && echo "Running" || echo "Not running"

# List all audio output devices (sinks)
pactl list sinks short

# List all audio input devices (sources)
pactl list sources short

# More detailed sink information
pactl list sinks

# List all active audio streams
pactl list sink-inputs short

# Show PulseAudio server info
pactl info
```

## Setting Default Sink and Source

```bash
# List sinks to find the one you want
pactl list sinks short
# Output: 0  alsa_output.pci-0000_00_1f.3.analog-stereo  ...

# Set default output (sink)
pactl set-default-sink alsa_output.pci-0000_00_1f.3.analog-stereo

# Set default input (source)
pactl set-default-source alsa_input.pci-0000_00_1f.3.analog-stereo

# Move a running application's audio to a different output
# First get the sink-input ID
pactl list sink-inputs short
# Then move it
pactl move-sink-input 0 alsa_output.pci-0000_00_1f.3.analog-stereo
```

## Volume Control

```bash
# Set volume to 80% for default sink
pactl set-sink-volume @DEFAULT_SINK@ 80%

# Set to 100%
pactl set-sink-volume @DEFAULT_SINK@ 100%

# Increase volume by 5%
pactl set-sink-volume @DEFAULT_SINK@ +5%

# Decrease volume by 5%
pactl set-sink-volume @DEFAULT_SINK@ -5%

# Mute/unmute
pactl set-sink-mute @DEFAULT_SINK@ toggle

# Set volume for a specific sink input (application)
pactl set-sink-input-volume 1 50%

# Set microphone volume
pactl set-source-volume @DEFAULT_SOURCE@ 70%
```

## Configuration Files

PulseAudio's configuration lives in several places:

```bash
# User configuration (highest priority)
~/.config/pulse/

# Per-user defaults
~/.config/pulse/default.pa    # startup script
~/.config/pulse/daemon.conf   # daemon settings

# System-wide defaults
/etc/pulse/default.pa         # startup script
/etc/pulse/daemon.conf        # daemon settings
/etc/pulse/system.pa          # system mode config
```

### daemon.conf Settings

```bash
# View current daemon settings
cat /etc/pulse/daemon.conf

# Create user override (only add lines you want to change)
cat > ~/.config/pulse/daemon.conf << 'EOF'
# Reduce latency for real-time applications
default-fragments = 2
default-fragment-size-msec = 5

# Increase sample rate for better audio quality
default-sample-rate = 48000
alternate-sample-rate = 44100

# Better CPU handling
realtime-scheduling = yes
realtime-priority = 9

# Avoid module-suspend-on-idle (prevents audio pops when stream starts)
exit-idle-time = -1
EOF
```

## Managing Modules

```bash
# List loaded modules
pactl list modules short

# Load a module
pactl load-module module-null-sink sink_name=virtual-speaker sink_properties=device.description=Virtual-Speaker

# Unload a module by ID
pactl unload-module 23

# Common useful modules:
# module-null-sink: virtual audio output (useful for routing)
# module-combine-sink: combine multiple sinks into one
# module-loopback: route audio from source to sink
# module-native-protocol-tcp: network audio
```

## Creating a Virtual Sink for Audio Routing

Useful for recording desktop audio or routing audio between applications:

```bash
# Create a virtual sink
pactl load-module module-null-sink sink_name=virtual-speaker sink_properties=device.description="Virtual-Speaker"

# Create a loopback (what goes into virtual-speaker plays on real speakers too)
pactl load-module module-loopback source=virtual-speaker.monitor sink=@DEFAULT_SINK@

# To record from this virtual sink, set it as source in recording app:
# Source = "Monitor of Virtual-Speaker"
```

## Network Audio with PulseAudio

Share audio across machines on your network:

```bash
# On the server (the machine with speakers):
# Load TCP module
pactl load-module module-native-protocol-tcp

# Add to /etc/pulse/default.pa for persistence:
# load-module module-native-protocol-tcp

# On the client (machine sending audio):
# Set the remote PulseAudio server
export PULSE_SERVER=tcp:192.168.1.100

# Or add a tunnel sink
pactl load-module module-tunnel-sink server=192.168.1.100 sink=remote-speakers
```

## Equalizer Setup

Install and use PulseAudio EQ:

```bash
# Install equalizer
sudo apt-get install -y pulseaudio-equalizer

# Launch equalizer GUI
qpaeq &

# Load the EQ module
pactl load-module module-equalizer-sink sink_name=equalizer
pactl load-module module-dbus-protocol

# Set equalizer as default
pactl set-default-sink equalizer

# For persistence, add to ~/.config/pulse/default.pa:
# load-module module-equalizer-sink
# load-module module-dbus-protocol
# set-default-sink equalizer
```

## Bluetooth Audio Configuration

```bash
# Install Bluetooth audio support
sudo apt-get install -y pulseaudio-module-bluetooth

# Restart PulseAudio after installing
pulseaudio -k && pulseaudio --start

# Load Bluetooth module if not auto-loaded
pactl load-module module-bluetooth-discover

# Pair and connect via bluetoothctl
bluetoothctl
# Inside bluetoothctl:
# scan on
# pair AA:BB:CC:DD:EE:FF
# connect AA:BB:CC:DD:EE:FF
# quit

# Set the Bluetooth headset as default
pactl set-default-sink bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink
```

## Restarting PulseAudio

```bash
# Restart the user-level PulseAudio daemon
pulseaudio -k  # kill
pulseaudio --start  # start

# Or use systemd (on systems where PulseAudio runs as a service)
systemctl --user restart pulseaudio

# Reset all PulseAudio configuration (nuclear option)
pulseaudio -k
rm -rf ~/.config/pulse
pulseaudio --start
```

## Automating Sink Selection

Create a script to quickly switch between outputs:

```bash
#!/bin/bash
# switch-audio.sh - Toggle between speakers and headphones

SPEAKERS="alsa_output.pci-0000_00_1f.3.analog-stereo"
HEADPHONES="alsa_output.usb-Focusrite_Scarlett_Solo_USB-00.analog-stereo"

CURRENT=$(pactl get-default-sink)

if [ "$CURRENT" = "$SPEAKERS" ]; then
    pactl set-default-sink "$HEADPHONES"
    echo "Switched to headphones"
else
    pactl set-default-sink "$SPEAKERS"
    echo "Switched to speakers"
fi

# Move all current streams to the new default
DEFAULT=$(pactl get-default-sink)
pactl list sink-inputs short | awk '{print $1}' | while read id; do
    pactl move-sink-input "$id" "$DEFAULT"
done
```

## Diagnosing Issues

```bash
# Run PulseAudio in verbose mode to see what's happening
pulseaudio -k
pulseaudio -vvv 2>&1 | head -100

# Check if ALSA is working independently of PulseAudio
aplay -l  # list ALSA devices
aplay /usr/share/sounds/alsa/Front_Center.wav  # test ALSA directly

# Check what's using ALSA (blocking PulseAudio)
fuser /dev/snd/*

# Verify PulseAudio socket
ls -la /run/user/$(id -u)/pulse/

# Test audio output
paplay /usr/share/sounds/alsa/Front_Center.wav
```

## Common Issues

### No audio after suspend

```bash
# Load the suspend fix module
pactl load-module module-switch-on-port-available

# Add to ~/.config/pulse/default.pa for persistence
echo "load-module module-switch-on-port-available" >> ~/.config/pulse/default.pa
```

### Audio stuttering or crackling

```bash
# Edit daemon.conf to increase buffer size
cat >> ~/.config/pulse/daemon.conf << 'EOF'
default-fragments = 8
default-fragment-size-msec = 25
EOF

pulseaudio -k && pulseaudio --start
```

PulseAudio's strength is its flexibility. Once you understand the sink/source/module model, you can build almost any audio routing configuration you need.
