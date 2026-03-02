# How to Configure Bluetooth Audio on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bluetooth, Audio, PipeWire, PulseAudio

Description: Complete guide to setting up Bluetooth audio on Ubuntu, including pairing headphones and speakers, configuring audio profiles, fixing common Bluetooth audio issues, and improving codec quality.

---

Bluetooth audio on Ubuntu has improved significantly with PipeWire, but getting it working well still requires understanding how Bluetooth profiles, audio servers, and kernel modules interact. This guide covers pairing, profile management, codec selection, and fixes for the most common problems.

## Prerequisites: What You Need

```bash
# Install Bluetooth stack and audio support
sudo apt-get update
sudo apt-get install -y \
    bluez \
    bluez-tools \
    bluetooth \
    pulseaudio-module-bluetooth  # if using PulseAudio

# For PipeWire (Ubuntu 22.04+)
sudo apt-get install -y libspa-0.2-bluetooth

# Verify Bluetooth service is running
sudo systemctl status bluetooth

# Check if Bluetooth hardware is detected
rfkill list
# If Bluetooth is "hard blocked" or "soft blocked", unblock it:
sudo rfkill unblock bluetooth
```

## Understanding Bluetooth Audio Profiles

Bluetooth audio uses different profiles for different purposes:

- **A2DP (Advanced Audio Distribution Profile)**: High-quality stereo audio for listening. One direction only (device to headphones). This is what you use for music.
- **HSP (Headset Profile)**: Basic two-way audio for phone calls. Low quality (8kHz).
- **HFP (Hands-Free Profile)**: Modern version of HSP with better quality (16kHz for wideband).
- **BLE Audio**: Newest standard, not yet widely supported on Linux.

When connecting headphones, Ubuntu automatically switches to HSP/HFP when a microphone application opens, which drops audio quality. This is a common complaint that requires configuration.

## Pairing a Bluetooth Device

### Using bluetoothctl (Command Line)

```bash
# Start the Bluetooth control tool
bluetoothctl

# Inside bluetoothctl:
# Enable the adapter
power on

# Make the adapter visible (for pairing from another device)
discoverable on

# Start scanning for devices
scan on

# Wait for your device to appear, then pair it
# (Replace AA:BB:CC:DD:EE:FF with your device's MAC)
pair AA:BB:CC:DD:EE:FF

# Trust the device so it auto-connects in the future
trust AA:BB:CC:DD:EE:FF

# Connect to the device
connect AA:BB:CC:DD:EE:FF

# Stop scanning
scan off

# Exit
quit
```

### Verifying Connection

```bash
# List paired devices
bluetoothctl devices

# Check connection status
bluetoothctl info AA:BB:CC:DD:EE:FF

# Check if the device appears as an audio sink
pactl list sinks | grep -i blue
# Or with PipeWire:
wpctl status | grep -i blue
```

## Setting Up as Default Audio Output

```bash
# List available sinks (audio outputs)
pactl list sinks short

# Set Bluetooth device as default output
pactl set-default-sink bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink

# Move all current audio streams to Bluetooth
pactl list sink-inputs short | awk '{print $1}' | while read id; do
    pactl move-sink-input "$id" bluez_sink.AA_BB_CC_DD_EE_FF.a2dp_sink
done
```

## Managing Audio Profiles

The most critical configuration is keeping A2DP active instead of switching to HSP/HFP:

```bash
# List available profiles for the Bluetooth card
pactl list cards | grep -A 30 "bluez"

# Set the profile to A2DP (high quality)
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF a2dp_sink

# If you need to use microphone on the headset (voice chat):
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF headset_head_unit_msbc

# Switch back to A2DP when done with voice call
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF a2dp_sink
```

### Preventing Auto-Switch to HSP/HFP

The `module-bluetooth-policy` in PulseAudio automatically switches profiles when a recording application opens. Disable this behavior:

```bash
# Edit PulseAudio default configuration
sudo nano /etc/pulse/default.pa

# Find and comment out or modify this line:
# load-module module-bluetooth-policy
# Change to:
load-module module-bluetooth-policy auto_switch=false

# Restart PulseAudio
pulseaudio -k && pulseaudio --start
```

For PipeWire, configure via WirePlumber:

```bash
mkdir -p ~/.config/wireplumber/bluetooth.lua.d/

cat > ~/.config/wireplumber/bluetooth.lua.d/50-disable-autoswitch.lua << 'EOF'
bluez_monitor.properties = {
  ["bluez5.enable-autoswitch-profile"] = false,
}
EOF

systemctl --user restart wireplumber
```

## Enabling Better Codecs

Standard Bluetooth A2DP uses SBC codec, which sounds mediocre. Better codecs require both your headphones and Ubuntu to support them.

### Supported Codecs on Linux

- **SBC**: Default, always available, OK quality
- **SBC-XQ**: Extended SBC with higher bitrate, good quality
- **AAC**: Apple devices, good quality
- **aptX / aptX HD**: Qualcomm devices, excellent quality
- **LDAC**: Sony devices, excellent quality (up to 990kbps)
- **FastStream**: Low latency for gaming

### Enabling Extended Codec Support

```bash
# For PulseAudio with Bluetooth codec support
sudo apt-get install -y pulseaudio-module-bluetooth-discover

# For PipeWire (codecs are built into the spa-bluez5 plugin)
# Check available codecs
pactl list cards | grep -i codec

# Enable SBC-XQ and other codecs via WirePlumber config
cat > ~/.config/wireplumber/bluetooth.lua.d/51-codecs.lua << 'EOF'
bluez_monitor.properties = {
  ["bluez5.enable-sbc-xq"] = true,
  ["bluez5.enable-msbc"] = true,
  ["bluez5.enable-hw-volume"] = true,
  ["bluez5.codecs"] = "[ sbc sbc_xq aac ldac aptx aptx_hd ]",
}
EOF

systemctl --user restart wireplumber
```

### Selecting Active Codec

```bash
# PipeWire: view current codec
pactl list cards | grep -i "Active Profile\|codec"

# Switch to LDAC if supported
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF a2dp_sink-ldac

# Switch to aptX
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF a2dp_sink-aptx
```

## Auto-Connect on Boot

Once trusted, most devices auto-connect. To ensure auto-connection even when the device wasn't connected when the system booted:

```bash
# Create a systemd service to auto-connect
sudo tee /etc/systemd/system/bluetooth-autoconnect@.service << 'EOF'
[Unit]
Description=Auto-connect Bluetooth device %i
After=bluetooth.service
Wants=bluetooth.service

[Service]
Type=oneshot
ExecStart=/usr/bin/bluetoothctl connect %i
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Enable for your device (replace AA_BB_CC_DD_EE_FF with colons)
sudo systemctl enable bluetooth-autoconnect@AA:BB:CC:DD:EE:FF.service
```

## Troubleshooting

### Bluetooth headphones connected but no sound

```bash
# Check if A2DP profile is active
pactl list cards | grep -A 5 "bluez"

# If stuck on HSP, switch manually
pactl set-card-profile bluez_card.AA_BB_CC_DD_EE_FF a2dp_sink

# If A2DP is not in the list, A2DP may not be established
# Try disconnecting and reconnecting
bluetoothctl disconnect AA:BB:CC:DD:EE:FF
sleep 2
bluetoothctl connect AA:BB:CC:DD:EE:FF
```

### Connection drops frequently

```bash
# Check for Bluetooth module options
cat /sys/module/btusb/parameters/enable_autosuspend

# Disable USB autosuspend for Bluetooth adapter
echo 'options btusb enable_autosuspend=0' | sudo tee /etc/modprobe.d/btusb.conf

# Reload module
sudo modprobe -r btusb
sudo modprobe btusb
```

### Audio stuttering or skipping

```bash
# Increase PulseAudio Bluetooth buffer
cat >> ~/.config/pulse/daemon.conf << 'EOF'
# Larger buffer for Bluetooth
default-fragments = 4
default-fragment-size-msec = 25
EOF

pulseaudio -k && pulseaudio --start

# Check for Bluetooth interference
# Bluetooth uses 2.4GHz, same as many WiFi networks
# Use 5GHz WiFi if possible, or distance the device from the router
```

### Device visible but pairing fails

```bash
# Remove cached pairing data and re-pair
bluetoothctl remove AA:BB:CC:DD:EE:FF

# Make sure device is in pairing mode
# Then re-run the pairing process

# Check for errors
sudo journalctl -u bluetooth -f
```

### "Protocol not available" error when connecting

Usually means the Bluetooth audio module isn't loaded:

```bash
# For PulseAudio
pactl load-module module-bluetooth-discover

# For PipeWire - verify the plugin is installed
ls /usr/lib/$(dpkg-architecture -q DEB_HOST_MULTIARCH)/spa-0.2/bluez5/
# Should list libspa-bluez5.so and related files

# Reinstall if missing
sudo apt-get install --reinstall libspa-0.2-bluetooth
systemctl --user restart pipewire wireplumber
```

## Useful Bluetooth Management Scripts

```bash
#!/bin/bash
# bt-audio.sh - Quick Bluetooth audio management

case "$1" in
    list)
        bluetoothctl devices
        ;;
    connect)
        bluetoothctl connect "$2"
        sleep 2
        pactl set-card-profile bluez_card.$(echo "$2" | tr ':' '_') a2dp_sink
        ;;
    disconnect)
        bluetoothctl disconnect "$2"
        ;;
    profile)
        # Switch to A2DP high quality
        MAC=$(echo "$2" | tr ':' '_')
        pactl set-card-profile "bluez_card.${MAC}" a2dp_sink
        ;;
    *)
        echo "Usage: $0 {list|connect MAC|disconnect MAC|profile MAC}"
        ;;
esac
```

With PipeWire and proper configuration, Bluetooth audio on Ubuntu is reliable enough for daily use, including high-quality music listening and video calls.
