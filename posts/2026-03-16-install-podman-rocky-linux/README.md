# How to Install Podman on Rocky Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, Rocky Linux

Description: A step-by-step guide to installing and configuring Podman on Rocky Linux 8 and 9, including rootless setup and SELinux integration.

---

> Rocky Linux, as a RHEL-compatible distribution, provides enterprise-grade Podman support with long-term stability and security updates.

Rocky Linux was created as a direct replacement for CentOS Linux and maintains full binary compatibility with RHEL. This means Podman enjoys first-class support with the same packages and configurations used in Red Hat environments. This guide covers installation on Rocky Linux 8 and 9.

---

## Prerequisites

- Rocky Linux 8 or 9
- A user account with sudo privileges
- An active internet connection

## Step 1: Update Your System

```bash
# Update all packages

sudo dnf update -y
```

## Step 2: Install Podman

### Rocky Linux 9

```bash
# Install Podman directly from the AppStream repository
sudo dnf install -y podman
```

### Rocky Linux 8

```bash
# Enable the container-tools module
sudo dnf module enable -y container-tools:rhel8

# Install Podman
sudo dnf install -y podman
```

## Step 3: Install Additional Container Tools

```bash
# Enable EPEL for podman-compose
sudo dnf install -y epel-release

# Install the complete container toolkit
sudo dnf install -y buildah skopeo podman-compose

# Verify all installations
podman --version
buildah --version
skopeo --version
```

## Step 4: Verify the Installation

```bash
# Check Podman version
podman --version

# View detailed system information
podman info

# Run a test container
podman run --rm docker.io/library/hello-world
```

## Step 5: Configure Rootless Containers

```bash
# Verify subuid and subgid entries
cat /etc/subuid
cat /etc/subgid

# Add mappings if needed
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)

# Apply the updated user namespace mappings
podman system migrate

# Install slirp4netns for rootless networking
sudo dnf install -y slirp4netns
```

## Step 6: Configure SELinux for Containers

Rocky Linux enforces SELinux by default:

```bash
# Check SELinux status
getenforce

# Install SELinux container policies
sudo dnf install -y container-selinux

# When mounting volumes, use the :Z flag for proper labeling
podman run --rm -v /tmp:/data:Z docker.io/library/alpine:latest ls /data
```

## Step 7: Enable the Podman Socket

```bash
# Enable the user-level Podman socket
systemctl --user enable --now podman.socket

# Verify the socket
systemctl --user status podman.socket

# For system-wide Docker compatibility
sudo systemctl enable --now podman.socket
```

## Step 8: Configure the Firewall

```bash
# Open ports for your container services
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --add-port=443/tcp --permanent
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-ports
```

## Running a Practical Example

Deploy a containerized web application:

```bash
# Run an Nginx web server
podman run -d \
  --name rocky-web \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Verify it is running
podman ps

# Test the web server
curl http://localhost:8080

# View container logs
podman logs rocky-web
```

Deploy with a volume mount using SELinux:

```bash
# Create content directory
mkdir -p ~/web-content
echo "<h1>Rocky Linux + Podman</h1>" > ~/web-content/index.html

# Run with SELinux-aware volume mount
podman run -d \
  --name rocky-web-custom \
  -p 8081:80 \
  -v ~/web-content:/usr/share/nginx/html:Z \
  docker.io/library/nginx:latest

# Test
curl http://localhost:8081

# Clean up
podman stop rocky-web rocky-web-custom
podman rm rocky-web rocky-web-custom
```

## Creating systemd Services

```bash
# Create a Quadlet service definition
mkdir -p ~/.config/containers/systemd
cat > ~/.config/containers/systemd/my-service.container <<'EOF'
[Container]
Image=docker.io/library/nginx:latest
PublishPort=8080:80

[Install]
WantedBy=default.target
EOF

# Load and start the systemd-managed container
systemctl --user daemon-reload
systemctl --user enable --now my-service.service

# Enable lingering for boot-time startup
sudo loginctl enable-linger $(whoami)

# Verify
systemctl --user status my-service.service
```

## Troubleshooting

If you encounter SELinux denials:

```bash
# Check recent SELinux denials
sudo ausearch -m AVC -ts recent

# Generate and apply a custom policy if needed
sudo ausearch -m AVC -ts recent | audit2allow -M podman-custom
sudo semodule -i podman-custom.pp
```

If rootless containers fail:

```bash
# Reset Podman storage
podman system reset

# Verify user namespaces are enabled
sysctl user.max_user_namespaces
```

If container networking fails after firewall changes:

```bash
# Inspect Podman's network configuration
podman network ls
podman network inspect podman

# Reload network configuration for running containers
podman network reload --all
```

## Summary

Podman on Rocky Linux provides an enterprise-grade container environment with full RHEL compatibility. SELinux integration, the container-tools module, and long-term support make Rocky Linux an excellent choice for production container hosts. The installation process mirrors RHEL, so documentation and configurations are interchangeable between the two.
