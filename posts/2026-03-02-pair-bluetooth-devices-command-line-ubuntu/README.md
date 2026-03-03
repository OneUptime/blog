# How to Pair Bluetooth Devices from the Command Line on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bluetooth, bluetoothctl, Pairing, Command Line

Description: Learn how to pair, trust, and connect Bluetooth devices from the command line on Ubuntu using bluetoothctl, with examples for keyboards, mice, speakers, and phones.

---

Pairing Bluetooth devices without a GUI is something you need when working on headless Ubuntu servers, remote systems, or when you prefer the command line. The `bluetoothctl` tool handles the entire pairing process and supports all the standard pairing methods including passkey entry, PIN codes, and just-works (no-input, no-output) pairing.

## Prerequisites

```bash
# Ensure BlueZ is installed and running
sudo apt install bluetooth bluez -y
sudo systemctl start bluetooth
sudo systemctl enable bluetooth

# Verify the adapter is powered on
bluetoothctl show | grep "Powered"

# Power on if needed
bluetoothctl power on
```

## Understanding Bluetooth Pairing Methods

Bluetooth devices use different pairing methods based on their capabilities:

- **Just Works**: No authentication, auto-pairs. Used for devices with no display or input (e.g., some headphones). Vulnerable to man-in-the-middle attacks.
- **Passkey Entry**: One device displays a 6-digit number, you enter it on the other. Used for keyboards pairing to a computer.
- **Passkey Comparison**: Both devices show a number, you confirm they match. Used for phones.
- **Out of Band (OOB)**: Uses NFC or other means to exchange keys.

## Interactive Pairing with bluetoothctl

The interactive shell is the most flexible approach:

```bash
# Launch bluetoothctl
bluetoothctl
```

Once inside the interactive shell:

```text
# Power on the adapter
[bluetooth]# power on
Changing power on succeeded

# Enable the agent (handles PIN entry and confirmations)
[bluetooth]# agent on
Agent registered

# Set as the default agent
[bluetooth]# default-agent
Default agent request successful

# Make your Ubuntu system discoverable (for devices that need to find it)
[bluetooth]# discoverable on
Changing discoverable on succeeded

# Make pairable
[bluetooth]# pairable on
Changing pairable on succeeded

# Start scanning for nearby devices
[bluetooth]# scan on
Discovery started
[NEW] Device AA:BB:CC:DD:EE:FF Logitech K380
[NEW] Device 11:22:33:44:55:66 Sony WH-1000XM4
[NEW] Device 77:88:99:AA:BB:CC Pixel 7

# Stop scanning when you see your device
[bluetooth]# scan off

# Pair with the device using its MAC address
[bluetooth]# pair AA:BB:CC:DD:EE:FF
Attempting to pair with AA:BB:CC:DD:EE:FF
[CHG] Device AA:BB:CC:DD:EE:FF Connected: yes

# If prompted for a PIN, type it and press Enter
[agent] Enter PIN code: 0000

# Or if it shows a passkey comparison
[agent] Confirm passkey 123456 (yes/no): yes

# After pairing, trust the device so it auto-connects in the future
[bluetooth]# trust AA:BB:CC:DD:EE:FF
Changing AA:BB:CC:DD:EE:FF trust succeeded

# Connect to the device
[bluetooth]# connect AA:BB:CC:DD:EE:FF
Attempting to connect to AA:BB:CC:DD:EE:FF
[CHG] Device AA:BB:CC:DD:EE:FF Connected: yes
Connection successful

# Verify it's paired and connected
[bluetooth]# info AA:BB:CC:DD:EE:FF
```

## Non-Interactive Pairing Script

For automated environments, use bluetoothctl with piped commands:

```bash
#!/bin/bash
# bt-pair.sh - Non-interactive Bluetooth pairing script

DEVICE_MAC="$1"

if [ -z "$DEVICE_MAC" ]; then
    echo "Usage: $0 <MAC_ADDRESS>"
    echo "Example: $0 AA:BB:CC:DD:EE:FF"
    exit 1
fi

echo "Setting up Bluetooth..."
bluetoothctl power on

echo "Scanning for $DEVICE_MAC (put device in pairing mode now)..."
# Start scan in background
bluetoothctl scan on &
SCAN_PID=$!

# Wait for the device to appear
FOUND=false
for i in $(seq 1 30); do
    if bluetoothctl devices | grep -q "$DEVICE_MAC"; then
        FOUND=true
        break
    fi
    sleep 1
done

kill $SCAN_PID 2>/dev/null
bluetoothctl scan off

if ! $FOUND; then
    echo "Device $DEVICE_MAC not found after 30 seconds"
    exit 1
fi

echo "Pairing with $DEVICE_MAC..."
bluetoothctl pair "$DEVICE_MAC"

echo "Trusting $DEVICE_MAC..."
bluetoothctl trust "$DEVICE_MAC"

echo "Connecting to $DEVICE_MAC..."
bluetoothctl connect "$DEVICE_MAC"

echo "Done. Device status:"
bluetoothctl info "$DEVICE_MAC"
```

```bash
# Usage
chmod +x bt-pair.sh
./bt-pair.sh AA:BB:CC:DD:EE:FF
```

## Pairing a Bluetooth Keyboard

Keyboards use the passkey entry method - the keyboard will prompt you to type a number:

```bash
bluetoothctl
```

```text
# Start the agent
[bluetooth]# agent on
[bluetooth]# default-agent

# Enable scanning
[bluetooth]# scan on

# When keyboard appears, pair it
[bluetooth]# pair AA:BB:CC:DD:EE:FF

# The keyboard will display a number like: 123456
# Type that number on the keyboard and press Enter
[agent] Enter PIN code:
# Type: 123456 (using the Bluetooth keyboard) and press Enter

# Trust it for auto-connect
[bluetooth]# trust AA:BB:CC:DD:EE:FF
[bluetooth]# connect AA:BB:CC:DD:EE:FF
```

## Pairing a Bluetooth Speaker or Headset

Audio devices typically use Just Works pairing:

```bash
bluetoothctl

[bluetooth]# agent on
[bluetooth]# scan on

# When speaker appears (e.g., "Sony WH-1000XM4")
[bluetooth]# pair 11:22:33:44:55:66
# Just Works - no PIN needed, just confirm if asked

[bluetooth]# trust 11:22:33:44:55:66
[bluetooth]# connect 11:22:33:44:55:66

# Verify audio profile connected
[bluetooth]# info 11:22:33:44:55:66
```

After connecting a speaker, you need to configure the audio output:

```bash
# Install PulseAudio Bluetooth module
sudo apt install pulseaudio pulseaudio-module-bluetooth -y

# List audio sinks (output devices)
pactl list sinks short

# Set the Bluetooth speaker as default output
pactl set-default-sink bluez_sink.11_22_33_44_55_66.a2dp_sink
```

## Pairing a Smartphone

Phone pairing uses passkey comparison:

```bash
bluetoothctl

[bluetooth]# agent on
[bluetooth]# scan on

# When phone appears
[bluetooth]# pair 77:88:99:AA:BB:CC

# Both devices show the same 6-digit number
# Confirm on your Ubuntu system:
[agent] Confirm passkey 456789 (yes/no): yes
# Also confirm on the phone

[bluetooth]# trust 77:88:99:AA:BB:CC
[bluetooth]# connect 77:88:99:AA:BB:CC
```

## Managing Paired Devices

```bash
# List all paired devices
bluetoothctl devices Paired

# List all discovered devices (includes unpaired)
bluetoothctl devices

# Get detailed info about a paired device
bluetoothctl info AA:BB:CC:DD:EE:FF

# Connect to an already-paired device
bluetoothctl connect AA:BB:CC:DD:EE:FF

# Disconnect without removing the pairing
bluetoothctl disconnect AA:BB:CC:DD:EE:FF

# Remove (unpair) a device - removes trust and pairing info
bluetoothctl remove AA:BB:CC:DD:EE:FF

# Remove trust (device stays paired but won't auto-connect)
bluetoothctl untrust AA:BB:CC:DD:EE:FF

# Block a device (won't be able to connect)
bluetoothctl block AA:BB:CC:DD:EE:FF

# Unblock
bluetoothctl unblock AA:BB:CC:DD:EE:FF
```

## Auto-Connect on Boot

Trusted devices should auto-connect when they come within range. To enable this:

```bash
# In bluetoothctl, trust the device (already done during pairing above)
bluetoothctl trust AA:BB:CC:DD:EE:FF

# Make the adapter automatically power on at boot
sudo sed -i 's/#AutoEnable=false/AutoEnable=true/' /etc/bluetooth/main.conf
sudo systemctl restart bluetooth

# Verify AutoEnable is set
grep AutoEnable /etc/bluetooth/main.conf
```

## Troubleshooting Pairing Issues

```bash
# Pairing fails - check for agent conflicts
# Only one agent should be active; restart bluetoothctl if in doubt
sudo systemctl restart bluetooth
bluetoothctl power on

# "Connection refused" after pairing
# The device may need to be in connection mode (not just paired mode)
# Check device documentation for how to put it in connection mode

# PIN entry not working
# Make sure you're using the agent: 'agent on' and 'default-agent'
# in bluetoothctl before attempting to pair

# Device paired but won't reconnect
bluetoothctl info AA:BB:CC:DD:EE:FF
# Verify "Trusted: yes" is shown
# If not: bluetoothctl trust AA:BB:CC:DD:EE:FF

# Clear all pairings and start fresh (use with caution)
# This removes ALL paired devices
for device in $(bluetoothctl devices | grep Device | cut -d' ' -f2); do
    bluetoothctl remove "$device"
done

# Check logs for pairing errors
journalctl -u bluetooth -f
```

Once devices are paired and trusted, they auto-connect when in range and the Bluetooth adapter is powered on. The `bluetoothctl` tool gives you full control without needing any graphical interface.
