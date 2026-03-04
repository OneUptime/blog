# How to Enable and Configure Bluetooth Hardware on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Bluetooth, Hardware, Wireless, Linux

Description: Enable and configure Bluetooth hardware on RHEL for connecting wireless peripherals such as keyboards, mice, headphones, and speakers.

---

RHEL supports Bluetooth through the BlueZ stack. This guide covers enabling the Bluetooth service, pairing devices, and troubleshooting common issues on RHEL workstations and laptops.

## Install Bluetooth Packages

```bash
# Install the Bluetooth stack and utilities
sudo dnf install -y bluez bluez-tools

# For audio devices (headphones, speakers), also install PipeWire Bluetooth support
sudo dnf install -y pipewire-codec-aptx
```

## Enable and Start the Bluetooth Service

```bash
# Enable Bluetooth at boot
sudo systemctl enable bluetooth

# Start the service
sudo systemctl start bluetooth

# Check the status
sudo systemctl status bluetooth
```

## Verify Bluetooth Hardware

```bash
# Check if the Bluetooth adapter is detected
hciconfig
# or
bluetoothctl show

# If the adapter is blocked by rfkill, unblock it
rfkill list bluetooth
sudo rfkill unblock bluetooth

# Verify it is unblocked
rfkill list bluetooth
```

## Pair a Device Using bluetoothctl

```bash
# Launch the interactive Bluetooth control tool
bluetoothctl

# Inside bluetoothctl, run these commands:
```

```bash
# Turn on the Bluetooth adapter
power on

# Enable the agent for pairing
agent on
default-agent

# Start scanning for nearby devices
scan on

# Wait for your device to appear, then note its MAC address
# Example: [NEW] Device AA:BB:CC:DD:EE:FF Wireless Mouse

# Stop scanning
scan off

# Pair with the device
pair AA:BB:CC:DD:EE:FF

# Trust the device for automatic reconnection
trust AA:BB:CC:DD:EE:FF

# Connect to the device
connect AA:BB:CC:DD:EE:FF

# Exit bluetoothctl
exit
```

## Pair a Device from the Command Line (Non-Interactive)

```bash
# Power on the adapter
bluetoothctl power on

# Scan for devices
bluetoothctl scan on &
sleep 10
bluetoothctl scan off

# Pair, trust, and connect
bluetoothctl pair AA:BB:CC:DD:EE:FF
bluetoothctl trust AA:BB:CC:DD:EE:FF
bluetoothctl connect AA:BB:CC:DD:EE:FF
```

## Configure Bluetooth Audio

For Bluetooth headphones and speakers:

```bash
# Verify PipeWire is handling Bluetooth audio
pactl list modules | grep bluetooth

# If the Bluetooth audio module is not loaded
# PipeWire should load it automatically when a device connects

# Check connected audio devices
pactl list sinks short

# Set the Bluetooth device as the default audio output
pactl set-default-sink bluez_output.AA_BB_CC_DD_EE_FF.1
```

## Auto-Connect on Boot

Trusted devices should reconnect automatically. If they do not:

```bash
# Edit the Bluetooth main configuration
sudo vi /etc/bluetooth/main.conf

# Ensure these settings are enabled:
[General]
AutoEnable=true

[Policy]
AutoEnable=true
```

```bash
# Restart the Bluetooth service
sudo systemctl restart bluetooth
```

## Troubleshooting

```bash
# Check Bluetooth service logs
journalctl -u bluetooth -f

# Check dmesg for hardware issues
dmesg | grep -i bluetooth

# Reset the Bluetooth adapter if it stops responding
sudo hciconfig hci0 reset

# Remove a paired device and start fresh
bluetoothctl remove AA:BB:CC:DD:EE:FF
```

With BlueZ and PipeWire, RHEL provides solid Bluetooth support for keyboards, mice, headphones, and other wireless peripherals.
