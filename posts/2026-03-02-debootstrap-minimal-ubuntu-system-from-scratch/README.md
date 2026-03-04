# How to Debootstrap a Minimal Ubuntu System from Scratch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Debootstrap, Minimal, Chroot, Advanced

Description: Learn how to use debootstrap to build a minimal Ubuntu system from scratch, configure it manually, install a bootloader, and understand how Linux system construction works at a fundamental level.

---

Debootstrap is the tool Debian and Ubuntu use internally to construct the base OS during installation. It downloads packages directly from the archive and installs them into a directory, creating a bootable system without running the graphical or text installer. Using debootstrap directly gives you complete control over what gets installed, lets you build minimal containers and chroot environments, and helps you understand what a Linux system actually consists of at its most fundamental level.

## What Debootstrap Does

Debootstrap works in two stages:

1. **Stage 1**: Downloads the essential packages (dpkg, libc, etc.) and creates a minimal unpacking environment inside a directory
2. **Stage 2**: Runs inside a chroot of that directory to configure the packages, run post-install scripts, and set up the base system

The result is a directory containing a functional (though minimal) Debian/Ubuntu root filesystem.

## Installing Debootstrap

```bash
# Install debootstrap (available on any Debian/Ubuntu system)
sudo apt install debootstrap -y

# Also available on Fedora/RHEL for cross-distro bootstrap operations
sudo dnf install debootstrap

# And on Arch Linux
sudo pacman -S debootstrap
```

## Basic Debootstrap Usage

The minimal command to create an Ubuntu 24.04 system:

```bash
# Create a minimal Ubuntu Noble (24.04) base system in /tmp/ubuntu-noble
sudo debootstrap noble /tmp/ubuntu-noble http://archive.ubuntu.com/ubuntu

# For ARM64 systems (or to create an ARM64 chroot on x86_64 with QEMU)
sudo debootstrap --arch=arm64 noble /tmp/ubuntu-noble-arm64 http://ports.ubuntu.com/ubuntu-ports
```

The variants affect what gets installed:

```bash
# Minbase: only essential packages and priority=required
# Smallest possible system (~100-150 MB)
sudo debootstrap --variant=minbase noble /tmp/ubuntu-minbase http://archive.ubuntu.com/ubuntu

# Buildd: packages needed for building Debian packages
sudo debootstrap --variant=buildd noble /tmp/ubuntu-build http://archive.ubuntu.com/ubuntu

# Default (no --variant): installs standard + important priority packages
sudo debootstrap noble /tmp/ubuntu-base http://archive.ubuntu.com/ubuntu
```

## Exploring the Bootstrapped System

After debootstrap completes, you have a working chroot:

```bash
# See what got installed
ls /tmp/ubuntu-minbase/

# Check the package count
ls /tmp/ubuntu-minbase/var/lib/dpkg/info/ | grep '.list' | wc -l

# Enter the chroot
sudo chroot /tmp/ubuntu-minbase /bin/bash

# Inside the chroot, you have a minimal Ubuntu:
cat /etc/os-release
dpkg -l | head -30
# Exit with Ctrl+D or 'exit'
```

## Setting Up a Full Chroot Environment

For a chroot that can run more complex programs, mount the pseudo-filesystems:

```bash
# Mount required filesystems
sudo mount --bind /dev /tmp/ubuntu-minbase/dev
sudo mount --bind /dev/pts /tmp/ubuntu-minbase/dev/pts
sudo mount -t proc proc /tmp/ubuntu-minbase/proc
sudo mount -t sysfs sysfs /tmp/ubuntu-minbase/sys
sudo mount --bind /run /tmp/ubuntu-minbase/run

# Optional: mount resolv.conf for DNS resolution inside chroot
sudo cp /etc/resolv.conf /tmp/ubuntu-minbase/etc/resolv.conf

# Enter the chroot
sudo chroot /tmp/ubuntu-minbase /bin/bash

# Now you can install packages inside the chroot
apt update
apt install vim curl wget sudo -y

# Exit and unmount when done
exit
sudo umount /tmp/ubuntu-minbase/run
sudo umount /tmp/ubuntu-minbase/sys
sudo umount /tmp/ubuntu-minbase/proc
sudo umount /tmp/ubuntu-minbase/dev/pts
sudo umount /tmp/ubuntu-minbase/dev
```

## Building a Bootable System on a Disk

This is the full process to build a bootable Ubuntu installation from scratch using debootstrap - the same process the Ubuntu installer uses internally.

### Step 1: Prepare the Target Disk

```bash
# Create a disk image for testing (or use a real disk)
dd if=/dev/zero of=/tmp/ubuntu-disk.img bs=1M count=4096 status=progress

# Set up a loop device
LOOP=$(sudo losetup --find --show --partscan /tmp/ubuntu-disk.img)
echo "Loop device: $LOOP"

# Create partition table (UEFI/GPT layout)
sudo parted $LOOP mklabel gpt
sudo parted $LOOP mkpart ESP fat32 1MiB 513MiB
sudo parted $LOOP set 1 esp on
sudo parted $LOOP mkpart root ext4 513MiB 100%

# Rescan partitions
sudo partprobe $LOOP

# Format partitions
sudo mkfs.fat -F32 ${LOOP}p1
sudo mkfs.ext4 ${LOOP}p2
```

### Step 2: Mount and Bootstrap

```bash
# Mount the root partition
sudo mkdir -p /mnt/ubuntu-build
sudo mount ${LOOP}p2 /mnt/ubuntu-build
sudo mkdir -p /mnt/ubuntu-build/boot/efi
sudo mount ${LOOP}p1 /mnt/ubuntu-build/boot/efi

# Bootstrap the base system
sudo debootstrap noble /mnt/ubuntu-build http://archive.ubuntu.com/ubuntu
```

### Step 3: Configure the System

Mount the pseudo-filesystems and chroot:

```bash
sudo mount --bind /dev /mnt/ubuntu-build/dev
sudo mount --bind /dev/pts /mnt/ubuntu-build/dev/pts
sudo mount -t proc proc /mnt/ubuntu-build/proc
sudo mount -t sysfs sysfs /mnt/ubuntu-build/sys
sudo mount --bind /sys/firmware/efi/efivars /mnt/ubuntu-build/sys/firmware/efi/efivars
sudo cp /etc/resolv.conf /mnt/ubuntu-build/etc/resolv.conf

sudo chroot /mnt/ubuntu-build
```

Inside the chroot, configure the system:

```bash
# Set locale
locale-gen en_US.UTF-8
update-locale LANG=en_US.UTF-8

# Set timezone
ln -sf /usr/share/zoneinfo/UTC /etc/localtime
echo "UTC" > /etc/timezone

# Set hostname
echo "ubuntu-debootstrap" > /etc/hostname

# Configure /etc/hosts
cat > /etc/hosts << 'EOF'
127.0.0.1 localhost
127.0.1.1 ubuntu-debootstrap
::1       localhost ip6-localhost ip6-loopback
EOF

# Configure apt sources
cat > /etc/apt/sources.list << 'EOF'
deb http://archive.ubuntu.com/ubuntu noble main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu noble-updates main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu noble-security main restricted universe multiverse
EOF

# Update and install essential packages
apt update
apt install -y \
    linux-image-generic \
    linux-headers-generic \
    grub-efi-amd64 \
    systemd-sysv \
    networkd-dispatcher \
    systemd-resolved \
    openssh-server \
    sudo \
    vim

# Create a user
useradd -m -s /bin/bash -G sudo admin
echo "admin:password" | chpasswd
# Better: set up SSH key instead of password
mkdir -p /home/admin/.ssh
echo "ssh-ed25519 AAAA... your_key" > /home/admin/.ssh/authorized_keys
chown -R admin:admin /home/admin/.ssh
chmod 700 /home/admin/.ssh
chmod 600 /home/admin/.ssh/authorized_keys
```

### Step 4: Configure fstab

```bash
# Still inside chroot
# Get the UUIDs
BOOT_UUID=$(blkid -s UUID -o value ${LOOP}p1)
ROOT_UUID=$(blkid -s UUID -o value ${LOOP}p2)

cat > /etc/fstab << EOF
UUID=${ROOT_UUID}  /         ext4  defaults  0  1
UUID=${BOOT_UUID}  /boot/efi vfat  umask=0077  0  1
EOF
```

### Step 5: Install and Configure GRUB

```bash
# Still inside chroot
# Install GRUB to the EFI partition
grub-install --target=x86_64-efi --efi-directory=/boot/efi --bootloader-id=ubuntu

# Generate GRUB configuration
update-grub

# Verify GRUB was installed
ls /boot/efi/EFI/ubuntu/
# Should see grubx64.efi and other files
```

### Step 6: Network Configuration

```bash
# Still inside chroot, configure Netplan
mkdir -p /etc/netplan
cat > /etc/netplan/00-default.yaml << 'EOF'
network:
  version: 2
  ethernets:
    enp0s3:
      dhcp4: true
EOF
chmod 600 /etc/netplan/00-default.yaml

# Enable essential services
systemctl enable systemd-networkd
systemctl enable systemd-resolved
systemctl enable ssh
```

### Step 7: Exit and Clean Up

```bash
# Exit the chroot
exit

# Unmount everything in reverse order
sudo umount /mnt/ubuntu-build/sys/firmware/efi/efivars
sudo umount /mnt/ubuntu-build/sys
sudo umount /mnt/ubuntu-build/proc
sudo umount /mnt/ubuntu-build/dev/pts
sudo umount /mnt/ubuntu-build/dev
sudo umount /mnt/ubuntu-build/boot/efi
sudo umount /mnt/ubuntu-build

# Detach the loop device
sudo losetup -d $LOOP
```

The disk image is now bootable. Test it:

```bash
# Boot in QEMU to test
qemu-system-x86_64 \
    -enable-kvm \
    -m 2048 \
    -drive file=/tmp/ubuntu-disk.img \
    -drive file=/usr/share/OVMF/OVMF_CODE.fd,if=pflash,format=raw,readonly=on \
    -netdev user,id=net0,hostfwd=tcp::2222-:22 \
    -device virtio-net-pci,netdev=net0
```

## Creating a Minimal Docker Image with Debootstrap

```bash
# Create a minbase Ubuntu chroot
sudo debootstrap --variant=minbase noble /tmp/ubuntu-docker http://archive.ubuntu.com/ubuntu

# Optionally install additional packages inside the chroot
sudo chroot /tmp/ubuntu-docker apt install -y curl python3

# Package it as a Docker image
sudo tar -C /tmp/ubuntu-docker -czf ubuntu-noble-minimal.tar.gz .
docker import ubuntu-noble-minimal.tar.gz ubuntu-minimal:noble

# Test the image
docker run --rm -it ubuntu-minimal:noble bash
```

## Automating with a Script

```bash
#!/bin/bash
# debootstrap-ubuntu.sh - Create a minimal Ubuntu system

set -euo pipefail

SUITE="noble"
MIRROR="http://archive.ubuntu.com/ubuntu"
TARGET="/tmp/ubuntu-${SUITE}"
ARCH="amd64"

echo "Bootstrapping Ubuntu ${SUITE} for ${ARCH}..."
sudo debootstrap \
    --arch=${ARCH} \
    --variant=minbase \
    --include=apt,vim,openssh-server,sudo,systemd,networkd-dispatcher \
    ${SUITE} \
    ${TARGET} \
    ${MIRROR}

echo "Configuring system..."
echo "ubuntu-minimal" | sudo tee ${TARGET}/etc/hostname

sudo tee ${TARGET}/etc/apt/sources.list << EOF
deb ${MIRROR} ${SUITE} main restricted universe
deb ${MIRROR} ${SUITE}-updates main restricted universe
deb http://security.ubuntu.com/ubuntu ${SUITE}-security main restricted universe
EOF

echo "Bootstrap complete: ${TARGET}"
du -sh ${TARGET}
```

Debootstrap is the foundation tool that powers Ubuntu's entire packaging and distribution system. Understanding it demystifies what a Linux installation actually is: a carefully ordered sequence of package extractions and configuration scripts, organized into a coherent system. That understanding is valuable whether you are debugging a broken installation, building custom images, or just curious about how it all works.
