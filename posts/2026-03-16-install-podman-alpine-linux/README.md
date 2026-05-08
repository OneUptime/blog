# How to Install Podman on Alpine Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, Alpine Linux

Description: A practical guide to installing Podman on Alpine Linux, covering package installation, rootless configuration, and container management on a minimal system.

---

> Alpine Linux's minimal footprint combined with Podman's daemonless architecture creates an extremely lightweight container host.

Alpine Linux is known for its small size and security focus, making it a popular choice for container hosts and embedded systems. Podman is available in Alpine's community repository and pairs well with Alpine's minimalist philosophy. This guide walks you through installation and configuration.

---

## Prerequisites

- Alpine Linux 3.16 or later
- A user account with root or sudo access
- An active internet connection

## Step 1: Enable the Community Repository

Podman is in the Alpine community repository. Ensure it is enabled:

```bash
# Check if community repo is enabled

cat /etc/apk/repositories

# If the community line is commented out, enable it
sudo sed -i 's|#\(.*community\)|\1|' /etc/apk/repositories
```

## Step 2: Update Package Index

Refresh the package cache:

```bash
# Update the package index
sudo apk update

# Upgrade installed packages
sudo apk upgrade
```

## Step 3: Install Podman

Install Podman and its dependencies:

```bash
# Install Podman with rootless dependencies
sudo apk add podman fuse-overlayfs slirp4netns shadow shadow-subids
```

The `shadow-subids` package provides `newuidmap` and `newgidmap` needed for rootless containers, and the `shadow` package provides `usermod`.

## Step 4: Configure the Kernel Modules

Load the required kernel modules:

```bash
# Load the tun module for networking
sudo modprobe tun

# Make it persistent across reboots
echo "tun" | sudo tee -a /etc/modules
```

## Step 5: Configure Rootless Containers

Set up subordinate UID/GID mappings:

```bash
# Create subuid and subgid files if they do not exist
sudo touch /etc/subuid /etc/subgid

# Add your user (replace 'youruser' with your actual username)
sudo usermod --add-subuids 100000-165535 youruser
sudo usermod --add-subgids 100000-165535 youruser

# Verify the mappings
cat /etc/subuid
cat /etc/subgid
```

## Step 6: Configure Storage

Set up the storage driver for rootless Podman:

```bash
# Create the user-level configuration directory
mkdir -p ~/.config/containers

# Set up overlay storage with fuse-overlayfs
cat > ~/.config/containers/storage.conf <<EOF
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF
```

## Step 7: Enable cgroups

Alpine Linux supports cgroups v2, and current Alpine releases use unified cgroups by default. Enable the cgroups service so Podman can use cgroups for resource management:

```bash
# Check if cgroups v2 is enabled
mount | grep cgroup2

# If using OpenRC, enable the cgroups service
sudo rc-update add cgroups default
sudo rc-service cgroups start
```

## Step 8: Verify the Installation

Test that Podman works:

```bash
# Check the version
podman --version

# View system information
podman info

# Run a test container
podman run --rm docker.io/library/hello-world
```

## Step 9: Configure Registries

Set up default container registries:

```bash
# Configure search registries
sudo tee /etc/containers/registries.conf <<EOF
unqualified-search-registries = ['docker.io', 'quay.io']
EOF
```

## Running a Practical Example

Run a lightweight Alpine-based container:

```bash
# Run an Alpine container interactively
podman run -it --rm docker.io/library/alpine:latest sh

# Inside the container, you can run commands
# apk add curl
# curl -s https://httpbin.org/ip
# exit
```

Deploy a lightweight web server:

```bash
# Run a simple HTTP server
podman run -d \
  --name web \
  -p 8080:80 \
  docker.io/library/nginx:alpine

# Test it
wget -qO- http://localhost:8080

# Clean up
podman stop web
podman rm web
```

## Using Podman with OpenRC

Alpine uses OpenRC instead of systemd. To auto-start containers at boot, create an OpenRC service:

```bash
# Create an OpenRC service for a container
sudo tee /etc/init.d/podman-web <<'EOF'
#!/sbin/openrc-run

name="podman-web"
description="Podman Web Container"

depend() {
    need net
    after firewall
}

start() {
    ebegin "Starting ${name}"
    podman start web || podman run -d --name web -p 8080:80 docker.io/library/nginx:alpine
    eend $?
}

stop() {
    ebegin "Stopping ${name}"
    podman stop web
    eend $?
}
EOF

# Make it executable and enable it
sudo chmod +x /etc/init.d/podman-web
sudo rc-update add podman-web default
```

## Troubleshooting

If you get permission errors running rootless containers:

```bash
# Ensure your user can access /dev/fuse
ls -la /dev/fuse

# Add your user to the fuse group if needed
sudo addgroup youruser fuse
```

If networking fails inside containers:

```bash
# Check that slirp4netns is installed
which slirp4netns

# Verify the tun device exists
ls -la /dev/net/tun
```

## Summary

Podman on Alpine Linux creates a minimal yet powerful container host. While Alpine uses OpenRC instead of systemd, Podman works well with some additional configuration for rootless mode and cgroups. The combination of Alpine's small footprint and Podman's daemonless design is ideal for resource-constrained environments.
