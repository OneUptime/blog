# How to Map Host Devices (USB, Serial) to Containers in Portainer (3)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, USB, SERIAL, Hardware, IoT, Device Mapping

Description: Configure Docker device mappings in Portainer to pass USB devices, serial ports, and other host hardware directly to containers for IoT, hardware control, and protocol conversion workloads.

---

Many IoT, industrial, and hardware projects require containers running on a Linux Docker Engine host to access physical devices - USB scanners, serial sensors, GPS receivers, HART multiplexers, and more. Docker's device mapping feature makes this possible, and Portainer makes it configurable through the stack editor.

## Device Mapping in Portainer Stacks

Use the `devices` key in your service definition:

```yaml
services:
  serial-reader:
    image: myapp/sensor-reader:1.2.3
    devices:
      # Map the host serial port to the same path in the container
      - /dev/ttyUSB0:/dev/ttyUSB0
      # Map a second serial port
      - /dev/ttyUSB1:/dev/ttyUSB1
      # Map a USB device
      - /dev/bus/usb/001/002:/dev/bus/usb/001/002
      # Map a GPS receiver
      - /dev/ttyACM0:/dev/ttyACM0
    restart: unless-stopped
```

## Finding Device Paths

Identify the correct device path on the host before mapping:

```bash
# Inspect candidate serial device nodes

ls -la /dev/tty*
ls -la /dev/ttyUSB*
ls -la /dev/ttyACM*

# More detailed USB device information
lsusb

# Check udev events when plugging in a device
udevadm monitor --property --udev | grep -A 5 "DEVNAME"

# Get device details
udevadm info --query=all --name=/dev/ttyUSB0
```

## Mapping Different Device Types

### USB Serial Devices (FTDI, CH340, etc.)

```yaml
devices:
  - /dev/ttyUSB0:/dev/ttyUSB0   # Generic USB serial
```

### Arduino and Microcontrollers

```yaml
devices:
  - /dev/ttyACM0:/dev/ttyACM0   # Arduino Mega, Uno, etc.
  - /dev/ttyACM1:/dev/ttyACM1   # Second Arduino
```

### USB Devices (raw access)

```yaml
devices:
  - /dev/bus/usb:/dev/bus/usb    # All USB devices (broad access)
```

Or for a specific device:

```bash
# Find the specific bus and device number
lsusb
# Bus 001 Device 003: ID 0403:6001 Future Technology Devices International, Ltd FT232 USB-Serial (UART) IC

devices:
  - /dev/bus/usb/001/003:/dev/bus/usb/001/003
```

### Video Capture and Webcams

```yaml
devices:
  - /dev/video0:/dev/video0   # First video device
```

## Persistent Device Names with udev Rules

Device names like `/dev/ttyUSB0` can change when devices are reconnected. Create udev rules for stable names, but note that unplugging and recreating a device can still require restarting the container so Docker remaps it:

```bash
# /etc/udev/rules.d/99-serial-devices.rules

# Rule for a specific USB serial device (by Vendor ID and Product ID)
# ATTRS{idVendor}=="0403" is FTDI, ATTRS{idProduct}=="6001" is FT232
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", \
  ATTRS{serial}=="A12345", SYMLINK+="sensor-gateway", GROUP="dialout", MODE="0660"
```

Now map the stable symlink:

```yaml
devices:
  - /dev/sensor-gateway:/dev/sensor-gateway
```

## Permissions for Device Access

Containers may need elevated permissions to access devices:

```yaml
services:
  device-app:
    devices:
      - /dev/ttyUSB0:/dev/ttyUSB0
    # Option 1: Add the device's group for serial port access
    group_add:
      - dialout
    # Option 2: Use privileged mode (less secure, broader access)
    # privileged: true
```

Add the device's group to your container to allow serial port access without full `privileged` mode. On many Linux distributions that is `dialout` for serial ports, but the group name or GID must match what owns the device on the host.

## Verify Device Access in Container

After deploying, verify the device is accessible:

```bash
# In the Portainer container console
ls -la /dev/ttyUSB0
# crw-rw---- 1 root dialout 188, 0 Mar 20 10:00 /dev/ttyUSB0

# Read from the device (for serial devices)
cat /dev/ttyUSB0   # May show raw bytes if the port is configured and the device is sending data
```

## Summary

On Linux Docker Engine hosts, device mapping in Portainer stacks gives containers access to physical hardware without needing privileged mode for most use cases. Use udev rules for stable device names, add the appropriate device group (often `dialout` for serial ports), and remember that reconnecting a device may still require restarting the container.
