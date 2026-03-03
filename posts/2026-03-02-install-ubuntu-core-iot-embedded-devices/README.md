# How to Install Ubuntu Core for IoT and Embedded Devices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Ubuntu Core, IoT, Embedded, Snap

Description: Learn how to install and configure Ubuntu Core on IoT and embedded devices, understand the snap-based architecture, and set up remote management for fleet deployments.

---

Ubuntu Core is a stripped-down, immutable version of Ubuntu designed specifically for IoT devices, embedded systems, and appliances. Unlike Ubuntu Server, the entire operating system in Ubuntu Core is delivered as snap packages - including the kernel, base OS, and applications. This architecture provides transactional updates (meaning a failed update rolls back automatically), a minimal attack surface, and reliable remote management for devices that may be deployed in hard-to-reach locations.

## Ubuntu Core vs Ubuntu Server

Understanding the differences helps determine which is right for your use case:

| Feature | Ubuntu Core | Ubuntu Server |
|---------|------------|---------------|
| Package management | Snaps only | apt + snaps |
| Root filesystem | Read-only | Read-write |
| Updates | Transactional, automatic rollback | Manual or unattended-upgrades |
| Remote management | Ubuntu Core dashboard / store | SSH + tools |
| Use case | Kiosk, IoT, appliances | General server |
| Footprint | ~300 MB | 1-4 GB |
| Recovery | Automatic rollback | Manual |

If you are building an appliance or IoT gateway that will receive OTA updates and must never be left in a broken state, Ubuntu Core is the right choice. If you need a general-purpose server with full apt package management, use Ubuntu Server.

## Supported Hardware

Ubuntu Core 24 supports:

- Raspberry Pi 2/3/4/5 (armhf and arm64)
- Intel and AMD x86_64 systems (including NUC, industrial PCs)
- ARM-based development boards (limited)
- Custom boards via Ubuntu Core Build Service

The full list of tested hardware and certified devices is at certification.ubuntu.com.

## Getting an Ubuntu One Account

Ubuntu Core requires an Ubuntu One account for initial setup. The system uses your SSH public keys registered with Ubuntu One to authenticate during first-boot setup.

1. Create an account at login.ubuntu.com
2. Add your SSH public key at ubuntu.com/login (SSH keys section)

This is required - Ubuntu Core has no default password and no way to log in without an Ubuntu One account's associated SSH keys.

## Raspberry Pi 4 - Most Common Target

The Raspberry Pi 4 is the most popular Ubuntu Core target. Here is the complete setup.

### Download the Image

```bash
# Download Ubuntu Core 24 for Raspberry Pi (arm64)
wget https://cdimage.ubuntu.com/ubuntu-core/24/stable/current/ubuntu-core-24-arm64+raspi.img.xz

# Verify
sha256sum ubuntu-core-24-arm64+raspi.img.xz
```

### Flash to SD Card

```bash
# Using dd
xzcat ubuntu-core-24-arm64+raspi.img.xz | sudo dd of=/dev/sdX bs=4M status=progress

# Or using Raspberry Pi Imager (easier)
# Choose OS: Other general-purpose OS -> Ubuntu -> Ubuntu Core 24
```

### First Boot Configuration

Insert the SD card, connect a monitor and keyboard (or have serial console access), and power on.

Ubuntu Core boots and runs a system setup wizard. You will be prompted to configure network connectivity (Ethernet or WiFi) and associate the device with your Ubuntu SSO account.

Enter your Ubuntu One email address when prompted. The system fetches your SSH public keys and completes setup.

```bash
# After first boot, SSH in using the key associated with your Ubuntu One account
ssh user@<device-ip>
# Default username on Core is your Ubuntu One username
```

## PC/x86_64 Installation

For industrial PCs, Intel NUC, or other x86_64 hardware:

```bash
# Download Ubuntu Core for x86_64
wget https://cdimage.ubuntu.com/ubuntu-core/24/stable/current/ubuntu-core-24-amd64.img.xz

# Write to USB drive
xzcat ubuntu-core-24-amd64.img.xz | sudo dd of=/dev/sdX bs=4M status=progress
```

Boot from the USB. Ubuntu Core x86_64 uses a live boot that walks through system setup, then writes itself to the internal disk.

## Ubuntu Core Architecture

### Snap Layers

Ubuntu Core's filesystem consists of several snap layers:

```bash
# View installed snaps (these make up the entire OS)
snap list

# Typical output on Core:
# Name        Version  Rev  Tracking  Publisher
# core24      24.04    xxx  latest    canonical
# pc          24.xxx   xxx  24        canonical
# pc-kernel   6.8.x    xxx  24        canonical
# snapd       2.x.x    xxx  latest    canonical
```

- `core24`: The Ubuntu 24.04 base OS snap (libraries, etc.)
- `pc` or `pi`: The gadget snap (bootloader config, partition layout)
- `pc-kernel` or `pi-kernel`: The kernel snap
- `snapd`: The snap daemon

### Filesystem Layout

```bash
# Ubuntu Core filesystem is immutable
ls -la /
# /snap     - mounted snap contents (read-only)
# /var      - writable data
# /home     - writable user data
# /etc      - overlay (writable, starts from snap content)

# The root filesystem is squashfs
mount | grep squashfs
```

## Installing Applications

Only snap packages can be installed on Ubuntu Core. The snap store has thousands of applications.

```bash
# Install applications
snap install mosquitto         # MQTT broker for IoT
snap install influxdb          # Time-series database
snap install grafana           # Dashboard visualization
snap install docker            # Container runtime

# Install from a specific channel
snap install my-app --channel=edge

# List available channels for a snap
snap info nginx | grep channels
```

## Confining Application Snaps

Snaps run in confinement (AppArmor/seccomp sandbox). Interfaces declare what resources an application can access:

```bash
# List interfaces (permissions) for a snap
snap interfaces mosquitto

# Connect an interface manually
snap connect mosquitto:network-bind

# List all available interfaces
snap connections
```

## Building a Custom Device Image

For production IoT deployments, you build a custom Ubuntu Core image with your application pre-installed using `ubuntu-image`:

```bash
# Install ubuntu-image
sudo snap install ubuntu-image --classic

# Create a model assertion (describes the device and its snaps)
cat > my-device.yaml << 'EOF'
type: model
authority-id: your-store-id
series: 16
brand-id: your-brand-id
model: my-iot-device
architecture: arm64
base: core24
grade: signed
snaps:
  - name: pi
    type: gadget
    default-channel: 24/stable
  - name: pi-kernel
    type: kernel
    default-channel: 24/stable
  - name: core24
    type: base
    default-channel: latest/stable
  - name: snapd
    type: snapd
    default-channel: latest/stable
  - name: my-application
    type: app
    default-channel: latest/stable
timestamp: "2026-03-02T00:00:00+00:00"
EOF
```

Sign the model with snapcraft:

```bash
# Sign the model assertion with your Snap Store key
snap sign -k my-signing-key my-device.yaml > my-device.model
```

Build the image:

```bash
# Build a Raspberry Pi image with your model
ubuntu-image snap my-device.model

# The output is a complete bootable image with your app pre-installed
ls *.img
```

## OTA Updates

Ubuntu Core devices update automatically from the Snap Store. Each channel (`stable`, `candidate`, `beta`, `edge`) receives updates independently.

```bash
# Check update status
snap refresh --list

# Force a refresh
sudo snap refresh

# Configure update schedule (Core 20+)
sudo snap set system refresh.schedule="00:00-04:00/mon-fri"

# Hold updates for testing
sudo snap refresh --hold=48h my-app
```

Rollback happens automatically if a snap fails to load after update:

```bash
# Manually revert a snap to the previous version
sudo snap revert my-app

# Check revision history
snap changes
```

## Remote Management with Ubuntu IoT Device Management

Canonical provides the IoT Device Management portal (formerly known as Landscape for IoT) for managing fleets of Ubuntu Core devices. For smaller fleets, direct SSH management works fine.

### Serial Console for Headless Recovery

Always configure a serial console for headless devices in case network or SSH becomes unavailable:

```bash
# Check if serial console is available
ls /dev/ttyS* /dev/ttyAMA*

# Test serial console access
screen /dev/ttyUSB0 115200
```

For Raspberry Pi devices, enable UART in `/boot/firmware/config.txt` (though on Core, this is managed by the gadget snap):

```text
# In the gadget snap's extra config:
enable_uart=1
```

## Developing Snap Packages for Ubuntu Core

If you are developing an IoT application to run on Ubuntu Core, you need to package it as a snap:

```bash
# Install snapcraft
sudo snap install snapcraft --classic

# Initialize a new snap project
mkdir my-iot-app && cd my-iot-app
snapcraft init
```

A basic `snapcraft.yaml` for a Python IoT application:

```yaml
name: my-iot-sensor
version: '1.0'
summary: IoT sensor reader
description: Reads temperature and humidity from sensors

grade: stable
confinement: strict
base: core24

parts:
  my-app:
    plugin: python
    source: .
    python-packages:
      - Adafruit-DHT

apps:
  sensor:
    command: bin/sensor-reader
    daemon: simple
    restart-condition: always
    plugs:
      - serial-port
      - hardware-observe
```

```bash
# Build the snap
snapcraft

# Test locally
sudo snap install my-iot-sensor_1.0_arm64.snap --devmode

# Publish to the Snap Store
snapcraft upload my-iot-sensor_1.0_arm64.snap
snapcraft release my-iot-sensor 1 stable
```

## Monitoring Ubuntu Core Devices

Standard metrics collection works on Ubuntu Core through snaps:

```bash
# Install Telegraf for metrics collection
snap install telegraf

# Configure Telegraf
cat /var/snap/telegraf/current/telegraf.conf

# Start and enable
snap start telegraf
```

For centralized monitoring of Ubuntu Core devices with something like [OneUptime](https://oneuptime.com), deploy a monitoring agent as a snap and configure it to report to your monitoring endpoint.

Ubuntu Core represents a different philosophy from traditional Linux: an immutable, snap-based OS where updates are reliable, rollback is guaranteed, and the attack surface is minimal. For IoT devices and appliances that need to "just work" with minimal maintenance, it is a compelling choice.
