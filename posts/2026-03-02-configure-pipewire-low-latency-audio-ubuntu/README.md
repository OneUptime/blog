# How to Configure PipeWire for Low-Latency Audio on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Audio, PipeWire, Low Latency, Production

Description: Configure PipeWire on Ubuntu for low-latency audio processing by tuning buffer sizes, quantum values, and real-time priorities for music production and audio work.

---

PipeWire's default configuration prioritizes stability and compatibility over latency. For general desktop use this is the right trade-off, but for music production, live audio monitoring, or any situation where you need tight timing, the defaults leave significant headroom that you can reclaim through configuration.

Latency in digital audio comes from buffer size - the number of audio samples processed in each batch. Larger buffers mean more stable audio but more delay. A buffer of 2048 samples at 48kHz introduces 42ms of latency. Reducing to 256 samples gives 5.3ms. The minimum you can achieve depends on your hardware, drivers, and CPU scheduling.

## Prerequisites

PipeWire should already be installed and running. Verify:

```bash
systemctl --user status pipewire
pactl info | grep "Server Name"
# Should show: PulseAudio (on PipeWire x.x.x)
```

Also install the PipeWire development tools:

```bash
sudo apt install pipewire-audio-client-libraries libpipewire-0.3-dev -y
```

## Understanding PipeWire's Quantum and Rate Settings

PipeWire uses two key parameters for latency control:

- **quantum** (also called the buffer size) - number of audio frames processed per cycle
- **rate** - the audio sample rate in Hz

Latency = quantum / rate

Examples:
- 1024 / 48000 = 21.3ms
- 512 / 48000 = 10.7ms
- 256 / 48000 = 5.3ms
- 128 / 48000 = 2.7ms

The default PipeWire quantum is 1024 or 2048 depending on the version and activity detection.

## Configuring the Default Quantum

Create or edit the PipeWire configuration override for the default quantum:

```bash
mkdir -p ~/.config/pipewire/pipewire.conf.d/
nano ~/.config/pipewire/pipewire.conf.d/10-low-latency.conf
```

Add:

```ini
context.properties = {
    # Set default quantum (buffer size)
    # Lower values = lower latency but higher CPU load
    default.clock.quantum = 256

    # Minimum and maximum allowed quantum
    default.clock.min-quantum = 32
    default.clock.max-quantum = 8192

    # Sample rate
    default.clock.rate = 48000

    # Allowed rates (PipeWire will auto-select based on content)
    default.clock.allowed-rates = [ 44100 48000 88200 96000 ]
}
```

Restart PipeWire to apply:

```bash
systemctl --user restart pipewire pipewire-pulse wireplumber
```

## Verifying Quantum and Latency

Check the current quantum and latency:

```bash
# Watch PipeWire streams and their quantum values
pw-top
```

In pw-top output, look for the `QUANT` column showing the current buffer size and the `RATE` column. Calculate latency:

```bash
# Quick latency calculation
python3 -c "print(f'Latency: {256/48000*1000:.1f}ms')"
```

## Real-Time Priority for Low Latency

Low-latency audio requires the audio processing thread to preempt other system tasks. Configure real-time priority:

### Installing Real-Time Kernel (Optional but Recommended)

For professional audio with very low latency targets (under 5ms), the real-time kernel reduces scheduling jitter:

```bash
# Check available real-time kernels
apt search linux-realtime

# Install if available for your Ubuntu version
sudo apt install linux-lowlatency -y
# or
sudo apt install linux-realtime -y

# Reboot to use the new kernel
sudo reboot
```

The `linux-lowlatency` kernel is available in Ubuntu repositories and provides better latency than the generic kernel without requiring a full real-time patch.

### Configuring Real-Time Privileges

Allow your user to use real-time scheduling:

```bash
# Create a limits configuration for audio
sudo nano /etc/security/limits.d/audio-rt.conf
```

Add:

```
# Allow users in the audio group to use real-time scheduling
@audio   -  rtprio    95
@audio   -  memlock   unlimited
@audio   -  nice      -19
```

Add your user to the audio group:

```bash
sudo usermod -aG audio $USER
```

Log out and back in for the group change to take effect.

### Configuring PipeWire for Real-Time

Create a PipeWire real-time configuration:

```bash
nano ~/.config/pipewire/pipewire.conf.d/20-realtime.conf
```

```ini
context.properties = {
    # Enable real-time priority for PipeWire threads
    mem.allow-mlock = true
    mem.warn-mlock  = false

    # Thread priority settings
    # PipeWire uses these for its processing threads
    core.daemon = true
}

context.spa-libs = {
    support.* = support/libspa-support
}
```

## WirePlumber Configuration for Low Latency

WirePlumber manages device activation and policy. Configure it for lower latency:

```bash
mkdir -p ~/.config/wireplumber/main.lua.d/
nano ~/.config/wireplumber/main.lua.d/51-alsa-disable-batch.lua
```

```lua
-- Disable batch mode for ALSA devices to reduce latency
-- Batch mode buffers multiple periods together; disabling it
-- reduces latency at the cost of slightly higher CPU usage
alsa_monitor.rules = {
  {
    matches = {
      {
        { "node.name", "matches", "alsa_output.*" },
      },
    },
    apply_properties = {
      ["api.alsa.disable-batch"] = true,
      -- Reduce headroom period count
      ["api.alsa.headroom"] = 0,
      -- Set specific period size
      ["api.alsa.period-size"] = 256,
      ["api.alsa.period-num"] = 2,
    },
  },
}
```

Restart WirePlumber:

```bash
systemctl --user restart wireplumber
```

## Adjusting Quantum Per Application

Some DAWs and audio applications can request a specific quantum from PipeWire. If an application supports PipeWire natively or through JACK, you can set the desired latency when launching it:

```bash
# Set quantum for a specific application using environment variable
PIPEWIRE_QUANTUM=256/48000 ardour6

# Or use pw-metadata to change the quantum at runtime
pw-metadata -n settings 0 clock.force-quantum 256
```

Reset the forced quantum:

```bash
pw-metadata -n settings 0 clock.force-quantum 0
```

## Measuring Actual Audio Latency

Test the real round-trip latency your setup achieves:

```bash
# Install the latency test tool
sudo apt install jack2 -y

# Use JACK's latency measurement (works with PipeWire's JACK compatibility)
PIPEWIRE_QUANTUM=128/48000 jackd -d alsa &
jack_iodelay
```

Or use a physical loopback test with a tool like `alsa-utils`:

```bash
# Generate a test tone and measure the round-trip
aplay -D hw:0,0 /usr/share/sounds/alsa/Front_Left.wav &
arecord -D hw:0,0 -f S16_LE -r 48000 /tmp/recorded.wav
```

Compare timestamps to measure actual latency.

## Tuning for Different Hardware

Different audio interfaces need different settings:

### USB Audio Interfaces

USB interfaces often need larger buffers due to USB scheduling:

```bash
# For USB interfaces, 512 or 1024 is often the stable minimum
# In /etc/pipewire/pipewire.conf.d/10-low-latency.conf
default.clock.quantum = 512
```

### Built-in Intel HDA Audio

Built-in audio can often go lower:

```bash
default.clock.quantum = 256
```

### Professional PCIe Audio Cards

PCIe cards with native ALSA drivers can achieve very low latency:

```bash
# Some can go as low as 64 samples
default.clock.quantum = 64
default.clock.min-quantum = 32
```

## Monitoring for Xruns

An xrun occurs when the audio buffer is not processed in time, causing a glitch. Monitor for xruns:

```bash
# pw-top shows xruns in the ERR column
pw-top

# Or monitor ALSA xruns directly
cat /proc/asound/card0/pcm0p/sub0/status
```

If xruns appear frequently at your target quantum, increase it until the system is stable, then consider whether a lower-latency kernel or CPU governor setting would help.

## CPU Governor for Real-Time Audio

Set the CPU governor to performance mode for sustained low latency:

```bash
# Check current governor
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor

# Set to performance
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Install cpufrequtils for persistence
sudo apt install cpufrequtils -y
sudo cpufreq-set -g performance
```

## Summary

Achieving low-latency audio with PipeWire requires tuning the quantum (buffer size) in the PipeWire configuration, granting real-time scheduling privileges to your user, adjusting WirePlumber's ALSA settings to disable batch mode, and optionally using the lowlatency kernel. The sustainable minimum quantum depends on your specific hardware - start at 512 and work down while monitoring for xruns in pw-top. For professional recording environments, combining PipeWire with the lowlatency kernel and a dedicated audio interface typically achieves stable latency under 10ms.
