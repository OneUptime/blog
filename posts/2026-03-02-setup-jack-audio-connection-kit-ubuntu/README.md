# How to Set Up JACK Audio Connection Kit on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Audio, JACK, PipeWire, Production

Description: Set up JACK Audio Connection Kit on Ubuntu for professional low-latency audio processing, real-time audio routing, and DAW integration, including the PipeWire JACK compatibility layer.

---

JACK (JACK Audio Connection Kit) is a professional audio server designed for low-latency, real-time audio processing. It provides sample-accurate routing between applications, consistent latency across the signal chain, and deterministic scheduling - the properties that matter for recording, mixing, and live audio processing.

On modern Ubuntu systems, JACK runs in two ways: as a standalone server using jackd, or as a compatibility layer on top of PipeWire. The PipeWire approach is generally preferable for most users since it integrates JACK applications with the rest of the desktop audio without having to switch servers.

## Choosing Between Standalone JACK and PipeWire JACK

**Use PipeWire with JACK compatibility if:**
- You want JACK applications to work alongside regular desktop audio (browsers, music players)
- You do not need sub-5ms latency
- You are new to professional audio on Linux

**Use standalone jackd if:**
- You need the absolute minimum latency
- You are running a dedicated audio workstation with no desktop apps
- You need advanced JACK features or specific hardware control

This guide covers both approaches.

## Option A: JACK via PipeWire (Recommended for Most Users)

### Prerequisites

PipeWire must be installed and running. Check:

```bash
systemctl --user status pipewire
pactl info | grep "Server Name"
# Should show: PulseAudio (on PipeWire x.x.x)
```

### Install JACK Compatibility Libraries

```bash
sudo apt update
sudo apt install pipewire-jack -y
```

This installs the PipeWire JACK compatibility library, which makes JACK applications use PipeWire as their backend.

### Configure the JACK Override

Set the LD_LIBRARY_PATH to use the PipeWire JACK libraries:

```bash
# Check if PipeWire JACK is configured
sudo cat /etc/pipewire/media-session.d/media-session.conf | grep jack

# Set PipeWire to provide JACK API
sudo cp /usr/share/doc/pipewire/examples/ld.so.conf.d/pipewire-jack-*.conf \
  /etc/ld.so.conf.d/
sudo ldconfig
```

Or configure it at the user level:

```bash
mkdir -p ~/.config/pipewire/
# PipeWire JACK is typically active when pipewire-jack is installed
```

### Verify JACK Applications Can Connect

Test with a JACK-aware application:

```bash
# Install a simple JACK test tool
sudo apt install jackd2 -y

# Run a JACK client (connects to PipeWire via JACK API)
jack_simple_client
```

## Option B: Standalone JACK Server (jackd)

### Installation

```bash
sudo apt install jackd2 qjackctl -y
```

During installation, you may be asked about real-time capabilities. Select Yes to configure the system for real-time audio.

`qjackctl` is a graphical JACK control panel that makes starting and configuring jackd easier.

### Configuring Real-Time Privileges

Standalone JACK requires real-time scheduling:

```bash
# Add user to audio group
sudo usermod -aG audio $USER

# Configure real-time limits
sudo nano /etc/security/limits.d/audio.conf
```

```
@audio   -  rtprio  95
@audio   -  memlock unlimited
@audio   -  nice    -19
```

Log out and back in after adding yourself to the audio group.

### Starting JACK via Command Line

```bash
# Start JACK with ALSA backend on hw:0 at 48kHz with 256-sample buffer
# -d alsa: use ALSA backend
# -r 48000: 48kHz sample rate
# -p 256: 256 samples per period (buffer size)
# -n 2: 2 periods per cycle
# -D: duplex (both input and output)
jackd -d alsa -r 48000 -p 256 -n 2 -D &
```

Latency with these settings: 256/48000 * 2 (periods) = 10.7ms round-trip

### Starting JACK via QjackCTL

Launch QjackCTL:

```bash
qjackctl &
```

Configure in Setup:
- **Driver**: alsa
- **Interface**: hw:0 (or your specific card)
- **Sample Rate**: 48000
- **Frames/Period**: 256
- **Periods/Buffer**: 2

Click Start to launch jackd with these settings.

### Finding Your Audio Hardware

```bash
# List ALSA playback devices
aplay -l

# List in JACK format
cat /proc/asound/cards
```

Use the card number in JACK's `-d alsa --device hw:N` where N is the card number.

## Connecting JACK Applications

JACK's power comes from routing audio between applications with sample accuracy.

### Using jack_connect

```bash
# List all JACK ports
jack_lsp

# Connect output of one app to input of another
# jack_connect <source_port> <destination_port>
jack_connect ardour:out1 system:playback_1
jack_connect system:capture_1 ardour:in1
```

### Using QjackCTL's Patchbay

QjackCTL includes a graphical patchbay:

1. Open QjackCTL
2. Click "Connect" to open the connection dialog
3. Drag connections between ports in the Audio or MIDI tabs

### Using Helvum (PipeWire Patchbay)

When using JACK via PipeWire, Helvum provides a modern graphical routing interface:

```bash
# Install helvum
sudo apt install helvum -y
helvum
```

## Setting Up Ardour (Professional DAW)

Ardour is a full-featured DAW that works natively with JACK:

```bash
# Install Ardour
sudo apt install ardour -y
```

Launch Ardour with JACK running:

```bash
ardour6
```

When creating a new session:
- Audio System: JACK
- Input Channels: your interface's inputs
- Output Channels: your interface's outputs

Ardour connects to the running JACK server automatically.

## Setting Up Reaper with JACK

Reaper (commercial DAW) also supports JACK:

```bash
# Download Reaper from reaper.fm
# After installation, configure in Options > Preferences > Audio > Audio System
# Set to JACK
```

## MIDI Over JACK

JACK also handles MIDI connections:

```bash
# Start JACK with MIDI support
jackd -d alsa -r 48000 -p 256 -n 2 -D --midi=seq &

# List MIDI ports
jack_lsp -t midi

# Connect MIDI ports
jack_connect "my-keyboard:capture" "ardour:midi-in"
```

## A2J Bridge (ALSA to JACK MIDI)

Connect ALSA MIDI devices to JACK:

```bash
sudo apt install a2jmidid -y

# Start the bridge
a2jmidid -e &

# ALSA MIDI devices now appear as JACK ports
jack_lsp | grep a2j
```

## Configuring PipeWire JACK Quantum

When using JACK through PipeWire, set the quantum for JACK sessions:

```bash
# Set quantum before starting JACK application
PIPEWIRE_QUANTUM=256/48000 ardour6

# Or set system-wide in PipeWire config
nano ~/.config/pipewire/pipewire.conf.d/jack.conf
```

```ini
context.properties = {
    default.clock.quantum = 256
    default.clock.min-quantum = 64
    default.clock.max-quantum = 8192
    default.clock.rate = 48000
}
```

## Troubleshooting

**JACK fails to start with "cannot lock down memory":**

```bash
# Verify group membership
groups | grep audio

# Verify limits are set
ulimit -r  # Should show 95 or higher
ulimit -l  # Should show unlimited
```

**Xruns during recording:**

```bash
# Increase period size in JACK configuration
# Change -p 256 to -p 512 or -p 1024

# Check CPU frequency scaling
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

**Applications cannot find JACK:**

```bash
# Check if JACK server is running
jack_lsp

# Check environment variables
echo $JACK_DEFAULT_SERVER
echo $JACK_NO_AUDIO_RESERVATION
```

## Summary

JACK provides the professional audio infrastructure needed for recording, production, and live processing on Ubuntu. For most desktop users, the PipeWire JACK compatibility layer is the best approach since it integrates JACK applications with desktop audio seamlessly. For dedicated recording workstations, standalone jackd with carefully tuned period sizes and real-time privileges provides the lowest possible latency. The jackd command line, QjackCTL GUI, and the graphical patchbay tools give you precise control over how audio flows between applications and hardware.
