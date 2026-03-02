# How to Set Up Bluetooth on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Bluetooth, Server, BlueZ, Hardware

Description: Learn how to set up and configure Bluetooth on Ubuntu Server, including installing BlueZ, enabling the service, and managing Bluetooth devices from the command line.

---

Bluetooth on Ubuntu Server might seem unusual - servers typically don't need wireless peripherals. But there are legitimate use cases: Bluetooth-connected sensors in IoT deployments, barcode scanners, point-of-sale hardware, serial connections to embedded devices, and Bluetooth audio for monitoring stations. This guide covers the full setup from scratch.

## Installing Bluetooth Support

Ubuntu Server doesn't install Bluetooth tools by default:

```bash
# Update package list
sudo apt update

# Install BlueZ (the Linux Bluetooth protocol stack) and utilities
sudo apt install bluetooth bluez bluez-tools -y

# Install additional utilities for device management
sudo apt install rfkill -y

# Verify the BlueZ version installed
bluetoothctl --version
```

## Checking Bluetooth Hardware

```bash
# Check if a Bluetooth adapter is present
lsusb | grep -i bluetooth
lspci | grep -i bluetooth

# Check if the Bluetooth adapter is recognized by the kernel
hciconfig -a

# Or use the newer approach
bluetoothctl show

# Check kernel modules for Bluetooth
lsmod | grep bluetooth

# View adapter details
hciconfig hci0 version
```

If `hciconfig` shows nothing, either no adapter is present, or the driver isn't loaded:

```bash
# Check for Bluetooth in kernel messages
dmesg | grep -i bluetooth

# For USB Bluetooth adapters, check if the module loaded
lsmod | grep btusb

# Manually load the USB Bluetooth module
sudo modprobe btusb
```

## Starting the Bluetooth Service

```bash
# Start the BlueZ daemon
sudo systemctl start bluetooth

# Enable it to start at boot
sudo systemctl enable bluetooth

# Check service status
sudo systemctl status bluetooth

# Detailed status output
journalctl -u bluetooth -n 50
```

## Basic Bluetooth Operations with bluetoothctl

`bluetoothctl` is the primary command-line tool for Bluetooth management:

```bash
# Start the interactive bluetoothctl shell
bluetoothctl

# Inside bluetoothctl:
# Show adapter information
[bluetooth]# show

# Power on the Bluetooth adapter
[bluetooth]# power on

# Enable agent for PIN/passkey handling
[bluetooth]# agent on
[bluetooth]# default-agent

# Make the adapter discoverable (visible to other devices)
[bluetooth]# discoverable on

# Set discoverable timeout (seconds, 0 = never timeout)
[bluetooth]# discoverable-timeout 120

# Make the adapter pairable
[bluetooth]# pairable on

# Exit the interactive shell
[bluetooth]# quit
```

## Non-Interactive Bluetooth Commands

For scripting and automation, bluetoothctl accepts commands directly:

```bash
# Power on the adapter
bluetoothctl power on

# Show adapter status
bluetoothctl show

# List paired devices
bluetoothctl devices

# List only paired devices
bluetoothctl devices Paired

# Get info about a specific device
bluetoothctl info AA:BB:CC:DD:EE:FF
```

## Scanning for Devices

```bash
# Start scanning (this is usually done interactively)
bluetoothctl scan on

# In a separate terminal, list discovered devices
bluetoothctl devices

# Scan in a timeout loop (run scan for 15 seconds, then list results)
timeout 15 bluetoothctl scan on &
sleep 16
bluetoothctl devices
```

For scripted scanning:

```bash
#!/bin/bash
# bt-scan.sh - Scan for Bluetooth devices for 30 seconds

echo "Starting Bluetooth scan..."

# Power on and start scanning
bluetoothctl power on
bluetoothctl scan on &
SCAN_PID=$!

# Wait for devices to be discovered
sleep 30

# Stop scanning
kill $SCAN_PID 2>/dev/null
bluetoothctl scan off

# List discovered devices
echo "Discovered devices:"
bluetoothctl devices
```

## Checking the hci Interface

The `hci` (Host Controller Interface) is the Bluetooth adapter's low-level interface:

```bash
# Show all HCI devices and their status
hciconfig -a

# Show just hci0
hciconfig hci0

# Bring the interface up
sudo hciconfig hci0 up

# Check connection statistics
hciconfig hci0 stats

# Reset the adapter if it's in a bad state
sudo hciconfig hci0 reset
```

## Configuring Bluetooth via /etc/bluetooth/main.conf

The main BlueZ configuration file controls adapter behavior:

```bash
# View and edit the configuration
sudo nano /etc/bluetooth/main.conf
```

Key settings to configure:

```ini
# /etc/bluetooth/main.conf

[Policy]
# Automatically power on adapters when BlueZ starts
AutoEnable=true

[General]
# Name announced to other devices
Name = UbuntuServer

# Default adapter class (0x000000 = uncategorized)
Class = 0x000100

# How long to remain discoverable (0 = always, value in seconds)
DiscoverableTimeout = 0

# How long to remain pairable (0 = always)
PairableTimeout = 0

# Enable LE (Bluetooth Low Energy) support
ControllerMode = dual

# Disable BNEP (Network) profile if not needed
#DisabledPlugins = network
```

After editing:

```bash
# Restart BlueZ to apply changes
sudo systemctl restart bluetooth

# Verify the adapter name changed
bluetoothctl show | grep Name
```

## Bluetooth Low Energy (BLE) Operations

For IoT sensor deployments, BLE is commonly used:

```bash
# Install additional BLE tools
sudo apt install bluez-tools python3-gattlib -y

# Scan specifically for BLE devices
sudo hcitool lescan

# Or with bluetoothctl
bluetoothctl scan le

# Get BLE GATT characteristics from a device
gatttool -b AA:BB:CC:DD:EE:FF --primary
```

For reading data from BLE sensors programmatically:

```python
# ble-reader.py - Read data from a BLE sensor
import subprocess
import re

def scan_ble_devices(duration=10):
    """Scan for BLE devices and return found devices."""
    result = subprocess.run(
        ['timeout', str(duration), 'hcitool', 'lescan'],
        capture_output=True,
        text=True
    )
    devices = []
    for line in result.stdout.splitlines():
        # Parse "AA:BB:CC:DD:EE:FF DeviceName" format
        match = re.match(r'([0-9A-F:]{17})\s+(.*)', line)
        if match:
            devices.append({
                'address': match.group(1),
                'name': match.group(2).strip()
            })
    return devices

if __name__ == '__main__':
    print("Scanning for BLE devices...")
    devices = scan_ble_devices(10)
    for device in devices:
        print(f"Found: {device['address']} - {device['name']}")
```

## Troubleshooting Common Issues

```bash
# Adapter not found
# Check for rfkill blocking
rfkill list all
sudo rfkill unblock bluetooth

# BlueZ service fails to start
# Check for conflicting processes
sudo systemctl status bluetooth
journalctl -u bluetooth -n 100

# Adapter keeps disconnecting
# Disable USB autosuspend for Bluetooth adapters
echo 'ACTION=="add", SUBSYSTEM=="usb", ATTR{idVendor}=="0a12", ATTR{power/autosuspend}="-1"' | \
    sudo tee /etc/udev/rules.d/50-bluetooth-usb.rules
# Replace 0a12 with your Bluetooth adapter's vendor ID from lsusb

# Cannot see the adapter after suspend/resume
# Reset the HCI device
sudo hciconfig hci0 reset
sudo systemctl restart bluetooth

# Check dmesg for USB errors
dmesg | grep -E "bluetooth|hci|btusb" | tail -30
```

## Serial Profile for Embedded Devices

Bluetooth Serial Port Profile (SPP) allows connecting to serial devices:

```bash
# Install rfcomm for serial connections
sudo apt install bluez -y  # rfcomm included in bluez

# Check rfcomm devices
ls /dev/rfcomm* 2>/dev/null

# Bind rfcomm to a paired device (after pairing)
sudo rfcomm bind 0 AA:BB:CC:DD:EE:FF 1
# Creates /dev/rfcomm0 as a serial device

# Use the serial connection
sudo screen /dev/rfcomm0 9600

# Or read with standard tools
cat /dev/rfcomm0 &
echo "AT" > /dev/rfcomm0
```

Bluetooth on Ubuntu Server provides the foundation for building Bluetooth-enabled server applications. The BlueZ stack is mature and supports a wide range of profiles, from simple serial connections to full audio and HID device support.
