# How to Run a Container with Device Access in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Device, Hardware

Description: Learn how to grant Podman containers access to specific host devices like GPUs, USB devices, and serial ports without running in privileged mode.

---

> The --device flag gives containers targeted access to specific hardware without the security risk of full privileged mode.

Containers are isolated from host hardware by default. This is good for security, but some workloads need direct access to specific devices: GPU computing, USB peripherals, serial communication, or hardware monitoring. Podman's `--device` flag provides granular device access, letting you expose only the devices a container needs.

---

## Basic Device Access

Use the `--device` flag to expose a host device to the container:

```bash
# Grant access to a specific device

podman run --rm --device /dev/fuse alpine ls -la /dev/fuse

# The device appears inside the container
podman run --rm --device /dev/null alpine sh -c "
  echo 'Device /dev/null accessible:'
  ls -la /dev/null
  echo 'test' > /dev/null && echo 'Write to /dev/null works'
"
```

## Device Access with Permissions

Control read, write, and mknod permissions on the device:

```bash
# Read-only access to a device
podman run --rm --device /dev/sda:/dev/sda:r alpine sh -c "
  ls -la /dev/sda
  echo 'Read-only access granted'
"

# Read-write access (default)
podman run --rm --device /dev/fuse:/dev/fuse:rw alpine ls -la /dev/fuse

# Read, write, and mknod
podman run --rm --device /dev/fuse:/dev/fuse:rwm alpine ls -la /dev/fuse
```

Permission flags:
- `r`: Read access
- `w`: Write access
- `m`: Mknod (create device files)

## Mapping Device to a Different Path

You can map a host device to a different path inside the container:

```bash
# Map host device to a different container path
podman run --rm \
  --device /dev/null:/dev/my-null \
  alpine sh -c "
    ls -la /dev/my-null
    echo 'Mapped /dev/null to /dev/my-null'
  "
```

## GPU Access

For GPU workloads like machine learning:

```bash
# NVIDIA GPU access (requires NVIDIA Container Toolkit with a generated CDI spec)
# podman run --rm --security-opt=label=disable --device nvidia.com/gpu=all ubuntu nvidia-smi -L

# Specific GPU device access
podman run --rm \
  --device /dev/dri:/dev/dri \
  alpine sh -c "
    ls -la /dev/dri/ 2>/dev/null || echo 'No DRI devices on this host'
  "

# Intel GPU access
podman run --rm \
  --device /dev/dri/renderD128 \
  alpine sh -c "
    ls -la /dev/dri/renderD128 2>/dev/null || echo 'No render device on this host'
  "
```

## USB Device Access

Access USB devices from within a container:

```bash
# Access all USB devices
podman run --rm \
  --device /dev/bus/usb \
  alpine sh -c "
    ls -la /dev/bus/usb/ 2>/dev/null || echo 'No USB bus found'
  "

# Access a specific USB device
# First find the device path
# lsusb  # lists USB devices on the host

# Then grant access to the specific device
podman run --rm \
  --device /dev/bus/usb/001/002 \
  alpine sh -c "
    ls -la /dev/bus/usb/001/002 2>/dev/null || echo 'Device not found'
  "
```

## Serial Port Access

For containers that need serial communication:

```bash
# Access a serial port
podman run --rm \
  --device /dev/ttyUSB0 \
  alpine sh -c "
    ls -la /dev/ttyUSB0 2>/dev/null || echo 'No USB serial device found'
  "

# Access multiple serial devices
podman run --rm \
  --device /dev/ttyUSB0 \
  --device /dev/ttyACM0 \
  alpine sh -c "
    ls -la /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || echo 'No serial devices found'
  "
```

## Sound Device Access

For audio processing containers:

```bash
# Access ALSA sound devices
podman run --rm \
  --device /dev/snd \
  alpine sh -c "
    ls -la /dev/snd/ 2>/dev/null || echo 'No sound devices found'
  "
```

## Video Device Access

For camera and video capture:

```bash
# Access a webcam
podman run --rm \
  --device /dev/video0 \
  alpine sh -c "
    ls -la /dev/video0 2>/dev/null || echo 'No video device found'
  "

# Access multiple video devices
podman run --rm \
  --device /dev/video0 \
  --device /dev/video1 \
  alpine sh -c "
    ls -la /dev/video* 2>/dev/null || echo 'No video devices found'
  "
```

## FUSE Device for User-Space Filesystems

```bash
# Mount FUSE filesystems inside a container
podman run --rm \
  --device /dev/fuse \
  --cap-add SYS_ADMIN \
  alpine sh -c "
    ls -la /dev/fuse
    echo 'FUSE device available for user-space filesystem mounting'
  "
```

## KVM Device for Hardware Virtualization

```bash
# Access KVM for running VMs inside containers
podman run --rm \
  --device /dev/kvm \
  alpine sh -c "
    ls -la /dev/kvm 2>/dev/null || echo 'No KVM device found'
    echo 'KVM access enables hardware virtualization workloads'
  "
```

## Multiple Devices

Pass multiple `--device` flags for access to several devices:

```bash
# Grant access to multiple devices
podman run --rm \
  --device /dev/fuse \
  --device /dev/null \
  --device /dev/zero \
  alpine sh -c "
    echo 'Accessible devices:'
    ls -la /dev/fuse /dev/null /dev/zero
  "
```

## Device Access vs Privileged Mode

```bash
# Targeted device access (preferred)
podman run --rm --device /dev/fuse alpine ls -la /dev/fuse

# Full privileged mode (avoid when possible)
podman run --rm --privileged alpine ls -la /dev/

# --device exposes ONLY what you need
# --privileged exposes EVERYTHING
```

## Verifying Device Access

```bash
# Check what devices a container has access to
podman run -d --name device-test \
  --device /dev/fuse \
  alpine sleep infinity

podman inspect device-test --format '{{json .HostConfig.Devices}}' | python3 -m json.tool

podman stop device-test && podman rm device-test
```

## Summary

Device access in Podman provides targeted hardware exposure:

- Use `--device /dev/path` to expose specific devices
- Set permissions with the three-part format `/host/dev:/container/dev:rwm`
- Map devices to different container paths with `/host/dev:/container/dev`
- Supports GPUs, USB, serial ports, cameras, sound, FUSE, and KVM
- Always prefer `--device` over `--privileged` for security
- Multiple devices require multiple `--device` flags
- Some devices also need `--cap-add` for the relevant capability

Grant only the specific devices your container needs, following the principle of least privilege.
