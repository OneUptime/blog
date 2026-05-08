# How to Install Podman on AlmaLinux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, AlmaLinux

Description: A complete guide to installing Podman on AlmaLinux 8 and 9, with rootless configuration, SELinux setup, and production deployment examples.

---

> AlmaLinux delivers RHEL-compatible Podman packages with community-driven long-term support, making it ideal for stable container infrastructure.

AlmaLinux is a community-driven, RHEL-compatible distribution that provides free enterprise-grade Linux. Like Rocky Linux, it offers the same Podman packages and compatibility as RHEL. This guide covers complete Podman setup on AlmaLinux 8 and 9.

---

## Prerequisites

- AlmaLinux 8 or 9
- A user account with sudo privileges
- An active internet connection

## Step 1: Update Your System

```bash
# Update all packages

sudo dnf update -y
```

## Step 2: Install Podman

### AlmaLinux 9

```bash
# Install Podman from the AppStream repository
sudo dnf install -y podman
```

### AlmaLinux 8

```bash
# Enable the container-tools module
sudo dnf module enable -y container-tools:rhel8

# Install Podman
sudo dnf install -y podman
```

## Step 3: Install Additional Container Tools

```bash
# Install complementary tools
sudo dnf install -y buildah skopeo

# Verify installations
podman --version
buildah --version
skopeo --version
```

## Step 4: Verify the Installation

```bash
# Check the Podman version
podman --version

# Display system information
podman info

# Run a test container
podman run --rm docker.io/library/hello-world
```

## Step 5: Configure Rootless Containers

```bash
# Check for subuid and subgid entries
cat /etc/subuid
cat /etc/subgid

# Add mappings if your user is not listed
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)

# Install rootless networking support
sudo dnf install -y slirp4netns
```

## Step 6: Configure SELinux

AlmaLinux enforces SELinux by default:

```bash
# Check SELinux status
getenforce

# Ensure container SELinux policies are installed
sudo dnf install -y container-selinux
```

## Step 7: Enable the Podman Socket

```bash
# Enable the user-level Podman socket for Docker compatibility
systemctl --user enable --now podman.socket

# Verify
systemctl --user status podman.socket

# Set the Docker host variable
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock' >> ~/.bashrc
source ~/.bashrc
```

## Step 8: Configure the Firewall

```bash
# Open ports for container services
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

## Running a Practical Example

Deploy two containers on a custom network:

```bash
# Create a custom network
podman network create app-network

# Run a Redis backend
podman run -d \
  --name redis-backend \
  --network app-network \
  docker.io/library/redis:alpine

# Run a web frontend on the same network
podman run -d \
  --name web-frontend \
  --network app-network \
  -p 8080:80 \
  docker.io/library/nginx:alpine

# Verify both containers are running
podman ps

# Check name resolution between containers
podman exec web-frontend ping -c 2 redis-backend

# Clean up
podman stop redis-backend web-frontend
podman rm redis-backend web-frontend
podman network rm app-network
```

## Setting Up Container Auto-Start

```bash
# Create and run a container
podman run -d \
  --name alma-web \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Generate a systemd unit file (note: podman generate systemd is deprecated;
# consider using Quadlet .container files for new deployments)
mkdir -p ~/.config/systemd/user
podman generate systemd --new --name alma-web > ~/.config/systemd/user/container-alma-web.service

# Remove the manually started container
podman stop alma-web
podman rm alma-web

# Enable the service
systemctl --user daemon-reload
systemctl --user enable --now container-alma-web.service

# Enable lingering for boot startup
sudo loginctl enable-linger $(whoami)

# Verify
systemctl --user status container-alma-web.service
podman ps
```

## Using Podman with SELinux Volume Mounts

```bash
# Create a data directory
mkdir -p ~/app-data
echo "Hello from AlmaLinux" > ~/app-data/index.html

# Mount with the :Z flag for SELinux relabeling
podman run -d \
  --name selinux-test \
  -p 8081:80 \
  -v ~/app-data:/usr/share/nginx/html:Z \
  docker.io/library/nginx:latest

# Test
curl http://localhost:8081

# Clean up
podman stop selinux-test
podman rm selinux-test
```

## Using Podman with EPEL Packages

AlmaLinux supports the EPEL repository for additional tools:

```bash
# Enable EPEL
sudo dnf install -y epel-release

# Install podman-compose from EPEL (if available)
sudo dnf install -y podman-compose

# Or install via pip
sudo dnf install -y python3-pip
pip3 install podman-compose
```

## Troubleshooting

If SELinux blocks container operations:

```bash
# Check for SELinux denials
sudo ausearch -m AVC -ts recent | grep podman

# Temporarily set SELinux to permissive for debugging (not recommended for production)
sudo setenforce 0

# Install policy generation tools if needed
sudo dnf install -y policycoreutils-python-utils

# Generate a custom policy for persistent fixes
sudo ausearch -m AVC -ts recent | audit2allow -M my-podman
sudo semodule -i my-podman.pp

# Re-enable enforcing mode
sudo setenforce 1
```

If rootless containers fail:

```bash
# Reset Podman storage
podman system reset

# Run storage migration
podman system migrate
```

If an AlmaLinux 8 system is using an older container-tools stream:

```bash
# Check available container-tools streams
sudo dnf module list container-tools

# Switch to the supported rolling stream
sudo dnf module switch-to container-tools:rhel8
```

## Summary

Podman on AlmaLinux provides the same enterprise-grade container experience as RHEL without licensing costs. The RHEL-compatible packages, SELinux integration, and long-term support make AlmaLinux a solid foundation for production container workloads. The installation and configuration process is identical to RHEL, ensuring documentation compatibility.
