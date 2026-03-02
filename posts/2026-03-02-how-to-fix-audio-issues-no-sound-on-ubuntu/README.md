# How to Fix Audio Issues (No Sound) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Audio, Troubleshooting, ALSA, PulseAudio

Description: Systematic troubleshooting guide for fixing no-sound audio issues on Ubuntu, working through hardware detection, driver loading, PulseAudio configuration, and common audio problem fixes.

---

No sound on Ubuntu can happen for many reasons: a muted mixer channel, a wrong default audio device, a driver not loading, a PulseAudio configuration problem, or even a misconfigured HDMI output being set as the default. The trick is to work through the stack systematically rather than trying random fixes. This guide walks through that process from hardware detection down to application configuration.

## Step 1: Check the Obvious

Before anything else, check the basics:

```bash
# Is the system muted at the ALSA level?
alsamixer
# Press F6 to select your sound card
# Look for channels showing "MM" (muted) and press M to unmute
# The "Master" and "PCM" channels must not be muted

# Unmute from command line
amixer set Master unmute
amixer set PCM unmute
amixer set Speaker unmute
amixer set Headphone unmute

# Set volume to 100%
amixer set Master 100%

# Check if PulseAudio/PipeWire is muted
pactl list sinks | grep -E "Mute:|Volume:"
pactl set-sink-mute @DEFAULT_SINK@ 0  # unmute
pactl set-sink-volume @DEFAULT_SINK@ 100%
```

## Step 2: Verify Hardware Is Detected

```bash
# List all sound cards detected by ALSA
aplay -l

# If this shows nothing, the sound card isn't detected
# Check if the hardware is physically present
lspci | grep -i audio
lsusb | grep -i audio  # for USB audio devices

# Check kernel messages for audio-related messages
dmesg | grep -i "audio\|sound\|snd\|alsa" | tail -30
```

If `aplay -l` shows no devices, the problem is at the hardware/driver level. If it shows devices, the problem is configuration.

## Step 3: Check ALSA Modules

```bash
# List loaded audio kernel modules
lsmod | grep snd

# Expected modules include:
# snd_hda_intel (for Intel/Realtek HDA)
# snd_hda_codec_realtek (codec)
# snd_usb_audio (USB audio)

# If modules are missing, load them manually
sudo modprobe snd-hda-intel
sudo modprobe snd-usb-audio

# Check if modules loaded successfully
dmesg | tail -20
```

## Step 4: Test Audio Directly Through ALSA

Bypass PulseAudio/PipeWire completely to test raw hardware:

```bash
# Stop PulseAudio temporarily
pulseaudio --kill

# Test ALSA directly
speaker-test -c 2 -t wav

# Or play a file
aplay /usr/share/sounds/alsa/Front_Center.wav

# If this works, the problem is in PulseAudio/PipeWire, not the hardware
# Restart PulseAudio
pulseaudio --start
```

If `aplay` produces sound but your desktop has no sound, skip to the PulseAudio section.

## Step 5: Fix ALSA No Sound

### Wrong Default Card

```bash
# If you have multiple cards, the wrong one may be default
cat /proc/asound/cards

# Set correct default card
sudo tee /etc/asound.conf << 'EOF'
defaults.pcm.card 0  # change to your card number
defaults.ctl.card 0
EOF

# Test
aplay /usr/share/sounds/alsa/Front_Center.wav
```

### HDMI Set as Default Instead of Speakers

Very common issue - HDMI audio card gets a lower index than built-in audio:

```bash
# List cards
aplay -l

# Find your built-in audio card number and set it as default
# If built-in is card 1 and HDMI is card 0, swap them
sudo tee /etc/modprobe.d/audio-fix.conf << 'EOF'
# Make built-in audio card 0 (index=0) and HDMI card 1 (index=1)
options snd-hda-intel index=0   # for built-in HDA
options snd_hda_intel index=1   # for HDMI HDA (different module name sometimes)
EOF

# Reboot and test
sudo reboot
```

## Step 6: Fix PulseAudio Issues

```bash
# Check PulseAudio status
pulseaudio --check; echo $?  # 0 = running

# If not running, start it
pulseaudio --start

# Restart PulseAudio (fixes many issues)
pulseaudio -k
pulseaudio --start

# Check if PulseAudio has audio devices
pactl list sinks

# Check the default sink
pactl info | grep "Default Sink"

# Check if a sink is suspended (happens after idle timeout)
pactl list sinks | grep -E "State:|Name:"
# Suspended state won't play audio
# Trigger it to wake up:
paplay /dev/null
```

### PulseAudio Reset

If PulseAudio configuration is corrupted:

```bash
# Nuclear reset - removes all PulseAudio configuration
pulseaudio -k
rm -rf ~/.config/pulse
pulseaudio --start

# Verify
pactl info
paplay /usr/share/sounds/alsa/Front_Center.wav
```

### PulseAudio Fallback Sink

If a specific application has no sound but others do:

```bash
# Check if the app is sending audio to a non-existent sink
pactl list sink-inputs

# Move the app's audio to the working sink
pactl move-sink-input SINK_INPUT_ID WORKING_SINK_NAME
```

## Step 7: Fix PipeWire Issues

On Ubuntu 22.04+ with PipeWire:

```bash
# Check PipeWire status
systemctl --user status pipewire pipewire-pulse wireplumber

# Restart all PipeWire services
systemctl --user restart pipewire pipewire-pulse wireplumber

# Wait a moment and test
sleep 2
paplay /usr/share/sounds/alsa/Front_Center.wav

# Check WirePlumber (session manager) logs
journalctl --user -u wireplumber --since "5 minutes ago"

# Check available audio devices via WirePlumber
wpctl status
```

## Step 8: Fix Bluetooth Audio

```bash
# If Bluetooth headphones connected but no sound
pactl list sinks | grep -i blue

# Set Bluetooth device as default sink
pactl set-default-sink bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink

# Check the Bluetooth audio profile
pactl list cards | grep -A 20 "bluez"

# Switch to A2DP profile (high quality)
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF a2dp_sink

# If A2DP not available, Bluetooth headset is likely in HSP/HFP mode
# Restart bluetooth service
sudo systemctl restart bluetooth
```

## Step 9: Fix HDMI Audio

```bash
# List HDMI audio outputs
aplay -l | grep HDMI

# Test each HDMI output
aplay -D plughw:0,3 /usr/share/sounds/alsa/Front_Center.wav
aplay -D plughw:0,7 /usr/share/sounds/alsa/Front_Center.wav

# Set HDMI as default in PulseAudio
pactl list sinks | grep HDMI
pactl set-default-sink alsa_output.pci-0000_00_1f.3.hdmi-stereo

# Check HDMI sink is not in a bad profile
pactl list cards | grep -A 30 "HDMI"
pactl set-card-profile alsa_card.pci-0000_00_1f.3 output:hdmi-stereo
```

## Step 10: Driver Issues

### Realtek HDA Not Working

The most common built-in audio chip. Often needs a model hint:

```bash
# Try different model hints
sudo nano /etc/modprobe.d/alsa-base.conf

# Try these options one at a time (reboot after each):
# options snd-hda-intel model=auto
# options snd-hda-intel model=generic
# options snd-hda-intel model=laptop
# options snd-hda-intel model=laptop-dmic

# Check what codec you have
cat /proc/asound/card0/codec#0 | head -5
# "Codec: Realtek ALC287" for example

# Search ALSA kernel docs for your specific codec model options
```

### Reinstall ALSA/Audio Packages

```bash
sudo apt-get remove --purge alsa-base pulseaudio
sudo apt-get install -y alsa-base alsa-utils pulseaudio
sudo alsa force-reload
pulseaudio --start
```

## Common Application-Specific Fixes

### Firefox has no sound

```bash
# Check audio backend in Firefox
# Go to about:config, search for "media.cubeb.backend"
# Set to "pulse" or "pulse-rust"

# Or via environment variable
PULSE_SERVER=unix:/run/user/$(id -u)/pulse/native firefox
```

### VLC has no sound

```bash
# In VLC: Tools -> Preferences -> Audio
# Set Output module to "PulseAudio audio output"
# Or from command line:
vlc --aout=pulse video.mp4
```

### Games (via Steam/Proton) have no sound

```bash
# Ensure 32-bit PulseAudio libraries are installed
sudo apt-get install -y libpulse0:i386 libasound2:i386

# Check PulseAudio socket permissions
ls -la /run/user/$(id -u)/pulse/
```

## Diagnostic One-liner Summary

```bash
# Run this to get a quick overview of your audio setup
echo "=== ALSA Cards ===" && aplay -l 2>&1
echo "=== PulseAudio ===" && pactl info 2>&1 | head -10
echo "=== Default Sink ===" && pactl get-default-sink 2>&1
echo "=== Sinks ===" && pactl list sinks short 2>&1
echo "=== Modules ===" && lsmod | grep snd | head -10
```

Audio problems on Ubuntu almost always fall into one of these categories: muted mixer, wrong default device, PulseAudio not running or misconfigured, or a driver issue. Working through them in order from hardware to software identifies the problem quickly.
