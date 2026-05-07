# How to Pass USB Devices to Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, USB, Container, Device, Linux, IoT

Description: Learn how to pass USB devices into Podman containers for IoT development, serial communication, hardware testing, and embedded device programming.

---

> Passing USB devices to Podman containers bridges the gap between containerized software and physical hardware, enabling everything from IoT development to hardware testing in isolated environments.

Containers are typically thought of as software-only environments, but many real-world applications need access to USB hardware. Whether you are developing firmware for microcontrollers, communicating with serial devices, working with USB cameras, or testing hardware interfaces, Podman can map USB devices directly into containers. This guide covers the methods for USB device passthrough, handling permissions, and practical examples for common use cases.

---

## Understanding USB Devices in Linux

Before passing USB devices to containers, it helps to understand how Linux represents them.

```bash
# List all connected USB devices

lsusb
# Example output:
# Bus 001 Device 003: ID 2341:0043 Arduino SA Mega 2560 R3
# Bus 001 Device 004: ID 0403:6001 Future Technology Devices International, Ltd FT232 USB-Serial
# Bus 002 Device 002: ID 046d:c52b Logitech, Inc. Unifying Receiver

# Get detailed information about a specific device
lsusb -v -d 2341:0043 2>/dev/null | head -20

# List USB serial devices
ls -la /dev/ttyUSB* /dev/ttyACM* 2>/dev/null
# Example output:
# crw-rw---- 1 root dialout 166, 0 Mar 18 08:00 /dev/ttyUSB0
# crw-rw---- 1 root dialout 166, 0 Mar 18 08:00 /dev/ttyACM0

# Check device details with udevadm
udevadm info --query=all --name=/dev/ttyUSB0
```

USB devices in Linux appear as device files, typically under `/dev/`. The key types are:

- `/dev/ttyUSB*` - USB serial adapters (FTDI, CH340, CP210x)
- `/dev/ttyACM*` - USB ACM devices (Arduino, modems)
- `/dev/bus/usb/BBB/DDD` - Raw USB device access
- `/dev/hidraw*` - HID (Human Interface Device) raw access
- `/dev/usb/hiddev*` - HID devices via hiddev interface

## Passing USB Devices with --device

The `--device` flag is the primary way to pass USB devices into Podman containers.

### Serial Devices

```bash
# Pass a USB serial device (e.g., FTDI adapter)
podman run --rm -it \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  fedora:latest \
  bash -c "ls -la /dev/ttyUSB0"

# Pass an Arduino device
podman run --rm -it \
  --device /dev/ttyACM0:/dev/ttyACM0 \
  fedora:latest \
  bash -c "ls -la /dev/ttyACM0"

# Pass multiple serial devices
podman run --rm -it \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  --device /dev/ttyUSB1:/dev/ttyUSB1 \
  fedora:latest \
  bash -c "ls -la /dev/ttyUSB*"
```

### Raw USB Device Access

For applications that need raw USB access (like libusb-based tools):

```bash
# Pass a specific USB device by bus/device number
# First, find the bus and device number with lsusb
lsusb
# Bus 001 Device 003: ID 2341:0043 Arduino SA Mega 2560 R3

# Pass the raw USB device
podman run --rm -it \
  --device /dev/bus/usb/001/003:/dev/bus/usb/001/003 \
  fedora:latest \
  bash -c "ls -la /dev/bus/usb/001/003"

# Pass the entire USB bus for broader access
# Major number 189 = USB bus devices
podman run --rm -it \
  --device-cgroup-rule='c 189:* rwm' \
  -v /dev/bus/usb:/dev/bus/usb:rw,dev \
  fedora:latest \
  bash -c "ls -la /dev/bus/usb/"
```

## Handling Permissions

USB device permissions are often the biggest challenge. The device files on the host have specific ownership and permissions that must be handled correctly.

### Adding Users to Device Groups

```bash
# Most serial devices belong to the 'dialout' group
sudo usermod -aG dialout $USER

# HID devices often belong to 'plugdev' or need udev rules
sudo usermod -aG plugdev $USER

# Log out and back in for changes to take effect
```

### Running with Group Permissions

```bash
# Pass the device with the correct group ID
# First, find the group ID of the device
stat -c '%g' /dev/ttyUSB0
# Example output: 20 (dialout group)

# Run the container with the matching group
podman run --rm -it \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  --group-add keep-groups \
  fedora:latest \
  bash -c "ls -la /dev/ttyUSB0"
```

### Creating udev Rules for Consistent Device Names

USB devices can change their `/dev/ttyUSB*` number when reconnected. Use udev rules for stable names:

```bash
# Find device attributes for a udev rule
udevadm info --attribute-walk --name=/dev/ttyUSB0 | grep -E 'idVendor|idProduct|serial'

# Create a udev rule for a consistent device name
sudo tee /etc/udev/rules.d/99-usb-serial.rules << 'EOF'
# Arduino Mega - always maps to /dev/arduino
SUBSYSTEM=="tty", ATTRS{idVendor}=="2341", ATTRS{idProduct}=="0043", SYMLINK+="arduino", MODE="0666"

# FTDI adapter - always maps to /dev/ftdi_adapter
SUBSYSTEM=="tty", ATTRS{idVendor}=="0403", ATTRS{idProduct}=="6001", SYMLINK+="ftdi_adapter", MODE="0666"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Now use the stable symlink in containers
podman run --rm -it \
  --device /dev/arduino:/dev/arduino \
  fedora:latest \
  bash -c "ls -la /dev/arduino"
```

## Practical Examples

### Arduino Development

```bash
# Create a Containerfile for Arduino CLI development
mkdir -p /tmp/usb-demo
cat > /tmp/usb-demo/Containerfile.arduino << 'EOF'
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-serial \
    && rm -rf /var/lib/apt/lists/*

# Install Arduino CLI
RUN curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh -s -- --install-dir /usr/local/bin

# Install Arduino AVR core
RUN arduino-cli core update-index && \
    arduino-cli core install arduino:avr

WORKDIR /workspace
CMD ["bash"]
EOF

# Build the Arduino development image
podman build -t arduino-dev:latest -f /tmp/usb-demo/Containerfile.arduino /tmp/usb-demo/

# Run with Arduino device access
podman run --rm -it \
  --device /dev/ttyACM0:/dev/ttyACM0 \
  -v /home/$USER/arduino-projects:/workspace:Z \
  arduino-dev:latest \
  bash

# Inside the container, you can compile and upload sketches:
# arduino-cli compile --fqbn arduino:avr:mega /workspace/MySketch
# arduino-cli upload -p /dev/ttyACM0 --fqbn arduino:avr:mega /workspace/MySketch
```

### Serial Communication with Python

```bash
# Create a Python serial communication script
cat > /tmp/usb-demo/serial_monitor.py << 'EOF'
import serial
import sys
import time

# Configure the serial port
port = sys.argv[1] if len(sys.argv) > 1 else "/dev/ttyUSB0"
baud_rate = int(sys.argv[2]) if len(sys.argv) > 2 else 9600

print(f"Opening {port} at {baud_rate} baud...")

try:
    ser = serial.Serial(port, baud_rate, timeout=1)
    print(f"Connected to {ser.name}")

    # Read data from the serial port
    while True:
        if ser.in_waiting > 0:
            data = ser.readline().decode('utf-8', errors='replace').strip()
            timestamp = time.strftime('%H:%M:%S')
            print(f"[{timestamp}] {data}")
        time.sleep(0.01)

except serial.SerialException as e:
    print(f"Error: {e}")
except KeyboardInterrupt:
    print("\nExiting...")
finally:
    if 'ser' in locals() and ser.is_open:
        ser.close()
EOF

# Run the serial monitor in a container
podman run --rm -it \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  -v /tmp/usb-demo:/workspace:Z \
  python:3.11-slim \
  bash -c "pip install pyserial && python3 /workspace/serial_monitor.py /dev/ttyUSB0 9600"
```

### USB Storage Devices

```bash
# Pass a USB storage device (be careful with write access)
# First, identify the device
lsblk
# Example: sdb, sdb1

# Pass the block device (read-only for safety)
podman run --rm -it \
  --device /dev/sdb:/dev/sdb:r \
  fedora:latest \
  bash -c "fdisk -l /dev/sdb"

# Mount and access the USB drive inside the container
# Note: requires SYS_ADMIN capability for mounting
podman run --rm -it \
  --device /dev/sdb1:/dev/sdb1 \
  --cap-add SYS_ADMIN \
  fedora:latest \
  bash -c "mkdir -p /mnt/usb && mount -o ro /dev/sdb1 /mnt/usb && ls /mnt/usb"
```

## Hot-Plugging USB Devices

One challenge with USB passthrough is that the device must exist when the container starts. For hot-pluggable scenarios:

```bash
# Option 1: Pass the entire USB bus for dynamic device detection
podman run --rm -it \
  -v /dev/bus/usb:/dev/bus/usb:rw,rslave,dev \
  --privileged \
  fedora:latest \
  bash -c "while true; do find /dev/bus/usb -type c; sleep 5; done"

# Option 2: Use device cgroup rules to allow a class of devices
podman run --rm -it \
  --device-cgroup-rule='c 166:* rwm' \
  --device-cgroup-rule='c 188:* rwm' \
  -v /dev:/dev:rw,rslave,dev \
  fedora:latest \
  bash

# Major number 166 = ttyACM devices
# Major number 188 = ttyUSB devices
```

## Security Considerations

```bash
# Avoid --privileged when possible; use specific --device flags instead
# GOOD: Specific device access
podman run --rm -it \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  fedora:latest bash

# AVOID: Privileged mode (gives access to ALL devices)
# podman run --rm -it --privileged fedora:latest bash

# Use read-only device access when writing is not needed
podman run --rm -it \
  --device /dev/ttyUSB0:/dev/ttyUSB0:r \
  fedora:latest bash

# Limit device access with cgroup rules for better control
podman run --rm -it \
  --device-cgroup-rule='c 166:0 rw' \
  fedora:latest bash
```

## Troubleshooting

```bash
# Device not found in container
# Verify the device exists on the host
ls -la /dev/ttyUSB0

# Permission denied
# Check device permissions
stat /dev/ttyUSB0
# Try running with --group-add keep-groups
podman run --rm -it \
  --device /dev/ttyUSB0:/dev/ttyUSB0 \
  --group-add keep-groups \
  fedora:latest \
  bash -c "ls -la /dev/ttyUSB0"

# Device is busy
# Check if another process is using the device
fuser /dev/ttyUSB0
# or
lsof /dev/ttyUSB0

# Device disconnected - container cannot access new device path
# USB devices may get a different path when reconnected
# Use udev rules (described above) for stable device naming

# SELinux blocking device access (Fedora/RHEL)
sudo ausearch -m avc -ts recent | grep ttyUSB
sudo setsebool -P container_use_devices on
```

## Conclusion

Passing USB devices to Podman containers opens up a wide range of hardware-interaction possibilities within containerized environments. By using the `--device` flag with specific device paths, you maintain security while giving containers the hardware access they need. Combine this with udev rules for stable device naming, proper group permissions for rootless operation, and device cgroup rules for hot-plug scenarios. Whether you are building IoT applications, developing embedded firmware, or testing hardware interfaces, Podman provides the tools to bridge the container-hardware divide effectively.
