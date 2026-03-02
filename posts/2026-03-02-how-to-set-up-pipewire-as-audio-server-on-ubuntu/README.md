# How to Set Up PipeWire as Audio Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, PipeWire, Audio, Sound Server, Multimedia

Description: Guide to installing and configuring PipeWire as the audio server on Ubuntu, replacing PulseAudio with PipeWire's lower-latency, unified audio and video pipeline.

---

PipeWire is the modern replacement for both PulseAudio and JACK on Linux. It provides lower latency, better Bluetooth support, and a unified graph for both audio and video routing. Ubuntu 22.04 ships with PipeWire available but defaults to PulseAudio in some configurations; Ubuntu 23.04 and later fully default to PipeWire. This guide covers setting up PipeWire and its compatibility layers so existing applications work without changes.

## Why Switch to PipeWire

- **Lower latency**: Designed for pro-audio use cases alongside desktop use
- **Unified API**: Replaces both PulseAudio (desktop audio) and JACK (pro audio)
- **Better Bluetooth**: Improved codec support (aptX, LDAC, AAC)
- **Improved Wayland integration**: Better support for screen capture and audio routing
- **PulseAudio compatibility**: The `pipewire-pulse` daemon handles PulseAudio clients transparently

## Checking Current Audio Setup

```bash
# See what audio server is running
pactl info | grep "Server Name"

# Check if PipeWire is installed
dpkg -l | grep pipewire

# Check running audio services
systemctl --user list-units | grep -i 'pulse\|pipewire\|wireplumber'
```

## Installing PipeWire

On Ubuntu 22.04:

```bash
sudo apt-get update
sudo apt-get install -y \
    pipewire \
    pipewire-audio-client-libraries \
    pipewire-pulse \
    pipewire-jack \
    pipewire-alsa \
    libspa-0.2-bluetooth \
    wireplumber
```

On Ubuntu 24.04 (PipeWire is default, but may need bluetooth support):

```bash
sudo apt-get install -y libspa-0.2-bluetooth pipewire-audio
```

## Switching from PulseAudio to PipeWire

```bash
# Disable PulseAudio
systemctl --user disable pulseaudio.service pulseaudio.socket
systemctl --user mask pulseaudio.service pulseaudio.socket

# Stop PulseAudio immediately
systemctl --user stop pulseaudio.service pulseaudio.socket

# Enable PipeWire and its components
systemctl --user enable pipewire pipewire-pulse wireplumber
systemctl --user start pipewire pipewire-pulse wireplumber

# Verify PipeWire is now the audio server
pactl info | grep "Server Name"
# Should show: pipewire-X.X.X
```

## Verifying the Setup

```bash
# Check PipeWire is running
pw-cli info

# List all audio nodes
pw-cli list-objects | grep -i "type:PipeWire:Interface:Node"

# Or use the more user-friendly wpctl (WirePlumber control)
wpctl status

# List audio sinks and sources
wpctl status | grep -A 20 "Audio"

# Play a test sound
paplay /usr/share/sounds/alsa/Front_Center.wav

# Test with PipeWire native tools
pw-play /usr/share/sounds/alsa/Front_Center.wav
```

## WirePlumber: The Session Manager

WirePlumber manages audio policy - which apps connect to which devices. It's the replacement for PulseAudio's automatic routing:

```bash
# View current WirePlumber status
wpctl status

# Set default audio output
wpctl set-default $(wpctl status | grep "Speakers\|Headphones" | awk '{print $2}' | head -1)

# Adjust volume
wpctl set-volume @DEFAULT_AUDIO_SINK@ 80%

# Mute/unmute
wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle

# Set microphone volume
wpctl set-volume @DEFAULT_AUDIO_SOURCE@ 70%
```

## Configuration Files

PipeWire configuration is more modular than PulseAudio's:

```bash
# System config locations
/usr/share/pipewire/          # Default configs
/etc/pipewire/               # System overrides

# User config location
~/.config/pipewire/

# Copy default config to customize
mkdir -p ~/.config/pipewire
cp /usr/share/pipewire/pipewire.conf ~/.config/pipewire/
```

### Adjusting Latency

```bash
# Create user pipewire config directory
mkdir -p ~/.config/pipewire/pipewire.conf.d/

# Set lower latency (default is 1024/48000 = ~21ms)
cat > ~/.config/pipewire/pipewire.conf.d/10-custom.conf << 'EOF'
context.properties = {
    # Set quantum (buffer size) for ~5ms latency at 48000Hz
    default.clock.rate = 48000
    default.clock.quantum = 256
    default.clock.min-quantum = 32
    default.clock.max-quantum = 8192
}
EOF

# Restart PipeWire to apply
systemctl --user restart pipewire
```

## JACK Compatibility for Pro Audio

PipeWire includes a JACK compatibility layer so JACK-based audio software works without changes:

```bash
# Install JACK compatibility
sudo apt-get install -y pipewire-jack

# Configure JACK to use PipeWire
# The pipewire-jack package installs compatibility libraries that override libjack

# Verify JACK compatibility
pw-jack jackd -d dummy  # Start a JACK server session via PipeWire

# Use JACK-based software normally
pw-jack ardour   # Ardour DAW
pw-jack qjackctl # QjackCtl patchbay
```

## Bluetooth Audio with PipeWire

PipeWire's Bluetooth support is significantly better than PulseAudio's:

```bash
# Install Bluetooth support
sudo apt-get install -y libspa-0.2-bluetooth bluez

# Restart PipeWire after installation
systemctl --user restart pipewire wireplumber

# Pair device via bluetoothctl
bluetoothctl
# scan on
# pair AA:BB:CC:DD:EE:FF
# connect AA:BB:CC:DD:EE:FF

# Check available Bluetooth codecs
pactl list cards | grep -i codec

# Force a specific codec (e.g., AAC, LDAC)
# In ~/.config/wireplumber/bluetooth.lua.d/51-bluez-config.lua
mkdir -p ~/.config/wireplumber/bluetooth.lua.d/
cat > ~/.config/wireplumber/bluetooth.lua.d/51-bluez-config.lua << 'EOF'
bluez_monitor.properties = {
  ["bluez5.enable-sbc-xq"] = true,
  ["bluez5.enable-msbc"] = true,
  ["bluez5.enable-hw-volume"] = true,
  ["bluez5.headset-roles"] = "[ hsp_hs hsp_ag hfp_hf hfp_ag ]"
}
EOF

systemctl --user restart wireplumber
```

## Virtual Sinks and Loopbacks

```bash
# Create a virtual null sink (useful for recording desktop audio)
pactl load-module module-null-sink media.class=Audio/Sink sink_name=virtual-speaker object.linger=1

# Create a loopback (route audio from virtual sink to real output)
pactl load-module module-loopback source=virtual-speaker.monitor sink=@DEFAULT_SINK@

# Using PipeWire native tools for more complex graphs
pw-link  # List and manage PipeWire port connections
pw-dump  # Dump full PipeWire graph state
```

## Using pavucontrol with PipeWire

The standard PulseAudio volume control works with PipeWire via the `pipewire-pulse` compatibility layer:

```bash
# Install if not present
sudo apt-get install -y pavucontrol

# Launch (works with both PulseAudio and PipeWire)
pavucontrol
```

## Screen Recording Audio Capture

PipeWire's Wayland integration enables proper screen recording audio capture:

```bash
# Install PipeWire Wayland portal
sudo apt-get install -y xdg-desktop-portal xdg-desktop-portal-gnome

# For KDE Plasma
sudo apt-get install -y xdg-desktop-portal-kde

# OBS Studio with PipeWire support
sudo apt-get install -y obs-studio

# In OBS, add a source -> Audio Input Capture -> choose PipeWire
```

## Monitoring and Debugging

```bash
# Real-time PipeWire graph viewer
sudo apt-get install -y helvum  # GUI graph editor
helvum

# Or command-line monitoring
watch -n 1 "wpctl status"

# Verbose PipeWire logging
PIPEWIRE_DEBUG=3 pipewire 2>&1 | head -100

# Check WirePlumber logs
journalctl --user -u wireplumber -f

# Check for errors
journalctl --user -u pipewire --since "10 minutes ago"
```

## Troubleshooting

### No sound after switching to PipeWire

```bash
# Check if pipewire-pulse is running (handles PulseAudio client apps)
systemctl --user status pipewire-pulse

# Restart all PipeWire services
systemctl --user restart pipewire pipewire-pulse wireplumber

# Check pactl still sees devices
pactl list sinks short
```

### Bluetooth audio not working

```bash
# Verify spa-bluez5 plugin is installed
ls /usr/lib/x86_64-linux-gnu/spa-0.2/bluez5/

# Check Bluetooth service
systemctl status bluetooth

# Restart WirePlumber which manages Bluetooth
systemctl --user restart wireplumber
```

### Applications not finding audio

Some applications hard-code PulseAudio socket paths. Verify the socket exists:

```bash
# PipeWire creates a PulseAudio-compatible socket
ls /run/user/$(id -u)/pulse/

# If missing, pipewire-pulse may not be running
systemctl --user start pipewire-pulse
```

### Rolling back to PulseAudio

```bash
# Unmask PulseAudio
systemctl --user unmask pulseaudio.service pulseaudio.socket

# Disable PipeWire services
systemctl --user disable pipewire pipewire-pulse wireplumber

# Start PulseAudio
systemctl --user start pulseaudio
```

PipeWire represents a genuine improvement over PulseAudio for most use cases, particularly Bluetooth audio quality and pro-audio latency. The compatibility layers make the transition transparent for most applications.
