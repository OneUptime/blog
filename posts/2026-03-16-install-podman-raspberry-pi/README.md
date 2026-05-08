# How to Install Podman on Raspberry Pi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, Raspberry Pi

Description: Learn how to install Podman on a Raspberry Pi running Raspberry Pi OS, including ARM-specific configuration and lightweight container examples.

---

> Podman's daemonless architecture is ideal for the Raspberry Pi, consuming fewer resources than Docker while providing full container support on ARM.

The Raspberry Pi is a versatile platform for home labs, IoT projects, and edge computing. Podman's lightweight, daemonless design makes it a better fit than Docker for the Pi's limited resources. This guide covers installing Podman on Raspberry Pi OS (Debian-based) for both 32-bit and 64-bit ARM systems.

---

## Prerequisites

- Raspberry Pi 3, 4, or 5 (2GB RAM minimum recommended)
- Raspberry Pi OS (Bullseye or Bookworm)
- SSH or terminal access with sudo privileges
- An active internet connection

## Step 1: Update Your System

```bash
# Update package lists and upgrade all packages

sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Podman

On Raspberry Pi OS Bookworm (Debian 12-based):

```bash
# Install Podman directly from the repositories
sudo apt install -y podman
```

On Raspberry Pi OS Bullseye (Debian 11-based):

```bash
# Install Podman from the standard repository
sudo apt install -y podman
```

Bullseye backports have been discontinued. If you need a newer Podman version than Bullseye provides, upgrade to Raspberry Pi OS Bookworm or later.

## Step 3: Install Rootless Dependencies

```bash
# Install required packages for rootless operation
sudo apt install -y slirp4netns uidmap fuse-overlayfs
```

## Step 4: Verify the Installation

```bash
# Check the Podman version
podman --version

# Verify ARM architecture support
podman info | grep -i arch

# Display full system information
podman info
```

## Step 5: Configure Rootless Containers

```bash
# Verify subuid and subgid mappings exist
grep $(whoami) /etc/subuid
grep $(whoami) /etc/subgid

# Add them if they do not exist
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)
```

## Step 6: Configure Storage for the Pi

The Raspberry Pi typically uses an SD card. Use the `overlay` storage driver with `fuse-overlayfs` for rootless containers; `vfs` is a fallback but uses more disk space and is slower:

```bash
# Create user-level container configuration
mkdir -p ~/.config/containers

# Use fuse-overlayfs for better performance on SD cards
cat > ~/.config/containers/storage.conf <<EOF
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF
```

For Pi setups with an external SSD, redirect container storage:

```bash
# If you have an external SSD mounted at /mnt/ssd
# Configure Podman to use it for storage
sudo mkdir -p /mnt/ssd/containers/storage
sudo chown -R $(whoami):$(id -gn) /mnt/ssd/containers

cat > ~/.config/containers/storage.conf <<EOF
[storage]
driver = "overlay"
graphroot = "/mnt/ssd/containers/storage"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF
```

## Step 7: Run a Test Container

```bash
# Run a test container with an ARM-compatible image
podman run --rm docker.io/library/hello-world

# Run an ARM-native Alpine container
podman run --rm -it docker.io/library/alpine:latest uname -m
```

## Running a Practical Example

Deploy a lightweight monitoring stack on your Pi:

```bash
# Run a Node Exporter container for system metrics
podman run -d \
  --name node-exporter \
  --net=host \
  --pid=host \
  -v /:/host:ro \
  docker.io/prom/node-exporter:latest \
  --path.rootfs=/host

# Verify it is running
podman ps

# Check metrics are available
curl -s http://localhost:9100/metrics | head -20

# Clean up
podman stop node-exporter
podman rm node-exporter
```

Run a lightweight web server for a home project:

```bash
# Create a simple web page
mkdir -p ~/my-website
echo "<h1>Hello from Raspberry Pi</h1>" > ~/my-website/index.html

# Serve it with Nginx
podman run -d \
  --name pi-web \
  -p 8080:80 \
  -v ~/my-website:/usr/share/nginx/html:ro \
  docker.io/library/nginx:alpine

# Access it from another device on your network
# http://<pi-ip-address>:8080
hostname -I

# Clean up
podman stop pi-web
podman rm pi-web
```

## Performance Tips

Optimize Podman for the Raspberry Pi's limited resources:

```bash
# Limit container resources to prevent overwhelming the Pi
podman run -d \
  --name limited-app \
  --memory=256m \
  --cpus=1 \
  -p 3000:3000 \
  docker.io/library/node:alpine

# Monitor container resource usage
podman stats --no-stream

# Prune unused images to free SD card space
podman image prune -a

# Clean up all unused resources
podman system prune -a
```

## Auto-Starting Containers on Boot

```bash
# Create a stopped container for systemd to use as a template
podman create \
  --name pi-web \
  -p 8080:80 \
  -v ~/my-website:/usr/share/nginx/html:ro \
  docker.io/library/nginx:alpine

# Generate a systemd service for the container
mkdir -p ~/.config/systemd/user
podman generate systemd --new --name pi-web > ~/.config/systemd/user/container-pi-web.service

# Enable the service
systemctl --user daemon-reload
systemctl --user enable container-pi-web.service

# Enable lingering for the pi user
sudo loginctl enable-linger $(whoami)
```

## Troubleshooting

If you encounter out-of-memory errors:

```bash
# Check available memory
free -h

# Enable swap if not already active
sudo dphys-swapfile swapoff
sudo sed -i 's/CONF_SWAPSIZE=.*/CONF_SWAPSIZE=2048/' /etc/dphys-swapfile
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

If image pulls fail on 32-bit Pi OS, ensure you pull ARM-compatible images:

```bash
# Specify the ARM platform explicitly
podman pull --platform linux/arm/v7 docker.io/library/alpine:latest
```

## Summary

Podman runs efficiently on the Raspberry Pi thanks to its daemonless design. By using an external SSD for storage, setting resource limits, and choosing ARM-optimized images, you can run production containers on even a Raspberry Pi 3. The combination of low overhead and rootless security makes Podman the ideal container runtime for Pi-based projects.
