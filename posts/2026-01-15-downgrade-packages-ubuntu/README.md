# How to Downgrade Packages on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, APT, Package Management, Downgrade, Tutorial

Description: Step-by-step guide to safely downgrading packages to previous versions on Ubuntu when updates cause issues.

---

Sometimes package updates introduce bugs, break compatibility, or cause unexpected issues. Ubuntu allows you to downgrade packages to previous versions when needed. This guide covers safe downgrade procedures.

## Prerequisites

- Ubuntu 18.04 or later
- Root or sudo access
- Knowledge of the package you want to downgrade

## Check Current Package Version

```bash
# Check installed version
apt show package-name | grep Version

# Example: Check nginx version
apt show nginx | grep Version

# Or use dpkg
dpkg -l | grep package-name
```

## List Available Versions

### From APT Cache

```bash
# List all available versions
apt-cache policy package-name

# Example: Check nginx versions
apt-cache policy nginx
```

Output shows:
- Installed version
- Candidate (default for install/upgrade)
- Version table with available versions and repositories

### Using Madison

```bash
# Show versions from all repositories
apt-cache madison package-name

# Example
apt-cache madison nginx
```

## Downgrade Using APT

### Basic Downgrade

```bash
# Install specific version
sudo apt install package-name=version

# Example: Downgrade nginx to specific version
sudo apt install nginx=1.18.0-0ubuntu1
```

### Downgrade with Dependencies

```bash
# Allow downgrades during install
sudo apt install package-name=version --allow-downgrades

# Example with multiple packages
sudo apt install nginx=1.18.0-0ubuntu1 nginx-common=1.18.0-0ubuntu1 --allow-downgrades
```

## Downgrade Using dpkg

### Download and Install .deb

```bash
# Download specific version from Ubuntu archives
# Format: http://archive.ubuntu.com/ubuntu/pool/main/n/nginx/

# Download the package
wget http://archive.ubuntu.com/ubuntu/pool/main/n/nginx/nginx_1.18.0-0ubuntu1_amd64.deb

# Install using dpkg
sudo dpkg -i nginx_1.18.0-0ubuntu1_amd64.deb

# Fix dependencies if needed
sudo apt install -f
```

### Find Package URLs

```bash
# Search Ubuntu package archive
# Visit: https://packages.ubuntu.com

# Or use apt-cache to find source
apt-cache showpkg package-name
```

## Prevent Auto-Upgrade After Downgrade

After downgrading, prevent APT from automatically upgrading the package:

```bash
# Hold package at current version
sudo apt-mark hold package-name

# Example
sudo apt-mark hold nginx

# Verify hold status
apt-mark showhold
```

To allow updates later:

```bash
# Remove hold
sudo apt-mark unhold package-name
```

## Downgrade Kernel

### List Installed Kernels

```bash
# List installed kernels
dpkg --list | grep linux-image
```

### Boot into Previous Kernel

1. Reboot system
2. Hold Shift during boot (BIOS) or press Esc (UEFI)
3. Select "Advanced options for Ubuntu"
4. Choose older kernel version

### Set Default Kernel

```bash
# Edit GRUB configuration
sudo nano /etc/default/grub

# Change GRUB_DEFAULT to specific kernel
# GRUB_DEFAULT="Advanced options for Ubuntu>Ubuntu, with Linux 5.15.0-91-generic"

# Update GRUB
sudo update-grub
```

### Remove Newer Kernel

```bash
# Remove specific kernel version
sudo apt remove linux-image-5.15.0-92-generic

# Clean up
sudo apt autoremove
```

## Downgrade from PPA

If a PPA package caused issues:

```bash
# Use ppa-purge to downgrade to official version
sudo apt install ppa-purge

# Purge PPA and downgrade packages
sudo ppa-purge ppa:repository/ppa

# Example
sudo ppa-purge ppa:ondrej/php
```

## Create Downgrade Script

For complex downgrades affecting multiple packages:

```bash
#!/bin/bash
# downgrade-app.sh - Downgrade application to specific version

APP_NAME="myapp"
TARGET_VERSION="1.2.3"

# List related packages
PACKAGES=$(dpkg -l | grep $APP_NAME | awk '{print $2}')

echo "Packages to downgrade:"
echo "$PACKAGES"

# Downgrade each package
for pkg in $PACKAGES; do
    echo "Downgrading $pkg to $TARGET_VERSION..."
    sudo apt install "$pkg=$TARGET_VERSION" --allow-downgrades -y
done

# Hold packages
for pkg in $PACKAGES; do
    sudo apt-mark hold "$pkg"
done

echo "Downgrade complete. Packages held at $TARGET_VERSION"
```

## Using Synaptic (GUI)

For desktop users:

```bash
# Install Synaptic
sudo apt install synaptic
```

1. Open Synaptic Package Manager
2. Search for package
3. Select package → Package menu → Force Version
4. Choose desired version
5. Apply changes

## Best Practices

### Before Downgrading

```bash
# Create system snapshot if using LVM/btrfs
# Or backup important files

# Document current versions
dpkg -l > ~/package-list-before.txt

# Check package dependencies
apt-cache depends package-name
apt-cache rdepends package-name
```

### Test in Isolation

```bash
# Use container to test downgrade
docker run -it ubuntu:22.04 bash

# Inside container
apt update
apt install package-name=old-version
# Test functionality
```

## Troubleshooting

### Version Not Available

```bash
# If version not in cache, check older releases
# Add old release repository temporarily
echo "deb http://old-releases.ubuntu.com/ubuntu/ focal main" | sudo tee /etc/apt/sources.list.d/focal.list
sudo apt update

# Install from old release
sudo apt install package-name=version

# Remove old release repo after
sudo rm /etc/apt/sources.list.d/focal.list
sudo apt update
```

### Dependency Conflicts

```bash
# Simulate installation to see conflicts
apt install -s package-name=version

# Force install ignoring dependencies (risky)
sudo dpkg --force-depends -i package.deb
```

### Broken Package State

```bash
# Fix broken packages
sudo apt --fix-broken install

# Reconfigure packages
sudo dpkg --configure -a

# Force removal if needed
sudo dpkg --remove --force-remove-reinstreq package-name
```

## Downgrade Snap Packages

For Snap packages:

```bash
# List available revisions
snap info package-name

# Revert to previous revision
sudo snap revert package-name

# Install specific revision
sudo snap refresh package-name --revision=123
```

## Downgrade Flatpak

```bash
# List commits
flatpak remote-info --log flathub org.application.Name

# Downgrade to specific commit
sudo flatpak update --commit=abc123def org.application.Name
```

---

Downgrading packages is a useful recovery technique when updates cause problems. Always hold downgraded packages to prevent automatic re-upgrade, and consider the root cause of issues before making permanent changes. For critical systems, test downgrades in isolated environments first.
