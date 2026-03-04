# How to Configure PipeWire as the Default Audio Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, PipeWire, Audio, PulseAudio, Sound, Linux

Description: Configure PipeWire as the default audio server on RHEL, replacing PulseAudio for improved audio handling, lower latency, and better Bluetooth audio support.

---

PipeWire is a modern multimedia server that handles both audio and video streams. RHEL 9 uses PipeWire as the default audio server, replacing PulseAudio. It provides PulseAudio and JACK compatibility layers, so existing applications continue to work without modification.

## Check the Current Audio Server

```bash
# Check if PipeWire is running
systemctl --user status pipewire pipewire-pulse

# Check which audio server is handling PulseAudio clients
pactl info | grep "Server Name"
# Output should include: PulseAudio (on PipeWire)

# Check PipeWire version
pipewire --version
```

## Install PipeWire (If Not Already Present)

```bash
# Install PipeWire and its PulseAudio compatibility layer
sudo dnf install -y pipewire pipewire-pulseaudio pipewire-utils

# Install JACK compatibility (for pro audio applications)
sudo dnf install -y pipewire-jack-audio-connection-kit

# Install Bluetooth audio codec support
sudo dnf install -y pipewire-codec-aptx
```

## Replace PulseAudio with PipeWire

If your system is still running PulseAudio:

```bash
# Remove PulseAudio
sudo dnf remove -y pulseaudio pulseaudio-libs

# Install PipeWire PulseAudio replacement
sudo dnf install -y pipewire-pulseaudio

# Enable PipeWire services for the current user
systemctl --user enable pipewire pipewire-pulse
systemctl --user start pipewire pipewire-pulse

# Enable WirePlumber (the PipeWire session manager)
systemctl --user enable wireplumber
systemctl --user start wireplumber
```

## Verify PipeWire is Working

```bash
# List audio output devices (sinks)
pactl list sinks short

# List audio input devices (sources)
pactl list sources short

# Play a test sound
paplay /usr/share/sounds/freedesktop/stereo/bell.oga

# Check PipeWire processing graph
pw-top
```

## Configure Audio Settings

```bash
# Set the default output device
pactl set-default-sink <sink-name>

# Set the default input device
pactl set-default-source <source-name>

# Adjust volume (0-100+)
pactl set-sink-volume @DEFAULT_SINK@ 75%

# Mute/unmute
pactl set-sink-mute @DEFAULT_SINK@ toggle
```

## Configure PipeWire Settings

```bash
# Copy the default configuration to the user directory
mkdir -p ~/.config/pipewire
cp /usr/share/pipewire/pipewire.conf ~/.config/pipewire/

# Edit the configuration
vi ~/.config/pipewire/pipewire.conf

# Common settings to adjust:
# default.clock.rate = 48000      # Sample rate
# default.clock.quantum = 1024    # Buffer size (lower = less latency)
# default.clock.min-quantum = 32  # Minimum buffer size
```

## Configure for Low-Latency Audio

```bash
# Create a low-latency configuration
mkdir -p ~/.config/pipewire/pipewire.conf.d

tee ~/.config/pipewire/pipewire.conf.d/low-latency.conf > /dev/null << 'EOF'
context.properties = {
    default.clock.rate          = 48000
    default.clock.quantum       = 256
    default.clock.min-quantum   = 256
    default.clock.max-quantum   = 256
}
EOF

# Restart PipeWire to apply
systemctl --user restart pipewire pipewire-pulse wireplumber
```

## Monitor PipeWire

```bash
# View the PipeWire processing graph in real-time
pw-top

# List all PipeWire objects (nodes, ports, links)
pw-cli list-objects

# Monitor PipeWire events
pw-mon
```

## Troubleshooting

```bash
# Check PipeWire logs
journalctl --user -u pipewire -f

# Check WirePlumber logs
journalctl --user -u wireplumber -f

# If no sound, check:
# 1. Volume is not muted
pactl get-sink-mute @DEFAULT_SINK@

# 2. Correct output device is selected
pactl get-default-sink

# 3. PipeWire services are running
systemctl --user status pipewire pipewire-pulse wireplumber
```

PipeWire provides a modern, unified audio and video framework for RHEL that handles all audio use cases from desktop sound to professional audio production.
