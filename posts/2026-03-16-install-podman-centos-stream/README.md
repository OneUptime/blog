# How to Install Podman on CentOS Stream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, CentOS

Description: A complete guide to installing Podman on CentOS Stream 8 and 9, with rootless configuration and practical container examples.

---

> CentOS Stream, as the upstream for RHEL, provides excellent Podman support with enterprise-grade stability and the latest container tooling.

CentOS Stream serves as the development branch for Red Hat Enterprise Linux, making it an ideal platform for Podman. As a Red Hat project, Podman is tightly integrated with CentOS Stream and receives timely updates. This guide focuses on CentOS Stream 9 and includes legacy notes for CentOS Stream 8, which reached end of life on May 31, 2024.

---

## Prerequisites

- CentOS Stream 9, or a legacy CentOS Stream 8 system
- A user account with sudo privileges
- An active internet connection

## Step 1: Update Your System

Begin by updating all packages:

```bash
# Update all packages on CentOS Stream

sudo dnf update -y
```

## Step 2: Install Podman

Podman is included in the default CentOS Stream repositories:

### CentOS Stream 9

```bash
# Install Podman on CentOS Stream 9
sudo dnf install -y podman
```

### CentOS Stream 8

CentOS Stream 8 reached end of life on May 31, 2024, so standard repositories no longer receive updates. On legacy CentOS Stream 8 systems with working repository configuration, Podman was available through the `container-tools` module:

```bash
# Enable the container-tools module and install Podman
sudo dnf module enable -y container-tools:rhel8
sudo dnf install -y podman
```

## Step 3: Verify the Installation

Confirm Podman is working:

```bash
# Check the Podman version
podman --version

# Display system-level information
podman info
```

## Step 4: Configure Rootless Containers

Set up your user for rootless container operation:

```bash
# Check existing subuid/subgid mappings
cat /etc/subuid
cat /etc/subgid
```

If your user is not listed, add the mappings:

```bash
# Add subordinate UID/GID ranges
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)
```

Ensure `slirp4netns` is installed for rootless networking:

```bash
# Install slirp4netns for rootless network support
sudo dnf install -y slirp4netns
```

## Step 5: Run a Test Container

Validate your installation with a quick test:

```bash
# Run a test container as a regular user
podman run --rm docker.io/library/hello-world
```

## Step 6: Install Additional Container Tools

CentOS Stream provides a full container toolkit:

```bash
# Install Buildah for building images and Skopeo for image management
sudo dnf install -y buildah skopeo

# Verify the installations
buildah --version
skopeo --version
```

## Step 7: Enable the Podman Socket

For Docker API compatibility:

```bash
# Enable the rootless Podman socket
systemctl --user enable --now podman.socket

# Verify it is active
systemctl --user status podman.socket
```

For system-wide Docker compatibility (requires root):

```bash
# Enable the system-wide Podman socket
sudo systemctl enable --now podman.socket

# The socket is available at /run/podman/podman.sock
ls -la /run/podman/podman.sock
```

## Step 8: Configure Firewall for Container Ports

CentOS Stream uses `firewalld` by default. Open ports for your containers:

```bash
# Open port 8080 for a web server container
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

## Running a Practical Example

Deploy a containerized web application:

```bash
# Run an Nginx container on port 8080
podman run -d \
  --name web-server \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Verify it is running
podman ps

# Test the web server
curl http://localhost:8080

# View container logs
podman logs web-server

# Stop and remove when done
podman stop web-server
podman rm web-server
```

## Configuring SELinux for Containers

CentOS Stream enforces SELinux by default. When mounting host directories into containers, use the `:Z` flag:

```bash
# Create a directory and mount it with SELinux labels
mkdir -p ~/web-content
echo "<h1>Hello from Podman</h1>" > ~/web-content/index.html

# Mount with the :Z flag for proper SELinux labeling
podman run -d \
  --name web-selinux \
  -p 8080:80 \
  -v ~/web-content:/usr/share/nginx/html:Z \
  docker.io/library/nginx:latest
```

## Troubleshooting

If you encounter `ERRO[0000] cannot find UID/GID` errors after changing `/etc/subuid` or `/etc/subgid`:

```bash
# Recreate the rootless user namespace with the updated mappings
podman system migrate
```

If containers fail to start with SELinux errors, check the audit log:

```bash
# Check SELinux denials
sudo ausearch -m AVC -ts recent
```

## Summary

Podman is fully supported on current CentOS Stream releases as part of the Red Hat container ecosystem. With direct package availability on CentOS Stream 9, and the legacy `container-tools` module on CentOS Stream 8 systems with archived repository access, you get a capable container runtime. SELinux integration provides additional security for production deployments.
