# How to Tune Ubuntu for Audio Production Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Audio Production, Real-Time, Jack, Low Latency

Description: Configure Ubuntu for professional audio production with low-latency kernel, JACK audio server, CPU tuning, and real-time user permissions for reliable recording and processing.

---

Getting Ubuntu ready for professional audio production requires more than just installing a DAW. The default Ubuntu configuration prioritizes general desktop responsiveness, not the microsecond-level timing that audio work demands. Recording, processing, and mixing audio without dropouts requires real-time kernel access, proper user permissions, optimized JACK audio settings, and a few system tweaks that are not done by default.

## Prerequisites

- Ubuntu 22.04 LTS or 24.04 LTS
- Audio interface (USB, Thunderbolt, or PCIe)
- At least 8 GB RAM recommended
- Root or sudo access

## Installing the Low-Latency Kernel

The standard Ubuntu kernel is not optimized for real-time audio. Install the low-latency variant:

```bash
# Update the system first
sudo apt update && sudo apt upgrade -y

# Install the low-latency kernel
sudo apt install -y linux-lowlatency

# Check available kernel packages
apt list --installed | grep linux-image

# Reboot into the new kernel
sudo reboot

# After reboot, verify
uname -r
# Should contain "lowlatency"
```

For the most demanding use cases (e.g., very small buffer sizes under 64 samples), the Ubuntu Pro real-time kernel provides better results:

```bash
sudo pro attach <YOUR_PRO_TOKEN>
sudo pro enable realtime-kernel
sudo reboot
```

## Adding Your User to the Audio Group

Real-time priority requires membership in the `audio` group:

```bash
# Add your user to the audio group
sudo usermod -aG audio $USER

# Verify group membership (you need to log out and back in for this to take effect)
groups $USER

# Log out and back in, then verify
id | grep audio
```

## Configuring Real-Time Limits

The `audio` group needs permission to use real-time scheduling and locked memory:

```bash
# Check the current limits file
cat /etc/security/limits.d/audio.conf
# If this file does not exist, create it

sudo tee /etc/security/limits.d/audio.conf > /dev/null <<'EOF'
# Real-time audio production limits
@audio   -  rtprio     95        # Maximum real-time priority
@audio   -  memlock    unlimited # Allow locking all memory in RAM
@audio   -  nice       -19       # Allow high nice (low niceness = high priority)
EOF

# Verify limits are applied after re-login
ulimit -r   # Should show 95
ulimit -l   # Should show unlimited
```

## Installing JACK Audio Connection Kit

JACK provides professional audio routing and real-time audio processing:

```bash
# Install JACK2 and client tools
sudo apt install -y jackd2 qjackctl jack-tools

# Install optional audio software
sudo apt install -y ardour audacity cadence

# During jackd2 installation, it may ask if you want to configure
# real-time priority - answer yes
```

## Configuring JACK

### Using QjackCtl (GUI)

```bash
# Launch QjackCtl
qjackctl &
```

Open Setup and configure:
- **Driver**: alsa (for ALSA interfaces) or firewire/coreaudio
- **Sample rate**: 48000 Hz (or 44100 for CD-quality)
- **Frames/period**: Start with 256, reduce if your CPU can handle it
- **Periods/buffer**: 2 or 3 (lower = less latency, more CPU load)
- **Real-time**: Checked
- **Priority**: 80

### Configuring JACK from the Command Line

```bash
# Start JACK with a USB audio interface
# -P: real-time priority, -d: driver, -r: sample rate, -p: period size
jackd -P80 -d alsa -d hw:USB -r 48000 -p 256 -n 2 &

# For internal audio (HDA Intel)
jackd -P80 -d alsa -d hw:0 -r 48000 -p 512 -n 2 &

# List available ALSA devices
cat /proc/asound/cards
aplay -l
arecord -l
```

### Creating a Persistent JACK Configuration

```bash
# Save JACK configuration using cadence or qjackctl
# Or configure directly in the JACK server file
mkdir -p ~/.config/rncbc.org
cat > ~/.config/rncbc.org/QjackCtl.conf <<'EOF'
[Settings]
Driver=alsa
Interface=hw:USB
SampleRate=48000
Frames=256
Periods=2
RealTime=true
Priority=80
Verbose=false
EOF
```

## Disabling CPU Frequency Scaling

Frequency scaling causes unpredictable latency as the CPU ramps up and down:

```bash
# Install cpufrequtils
sudo apt install -y cpufrequtils

# Set CPU governor to performance mode
sudo cpupower frequency-set -g performance

# Verify
cat /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
# All should show: performance

# Make permanent
sudo tee /etc/systemd/system/cpu-performance.service > /dev/null <<'EOF'
[Unit]
Description=Set CPU Governor to Performance
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/usr/bin/cpupower frequency-set -g performance
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now cpu-performance
```

## Disabling Power Management Features

Several power management features introduce latency:

```bash
# Add to kernel boot parameters for persistent effect
sudo nano /etc/default/grub

# Modify GRUB_CMDLINE_LINUX_DEFAULT:
GRUB_CMDLINE_LINUX_DEFAULT="quiet splash processor.max_cstate=1 intel_idle.max_cstate=1"
# For AMD systems:
# GRUB_CMDLINE_LINUX_DEFAULT="quiet splash processor.max_cstate=1 amd_idle.max_cstate=1"

sudo update-grub
```

For a quick test without rebooting:

```bash
# Disable CPU idle states temporarily
sudo cpupower idle-set -D 1    # Disable all C-states deeper than C1

# Check current C-state usage
sudo cpupower monitor
```

## Optimizing IRQ Affinity for Audio

Move non-audio IRQs away from the CPU core handling your audio interface:

```bash
# Find which IRQ your audio interface uses
cat /proc/interrupts | grep -i audio
cat /proc/interrupts | grep -i usb  # for USB audio

# Move other IRQs to CPU 0, leave CPU 1 for audio
# Replace 45 with your audio interface IRQ number
echo "0" | sudo tee /proc/irq/45/smp_affinity_list  # Pin audio IRQ to CPU 0
```

## Configuring the PulseAudio/PipeWire Bridge

Modern Ubuntu uses PipeWire for audio management. Configure it to work well with JACK:

```bash
# Install PipeWire JACK bridge
sudo apt install -y pipewire-jack pipewire-audio-client-libraries

# Configure PipeWire for low latency
mkdir -p ~/.config/pipewire
cp /usr/share/pipewire/pipewire.conf ~/.config/pipewire/

# Edit the config to reduce quantum (buffer size)
nano ~/.config/pipewire/pipewire.conf
```

Add or modify in the context.properties section:

```
context.properties = {
    # Set default sample rate and buffer size
    default.clock.rate = 48000
    default.clock.quantum = 256          # Frames per cycle
    default.clock.min-quantum = 32       # Minimum allowed quantum
    default.clock.max-quantum = 8192     # Maximum allowed quantum
    clock.power-of-two-quantum = true
}
```

```bash
# Restart PipeWire
systemctl --user restart pipewire pipewire-pulse
```

## Checking System Readiness with realTimeConfigQuickScan

```bash
# Install the audio configuration checker
git clone https://github.com/raboof/realtimeconfigquickscan.git
cd realtimeconfigquickscan
perl ./realTimeConfigQuickScan.pl
```

This tool checks CPU governors, real-time limits, kernel version, IRQ settings, and other audio-relevant configurations and reports which ones need attention.

## Measuring Latency

```bash
# Install rt-tests for latency measurement
sudo apt install -y rt-tests

# Measure latency while JACK is running
sudo cyclictest -t1 -p80 -i1000 -n -l 10000

# Lower Max values = better
# A well-tuned audio system should show Max < 200 microseconds
```

## Recommended Software Stack

```bash
# DAWs
sudo apt install -y ardour         # Professional DAW
sudo snap install reaper           # Popular cross-platform DAW

# Plugins and effects
sudo apt install -y ladspa-sdk calf-plugins guitarix tap-plugins

# MIDI tools
sudo apt install -y qsynth timidity++ midisnoop

# Audio routing
sudo apt install -y carla qjackctl a2jmidid

# Monitoring
sudo apt install -y jack-meter jack-capture
```

## Common Issues

### Audio Dropouts (Xruns)

```bash
# Check JACK xrun count in qjackctl or:
jack_cpu_load  # Shows CPU load percentage

# Solutions:
# 1. Increase buffer size (256 -> 512 -> 1024)
# 2. Disable unneeded system services
# 3. Check CPU frequency scaling
# 4. Reduce number of active plugins

# Identify which process causes xruns
sudo cat /proc/interrupts | sort -k2 -n | tail -20
```

### Audio Interface Not Detected

```bash
# List USB audio devices
lsusb | grep -i audio

# Check ALSA sees the device
aplay -l
arecord -l

# Check if the kernel module loaded
lsmod | grep snd_usb_audio

# Load the module manually if missing
sudo modprobe snd_usb_audio
```

Tuning Ubuntu for audio production is an iterative process. Start with the kernel switch and real-time limits, test with your actual DAW workload, then progressively apply the CPU and IRQ tuning steps until you achieve stable, dropout-free recording and playback at your desired buffer size.
