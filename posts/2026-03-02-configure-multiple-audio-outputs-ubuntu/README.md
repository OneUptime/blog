# How to Configure Multiple Audio Outputs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Audio, PipeWire, PulseAudio, System

Description: Configure Ubuntu to route audio to multiple outputs simultaneously, including speakers and headphones, or send different applications to different audio devices.

---

Managing multiple audio outputs on Ubuntu is something many users need - sending a video call to headphones while music plays through speakers, routing a DAW to a dedicated audio interface while system sounds go to built-in audio, or creating a combined sink that broadcasts audio to multiple devices simultaneously.

The approach depends on which audio server you are using. This guide covers configuration for both PipeWire (Ubuntu 22.10 and later, or manually switched) and PulseAudio (Ubuntu 22.04 LTS default).

## Checking Your Audio Setup

First, identify your audio server and available devices:

```bash
# Check which audio server is running
pactl info | grep "Server Name"

# List all audio output devices (sinks)
pactl list sinks short

# Example output:
# 0  alsa_output.pci-0000_00_1f.3.analog-stereo  PipeWire  s32le 2ch 48000Hz  RUNNING
# 1  alsa_output.usb-Creative_SB_X-Fi_Surround-00.analog-stereo  PipeWire  s32le 2ch 48000Hz  IDLE
# 2  bluez_output.AA_BB_CC_DD_EE_FF.1  PipeWire  s16le 2ch 44100Hz  IDLE
```

Note the sink names - you need them for routing commands.

## Method 1: Routing Applications to Different Outputs

This is the most straightforward need - sending one app to speakers and another to headphones.

### Using pavucontrol (GUI)

Install PulseAudio Volume Control if not already present:

```bash
sudo apt install pavucontrol -y
pavucontrol
```

1. Open pavucontrol
2. Click the "Playback" tab
3. Each playing application shows with a dropdown for its output device
4. Change the dropdown for each app to the desired output

This setting is persistent - the application remembers its assigned output.

### Using pactl (Command Line)

```bash
# List running audio streams
pactl list sink-inputs short

# Output:
# 34  2  PipeWire  s32le 2ch 48000Hz  RUNNING
# (stream_id, sink_id, driver, format, state)

# Move stream ID 34 to sink ID 1 (external USB audio)
pactl move-sink-input 34 1

# Or use sink name
pactl move-sink-input 34 alsa_output.usb-Creative_SB_X-Fi_Surround-00.analog-stereo
```

### Setting Per-Application Defaults with PipeWire

With PipeWire, you can set persistent per-application routing using WirePlumber rules:

```bash
mkdir -p ~/.config/wireplumber/main.lua.d/

nano ~/.config/wireplumber/main.lua.d/50-app-routing.lua
```

```lua
-- Route specific applications to specific audio sinks
-- This example sends Firefox to the built-in speakers
-- and Spotify to Bluetooth headphones

table.insert(alsa_monitor.rules, {
  matches = {
    {
      { "application.name", "equals", "Firefox" },
    },
  },
  apply_properties = {
    ["target.object"] = "alsa_output.pci-0000_00_1f.3.analog-stereo",
  },
})

table.insert(alsa_monitor.rules, {
  matches = {
    {
      { "application.name", "equals", "Spotify" },
    },
  },
  apply_properties = {
    ["target.object"] = "bluez_output.AA_BB_CC_DD_EE_FF.1",
  },
})
```

Restart WirePlumber:

```bash
systemctl --user restart wireplumber
```

## Method 2: Sending Audio to Multiple Outputs Simultaneously

This creates a "combined sink" that plays audio through two or more outputs at the same time.

### PulseAudio: Creating a Combined Sink

```bash
# First, find your sink names
pactl list sinks short

# Create a combined sink using module-combine-sink
# Replace sink1 and sink2 with your actual sink names
pactl load-module module-combine-sink \
  sink_name=combined \
  slaves="alsa_output.pci-0000_00_1f.3.analog-stereo,bluez_output.AA_BB_CC_DD_EE_FF.1" \
  adjust_time=0
```

The combined sink named "combined" now appears as an output device. Audio sent to it plays through both outputs.

Set it as the default output:

```bash
pactl set-default-sink combined
```

### Making the Combined Sink Permanent

To persist across reboots, add it to PulseAudio's configuration:

```bash
nano ~/.config/pulse/default.pa
```

```
# Load default PulseAudio setup
.include /etc/pulse/default.pa

# Create combined sink
load-module module-combine-sink \
  sink_name=combined \
  sink_properties=device.description="Combined Output" \
  slaves=alsa_output.pci-0000_00_1f.3.analog-stereo,bluez_output.AA_BB_CC_DD_EE_FF.1 \
  adjust_time=0

# Set as default
set-default-sink combined
```

Restart PulseAudio:

```bash
pulseaudio -k && pulseaudio --start
```

### PipeWire: Virtual Combined Sink

With PipeWire, create a virtual combined sink using a configuration file:

```bash
mkdir -p ~/.config/pipewire/pipewire.conf.d/

nano ~/.config/pipewire/pipewire.conf.d/99-combined-sink.conf
```

```ini
context.modules = [
  {
    name = libpipewire-module-combine-stream
    args = {
      combine.props = {
        node.name = "combined_output"
        node.description = "Combined Output (Speakers + Headphones)"
        media.class = "Audio/Sink"
      }
      stream.props = {
        media.class = "Audio/Sink"
      }
      stream.rules = [
        {
          matches = [ { node.name = "alsa_output.pci-0000_00_1f.3.analog-stereo" } ]
          actions = { create-stream = { } }
        }
        {
          matches = [ { node.name = "bluez_output.AA_BB_CC_DD_EE_FF.1" } ]
          actions = { create-stream = { } }
        }
      ]
    }
  }
]
```

Restart PipeWire:

```bash
systemctl --user restart pipewire pipewire-pulse wireplumber
```

The combined sink appears in pavucontrol and other audio applications.

## Method 3: Setting the Default Audio Output

Switch the default output device for all new streams:

```bash
# Set default sink by name
pactl set-default-sink alsa_output.usb-DAC.analog-stereo

# Or by index
pactl set-default-sink 1
```

New audio streams go to this device. Existing streams continue on their current device unless moved.

### Using GNOME Settings for Quick Switching

GNOME Settings provides a basic device picker:

1. Open Settings > Sound
2. Click the Output section
3. Select your desired output device

Or for quick access, click the speaker icon in the top bar and select the output device from the menu.

## Method 4: Audio Profiles and Port Switching

Many audio cards have multiple ports (analog out, HDMI, headphone jack) accessible through profiles:

```bash
# List available profiles for a card
pactl list cards | grep -A 30 "Profiles:"

# Set a specific profile
pactl set-card-profile 0 output:analog-stereo+input:analog-stereo

# Switch to HDMI output profile
pactl set-card-profile 0 output:hdmi-stereo
```

## Routing Audio Between Applications Using JACK/PipeWire

For complex routing scenarios (e.g., recording Discord audio while simultaneously sending it to speakers), use PipeWire's graph routing:

```bash
# Install Helvum for visual routing
sudo apt install helvum -y
helvum
```

In Helvum:
1. Applications appear as nodes with input and output ports
2. Click and drag between ports to create connections
3. Route one application's output to multiple inputs

## Scripting Output Switching

For users who regularly switch between headphones and speakers, a quick switching script:

```bash
#!/bin/bash
# /usr/local/bin/switch-audio.sh
# Toggle between two audio outputs

SINK1="alsa_output.pci-0000_00_1f.3.analog-stereo"  # Speakers
SINK2="bluez_output.AA_BB_CC_DD_EE_FF.1"              # Bluetooth headphones

CURRENT=$(pactl get-default-sink)

if [ "$CURRENT" = "$SINK1" ]; then
    pactl set-default-sink "$SINK2"
    notify-send "Audio" "Switched to Bluetooth Headphones"
else
    pactl set-default-sink "$SINK1"
    notify-send "Audio" "Switched to Speakers"
fi
```

Make it executable and bind it to a keyboard shortcut:

```bash
chmod +x /usr/local/bin/switch-audio.sh

# In GNOME Settings > Keyboard > Custom Shortcuts
# Name: Switch Audio Output
# Command: /usr/local/bin/switch-audio.sh
# Shortcut: Super+F4 (or your preference)
```

## Troubleshooting

**New audio device not appearing after plugging in:**

```bash
# Reload PipeWire
systemctl --user restart pipewire

# Or with PulseAudio
pulseaudio -k && pulseaudio --start
```

**Combined sink causes audio sync issues:**

Combined sinks can drift if the clocks of the underlying devices are not synchronized. This manifests as one device getting ahead of the other:

```bash
# In PulseAudio, adjust the adjust_time parameter
pactl unload-module module-combine-sink
pactl load-module module-combine-sink slaves="sink1,sink2" adjust_time=1
```

**Application stuck on wrong output after switching:**

```bash
# List sink inputs and find the stuck stream
pactl list sink-inputs short

# Move it to the correct output
pactl move-sink-input <stream_id> <sink_name>
```

## Summary

Ubuntu's audio system provides several ways to manage multiple outputs. For routing different applications to different devices, pavucontrol's Playback tab provides the simplest interface, while `pactl move-sink-input` handles the same task from the command line. For simultaneous playback through multiple outputs, the module-combine-sink module (PulseAudio) or PipeWire's combine-stream module creates a virtual combined device. WirePlumber rules enable persistent per-application routing that survives reboots without manual intervention.
