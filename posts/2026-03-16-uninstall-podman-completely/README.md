# How to Uninstall Podman Completely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps

Description: A thorough guide to completely removing Podman from your system, including containers, images, volumes, configuration files, and all associated data.

---

> A complete Podman uninstallation requires removing not just the package but also all containers, images, volumes, and configuration files left behind.

Whether you are switching to a different container runtime or cleaning up a test environment, simply uninstalling the Podman package leaves behind significant data. This guide walks through a complete removal on every major platform.

---

## Prerequisites

- A system with Podman installed
- A user account with sudo privileges

## Step 1: Stop All Running Containers

Before uninstalling, stop and remove all containers:

```bash
# Stop all running containers (rootless)

podman stop --all

# Stop all running containers (rootful, if any)
sudo podman stop --all

# Remove all containers (rootless)
podman rm --all --force

# Remove all containers (rootful)
sudo podman rm --all --force
```

## Step 2: Remove All Images, Volumes, and Networks

```bash
# Remove all images (rootless)
podman rmi --all --force

# Remove all volumes (rootless)
podman volume rm --all --force

# Remove all networks except the default (rootless)
podman network prune --force

# Repeat for rootful
sudo podman rmi --all --force
sudo podman volume rm --all --force
sudo podman network prune --force
```

Or use the nuclear option:

```bash
# Reset everything in one command (rootless)
podman system reset --force

# Reset everything (rootful)
sudo podman system reset --force
```

## Step 3: Stop and Disable Podman Services

```bash
# Disable the user-level Podman socket
systemctl --user stop podman.socket
systemctl --user disable podman.socket

# Disable the user-level Podman service
systemctl --user stop podman.service 2>/dev/null
systemctl --user disable podman.service 2>/dev/null

# Disable system-level services if enabled
sudo systemctl stop podman.socket 2>/dev/null
sudo systemctl disable podman.socket 2>/dev/null
sudo systemctl stop podman.service 2>/dev/null
sudo systemctl disable podman.service 2>/dev/null
```

## Step 4: Remove Generated systemd Unit Files

```bash
# Remove user-generated container and pod services
rm -f ~/.config/systemd/user/container-*.service
rm -f ~/.config/systemd/user/pod-*.service

# Remove system-level generated container and pod services
sudo rm -f /etc/systemd/system/container-*.service
sudo rm -f /etc/systemd/system/pod-*.service

# Reload systemd
systemctl --user daemon-reload
sudo systemctl daemon-reload
```

## Step 5: Uninstall the Podman Package

### On Fedora

```bash
# Remove Podman and related packages
sudo dnf remove -y podman podman-docker podman-compose buildah skopeo

# Remove orphaned dependencies
sudo dnf autoremove -y
```

### On Debian / Ubuntu

```bash
# Remove Podman and related packages
sudo apt remove -y podman podman-docker buildah skopeo

# Remove configuration files too
sudo apt purge -y podman podman-docker buildah skopeo

# Clean up orphaned dependencies
sudo apt autoremove -y
```

### On CentOS Stream / RHEL

```bash
# Remove Podman and related packages
sudo dnf remove -y podman podman-docker buildah skopeo

# Remove orphaned dependencies
sudo dnf autoremove -y
```

### On Arch Linux

```bash
# Remove Podman and related packages
sudo pacman -Rns podman buildah skopeo

# Remove any IgnorePkg entries
sudo sed -i '/^IgnorePkg.*podman/d' /etc/pacman.conf
```

### On openSUSE

```bash
# Remove Podman and related packages
sudo zypper remove -y podman podman-docker buildah skopeo

# Remove any package locks
sudo zypper removelock podman 2>/dev/null
```

### On Alpine Linux

```bash
# Remove Podman
sudo apk del podman
```

### On macOS

```bash
# Stop and remove the Podman machine
podman machine stop
podman machine rm --force

# Uninstall via Homebrew
brew uninstall podman
brew uninstall podman-compose 2>/dev/null

# Remove the Podman formula cache
brew cleanup podman
```

### On Windows

```bash
# Stop and remove the machine
podman machine stop
podman machine rm --force

# Uninstall via winget
winget uninstall --id RedHat.Podman --exact
```

## Step 6: Remove Remaining Data and Configuration

```bash
# Remove rootless container storage
rm -rf ~/.local/share/containers
rm -rf ~/.config/containers

# Remove rootful container storage
sudo rm -rf /var/lib/containers

# Remove Podman runtime data
rm -rf $XDG_RUNTIME_DIR/podman
rm -rf $XDG_RUNTIME_DIR/containers
rm -rf /tmp/podman-run-$(id -u)

# Remove system-level configuration
sudo rm -rf /etc/containers
sudo rm -rf /etc/cni/net.d

# Remove Podman cache
rm -rf ~/.cache/containers
```

## Step 7: Clean Up subuid and subgid Entries

```bash
# Remove your user's entries from subuid and subgid (optional)
sudo sed -i "/^$(whoami):/d" /etc/subuid
sudo sed -i "/^$(whoami):/d" /etc/subgid
```

## Step 8: Remove Shell Aliases and Environment Variables

```bash
# Remove any Docker compatibility aliases
sed -i '/alias docker=podman/d' ~/.bashrc ~/.zshrc 2>/dev/null
sed -i '/DOCKER_HOST.*podman/d' ~/.bashrc ~/.zshrc 2>/dev/null

# Reload the shell configuration
source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null
```

## Step 9: Verify Complete Removal

```bash
# Confirm Podman is no longer installed
which podman 2>/dev/null && echo "Podman still found!" || echo "Podman removed successfully"

# Check for remaining files
ls ~/.local/share/containers 2>/dev/null && echo "Leftover data found" || echo "No leftover data"
ls ~/.config/containers 2>/dev/null && echo "Leftover config found" || echo "No leftover config"
ls /var/lib/containers 2>/dev/null && echo "Leftover system data found" || echo "No leftover system data"

# Check for remaining services
systemctl --user list-units | grep podman
sudo systemctl list-units | grep podman
```

## Complete Uninstallation Script

Here is a comprehensive script for Fedora-based systems:

```bash
#!/bin/bash
# uninstall-podman.sh - Complete Podman removal

echo "Stopping all containers..."
podman stop --all 2>/dev/null
sudo podman stop --all 2>/dev/null

echo "Resetting Podman..."
podman system reset --force 2>/dev/null
sudo podman system reset --force 2>/dev/null

echo "Disabling services..."
systemctl --user stop podman.socket 2>/dev/null
systemctl --user disable podman.socket 2>/dev/null
systemctl --user stop podman.service 2>/dev/null
systemctl --user disable podman.service 2>/dev/null
sudo systemctl stop podman.socket 2>/dev/null
sudo systemctl disable podman.socket 2>/dev/null
sudo systemctl stop podman.service 2>/dev/null
sudo systemctl disable podman.service 2>/dev/null

echo "Removing packages..."
sudo dnf remove -y podman podman-docker buildah skopeo 2>/dev/null
sudo dnf autoremove -y

echo "Cleaning up data..."
rm -rf ~/.local/share/containers
rm -rf ~/.config/containers
rm -rf ~/.cache/containers
sudo rm -rf /var/lib/containers
sudo rm -rf /etc/containers

echo "Cleaning up shell configuration..."
sed -i '/alias docker=podman/d' ~/.bashrc 2>/dev/null
sed -i '/DOCKER_HOST.*podman/d' ~/.bashrc 2>/dev/null

echo "Podman has been completely removed."
```

## Troubleshooting

If `podman system reset` fails:

```bash
# Manually remove the storage directories
rm -rf ~/.local/share/containers
sudo rm -rf /var/lib/containers
```

If package removal fails due to dependencies:

```bash
# Force remove on Fedora
sudo rpm -e --nodeps podman

# Force remove on Debian
sudo dpkg --remove --force-depends podman
```

## Summary

Completely uninstalling Podman requires more than just removing the package. You need to stop all containers, reset storage, disable services, remove configuration files, and clean up shell aliases. The verification steps at the end ensure nothing is left behind. Save the uninstallation script for quick cleanup of test environments.
