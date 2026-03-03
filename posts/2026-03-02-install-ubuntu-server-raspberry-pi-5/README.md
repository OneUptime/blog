# How to Install Ubuntu Server on a Raspberry Pi 5

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Raspberry Pi, ARM, Installation, IoT

Description: Step-by-step guide to installing Ubuntu Server on a Raspberry Pi 5, including imaging the SD card or SSD, first-boot configuration, and performance tips.

---

The Raspberry Pi 5 is a significant leap over its predecessors - a quad-core Cortex-A76 processor running at 2.4 GHz, up to 8 GB of LPDDR4X RAM, and PCIe 2.0 via the new FPC connector for NVMe SSDs. Ubuntu Server 24.04 LTS supports the Pi 5 officially, making it a compelling option for home lab servers, edge nodes, and development boards that need a full Linux environment rather than a stripped-down embedded OS.

## What You Need

- Raspberry Pi 5 (4 GB or 8 GB recommended)
- MicroSD card (32 GB or larger, Class 10 or faster), or an NVMe SSD with a Pi 5 HAT
- USB-C power supply (5V/5A for the Pi 5)
- A computer with a card reader (for flashing the image)
- Optional: HDMI cable and monitor for initial setup; not required for headless install

## Step 1: Download the Ubuntu Server Image

Canonical provides official Ubuntu Server images for Raspberry Pi. Download from the Raspberry Pi image page on Ubuntu's website:

```bash
# Download Ubuntu 24.04 LTS for Raspberry Pi (64-bit ARM)
wget https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz

# Verify the checksum
wget https://cdimage.ubuntu.com/releases/24.04/release/SHA256SUMS
sha256sum -c SHA256SUMS --ignore-missing
```

The image is pre-installed, meaning it boots directly without a graphical installer - Ubuntu is already laid out on the image and expands to fill the card on first boot.

## Step 2: Flash the Image

### Using Raspberry Pi Imager (Recommended)

The Raspberry Pi Imager is the easiest option. Install it on your workstation:

```bash
# On Ubuntu/Debian workstation
sudo apt install rpi-imager

# On macOS with Homebrew
brew install raspberry-pi-imager
```

Open the imager, click "Choose OS", scroll to "Other general-purpose OS", then "Ubuntu", and select Ubuntu Server 24.04 LTS (64-bit). Choose your storage device and click Write.

Before writing, click the gear icon to pre-configure:
- Hostname
- SSH (enable with your public key)
- Username and password
- WiFi credentials (if needed)

This pre-configuration is written via cloud-init and applies on first boot.

### Using dd on Linux/macOS

```bash
# Decompress and write the image
xzcat ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz | sudo dd of=/dev/sdX bs=4M status=progress oflag=sync

# Sync to ensure all writes complete
sync
```

Replace `/dev/sdX` with your actual device - check with `lsblk` first.

## Step 3: Configure cloud-init Before First Boot

If you used `dd` instead of Raspberry Pi Imager, configure the system before the first boot by editing cloud-init files on the boot partition (which is FAT32 and readable from your workstation).

Mount the boot partition:

```bash
# Mount the boot partition from the SD card
sudo mount /dev/sdX1 /mnt
```

Edit `/mnt/user-data` to customize cloud-init:

```yaml
#cloud-config
hostname: pi5-server
manage_etc_hosts: true

# Create a user
users:
  - name: ubuntu
    groups: sudo
    shell: /bin/bash
    sudo: ['ALL=(ALL) NOPASSWD:ALL']
    ssh_authorized_keys:
      - ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... your_public_key_here

# Disable password authentication
ssh_pwauth: false

# Install packages on first boot
packages:
  - htop
  - vim
  - curl

# Run commands after first boot
runcmd:
  - timedatectl set-timezone UTC
  - apt-get update && apt-get upgrade -y
```

Unmount and eject:

```bash
sudo umount /mnt
sync
```

## Step 4: Boot the Raspberry Pi 5

Insert the SD card (or connect the NVMe drive if using one). Connect power. The Pi 5 will boot, resize the filesystem to fill the card, and run cloud-init setup. This first boot takes 2-4 minutes.

If you have a monitor connected, you will see boot messages and eventually a login prompt.

For headless setups, find the Pi's IP address from your router's DHCP table, or scan the network:

```bash
# Scan for the Pi on your local network
nmap -sn 192.168.1.0/24 | grep -A 1 "Raspberry Pi"
```

## Step 5: SSH Into the Server

```bash
# SSH using the key configured in cloud-init
ssh ubuntu@192.168.1.x

# If you set a password instead, use password auth
ssh ubuntu@192.168.1.x
```

## Post-Boot Configuration

### Update the System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt autoremove -y
```

### Set a Static IP

Edit the Netplan configuration:

```bash
sudo nano /etc/netplan/50-cloud-init.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: no
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

```bash
sudo netplan apply
```

### Configure the Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw enable
```

## Booting from NVMe SSD

The Pi 5 supports NVMe SSDs via a PCIe FPC HAT (such as the official Pi 5 M.2 HAT+). NVMe storage is significantly faster than SD cards and recommended for production use.

Flash the Ubuntu image to the NVMe SSD using dd (connect it via USB-to-NVMe adapter on your workstation), then update the Pi 5 bootloader to boot from PCIe:

```bash
# On the running Pi 5 (booted from SD), install the EEPROM tool
sudo apt install rpi-eeprom

# Check current EEPROM version
sudo rpi-eeprom-update

# Open EEPROM config to change boot order
sudo rpi-eeprom-config --edit
```

Set `BOOT_ORDER=0xf416` to try NVMe first, then SD, then USB, then network:

```text
BOOT_ORDER=0xf416
PCIE_PROBE=1
```

Apply the change and reboot. Remove the SD card and the Pi will boot from the NVMe.

## Performance Tuning

### CPU Governor

The Pi 5 defaults to `ondemand`. For server workloads, `performance` mode delivers consistent throughput:

```bash
# Set CPU governor to performance
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor

# Make it persistent
sudo apt install cpufrequtils
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils
```

### Memory Split

Since you are running Ubuntu Server headless, no GPU memory is needed:

```bash
# Set GPU memory to minimum (16 MB)
echo "gpu_mem=16" | sudo tee -a /boot/firmware/config.txt
sudo reboot
```

### Monitoring Temperature

The Pi 5 has a built-in temperature sensor:

```bash
# Check CPU temperature
cat /sys/class/thermal/thermal_zone0/temp
# Divide by 1000 for degrees Celsius: e.g., 45000 = 45°C

# Or use vcgencmd if installed
vcgencmd measure_temp
```

The Pi 5 will throttle at 85°C. A heatsink is recommended for sustained workloads; the official Pi 5 Active Cooler is worth it for server use.

## Common Issues

### No Network on First Boot

Check that the SD card was written completely and that cloud-init's network configuration is valid. The Pi 5 uses `eth0` for the built-in Ethernet port.

### SSH Not Available Immediately

Cloud-init runs on first boot and takes several minutes. Wait 3-5 minutes before trying to SSH in.

### Filesystem Did Not Expand

If the root filesystem is still the size of the compressed image, manually expand it:

```bash
sudo growpart /dev/mmcblk0 2
sudo resize2fs /dev/mmcblk0p2
df -h /
```

Ubuntu Server on the Raspberry Pi 5 is a genuinely capable server platform for moderate workloads. With NVMe storage and the Pi 5's improved performance, it handles web servers, databases, home automation, and monitoring stacks without breaking a sweat.
