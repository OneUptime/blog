# How to Replace PulseAudio with PipeWire on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Audio, PipeWire, PulseAudio, System

Description: Migrate from PulseAudio to PipeWire on Ubuntu for improved audio quality, lower latency, and better Bluetooth support, with step-by-step installation and verification instructions.

---

PipeWire is a modern multimedia server designed to replace both PulseAudio (the standard Linux audio server) and JACK (the low-latency professional audio server). It handles audio and video streams with lower latency, better Bluetooth codec support, and improved handling of simultaneous audio sources.

Ubuntu 22.04 and later ship with PipeWire available but still use PulseAudio by default for general desktop audio. Switching to PipeWire gives you access to higher-quality Bluetooth codecs (aptX, LDAC, AAC), lower latency for professional audio applications, and improved compatibility with Wayland screen sharing.

Ubuntu 22.10 and later ship with PipeWire as the default, so this guide is primarily for Ubuntu 22.04 LTS users who want to switch without waiting for a major version upgrade.

## Checking Your Current Audio Setup

Before switching, identify what is currently running:

```bash
# Check if PulseAudio is running
systemctl --user status pulseaudio

# Check if PipeWire is already running
systemctl --user status pipewire

# See the active audio server
pactl info | grep "Server Name"
```

If you are already on Ubuntu 22.10 or later and PipeWire is active, you likely do not need to follow this guide.

## Installing PipeWire Components

Install the PipeWire stack:

```bash
sudo apt update
sudo apt install pipewire pipewire-audio-client-libraries libspa-0.2-bluetooth \
  libspa-0.2-jack pipewire-pulse wireplumber -y
```

Package roles:
- `pipewire` - the core PipeWire server
- `pipewire-audio-client-libraries` - audio client support
- `libspa-0.2-bluetooth` - Bluetooth audio support including aptX and AAC
- `libspa-0.2-jack` - JACK compatibility layer
- `pipewire-pulse` - PulseAudio compatibility layer (makes PulseAudio apps work with PipeWire)
- `wireplumber` - the session manager for PipeWire (replaces pipewire-media-session)

## Disabling PulseAudio

Stop and disable PulseAudio:

```bash
# Disable PulseAudio autostart
systemctl --user disable pulseaudio.service pulseaudio.socket

# Stop PulseAudio
systemctl --user stop pulseaudio.service pulseaudio.socket

# Mask PulseAudio to prevent it from being started as a dependency
systemctl --user mask pulseaudio
```

Verify PulseAudio is stopped:

```bash
systemctl --user status pulseaudio
# Should show "masked" or "inactive"
```

## Enabling PipeWire

Enable and start PipeWire and its components:

```bash
# Enable PipeWire
systemctl --user enable pipewire pipewire-pulse

# Enable WirePlumber session manager
systemctl --user enable wireplumber

# Start all services
systemctl --user start pipewire pipewire-pulse wireplumber
```

## Verifying the Switch

Confirm PipeWire is running and the PulseAudio compatibility layer is active:

```bash
# Check PipeWire status
systemctl --user status pipewire
systemctl --user status pipewire-pulse
systemctl --user status wireplumber

# Verify pactl (PulseAudio control) is communicating with PipeWire
pactl info | grep "Server Name"
# Should show: Server Name: PulseAudio (on PipeWire x.x.x)

# Check PipeWire version
pipewire --version
```

Test audio playback:

```bash
# Play a test sound through PipeWire
pw-play /usr/share/sounds/freedesktop/stereo/audio-channel-front-left.oga

# Or use the speaker-test utility
speaker-test -c 2 -t wav
```

## Verifying Bluetooth Audio Codecs

One of the main reasons to switch is improved Bluetooth codec support. After switching:

```bash
# Connect your Bluetooth device, then check available codecs
pactl list cards | grep -A 30 "bluetooth"

# Or use pw-dump to see PipeWire's view of Bluetooth devices
pw-dump | python3 -m json.tool | grep -A 5 "bluetooth"
```

To enable all available Bluetooth codecs, ensure the WirePlumber configuration enables them:

```bash
mkdir -p ~/.config/wireplumber/bluetooth.lua.d/

cat > ~/.config/wireplumber/bluetooth.lua.d/51-bluez-config.lua << 'EOF'
bluez_monitor.properties = {
  -- Enable all available codecs
  ["bluez5.enable-sbc-xq"] = true,
  ["bluez5.enable-msbc"] = true,
  ["bluez5.enable-hw-volume"] = true,
  ["bluez5.headset-roles"] = "[ hsp_hs hsp_ag hfp_hf hfp_ag ]"
}
EOF

# Restart WirePlumber to apply
systemctl --user restart wireplumber
```

## Managing Audio with PipeWire Tools

PipeWire has its own management tools alongside the PulseAudio compatibility commands:

### pw-cli (PipeWire Command Line)

```bash
# List all PipeWire objects
pw-cli list-objects

# Check PipeWire status
pw-cli info
```

### pw-top (PipeWire Process Monitor)

```bash
# Monitor PipeWire streams, latency, and resource usage
pw-top
```

This shows all active audio streams, their sample rates, buffer sizes, and latency in real time.

### pactl (Still Works via Compatibility Layer)

```bash
# List audio sources and sinks
pactl list sinks short
pactl list sources short

# Set default output device
pactl set-default-sink <sink-name>

# Set volume
pactl set-sink-volume @DEFAULT_SINK@ 80%
```

### pavucontrol (PulseAudio Volume Control)

pavucontrol still works with PipeWire through the compatibility layer:

```bash
sudo apt install pavucontrol -y
pavucontrol
```

## Using Helvum for Visual Audio Routing

Helvum is a graphical patchbay for PipeWire that shows audio connections:

```bash
# Install via flatpak (most up to date version)
sudo apt install flatpak -y
flatpak install flathub org.freedesktop.pipewire.Helvum

# Or install from Ubuntu repositories if available
sudo apt install helvum
```

Helvum lets you visually connect audio sources to sinks, similar to professional audio routing software.

## Reverting to PulseAudio

If you need to go back to PulseAudio:

```bash
# Stop PipeWire services
systemctl --user stop pipewire pipewire-pulse wireplumber

# Disable PipeWire autostart
systemctl --user disable pipewire pipewire-pulse wireplumber

# Unmask and enable PulseAudio
systemctl --user unmask pulseaudio
systemctl --user enable pulseaudio.service pulseaudio.socket
systemctl --user start pulseaudio.service pulseaudio.socket

# Verify
pactl info | grep "Server Name"
# Should show PulseAudio without "on PipeWire"
```

## Troubleshooting

**No audio after switching:**

```bash
# Check if all services are running
systemctl --user status pipewire pipewire-pulse wireplumber

# Restart all PipeWire services
systemctl --user restart pipewire pipewire-pulse wireplumber

# Check for errors
journalctl --user -u pipewire --since "1 hour ago"
```

**Bluetooth audio not working:**

```bash
# Restart Bluetooth service
sudo systemctl restart bluetooth

# Check WirePlumber Bluetooth support
journalctl --user -u wireplumber | grep -i bluetooth
```

**Application-specific audio issues:**

Some applications that use ALSA directly may need configuration. Check if the PipeWire ALSA compatibility layer is installed:

```bash
dpkg -l | grep pipewire-alsa
sudo apt install pipewire-alsa -y
```

## Summary

Replacing PulseAudio with PipeWire on Ubuntu 22.04 involves installing the PipeWire stack, masking PulseAudio, enabling PipeWire services, and verifying the switch through pactl's server name output. The PulseAudio compatibility layer means existing applications continue working without modification. The primary benefits are better Bluetooth codec support, lower latency, and a unified audio and video routing system. If anything does not work, reverting is straightforward using the same systemctl commands in reverse.
