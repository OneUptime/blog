# How to Set Up Rootless Podman for the First Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Security, Setup

Description: Learn how to set up rootless Podman for the first time to run containers securely without root privileges.

---

> Rootless Podman lets you run containers as a regular user without running the container runtime as root, providing a significant security improvement over traditional root-based container runtimes.

Running containers as root is a security concern because a container escape could give an attacker full root access to the host. Rootless Podman reduces this risk by running containers as an unprivileged user, using Linux user namespaces for isolation.

---

## Prerequisites

Ensure your system meets the requirements:

```bash
# Check your Linux kernel version (4.18+ recommended)

uname -r

# On Debian/Ubuntu, verify unprivileged user namespaces are enabled
if [ -f /proc/sys/kernel/unprivileged_userns_clone ]; then
  cat /proc/sys/kernel/unprivileged_userns_clone
fi
# Should output: 1

# If it shows 0, enable it (requires root)
sudo sysctl -w kernel.unprivileged_userns_clone=1
# To make it permanent:
echo "kernel.unprivileged_userns_clone=1" | sudo tee /etc/sysctl.d/userns.conf
```

## Installing Podman

```bash
# Fedora / RHEL / CentOS
sudo dnf install -y podman passt

# Ubuntu / Debian
sudo apt-get update
sudo apt-get install -y podman passt uidmap

# Arch Linux
sudo pacman -S podman passt

# Verify the installation
podman --version
```

## Configuring subuid and subgid

Rootless containers require subordinate UID/GID mappings:

```bash
# Check if your user has subuid and subgid entries
grep "$USER" /etc/subuid
grep "$USER" /etc/subgid

# If entries are missing, add them (requires root)
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Verify the entries
cat /etc/subuid
cat /etc/subgid
# Should show: username:100000:65536
```

## Setting Up the User Namespace

```bash
# Initialize the user namespace mappings
podman system migrate

# Verify the namespace is working
podman unshare cat /proc/self/uid_map
```

## Running Your First Rootless Container

```bash
# Pull and run a container as your regular user (no sudo needed)
podman run --rm hello-world

# Run an interactive container
podman run -it --rm alpine:latest sh

# Verify you are running rootless
podman info --format '{{.Host.Security.Rootless}}'
# Should output: true
```

## Configuring Storage

```bash
# Check the default storage configuration
podman info --format '{{.Store.GraphRoot}}'
# Should be something like: /home/username/.local/share/containers/storage

# If needed, customize storage in storage.conf
mkdir -p ~/.config/containers
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"
graphroot = "$HOME/.local/share/containers/storage"
EOF
```

## Enabling Lingering for Background Containers

```bash
# Enable lingering so containers keep running after logout
loginctl enable-linger $USER

# Verify lingering is enabled
loginctl show-user $USER | grep Linger
# Should show: Linger=yes
```

## Verifying the Setup

```bash
# Run a comprehensive check
podman info | head -30

# Test networking
podman run --rm alpine:latest ping -c 1 8.8.8.8

# Test port publishing
podman run -d --name test-web -p 8080:80 nginx:latest
curl http://localhost:8080
podman rm -f test-web
```

## Summary

Setting up rootless Podman involves installing Podman, configuring subuid/subgid mappings for your user, verifying user namespace support, and enabling lingering for background containers. Once configured, you can run Podman commands as your regular user without sudo, providing a significant security improvement. Rootless Podman uses Linux user namespaces to isolate containers, meaning a container escape does not automatically gain root access to the host.
