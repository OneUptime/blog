# How to Install Docker on Arch Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Arch Linux, Linux, Installation, DevOps, Containers, Pacman, Rolling Release

Description: How to install and configure Docker on Arch Linux using pacman, including storage driver setup, networking, and common troubleshooting steps.

---

Arch Linux takes a different approach from most distributions. Its rolling release model means you always get the latest software versions, and Docker is available directly from the official Arch repositories. No third-party repos needed. This makes installation straightforward, but the lack of preconfigured defaults means you need to handle some configuration yourself.

## Prerequisites

- An Arch Linux system with a working internet connection
- A non-root user with `sudo` access
- An up-to-date system (`sudo pacman -Syu` run recently)

## Step 1: Update the System

Arch is a rolling release distribution. Always update before installing new packages to avoid dependency mismatches.

```bash
# Full system upgrade
sudo pacman -Syu
```

Never install packages on a partially upgraded Arch system. This is the single most common source of breakage.

## Step 2: Install Docker

Docker is available in the official `extra` repository.

```bash
# Install Docker from the official Arch repos
sudo pacman -S docker
```

This installs the Docker Engine, CLI, containerd, and runc. Arch packages Docker as a single cohesive package rather than splitting it into multiple packages like Debian or Fedora do.

## Step 3: Start and Enable Docker

The Docker daemon does not start automatically after installation.

```bash
# Start Docker now
sudo systemctl start docker

# Enable Docker to start on every boot
sudo systemctl enable docker
```

Check the status.

```bash
# Verify Docker is running
sudo systemctl status docker
```

## Step 4: Verify the Installation

Run the standard test container.

```bash
# Test Docker with hello-world
sudo docker run hello-world
```

If you see the "Hello from Docker!" message, the installation is complete and working.

## Step 5: Run Docker Without Sudo

Add your user to the `docker` group to run Docker commands without `sudo`.

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER
```

Log out and log back in (or reboot) for the group change to take effect.

```bash
# Verify you can run Docker without sudo
docker info
```

## Step 6: Install Docker Compose

Docker Compose is packaged separately on Arch.

```bash
# Install Docker Compose
sudo pacman -S docker-compose
```

This installs the standalone `docker-compose` binary. For the plugin version that runs as `docker compose`, install `docker-buildx` as well.

```bash
# Install Docker Buildx for multi-platform builds
sudo pacman -S docker-buildx
```

## Configuring the Storage Driver

Arch Linux uses `btrfs` or `ext4` as the default filesystem depending on your installation choices. Docker defaults to the `overlay2` storage driver, which works well on ext4 and xfs. If your root partition is btrfs, consider switching Docker to the btrfs driver.

Check your current filesystem.

```bash
# Check the filesystem type of the Docker data directory
df -Th /var/lib/docker
```

For btrfs filesystems, configure Docker accordingly.

```bash
# Create daemon.json for btrfs storage driver
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "storage-driver": "btrfs"
}
EOF

# Restart Docker
sudo systemctl restart docker
```

For ext4 or xfs, stick with the default `overlay2` driver. No configuration change is needed.

Verify the active storage driver.

```bash
# Check which storage driver Docker is using
docker info | grep "Storage Driver"
```

## Enabling IP Forwarding

Arch Linux does not enable IP forwarding by default. Docker needs this for container networking.

```bash
# Check current IP forwarding status
sysctl net.ipv4.ip_forward
```

If it shows `0`, enable it.

```bash
# Enable IP forwarding immediately
sudo sysctl -w net.ipv4.ip_forward=1

# Make it persistent across reboots
sudo tee /etc/sysctl.d/99-docker.conf <<'EOF'
net.ipv4.ip_forward = 1
EOF

# Apply the setting
sudo sysctl --system
```

Without IP forwarding, containers will not be able to reach the internet.

## Configuring DNS for Containers

Arch Linux uses `systemd-resolved` by default, which listens on `127.0.0.53`. Docker containers cannot use this address because it refers to the host's loopback. You may need to specify external DNS servers.

```bash
# Configure Docker to use public DNS servers
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "dns": ["1.1.1.1", "8.8.8.8"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker to apply
sudo systemctl restart docker
```

Test DNS resolution inside a container.

```bash
# Test that containers can resolve domain names
docker run --rm alpine nslookup google.com
```

## Using Docker with Firewalld or Iptables

If you use `iptables` or `nftables` directly, Docker should work without any extra configuration. Docker manages its own chains in iptables.

If you use `firewalld` (less common on Arch), trust the Docker bridge interface.

```bash
# Trust the docker0 interface in firewalld
sudo firewall-cmd --permanent --zone=trusted --add-interface=docker0
sudo firewall-cmd --reload
```

## AUR Packages for Docker

The official Arch repository carries the stable Docker release. If you want a development or nightly build, the AUR has options.

```bash
# Install Docker from AUR (using an AUR helper like yay)
# Only do this if you need a non-stable version
yay -S docker-git
```

For most users, the official `pacman` package is the right choice. AUR builds can lag behind or introduce instability.

## Checking Docker Logs

When something goes wrong, check the system journal.

```bash
# View Docker daemon logs
journalctl -u docker --no-pager -n 50

# Follow Docker logs in real time
journalctl -u docker -f
```

## Docker on Arch with Wayland/X11 (GUI containers)

If you want to run GUI applications inside Docker (a common use case on Arch desktop setups), you need to pass the display socket.

```bash
# Run a GUI app in Docker with X11 forwarding
docker run -e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix firefox
```

For Wayland, the setup is more involved and depends on your compositor.

## Troubleshooting

### "Cannot connect to the Docker daemon"

Make sure the service is running.

```bash
# Check if dockerd is running
systemctl is-active docker
```

If it reports `inactive`, start it with `sudo systemctl start docker`.

### "failed to start daemon: error initializing graphdriver"

This usually means a storage driver mismatch. If you switched filesystems or changed the storage driver in `daemon.json`, you may need to clear the old data.

```bash
# WARNING: This deletes all Docker data (images, containers, volumes)
sudo rm -rf /var/lib/docker
sudo systemctl restart docker
```

### Kernel module issues

Docker requires certain kernel modules. Arch's default kernel includes them, but custom kernels might not.

```bash
# Check for required modules
lsmod | grep overlay
lsmod | grep br_netfilter
```

If missing, load them manually.

```bash
# Load required kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter
```

### Slow image pulls

Arch uses the system-wide network settings. If you are behind a proxy, configure Docker to use it.

```bash
# Create a systemd drop-in for Docker proxy settings
sudo mkdir -p /etc/systemd/system/docker.service.d
sudo tee /etc/systemd/system/docker.service.d/proxy.conf <<'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

## Summary

Installing Docker on Arch Linux is as simple as running `pacman -S docker`, but the real work lies in post-install configuration. Enable IP forwarding, configure DNS, set up the right storage driver, and add yourself to the `docker` group. Arch's rolling release model ensures you always have the latest Docker version without adding third-party repositories, making it an excellent choice for developers who want to stay on the cutting edge.
