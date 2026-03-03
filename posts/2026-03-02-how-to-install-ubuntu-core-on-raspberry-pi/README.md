# How to Install Ubuntu Core on Raspberry Pi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Raspberry Pi, IoT, Ubuntu Core, Embedded

Description: A step-by-step guide to installing Ubuntu Core on a Raspberry Pi, setting up SSH access, and understanding the snap-based immutable OS for IoT and edge deployments.

---

Ubuntu Core is a minimal, immutable version of Ubuntu designed for IoT and edge devices. Unlike standard Ubuntu, Ubuntu Core uses snap packages exclusively - the OS itself is delivered as a snap, and all applications install as snaps. This transactional approach means updates are atomic: if something goes wrong, the system rolls back automatically.

Ubuntu Core makes sense for Raspberry Pi deployments where you want a maintainable, secure system that can run unattended for months or years without manual intervention.

## Ubuntu Core vs Ubuntu Server on Pi

|Feature|Ubuntu Core|Ubuntu Server|
|---|---|---|
|Update model|Automatic, atomic|Manual apt|
|Rollback|Automatic on failure|Manual|
|OS is modifiable|No (read-only)|Yes|
|Applications|Snaps only|apt + snap|
|Remote management|Snapd + snap store|SSH + scripts|
|Disk footprint|~500MB|~2-4GB|

Ubuntu Core is appropriate when you want the device to manage itself. Ubuntu Server is better when you need full control and arbitrary software.

## Requirements

- Raspberry Pi 4, Pi 3B+, or Pi CM4 (Ubuntu Core 22 supports these)
- microSD card (16GB minimum, 32GB recommended)
- Ubuntu One account (required for first login via SSH)
- A computer to flash the image

## Step 1: Create an Ubuntu One Account and Add SSH Key

Ubuntu Core's first-boot authentication uses your Ubuntu One account and SSH keys registered there. This is not optional.

1. Create an account at https://login.ubuntu.com if you do not have one
2. After logging in, navigate to **SSH keys**
3. Click **Import SSH key** and paste your public key:

```bash
# On your workstation, display your public key
cat ~/.ssh/id_ed25519.pub
# Paste this output into the Ubuntu One SSH keys section
```

Your Ubuntu One username will be used for the first SSH login.

## Step 2: Download the Ubuntu Core Image

Find the correct image for your Pi model at https://ubuntu.com/download/raspberry-pi-core

```bash
# Example: Ubuntu Core 22 for Raspberry Pi 4
wget https://cdimage.ubuntu.com/ubuntu-core/22/stable/current/ubuntu-core-22-arm64+raspi.img.xz

# Verify the download with the SHA256 checksum from Ubuntu's website
echo "expected-checksum  ubuntu-core-22-arm64+raspi.img.xz" | sha256sum -c
```

## Step 3: Flash the Image to microSD

On Linux/macOS with a microSD card reader:

```bash
# Find your SD card device
lsblk
# Look for the device that appears when you insert the card (e.g., /dev/sdb or /dev/mmcblk0)

# Flash using dd
xzcat ubuntu-core-22-arm64+raspi.img.xz | sudo dd of=/dev/sdX bs=4M status=progress
# Replace /dev/sdX with your actual device

# Sync to ensure all writes complete
sudo sync
```

Alternatively, use the Raspberry Pi Imager application:
1. Open Raspberry Pi Imager
2. Choose OS: "Other general-purpose OS" > "Ubuntu" > "Ubuntu Core 22"
3. Choose storage: your microSD card
4. Write

## Step 4: First Boot and Configuration

Insert the microSD into the Pi, connect it to your network via Ethernet, and power it on.

Ubuntu Core runs an interactive first-boot setup over a serial console or via the network. The first time you SSH in, it presents a setup wizard.

```bash
# Find the Pi's IP address from your router's DHCP leases
# Or connect via serial console

# SSH in using your Ubuntu One username
ssh <ubuntu-one-username>@<raspberry-pi-ip>
```

On first connection, the Pi will prompt you to complete setup:

```text
Welcome to Ubuntu Core 22!

This is the first boot of this Ubuntu Core system.

The system will be configured using your Ubuntu One account.

After setup, you can log in as 'ubuntu' or with your Ubuntu One credentials.

> Done
```

After setup completes, you can log in as:

```bash
ssh <ubuntu-one-username>@<pi-ip>
# or
ssh ubuntu@<pi-ip>  # if you set up the ubuntu user
```

## Step 5: Basic System Exploration

```bash
# Check the OS version
snap version

# View installed snaps
snap list

# Typical output:
# Name       Version    Rev    Tracking  Publisher  Notes
# core22     20231211   1034   latest    canonical  base
# pc-kernel  ...        ...    ...       canonical  kernel
# pi         ...        ...    ...       canonical  gadget
# snapd      2.61.3     ...    ...       canonical  snapd

# Check system info
snap model

# View system status
systemctl status
```

## Step 6: Installing Applications

Everything on Ubuntu Core installs as a snap:

```bash
# Search for available snaps
snap find nginx
snap find python

# Install snaps
sudo snap install hello-world          # Test snap
sudo snap install mosquitto            # MQTT broker for IoT
sudo snap install node --channel 18    # Node.js runtime

# Install from a specific channel
sudo snap install certbot --channel latest/stable

# List installed snaps
snap list

# Remove a snap
sudo snap remove mosquitto
```

## Enabling Developer Mode (for Custom Snaps)

If you need to install locally built snaps during development:

```bash
# Enable developer mode for a specific snap
sudo snap install myapp_1.0_arm64.snap --devmode

# Or enter a shell in a snap's environment
snap run --shell myapp
```

## System Updates

Ubuntu Core handles updates automatically. Check update status:

```bash
# View refresh schedule
snap refresh --time

# Manually trigger an update check
sudo snap refresh

# List available updates
snap refresh --list

# Check update history
snap changes

# Hold updates for specific snaps (not recommended for security snaps)
sudo snap hold myapp

# Resume auto-updates
sudo snap unhold myapp
```

## Configuring the Pi Hardware

Ubuntu Core includes a `pi` gadget snap that handles hardware configuration. Set configuration options via snap:

```bash
# List configurable Pi options
sudo snap get pi

# Enable UART (serial console)
sudo snap set pi uart=1

# Set GPU memory split
sudo snap set pi gpu-mem=128

# Enable I2C
sudo snap set pi i2c=1

# Enable SPI
sudo snap set pi spi=1

# Enable camera
sudo snap set pi camera=1
sudo snap set pi camera-legacy=1

# These changes take effect after reboot
sudo reboot
```

## Networking Configuration

Ubuntu Core uses netplan for network configuration:

```bash
# View current network config
cat /etc/netplan/00-snapd-config.yaml

# For static IP, create a new netplan config
sudo tee /etc/netplan/01-static.yaml << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.150/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 1.1.1.1
          - 8.8.8.8
EOF

sudo netplan apply
```

## Running Docker on Ubuntu Core

If you need Docker for containers:

```bash
# Install Docker from snap
sudo snap install docker

# Docker works normally after installation
sudo docker run hello-world

# The docker group for non-root usage
sudo addgroup --system docker
sudo adduser $USER docker
sudo snap disable docker
sudo snap enable docker
```

## Remote Management

For managing a fleet of Ubuntu Core devices, Snap Store's management features or Landscape (Canonical's device management tool) work well:

```bash
# Register with Landscape (if using it)
sudo snap install landscape-client
sudo landscape-config --computer-title "pi-01" \
  --account-name your-account \
  --url https://landscape.canonical.com/message-system

# View snap services running on the device
snap services

# Check logs for a specific snap service
snap logs mosquitto

# Follow logs live
snap logs -f mosquitto
```

## Troubleshooting

**Cannot SSH after first boot:**
```bash
# Verify the Pi got an IP address (check your router)
# Make sure your SSH key is registered with Ubuntu One
# Try connecting with verbose mode
ssh -v <ubuntu-one-username>@<pi-ip>
```

**Snap installation fails:**
```bash
# Check snap service is running
systemctl status snapd

# Check connectivity to snap store
snap find curl

# If behind a proxy
sudo snap set system proxy.http=http://proxy.internal:3128
sudo snap set system proxy.https=http://proxy.internal:3128
```

**Pi hardware features not working after snap set:**
```bash
# View current pi snap configuration
sudo snap get pi

# Check that changes applied
sudo snap changes pi

# Ensure you rebooted after changes
sudo reboot
```

Ubuntu Core's immutable design is its biggest strength for edge deployments. The system will not drift from its configured state, updates are tested before applying, and rollbacks happen automatically on failure. For a Pi sitting in a remote location doing sensor monitoring or running an MQTT broker, that reliability is worth the trade-off of a more constrained environment.
