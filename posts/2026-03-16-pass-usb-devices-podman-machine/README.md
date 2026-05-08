# How to Pass USB Devices to a Podman Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps, USB Devices

Description: Learn how to pass USB devices from your host system through a Podman machine to containers for hardware access and device testing.

---

> Passing USB devices to a Podman machine enables containers to interact with physical hardware like serial devices, storage, and development boards.

Podman machines are virtual machines, which means USB devices attached to your host are not automatically available inside the machine or its containers. Passing USB devices through requires configuring both the VM layer and the container runtime. This guide walks you through the process on different platforms.

---

## Understanding the Device Path

USB devices on the host appear as device files. First, identify the device you want to pass through.

```bash
# List USB devices on macOS

system_profiler SPUSBDataType

# List USB devices on Linux
lsusb

# Find the device path on Linux
ls -la /dev/ttyUSB*
ls -la /dev/ttyACM*

# Get detailed device information on Linux
udevadm info -a -n /dev/ttyUSB0
```

## Passing Devices on Linux

On Linux, where Podman can run natively without a machine VM, device passthrough is straightforward:

```bash
# Pass a USB serial device to a container
podman run -it --device /dev/ttyUSB0 --rm alpine sh

# Pass a USB device with specific permissions
podman run -it --device /dev/ttyUSB0:/dev/ttyUSB0:rwm --rm alpine sh

# If access depends on your user's supplementary groups in rootless mode
podman run -it --device /dev/ttyUSB0 --group-add keep-groups --rm alpine sh

# Pass multiple devices
podman run -it \
    --device /dev/ttyUSB0 \
    --device /dev/ttyUSB1 \
    --rm alpine sh
```

## Device Passthrough with Podman Machine (QEMU)

When using a Podman machine with QEMU as the backend, USB passthrough requires additional configuration.

```bash
# First, identify the USB device vendor and product ID
# On macOS:
system_profiler SPUSBDataType | grep -A 5 "Product ID"

# On Linux:
lsusb
# Output example: Bus 001 Device 005: ID 1a86:7523 QinHeng Electronics CH340 serial converter
# Vendor ID: 1a86, Product ID: 7523
```

## Configuring QEMU USB Passthrough

For QEMU-based machines, use Podman's `--usb` machine option to add USB device passthrough. The USB device must be present and accessible to your user when the VM starts.

```bash
# Add USB passthrough to an existing machine
podman machine stop my-machine
podman machine set --usb vendor=1a86,product=7523 my-machine
podman machine start my-machine

# Or configure passthrough when creating a new QEMU-backed machine
podman machine init --provider qemu --usb vendor=1a86,product=7523 my-machine
```

## Checking Device Files in the Machine

Volume mounts are useful for host directories, but they do not replace USB passthrough for device nodes. After configuring passthrough, check that the device appears inside the machine.

```bash
# SSH into the machine and check available devices
podman machine ssh my-machine -- ls -la /dev/ttyUSB* 2>/dev/null
podman machine ssh my-machine -- ls -la /dev/ttyACM* 2>/dev/null
```

## Running Containers with Device Access

Once the device is available inside the Podman machine, pass it to containers:

```bash
# Pass a serial device to a container
podman run -it --device /dev/ttyUSB0 --rm python:3.12 bash

# Inside the container, install pyserial and access the device
# pip install pyserial
# python -c "import serial; s = serial.Serial('/dev/ttyUSB0', 9600); print(s.name)"
```

## Privileged Mode for Full Device Access

When you need access to all devices, use privileged mode:

```bash
# Run a container with full device access (use with caution)
podman run -it --privileged --rm alpine sh

# Inside the container, all host devices are available
ls /dev/

# This is a security trade-off - only use when necessary
```

On Podman Machine, privileged mode only exposes devices that already exist inside the VM. It does not pass a USB device from the host into the VM.

## Working with Arduino and Serial Devices

A common use case is accessing Arduino or other microcontroller boards:

```bash
# Find the Arduino device
podman machine ssh my-machine -- ls -la /dev/ttyACM*

# Run a container with Arduino CLI
podman run -it --device /dev/ttyACM0 --rm arduino/arduino-cli:latest sh

# Inside the container
# arduino-cli board list
# arduino-cli compile --fqbn arduino:avr:uno ./my-sketch
# arduino-cli upload -p /dev/ttyACM0 --fqbn arduino:avr:uno ./my-sketch
```

## Verifying Device Access Inside Containers

Confirm that the device is accessible from within the container:

```bash
# Check device availability
podman run -it --device /dev/ttyUSB0 --rm alpine sh -c "ls -la /dev/ttyUSB0"

# Test reading from a serial device
podman run -it --device /dev/ttyUSB0 --rm alpine sh -c "cat /dev/ttyUSB0"

# Check device permissions
podman run -it --device /dev/ttyUSB0 --rm alpine sh -c "stat /dev/ttyUSB0"
```

## Troubleshooting Device Passthrough

Common issues and their solutions:

```bash
# Issue: Permission denied when accessing device
# Solution: Add the device with explicit permissions
podman run -it --device /dev/ttyUSB0:/dev/ttyUSB0:rwm --rm alpine sh

# Issue: Device not visible inside the machine
# Solution: Check if the device is recognized by the VM
podman machine ssh my-machine -- dmesg | tail -20

# Issue: Device path changes after reconnection
# Solution: Prefer --usb vendor=...,product=... over bus=...,devnum=..., or use udev rules inside the VM to create a stable symlink after the device is passed through
podman machine ssh my-machine
echo 'SUBSYSTEM=="tty", ATTRS{idVendor}=="1a86", ATTRS{idProduct}=="7523", SYMLINK+="my-device"' | \
    sudo tee /etc/udev/rules.d/99-my-device.rules
sudo udevadm control --reload-rules
exit
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman run --device /dev/ttyUSB0 ...` | Pass a specific device |
| `podman run --device /dev/ttyUSB0:/dev/ttyUSB0:rwm ...` | Pass with permissions |
| `podman run --privileged ...` | Full device access |
| `podman machine ssh <name> -- ls /dev/` | Check devices in machine |

## Summary

Passing USB devices to Podman machines requires getting the device into the virtual machine first, then passing it to containers using the `--device` flag. On native Linux, this is straightforward. For Podman machines, use Podman's QEMU USB passthrough support when the machine is QEMU-backed and the provider is available on your platform. Always prefer specific device passthrough over privileged mode for better security.
