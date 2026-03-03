# How to Install Ubuntu Server on an ARM64 (AArch64) Machine

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, ARM64, AArch64, Installation, Server

Description: A guide to installing Ubuntu Server on ARM64 hardware, covering platform variations, boot methods, UEFI vs device tree booting, and compatibility considerations.

---

ARM64 (also called AArch64) servers have gone mainstream. AWS Graviton, Ampere Altra, Arm Neoverse-based systems from Ampere, Oracle, and Hetzner, plus single-board computers like the Raspberry Pi 5 and ROCK 5B - all run 64-bit ARM processors that Ubuntu supports officially. Ubuntu 24.04 LTS has a first-class ARM64 port with the same package set as x86_64. However, ARM hardware is more diverse than x86, and installation varies significantly depending on the platform.

## ARM64 Platform Diversity

Unlike x86_64 where UEFI has standardized boot across all hardware, ARM64 platforms boot in different ways:

- **Server-class hardware** (Graviton, Ampere, ThunderX): Standards-based UEFI, boots exactly like x86_64 with EFI
- **Raspberry Pi**: Custom GPU bootloader, uses `config.txt` and flat device tree; Pi 5 supports UEFI via EDK2 firmware
- **Single-board computers** (RockChip, AllWinner): U-Boot bootloader, device tree files, platform-specific
- **Qualcomm platforms**: Often UEFI but with Qualcomm-specific extensions

The installation method depends entirely on which of these categories your hardware falls into.

## Server-Class ARM64 (UEFI-based)

Systems like AWS Graviton, Ampere Altra-based servers (Hetzner Ampere servers, Oracle A1), and most ARM server hardware use standard UEFI firmware. Installation is nearly identical to x86_64.

### Downloading the ARM64 ISO

```bash
# Download Ubuntu Server 24.04 LTS ARM64 ISO
wget https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-live-server-arm64.iso

# Verify checksum
wget https://cdimage.ubuntu.com/releases/24.04/release/SHA256SUMS
sha256sum -c SHA256SUMS --ignore-missing
```

### Creating a Bootable USB

```bash
# Write ISO to USB drive (replace /dev/sdX with your USB device)
sudo dd if=ubuntu-24.04-live-server-arm64.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

### Installation Process

Boot from USB on your ARM64 machine. If the firmware is UEFI-compliant, the Ubuntu ISO's GRUB will load and the installation proceeds identically to x86_64:

1. Select language and keyboard
2. Configure network
3. Configure storage (GPT + EFI partition required)
4. Create user and enable SSH
5. Install

The partition layout must include an EFI System Partition:

```text
/dev/sda1  512MB  fat32   /boot/efi
/dev/sda2  1GB    ext4    /boot
/dev/sda3  rest   ext4    /  (or LVM)
```

GRUB installs as `grubaa64.efi` in the EFI partition (the ARM64 variant, as opposed to `grubx64.efi` on x86_64).

## Cloud-Based ARM64 Instances

Most cloud providers offer Ubuntu ARM64 images ready to launch. No ISO installation is needed.

### AWS Graviton (EC2)

```bash
# Launch a Graviton instance with Ubuntu 24.04
aws ec2 run-instances \
    --image-id $(aws ec2 describe-images \
        --filters "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*" \
                  "Name=state,Values=available" \
        --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
        --output text \
        --region us-east-1) \
    --instance-type t4g.micro \
    --key-name your-key-pair \
    --region us-east-1
```

### Hetzner Ampere Arm64

```bash
# Create an Arm64 server on Hetzner
hcloud server create \
    --name arm64-server \
    --type cax11 \    # Ampere Altra-based server type
    --image ubuntu-24.04 \
    --ssh-key your-key
```

### Oracle Cloud Free Tier

Oracle Cloud's always-free tier includes 4 Ampere A1 CPUs and 24 GB RAM - a significant free ARM64 resource:

```bash
# Via OCI CLI
oci compute instance launch \
    --compartment-id <compartment-id> \
    --availability-domain <ad-name> \
    --shape VM.Standard.A1.Flex \
    --shape-config '{"ocpus": 4, "memoryInGBs": 24}' \
    --image-id <ubuntu-24.04-arm64-image-id> \
    --subnet-id <subnet-id>
```

## Raspberry Pi 5 (ARM64)

See the dedicated Raspberry Pi guide for full details, but the key points:

```bash
# Download Raspberry Pi Ubuntu Server image (pre-installed, not ISO)
wget https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz

# Write to SD card or SSD
xzcat ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz | sudo dd of=/dev/sdX bs=4M status=progress
```

The Pi uses a custom bootloader, so the Raspberry Pi image is different from the standard ARM64 server ISO.

## QEMU/KVM ARM64 VMs on ARM64 Hardware

On an ARM64 host (like an Apple Silicon Mac running Asahi Linux, or an ARM64 server), you can run ARM64 VMs natively:

```bash
# Install KVM and QEMU
sudo apt install qemu-system-arm qemu-efi-aarch64 qemu-utils ovmf

# Create a VM disk
qemu-img create -f qcow2 ubuntu-arm64.qcow2 40G

# Create UEFI firmware files
mkdir -p /tmp/arm64-vm
cp /usr/share/AAVMF/AAVMF_CODE.fd /tmp/arm64-vm/
cp /usr/share/AAVMF/AAVMF_VARS.fd /tmp/arm64-vm/

# Boot the installer
qemu-system-aarch64 \
    -machine virt \
    -cpu cortex-a72 \
    -smp 4 \
    -m 4096 \
    -drive if=pflash,format=raw,file=/tmp/arm64-vm/AAVMF_CODE.fd,readonly=on \
    -drive if=pflash,format=raw,file=/tmp/arm64-vm/AAVMF_VARS.fd \
    -drive file=ubuntu-arm64.qcow2,if=virtio \
    -drive file=ubuntu-24.04-live-server-arm64.iso,if=virtio,media=cdrom \
    -netdev user,id=net0 \
    -device virtio-net-pci,netdev=net0 \
    -nographic
```

## QEMU/KVM ARM64 VMs on x86_64 Hardware (Emulation)

You can also emulate ARM64 on an x86_64 machine, though performance is significantly slower:

```bash
# Install cross-architecture QEMU
sudo apt install qemu-system-arm

# Boot the ARM64 Ubuntu installer
qemu-system-aarch64 \
    -machine virt \
    -cpu cortex-a72 \
    -smp 2 \
    -m 2048 \
    -drive if=pflash,format=raw,file=/usr/share/AAVMF/AAVMF_CODE.fd,readonly=on \
    -drive if=pflash,format=raw,file=/tmp/AAVMF_VARS.fd \
    -drive file=ubuntu-arm64.qcow2,if=virtio \
    -cdrom ubuntu-24.04-live-server-arm64.iso \
    -netdev user,id=net0 \
    -device virtio-net-pci,netdev=net0 \
    -nographic
```

Emulation is useful for building and testing ARM64 packages on x86_64 CI systems.

## Package Compatibility on ARM64

Ubuntu's ARM64 archive is comprehensive, but a small number of packages are x86_64-only:

```bash
# Check if a package is available for arm64
apt-cache show package-name | grep Architecture

# Search available ARM64 packages
apt-cache search --names-only pattern
```

Most server software - nginx, PostgreSQL, MySQL, Redis, Docker, Python, Go, Rust, Node.js - is natively available for ARM64. Some third-party software is x86_64-only and requires emulation.

### Running x86_64 Binaries on ARM64 (User-space emulation)

```bash
# Install QEMU user-space emulation
sudo apt install qemu-user-static binfmt-support

# This allows running x86_64 binaries on ARM64
file /path/to/x86_64-binary
/path/to/x86_64-binary   # Will run via QEMU user emulation
```

This is particularly useful for running x86_64 Docker containers on ARM64 hosts.

## Post-Installation Considerations

### Checking Architecture

```bash
# Verify architecture after installation
uname -m       # Should show: aarch64
dpkg --print-architecture   # Should show: arm64

# Check CPU info
lscpu | grep -E "Architecture|CPU|Model"
```

### Kernel and Hardware Support

```bash
# Check loaded kernel modules
lsmod

# ARM64-specific hardware info
cat /proc/cpuinfo | grep -E "CPU|Features|implementer"

# Check available CPU performance counters
ls /sys/devices/system/cpu/cpu0/cpufreq/
```

### Performance Monitoring on ARM64

Standard tools work on ARM64:

```bash
# CPU usage
htop

# Memory
free -h

# Disk I/O
iostat -x 1

# Network
iftop

# ARM-specific: CPU frequency
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq
```

## Troubleshooting ARM64 Boot Issues

### UEFI Firmware Not Found

Some ARM64 boards do not have built-in UEFI and require flashing EDK2 UEFI firmware (like the Raspberry Pi 4 with Pi4 UEFI project). Check your specific board's documentation.

### Kernel Panic on Boot

ARM64 hardware often needs device tree support. The Ubuntu generic ARM64 kernel includes device tree support for many platforms, but not all:

```bash
# Check available device tree files
ls /lib/firmware/$(uname -r)/device-tree/

# Check if your platform is recognized
dmesg | grep -i "DT:"
dmesg | grep -i "machine model"
```

### Package Build Failures

Some packages with native extensions may fail to build on ARM64 if their build system lacks ARM64 support. Check for ARM64-specific build flags:

```bash
# Example: ensuring Node.js native modules build for ARM64
npm config set arch arm64
npm install
```

ARM64 is a mature Ubuntu platform for server workloads. For cloud instances and standards-based hardware, installation and operation are essentially identical to x86_64. The main differences arise with embedded boards and specialized hardware where boot methods and device tree support add complexity.
