# How to Flash Ubuntu Server to an SD Card for Single-Board Computers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Raspberry Pi, Single-Board Computers, Embedded

Description: How to download, write, and configure Ubuntu Server images for single-board computers like Raspberry Pi using both command-line and GUI tools.

---

Single-board computers (SBCs) like the Raspberry Pi, ODROID, and similar ARM-based boards run Ubuntu Server from microSD cards or eMMC storage. The process differs from typical x86 installations because you write a pre-built image rather than running an interactive installer. Ubuntu provides official images for several popular boards.

## Supported Boards

Canonical provides official Ubuntu Server images for:
- **Raspberry Pi 2, 3, 4, 5** (arm64 and armhf)
- **NVIDIA Jetson** series
- Various other boards listed at cdimage.ubuntu.com/ubuntu-server/

For Raspberry Pi specifically, Ubuntu Server 24.04 LTS arm64 is the recommended choice for Pi 4 and Pi 5, which have enough RAM (2GB+) to run server workloads comfortably.

## Downloading the Image

Download the appropriate image from Ubuntu's release server:

```bash
# Raspberry Pi 4/5 - arm64 Ubuntu Server 24.04 LTS
wget https://cdimage.ubuntu.com/ubuntu-server/noble/daily-preinstalled/current/noble-preinstalled-server-arm64+raspi.img.xz

# Verify the download (download the SHA256SUMS file from the same directory)
wget https://cdimage.ubuntu.com/ubuntu-server/noble/daily-preinstalled/current/SHA256SUMS
sha256sum --check SHA256SUMS --ignore-missing
```

The image file is compressed with XZ. You can decompress it before writing, or use a tool that handles compressed images directly.

## Writing the Image: Command Line (dd)

This is the most portable method, available on Linux and macOS.

**Identify the SD card device**:

```bash
# Before inserting SD card
ls /dev/sd*    # Linux
ls /dev/disk*  # macOS

# Insert SD card, then run again and note the new device
ls /dev/sd*
# Look for the new entry - likely /dev/sdb or /dev/sdc on Linux

# Confirm it is your SD card (check size)
lsblk /dev/sdb
# Should show the SD card capacity
```

**Write the image**:

```bash
# Decompress and write in one step (no intermediate file needed)
xzcat noble-preinstalled-server-arm64+raspi.img.xz | sudo dd of=/dev/sdb bs=4M status=progress conv=fsync

# Wait for the command to complete - the 'conv=fsync' ensures all data is flushed to the card
```

On macOS:

```bash
# macOS uses rdisk for faster writes (bypass buffering)
xzcat noble-preinstalled-server-arm64+raspi.img.xz | sudo dd of=/dev/rdisk2 bs=4m

# Use diskutil to identify the disk number first
diskutil list
```

After writing, eject safely:

```bash
# Linux
sudo eject /dev/sdb

# macOS
diskutil eject /dev/disk2
```

## Writing the Image: Raspberry Pi Imager

The Raspberry Pi Foundation provides a GUI tool (Raspberry Pi Imager) available for Windows, macOS, and Linux. It handles downloading and writing in one step and has a built-in configuration screen for:
- Hostname
- Username and password
- SSH key
- Wi-Fi credentials
- Locale settings

For server use, the CLI approach is often more reproducible, but the Raspberry Pi Imager is convenient for one-off setups.

## Writing the Image: Etcher

Balena Etcher is another GUI option that works on all platforms. It accepts compressed images directly and verifies the write after completion. Install it from etcher.balena.io.

## Pre-Boot Configuration via cloud-init

Ubuntu's SBC images use cloud-init for first-boot configuration. The SD card image contains a FAT partition labeled `system-boot` that you can mount and modify before the first boot.

After writing the image, the SD card will have two partitions visible:
- `system-boot` (FAT32) - accessible on Windows, macOS, and Linux without special tools
- `writable` (ext4) - the Linux root partition

Mount the `system-boot` partition and edit the cloud-init files:

```bash
# Linux - mount the first partition
sudo mount /dev/sdb1 /mnt

ls /mnt
# You will see: cmdline.txt, config.txt, network-config, user-data, meta-data
```

### Configuring Network

Edit `network-config` to configure static IP or Wi-Fi:

```yaml
# /mnt/network-config

version: 2
ethernets:
  eth0:
    dhcp4: true
    optional: true

# For a static IP:
# ethernets:
#   eth0:
#     dhcp4: false
#     addresses:
#       - 192.168.1.50/24
#     routes:
#       - to: default
#         via: 192.168.1.1
#     nameservers:
#       addresses:
#         - 8.8.8.8
#         - 8.8.4.4
```

For Wi-Fi (Raspberry Pi with wireless):

```yaml
version: 2
wifis:
  wlan0:
    dhcp4: true
    access-points:
      "YourNetworkName":
        password: "your-wifi-password"
```

### Configuring User and SSH

Edit `user-data` on the system-boot partition:

```yaml
#cloud-config

# Set hostname
hostname: pi-server-01

# Disable the default ubuntu user and create your own
users:
  - name: deploy
    groups: sudo
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - "ssh-ed25519 AAAA... user@machine"

# Disable password authentication
ssh_pwauth: false

# Install packages on first boot
packages:
  - vim
  - htop
  - fail2ban

# Run commands after first boot
runcmd:
  - apt update && apt upgrade -y
  - systemctl enable fail2ban
```

After editing, unmount the partition:

```bash
sudo umount /mnt
```

## First Boot

Insert the SD card into the SBC and power it on. The first boot takes longer than subsequent boots because cloud-init applies configuration. On a Raspberry Pi 4, expect 2-4 minutes.

If you configured SSH access, you can connect once the board is up:

```bash
# If DHCP, find the IP from your router's client list
ssh deploy@192.168.1.x

# Or use the hostname if your router supports mDNS
ssh deploy@pi-server-01.local
```

## Expanding the Root Filesystem

Ubuntu's cloud images typically auto-expand the root filesystem to fill the SD card on first boot. Verify this happened:

```bash
df -h /
# Should show the full SD card capacity used for root

# If not expanded, do it manually
sudo growpart /dev/mmcblk0 2
sudo resize2fs /dev/mmcblk0p2
```

On Raspberry Pi, the device is `/dev/mmcblk0` (onboard SD/eMMC reader), and partitions are `mmcblk0p1`, `mmcblk0p2`, etc.

## Performance Considerations for SD Cards

SD cards are significantly slower than NVMe or SATA SSDs, which affects system performance:

```bash
# Benchmark write speed
dd if=/dev/zero of=/tmp/testfile bs=1M count=512 conv=fsync status=progress
rm /tmp/testfile

# Benchmark read speed
dd if=/dev/mmcblk0 of=/dev/null bs=1M count=512 status=progress
```

A good Class 10 / UHS-I SD card should give 20-50 MB/s writes and 80-100 MB/s reads. For anything production-like, use a USB 3.0 SSD instead. Raspberry Pi 4 and 5 support USB boot:

```bash
# Check bootloader config for USB boot support
sudo rpi-eeprom-config | grep BOOT_ORDER
# BOOT_ORDER=0xf41 means SD card first, then USB storage
```

Modify to boot from USB:

```bash
sudo raspi-config
# Advanced Options -> Boot Order -> USB Boot
```

## Useful First-Configuration Steps

After connecting via SSH:

```bash
# Set timezone
sudo timedatectl set-timezone America/New_York

# Check system temperature (Raspberry Pi specific)
vcgencmd measure_temp

# Monitor CPU frequency
watch -n1 cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq

# Check memory
free -h

# Check SD card health
sudo dmesg | grep -i mmcblk | tail -20
```

Single-board computers with Ubuntu Server work well for home lab environments, edge computing, and learning Linux server administration without the cost of cloud instances. The key differences from x86 server installs are the ARM architecture, image-based installation, and SD card-specific performance characteristics to keep in mind.
