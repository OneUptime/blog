# How to Install Docker Engine on Ubuntu (Official Method)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Container, DevOps

Description: Install Docker Engine on Ubuntu using the official Docker repository method, covering GPG key setup, repository configuration, and post-installation verification steps.

---

Ubuntu's default repositories include Docker, but they typically ship older versions. The official Docker installation method - adding Docker's own apt repository - gives you the latest stable Docker Engine, Docker CLI, containerd, and the Docker Compose plugin. This is the recommended approach for any serious use.

## Why Use the Official Repository

The `docker.io` package from Ubuntu's repositories:
- Lags months or years behind the current Docker release
- Has different package names and configurations
- May not include the latest Compose V2 plugin

The official Docker repository always provides the current stable release.

## Prerequisites

Remove any old or conflicting Docker packages first:

```bash
# Remove old Docker packages if present
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
  sudo apt remove -y $pkg 2>/dev/null
done

# These are no longer needed after the official install
sudo apt autoremove -y
```

If you had Docker installed previously, you may want to preserve your images and containers. The removal steps above only remove the software packages - data in `/var/lib/docker` is not deleted unless you explicitly remove it.

## Step 1: Set Up the Repository

### Install Dependencies

```bash
sudo apt update
sudo apt install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release
```

### Add Docker's GPG Key

```bash
# Create the keyring directory
sudo install -m 0755 -d /etc/apt/keyrings

# Download and add Docker's GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set correct permissions on the key file
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

### Add the Docker Repository

```bash
# Add Docker's stable apt repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index to include Docker packages
sudo apt update
```

Verify the repository was added correctly:

```bash
# The Docker packages should now be visible
apt-cache policy docker-ce
# Should show the Docker version from download.docker.com
```

## Step 2: Install Docker Engine

```bash
# Install the latest Docker Engine
sudo apt install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin
```

What each package provides:
- `docker-ce` - Docker Engine daemon
- `docker-ce-cli` - Docker command-line client
- `containerd.io` - Container runtime
- `docker-buildx-plugin` - Extended build capabilities (multi-arch builds, cache)
- `docker-compose-plugin` - Docker Compose V2 (`docker compose` command)

### Installing a Specific Version

```bash
# List available Docker versions
apt-cache madison docker-ce | head -10

# Install a specific version
sudo apt install -y docker-ce=5:25.0.5-1~ubuntu.24.04~noble \
                   docker-ce-cli=5:25.0.5-1~ubuntu.24.04~noble \
                   containerd.io \
                   docker-buildx-plugin \
                   docker-compose-plugin
```

Hold the version to prevent unintended upgrades:

```bash
sudo apt-mark hold docker-ce docker-ce-cli containerd.io
```

## Step 3: Start and Enable Docker

```bash
# Start the Docker daemon
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Verify Docker is running
sudo systemctl status docker
```

## Step 4: Verify the Installation

```bash
# Run the hello-world test container
sudo docker run hello-world

# Check Docker version
docker version

# Check Docker info (daemon status, storage driver, etc.)
sudo docker info
```

Expected output from `docker run hello-world`:

```
Hello from Docker!
This message shows that your installation appears to be working correctly.

To generate this message, Docker took the following steps:
 1. The Docker client contacted the Docker daemon.
 2. The Docker daemon pulled the "hello-world" image from the Docker Hub.
 3. The Docker daemon created a new container from that image...
```

## Post-Installation: Managing Docker Without sudo

By default, Docker requires sudo. See the companion guide on running Docker without sudo for the full explanation. The short version:

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the group change
newgrp docker

# Verify - this should work without sudo
docker run hello-world
```

## Post-Installation: Configure Docker to Start on Boot

On systemd-based Ubuntu (all modern versions), Docker autostart is configured via systemd:

```bash
# Enable autostart
sudo systemctl enable docker.service
sudo systemctl enable containerd.service

# Verify
sudo systemctl is-enabled docker.service
# enabled
```

## Configuring the Docker Daemon

Docker's daemon configuration lives at `/etc/docker/daemon.json`. Create it if it doesn't exist:

```bash
# Create daemon configuration
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true
}
EOF

# Apply changes
sudo systemctl restart docker
```

See the companion guide on configuring Docker daemon options for a comprehensive reference.

## Verifying Docker Compose

Docker Compose V2 is installed as a plugin:

```bash
# Verify Compose is available
docker compose version
# Docker Compose version v2.24.5

# Test Compose
cat > /tmp/test-compose.yml <<'EOF'
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
EOF

docker compose -f /tmp/test-compose.yml up -d
curl -s http://localhost:8080 | head -5
docker compose -f /tmp/test-compose.yml down
```

## Verifying Buildx

Docker Buildx for multi-platform builds:

```bash
# List available builders
docker buildx ls

# Create a new builder with multi-platform support
docker buildx create --use --name mybuilder

# Verify multi-platform build capability
docker buildx inspect --bootstrap
```

## Updating Docker

```bash
# Update Docker to the latest version
sudo apt update
sudo apt upgrade docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Check the new version
docker version
```

## Uninstalling Docker

To completely remove Docker:

```bash
# Remove packages
sudo apt purge docker-ce docker-ce-cli containerd.io \
               docker-buildx-plugin docker-compose-plugin \
               docker-ce-rootless-extras

# Remove Docker data (images, containers, volumes)
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# Remove the repository
sudo rm /etc/apt/sources.list.d/docker.list
sudo rm /etc/apt/keyrings/docker.gpg
```

## Troubleshooting Installation Issues

### Repository Not Found

If `apt update` fails after adding the repository:

```bash
# Check that the codename is correct
. /etc/os-release && echo $VERSION_CODENAME
# Should be: jammy (22.04), noble (24.04), etc.

# Check the sources list entry
cat /etc/apt/sources.list.d/docker.list
```

### GPG Key Error

```bash
# Re-download the key
sudo rm /etc/apt/keyrings/docker.gpg
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
sudo apt update
```

### Docker Daemon Fails to Start

```bash
# Check the daemon logs
sudo journalctl -u docker.service --since "5 minutes ago"

# Common issue: storage driver incompatibility
# Force overlay2 in daemon.json and restart
sudo systemctl restart docker
```

Installing from the official Docker repository ensures you get security patches and new features as they're released. For any environment running Docker in production or development, the official repo method is the right approach.
