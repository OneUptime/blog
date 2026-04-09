# How to Install Ceph on Arch Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Arch Linux, Linux, Installation, Storage, AUR, Pacman

Description: Install Ceph on Arch Linux using pacman and AUR packages for development clusters and cutting-edge Ceph feature testing.

---

## Overview

Arch Linux is a rolling-release distribution that often carries the latest Ceph packages. It is well-suited for development, testing, and staying current with Ceph features. While not recommended for production storage clusters, Arch provides an excellent learning environment. This guide covers installing Ceph on Arch Linux.

## Prerequisites

- Arch Linux installation (up-to-date)
- At least 1 node (single-node for development)
- Additional disk or loop device for OSD
- Root or sudo access

## Step 1 - Install Ceph via Pacman

Arch Linux includes Ceph in the official repositories:

```bash
# Update package database
pacman -Syu

# Install Ceph and related packages
pacman -S ceph ceph-libs python-cephfs

# Check installed version
ceph --version
```

## Step 2 - Install cephadm

The AUR contains cephadm for orchestrated deployment:

```bash
# Using yay or paru AUR helper
yay -S cephadm

# Or build from AUR manually
git clone https://aur.archlinux.org/cephadm.git
cd cephadm
makepkg -si
```

Alternatively, download the script directly:

```bash
curl -fsSL https://download.ceph.com/rpm-squid/el9/noarch/cephadm \
  -o /usr/local/bin/cephadm
chmod +x /usr/local/bin/cephadm
```

## Step 3 - Create Loop Device for Development

```bash
# Create a sparse 20GB file for OSD
truncate -s 20G /var/lib/ceph-osd.img

# Attach as loop device
LOOP=$(losetup -f --show /var/lib/ceph-osd.img)
echo "OSD device: $LOOP"

# Add to systemd for persistence
cat > /etc/systemd/system/ceph-loop.service <<'EOF'
[Unit]
Description=Ceph OSD Loop Device
Before=ceph.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/losetup -f /var/lib/ceph-osd.img
ExecStop=/bin/sh -c 'losetup -d $(losetup -j /var/lib/ceph-osd.img | cut -d: -f1)'

[Install]
WantedBy=multi-user.target
EOF

systemctl enable ceph-loop
```

## Step 4 - Configure the Ceph Cluster Manually

For a minimal single-node development cluster on Arch:

```bash
# Generate a cluster UUID
UUID=$(uuidgen)

# Create ceph.conf
cat > /etc/ceph/ceph.conf <<EOF
[global]
fsid = $UUID
mon initial members = $(hostname -s)
mon host = 127.0.0.1
auth cluster required = cephx
auth service required = cephx
auth client required = cephx
osd journal size = 1024
osd pool default size = 1
osd pool default min size = 1
osd pool default pg num = 16
EOF
```

## Step 5 - Bootstrap with cephadm

```bash
# Ensure podman or docker is installed
pacman -S podman

# Bootstrap
cephadm bootstrap \
  --mon-ip 127.0.0.1 \
  --single-host-defaults \
  --skip-monitoring-stack
```

## Step 6 - Add OSD

```bash
LOOP=$(losetup -j /var/lib/ceph-osd.img | cut -d: -f1)
ceph orch daemon add osd $(hostname):$LOOP
```

## Step 7 - Verify Functionality

```bash
ceph -s
ceph osd tree

# Create a test pool and write data
ceph osd pool create arch-test 8
ceph osd pool set arch-test size 1
echo "test" | rados put obj1 - --pool arch-test
rados get obj1 - --pool arch-test
```

## Staying Current with Arch

Since Arch is rolling-release, Ceph updates arrive quickly:

```bash
# Update all packages including Ceph
pacman -Syu

# Check for Ceph-specific news
pacman -Qi ceph | grep -E "Version|Build"
```

## Summary

Ceph on Arch Linux is available directly from pacman, with `cephadm` available through the AUR. The rolling-release nature means you get the latest Ceph versions quickly, making Arch ideal for testing new features or staying current with Ceph development. Loop devices provide OSD backing for development without dedicated hardware. Production deployments should use more stable distributions.
