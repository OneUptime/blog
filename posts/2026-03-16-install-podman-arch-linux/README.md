# How to Install Podman on Arch Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, Arch Linux

Description: Learn how to install and configure Podman on Arch Linux, including rootless setup, storage configuration, and running containers.

---

> Arch Linux's rolling release model ensures you always have access to the latest Podman version through the official repositories.

Arch Linux is popular among developers who want the latest software. Thanks to its rolling release model, Podman packages in Arch are updated quickly after upstream releases. This guide walks you through installing Podman on Arch Linux, configuring it for rootless operation, and running your first containers.

---

## Prerequisites

- An Arch Linux system with a working installation
- A user account with sudo privileges
- An active internet connection

## Step 1: Update Your System

Always synchronize your package database before installing new packages:

```bash
# Synchronize package databases and upgrade all packages

sudo pacman -Syu
```

## Step 2: Install Podman

Install Podman from the official Arch repositories:

```bash
# Install Podman and recommended dependencies
sudo pacman -S podman buildah skopeo
```

Install additional packages commonly used with rootless containers:

```bash
# Install dependencies for rootless operation
sudo pacman -S passt fuse-overlayfs crun
```

## Step 3: Verify the Installation

Confirm Podman is installed:

```bash
# Check the Podman version
podman --version

# View detailed system information
podman info
```

## Step 4: Configure Rootless Containers

Arch Linux requires manual setup for subordinate UID/GID mappings:

```bash
# Check if /etc/subuid and /etc/subgid exist
ls -la /etc/subuid /etc/subgid 2>/dev/null
```

Create the files and add your user:

```bash
# Create subuid and subgid entries for your user
sudo touch /etc/subuid /etc/subgid
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)

# Verify the entries
cat /etc/subuid
cat /etc/subgid
```

## Step 5: Configure Storage

Set up the storage driver for rootless Podman if your system needs `fuse-overlayfs`:

```bash
# Create the local containers configuration directory
mkdir -p ~/.config/containers

# Configure storage to use fuse-overlayfs for rootless mode when native overlay is unavailable
cat > ~/.config/containers/storage.conf <<EOF
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF
```

## Step 6: Configure Container Registries

Set up default registries for pulling images:

```bash
# Create registries configuration
sudo tee /etc/containers/registries.conf.d/00-shortnames.conf <<EOF
unqualified-search-registries = ['docker.io', 'quay.io', 'ghcr.io']
EOF
```

## Step 7: Run Your First Container

Test the installation:

```bash
# Run a test container as a rootless user
podman run --rm docker.io/library/hello-world
```

If this succeeds, your Podman installation is working correctly.

## Step 8: Enable the Podman Socket

Enable Docker API compatibility:

```bash
# Enable the user-level Podman socket
systemctl --user enable --now podman.socket

# Verify the socket
systemctl --user status podman.socket

# Set the Docker host environment variable
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock' >> ~/.bashrc
source ~/.bashrc
```

## Running a Practical Example

Run a Redis container to test a real workload:

```bash
# Start a Redis container
podman run -d \
  --name my-redis \
  -p 6379:6379 \
  docker.io/library/redis:latest

# Verify it is running
podman ps

# Test the connection (install redis-cli if needed: sudo pacman -S redis)
redis-cli ping

# View container resource usage
podman stats --no-stream my-redis

# Clean up
podman stop my-redis
podman rm my-redis
```

## Installing from AUR (Alternative)

If you need a development version, you can use the AUR:

```bash
# Install an AUR helper if you do not have one
sudo pacman -S --needed base-devel git

# Clone and build podman-git from AUR (using yay as an example)
# First install yay if needed
git clone https://aur.archlinux.org/yay.git /tmp/yay
cd /tmp/yay && makepkg -si

# Then install the git version of Podman
yay -S podman-git
```

## Troubleshooting

If you get `ERRO[0000] cannot find newuidmap` errors:

```bash
# Install shadow package which provides newuidmap
sudo pacman -S shadow
```

If overlay storage fails in rootless mode on a system that cannot use native rootless overlay:

```bash
# Ensure fuse-overlayfs is installed, use the storage.conf example above if needed, and reset storage
sudo pacman -S fuse-overlayfs
podman system reset
```

If `podman info` shows warnings about `cgroup v2`:

```bash
# Arch Linux uses cgroup v2 by default, which Podman supports
# Ensure your kernel has cgroup v2 enabled
cat /sys/fs/cgroup/cgroup.controllers
```

## Summary

Podman on Arch Linux benefits from the rolling release model, giving you access to the newest features. With rootless overlay storage support and `pasta` from the `passt` package for networking, you get a complete rootless container environment. The AUR provides additional options for development builds.
