# How to Install and Manage Snap Packages on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Snap, Package Management, Applications, Tutorial

Description: Complete guide to using Snap packages on Ubuntu for installing, updating, and managing containerized applications.

---

Snap is Ubuntu's universal package format that bundles applications with their dependencies. Snaps are sandboxed, auto-updating, and work across different Linux distributions.

## Prerequisites

- Ubuntu 16.04 or later (Snap is pre-installed on 18.04+)
- Root or sudo access

## Install Snapd (If Not Installed)

```bash
# Install snapd
sudo apt update
sudo apt install snapd -y

# Verify installation
snap version
```

## Basic Snap Commands

### Search for Snaps

```bash
# Search snap store
snap find keyword

# Example
snap find video-editor
snap find vscode
```

### Install Snaps

```bash
# Install snap
sudo snap install package-name

# Example
sudo snap install code --classic
sudo snap install firefox
sudo snap install slack

# Install specific channel
sudo snap install package-name --channel=edge
```

### List Installed Snaps

```bash
# List all installed snaps
snap list

# Detailed list
snap list --all
```

### View Snap Info

```bash
# Show snap details
snap info package-name

# Example
snap info firefox
```

### Remove Snaps

```bash
# Remove snap
sudo snap remove package-name

# Remove with all data
sudo snap remove package-name --purge
```

## Snap Channels

Snaps have different release channels:

| Channel | Description |
|---------|-------------|
| stable | Production-ready |
| candidate | Testing before stable |
| beta | Feature testing |
| edge | Latest development |

```bash
# Install from specific channel
sudo snap install package-name --channel=beta

# Switch channel
sudo snap switch --channel=stable package-name
sudo snap refresh package-name
```

## Update Management

### Update Snaps

```bash
# Update all snaps
sudo snap refresh

# Update specific snap
sudo snap refresh package-name

# Check for updates
snap refresh --list
```

### Configure Auto-Updates

```bash
# Set refresh time (4 times daily by default)
sudo snap set system refresh.timer=00:00~24:00/4

# Set specific times
sudo snap set system refresh.timer=mon,04:00

# Disable auto-refresh (not recommended)
sudo snap set system refresh.hold="$(date --iso-8601=seconds -d '+30 days')"
```

### Revert to Previous Version

```bash
# Revert to previous revision
sudo snap revert package-name
```

## Snap Revisions

### List Revisions

```bash
# Show all revisions of a snap
snap list --all | grep package-name
```

### Remove Old Revisions

```bash
# Snaps keep 2 revisions by default
# Set retention limit
sudo snap set system refresh.retain=2

# Remove old revisions manually
#!/bin/bash
snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do
    sudo snap remove "$snapname" --revision="$revision"
done
```

## Snap Connections (Permissions)

### View Connections

```bash
# List all connections
snap connections

# Connections for specific snap
snap connections package-name
```

### Manage Permissions

```bash
# Connect interface
sudo snap connect package-name:interface

# Disconnect interface
sudo snap disconnect package-name:interface

# Common interfaces
# audio-playback, camera, home, network, removable-media
```

### Grant Home Directory Access

```bash
# Connect home interface
sudo snap connect package-name:home

# Connect removable media
sudo snap connect package-name:removable-media
```

## Classic Confinement

Some snaps need classic confinement (full system access):

```bash
# Install classic snap
sudo snap install code --classic
sudo snap install lxd --classic
sudo snap install go --classic
```

## Snap Services

### Manage Services

```bash
# List services
snap services

# Start service
sudo snap start package-name.service

# Stop service
sudo snap stop package-name.service

# Restart service
sudo snap restart package-name.service

# View logs
sudo snap logs package-name
sudo snap logs -f package-name  # Follow
```

## Aliases

```bash
# List aliases
snap aliases

# Create alias
sudo snap alias package-name.command alias-name

# Remove alias
sudo snap unalias alias-name
```

## Snap Store

### Browse Categories

```bash
# GUI store
snap-store

# Or use web browser
# https://snapcraft.io/store
```

### Popular Snaps

```bash
# Development
sudo snap install code --classic
sudo snap install postman
sudo snap install gitkraken --classic

# Communication
sudo snap install slack
sudo snap install discord
sudo snap install zoom-client

# Utilities
sudo snap install vlc
sudo snap install gimp
sudo snap install obs-studio
```

## Disk Space Management

### Check Snap Disk Usage

```bash
# Check /var/lib/snapd size
du -sh /var/lib/snapd

# Check individual snaps
du -sh /var/lib/snapd/snaps/*
```

### Clean Up

```bash
# Remove disabled snaps
sudo snap remove --purge package-name

# Clear snap cache
sudo rm /var/lib/snapd/cache/*
```

## Troubleshooting

### Snap Won't Install

```bash
# Check snapd is running
sudo systemctl status snapd

# Restart snapd
sudo systemctl restart snapd

# Check for errors
journalctl -u snapd -n 50
```

### Snap Won't Start

```bash
# Check snap logs
snap logs package-name

# Try running from terminal
snap run package-name

# Check connections/permissions
snap connections package-name
```

### "Too Early for Operation"

```bash
# Wait for seeding to complete
snap changes
# Wait for changes to complete, then retry
```

### Reset Snap

```bash
# Remove and reinstall
sudo snap remove package-name --purge
sudo snap install package-name
```

## Disable/Enable Snaps

```bash
# Disable snap (keeps data)
sudo snap disable package-name

# Enable snap
sudo snap enable package-name
```

## Snap vs APT

| Feature | Snap | APT |
|---------|------|-----|
| Sandboxing | Yes | No |
| Auto-updates | Yes | Manual |
| Bundle size | Larger | Smaller |
| Dependency conflicts | None | Possible |
| System integration | Limited | Full |

## Remove Snapd Completely

If you prefer not to use Snap:

```bash
# List installed snaps
snap list

# Remove all snaps
for snap in $(snap list | awk 'NR>1 {print $1}'); do
    sudo snap remove --purge "$snap"
done

# Remove snapd
sudo apt purge snapd -y
sudo rm -rf /var/cache/snapd /snap

# Prevent reinstallation
sudo apt-mark hold snapd
```

---

Snap provides easy installation and management of applications with automatic updates and sandboxing. While snaps are larger than traditional packages, they eliminate dependency issues and work consistently across Linux distributions.
