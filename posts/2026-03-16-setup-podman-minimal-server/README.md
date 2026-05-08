# How to Set Up Podman on a Minimal Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps

Description: Learn how to install and configure Podman on a minimal Linux server installation with no desktop environment, optimized for headless container workloads.

---

> A minimal server with Podman gives you a lean, secure container host with the smallest possible attack surface.

Minimal server installations strip away unnecessary packages, leaving only the essentials. This makes them ideal for container hosts where the operating system exists solely to run containers. This guide covers setting up Podman on a minimal Fedora, Debian, or CentOS Stream server from scratch.

---

## Prerequisites

- A minimal Linux server installation (no desktop environment)
- SSH access with a user that has sudo privileges
- An active internet connection
- At least 1GB RAM and 10GB disk space

## Step 1: Initial System Setup

After connecting to your minimal server via SSH:

```bash
# Update the system

sudo dnf update -y          # Fedora/CentOS
# or
sudo apt update && sudo apt upgrade -y  # Debian/Ubuntu

# Install essential utilities that may be missing on minimal installs
sudo dnf install -y curl wget vim tar    # Fedora/CentOS
# or
sudo apt install -y curl wget vim tar    # Debian/Ubuntu
```

## Step 2: Install Podman

### On Fedora Server (Minimal)

```bash
# Install Podman with minimal dependencies
sudo dnf install -y podman crun fuse-overlayfs passt
```

### On Debian Server (Minimal)

```bash
# Install Podman and rootless dependencies
sudo apt install -y podman slirp4netns uidmap fuse-overlayfs
```

### On CentOS Stream (Minimal)

```bash
# Install Podman
sudo dnf install -y podman crun fuse-overlayfs passt
```

## Step 3: Configure a Dedicated Container User

For security, run containers under a dedicated non-root user:

```bash
# Create a dedicated user for running containers
sudo useradd -m -s /bin/bash podman-user

# Set up subuid and subgid mappings
sudo usermod --add-subuids 100000-165535 podman-user
sudo usermod --add-subgids 100000-165535 podman-user

# Enable lingering so user services start at boot
sudo loginctl enable-linger podman-user
```

## Step 4: Configure Storage for Minimal Disk Usage

On a minimal server, optimize storage:

```bash
# Switch to the container user
sudo -u podman-user -i
export XDG_RUNTIME_DIR=/run/user/$(id -u)

# Create the configuration directory
mkdir -p ~/.config/containers

# Configure storage with overlay driver
cat > ~/.config/containers/storage.conf <<EOF
[storage]
driver = "overlay"

[storage.options]
size = ""

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF
```

## Step 5: Configure Registries

```bash
# Set up default registries (still as podman-user)
mkdir -p ~/.config/containers
cat > ~/.config/containers/registries.conf <<EOF
unqualified-search-registries = ['docker.io', 'quay.io']
EOF
```

## Step 6: Set Up Automatic Container Cleanup

Keep the server lean with automatic cleanup:

```bash
# Create a systemd timer for pruning unused resources
mkdir -p ~/.config/systemd/user

# Create the prune service
cat > ~/.config/systemd/user/podman-prune.service <<EOF
[Unit]
Description=Podman prune unused images and containers

[Service]
Type=oneshot
ExecStart=/usr/bin/podman system prune -a -f --volumes
EOF

# Create the timer to run daily
cat > ~/.config/systemd/user/podman-prune.timer <<EOF
[Unit]
Description=Run Podman prune daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable the timer
systemctl --user daemon-reload
systemctl --user enable --now podman-prune.timer
```

## Step 7: Enable the Podman API Socket

```bash
# Enable the Podman socket for remote management
systemctl --user enable --now podman.socket

# Verify it is running
systemctl --user status podman.socket
```

## Step 8: Configure the Firewall

```bash
# Exit back to the admin user
exit

# Open common ports for container services
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --add-port=443/tcp --permanent
sudo firewall-cmd --add-port=80/tcp --permanent
sudo firewall-cmd --reload
```

On Debian minimal, install and configure `ufw`:

```bash
# Install and configure ufw
sudo apt install -y ufw
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
```

## Step 9: Deploy a Container Service

Switch to the container user and deploy a service:

```bash
# Switch to the container user
sudo -u podman-user -i
export XDG_RUNTIME_DIR=/run/user/$(id -u)

# Run a web application
podman run -d \
  --name web-app \
  -p 8080:80 \
  docker.io/library/nginx:alpine

# Verify it is running
podman ps
```

## Step 10: Create systemd Services for Containers

Make containers survive reboots:

```bash
# Stop and remove the manually created container
podman stop web-app
podman rm web-app

# Create a Quadlet container unit
mkdir -p ~/.config/containers/systemd
cat > ~/.config/containers/systemd/web-app.container <<EOF
[Unit]
Description=Web app container

[Container]
Image=docker.io/library/nginx:alpine
ContainerName=web-app
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target
EOF

# Enable the generated systemd service
systemctl --user daemon-reload
systemctl --user enable --now web-app.service

# Verify it starts
systemctl --user status web-app.service
podman ps
```

## Setting Up Log Management

On a minimal server, configure container log rotation:

```bash
# Configure Podman to limit log sizes
mkdir -p ~/.config/containers
cat > ~/.config/containers/containers.conf <<EOF
[containers]
log_size_max = 10485760

[engine]
events_logger = "file"
EOF
```

## Monitoring Resource Usage

```bash
# Check container resource usage
podman stats --no-stream

# Check overall system resources
free -h
df -h
```

## Security Hardening

```bash
# Return to the admin user for system-level changes
exit

# Disable root login via SSH (if not already done)
sudo sed -i 's/^PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd  # Fedora/CentOS
# or
sudo systemctl restart ssh   # Debian/Ubuntu

# Enable automatic security updates
sudo dnf install -y dnf-automatic   # Fedora/CentOS
sudo systemctl enable --now dnf-automatic-install.timer
# or
sudo apt install -y unattended-upgrades   # Debian/Ubuntu
```

## Troubleshooting

If systemd user services do not start at boot:

```bash
# Ensure lingering is enabled for the container user
sudo loginctl enable-linger podman-user

# Verify
ls /var/lib/systemd/linger/
```

If the server runs out of disk space:

```bash
# Check Podman disk usage
sudo -u podman-user podman system df

# Prune unused resources
sudo -u podman-user podman system prune -a -f
```

## Summary

Setting up Podman on a minimal server creates a lightweight, secure container host. By using a dedicated user, enabling systemd services for container management, and configuring automatic cleanup, you get a production-ready environment with minimal overhead. The rootless configuration means containers run without root privileges, adding an extra layer of security.
