# How to Configure Device Cgroup Rules in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Cgroups, Device, Security, Linux, Container

Description: A detailed guide to configuring device cgroup rules in Podman for fine-grained control over which devices containers can access, including practical examples for various device types.

---

> Device cgroup rules give you surgical precision over hardware access in containers, letting you grant exactly the permissions needed without opening the floodgates of privileged mode.

Linux cgroups (control groups) provide a mechanism to limit and control the resources available to processes. The device cgroup controller specifically manages which device files a process can create, read, or write. In Podman, the `--device-cgroup-rule` flag lets you define rules that permit containers to access classes of devices by their major and minor numbers. This is more flexible than the `--device` flag because it can allow access to devices that do not yet exist (useful for hot-plugging) and can cover entire categories of devices with a single rule. This guide explains how device cgroup rules work and how to use them effectively.

---

## Understanding Linux Device Numbers

Every device file in Linux has two numbers: a major number and a minor number. The major number identifies the driver, while the minor number identifies the specific device managed by that driver.

```bash
# View major and minor numbers of device files

ls -la /dev/sda /dev/ttyUSB0 /dev/video0 /dev/null 2>/dev/null
# Example output:
# brw-rw---- 1 root disk      8,   0 Mar 18 08:00 /dev/sda       (block, major 8, minor 0)
# crw-rw---- 1 root dialout 188,   0 Mar 18 08:00 /dev/ttyUSB0   (char, major 188, minor 0)
# crw-rw----+ 1 root video   81,   0 Mar 18 08:00 /dev/video0    (char, major 81, minor 0)
# crw-rw-rw- 1 root root     1,   3 Mar 18 08:00 /dev/null       (char, major 1, minor 3)

# Find the major number for a specific device type
cat /proc/devices
# This lists all registered character and block device major numbers

# Common major numbers:
# Character devices:
#   1   - mem (null, zero, random)
#   4   - tty (serial terminals)
#   5   - tty (console, ptmx)
#  81   - video4linux (cameras)
# 116   - ALSA sound
# 166   - ttyACM (USB CDC ACM)
# 188   - ttyUSB (USB serial)
# 189   - USB device nodes (/dev/bus/usb; check /proc/devices)
# 195   - nvidia (GPU)
# 226   - DRI (GPU render nodes)
#
# Block devices:
#   8   - sd (SCSI/SATA/USB storage)
```

## Device Cgroup Rule Syntax

The `--device-cgroup-rule` flag uses the following syntax:

```text
--device-cgroup-rule='TYPE MAJOR:MINOR ACCESS'
```

Where:
- **TYPE**: `c` for character devices, `b` for block devices, `a` for all devices
- **MAJOR**: The major device number (or `*` for any)
- **MINOR**: The minor device number (or `*` for any)
- **ACCESS**: A combination of `r` (read), `w` (write), `m` (mknod/create)

```bash
# Examples of device cgroup rules:

# Allow read/write access to all USB serial devices (ttyUSB*)
podman run --rm -it \
  --device-cgroup-rule='c 188:* rwm' \
  fedora:latest bash

# Allow access to a specific video device (video0 = 81:0)
podman run --rm -it \
  --device-cgroup-rule='c 81:0 rwm' \
  fedora:latest bash

# Allow access to all video devices (video*)
podman run --rm -it \
  --device-cgroup-rule='c 81:* rwm' \
  fedora:latest bash

# Allow read-only access to all SCSI block devices
podman run --rm -it \
  --device-cgroup-rule='b 8:* r' \
  fedora:latest bash
```

## Why Use Cgroup Rules Instead of --device

The `--device` flag maps a specific device file into the container at startup. Device cgroup rules are more flexible:

1. **Hot-plug support** - The device does not need to exist when the container starts
2. **Class-based access** - Grant access to all devices of a type, not just one
3. **Future devices** - New devices that appear after the container starts are automatically accessible
4. **Finer control** - Separate read, write, and mknod permissions

```bash
# Problem: --device requires the device to exist at container start
# If you plug in a USB device after starting, it will not be accessible

# Solution: Use cgroup rules + volume mount for dynamic device access
podman run --rm -it \
  --device-cgroup-rule='c 188:* rwm' \
  -v /dev:/dev \
  fedora:latest \
  bash -c "echo 'Plug in a USB serial device now...' && \
           sleep 10 && \
           ls -la /dev/ttyUSB* 2>/dev/null || echo 'No USB serial devices found'"
```

## Practical Examples

### USB Hot-Plug Support

```bash
# Allow all USB serial devices to be accessed dynamically
# Major 166 = ttyACM, Major 188 = ttyUSB
podman run --rm -it \
  --device-cgroup-rule='c 166:* rwm' \
  --device-cgroup-rule='c 188:* rwm' \
  -v /dev:/dev \
  fedora:latest \
  bash

# Inside the container, USB devices that are plugged in
# after the container starts will be automatically accessible:
# ls -la /dev/ttyUSB* /dev/ttyACM*
```

### Camera and Video Devices

```bash
# Allow access to all V4L2 video devices
podman run --rm -it \
  --device-cgroup-rule='c 81:* rwm' \
  -v /dev:/dev \
  fedora:latest \
  bash -c "dnf install -y v4l-utils && v4l2-ctl --list-devices"
```

### Audio Devices

```bash
# Allow access to all ALSA sound devices (major 116)
podman run --rm -it \
  --device-cgroup-rule='c 116:* rwm' \
  -v /dev/snd:/dev/snd \
  fedora:latest \
  bash -c "dnf install -y alsa-utils && aplay -l"
```

### GPU Devices

```bash
# NVIDIA GPU devices (major 195) and DRI devices (major 226)
podman run --rm -it \
  --device-cgroup-rule='c 195:* rwm' \
  --device-cgroup-rule='c 226:* rwm' \
  -v /dev:/dev \
  nvidia/cuda:12.3.0-base-ubuntu22.04 \
  nvidia-smi

# AMD GPU: DRI (226) + KFD
# Find the KFD major number:
ls -la /dev/kfd
# Then use it in the cgroup rule
KFD_MAJOR=$(stat -c '%t' /dev/kfd)
KFD_MAJOR=$((16#$KFD_MAJOR))
podman run --rm -it \
  --device-cgroup-rule='c 226:* rwm' \
  --device-cgroup-rule="c ${KFD_MAJOR}:* rwm" \
  -v /dev:/dev \
  rocm/dev-ubuntu-22.04:6.0 \
  rocm-smi
```

### Input Devices (Keyboard, Mouse, Joystick)

```bash
# Allow access to input devices (major 13) and event devices
podman run --rm -it \
  --device-cgroup-rule='c 13:* rwm' \
  -v /dev/input:/dev/input \
  fedora:latest \
  bash -c "dnf install -y evtest && ls -la /dev/input/"

# HID raw devices (major 238 or 239, varies by system)
# Check your system:
ls -la /dev/hidraw*
# Then create a matching rule
```

### Block Device Access

```bash
# Allow read-only access to all SCSI disks (useful for backup containers)
podman run --rm -it \
  --device-cgroup-rule='b 8:* r' \
  -v /dev:/dev \
  fedora:latest \
  bash -c "fdisk -l /dev/sda 2>/dev/null || echo 'No SCSI disk found'"

# Allow access to device-mapper devices (major 253 on most systems)
podman run --rm -it \
  --device-cgroup-rule='b 253:* rwm' \
  -v /dev:/dev \
  fedora:latest bash
```

## Combining Multiple Rules

You can specify multiple `--device-cgroup-rule` flags to create a container with access to several device classes:

```bash
# IoT development container with access to serial, video, and GPIO
podman run --rm -it \
  --device-cgroup-rule='c 81:* rwm' \
  --device-cgroup-rule='c 166:* rwm' \
  --device-cgroup-rule='c 188:* rwm' \
  --device-cgroup-rule='c 254:* rwm' \
  -v /dev:/dev \
  fedora:latest \
  bash -c "echo 'IoT dev container with serial, video, and GPIO access' && \
           ls /dev/ttyUSB* /dev/ttyACM* /dev/video* 2>/dev/null"
```

## Finding the Right Major Number

```bash
# Method 1: Check the device file directly
stat -c 'Major: %t, Minor: %T (hex)' /dev/ttyUSB0
ls -la /dev/ttyUSB0   # Major number is shown in the output

# Method 2: Check /proc/devices for all registered major numbers
cat /proc/devices

# Method 3: Use udevadm for detailed device information
udevadm info --query=all --name=/dev/ttyUSB0

# Method 4: Search for specific device type
grep -r 'ttyUSB\|ttyACM' /proc/devices 2>/dev/null
```

## Security Best Practices

```bash
# GOOD: Use specific major numbers for the devices you need
podman run --rm -it \
  --device-cgroup-rule='c 188:* rwm' \
  fedora:latest bash

# AVOID: Wildcard major and minor for character devices
# podman run --rm -it --device-cgroup-rule='c *:* rwm' fedora:latest bash

# AVOID: Type 'a' with wildcard major and minor allows all devices
# podman run --rm -it --device-cgroup-rule='a *:* rwm' fedora:latest bash

# BETTER: Restrict to specific minor numbers if you know them
podman run --rm -it \
  --device-cgroup-rule='c 188:0 rwm' \
  fedora:latest bash

# Use read-only access when write is not needed
podman run --rm -it \
  --device-cgroup-rule='b 8:* r' \
  fedora:latest bash

# Avoid 'm' (mknod) permission unless the container needs to create device nodes
podman run --rm -it \
  --device-cgroup-rule='c 188:* rw' \
  fedora:latest bash
```

## Cgroup Rules in Quadlet

For persistent configurations, you can use Quadlet files (systemd integration for Podman):

```bash
# Create a Quadlet container file
mkdir -p ~/.config/containers/systemd/

cat > ~/.config/containers/systemd/iot-dev.container << 'EOF'
[Container]
Image=fedora:latest
# Device cgroup rules for IoT development
AddDevice=/dev/ttyUSB0
PodmanArgs=--device-cgroup-rule="c 188:* rwm"
PodmanArgs=--device-cgroup-rule="c 166:* rwm"
PodmanArgs=--device-cgroup-rule="c 81:* rwm"
Volume=/dev:/dev

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

# Reload systemd to pick up the new unit
systemctl --user daemon-reload

# Start the container
systemctl --user start iot-dev
```

## Inspecting Current Cgroup Device Rules

```bash
# Find the cgroup path for a running container
CONTAINER_ID=$(podman run -d --device-cgroup-rule='c 188:* rwm' fedora:latest sleep 300)

# For cgroups v2, inspect the container's device rules
podman inspect $CONTAINER_ID --format '{{.HostConfig.DeviceCgroupRules}}'

# Check the actual cgroup configuration (cgroups v2)
# The device controller in cgroups v2 uses eBPF programs
# You can inspect the container's spec:
podman inspect $CONTAINER_ID | grep -A 10 "DeviceCgroupRules"

# Clean up
podman stop $CONTAINER_ID
```

## Troubleshooting

```bash
# Device accessible on host but not in container
# Verify the major number matches your cgroup rule
ls -la /dev/your_device    # Check major:minor
# Ensure the cgroup rule covers this major:minor combination

# Permission denied despite cgroup rule
# Cgroup rules allow the operation at the cgroup level, but
# the device file must also exist in the container's mount namespace
# Solution: Mount /dev or the specific device file
podman run --rm -it \
  --device-cgroup-rule='c 188:* rwm' \
  -v /dev/ttyUSB0:/dev/ttyUSB0 \
  fedora:latest \
  ls -la /dev/ttyUSB0

# Cgroup rule not taking effect
# Check if you are using cgroups v1 or v2
mount | grep cgroup
# Some distributions may need different configuration for v1 vs v2

# SELinux blocking device access
sudo ausearch -m avc -ts recent | grep container
sudo setsebool -P container_use_devices on
```

## Conclusion

Device cgroup rules in Podman provide a powerful and flexible way to control hardware access in containers. Unlike the `--device` flag, cgroup rules work at the device class level using major and minor numbers, support hot-plugging, and allow you to separate read, write, and mknod permissions. By understanding Linux device numbering and combining cgroup rules with appropriate volume mounts, you can give containers exactly the hardware access they need while maintaining strong isolation. Use specific major numbers rather than wildcards, prefer read-only access when possible, and avoid the mknod permission unless the container truly needs to create device nodes.
