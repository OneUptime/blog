# How to Install Docker Desktop Alternatives (Colima, Rancher Desktop, Podman Desktop)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Colima, Podman, Rancher Desktop, Alternatives

Description: Learn how to install and configure Docker Desktop alternatives including Colima, Rancher Desktop, and Podman Desktop for container development without licensing costs.

---

Docker Desktop's licensing changes have led many developers to seek alternatives. This guide covers the most popular Docker Desktop alternatives: Colima, Rancher Desktop, and Podman Desktop, with installation and configuration for each.

## Comparison Overview

```
Docker Desktop Alternatives
┌──────────────────────────────────────────────────────────────┐
│  Feature        │ Colima │ Rancher Desktop │ Podman Desktop │
├──────────────────────────────────────────────────────────────┤
│  License        │ MIT    │ Apache 2.0      │ Apache 2.0     │
│  GUI            │ No     │ Yes             │ Yes            │
│  Kubernetes     │ Yes    │ Yes             │ No             │
│  Docker CLI     │ Yes    │ Yes             │ Alias needed   │
│  macOS          │ Yes    │ Yes             │ Yes            │
│  Windows        │ No     │ Yes             │ Yes            │
│  Linux          │ Yes    │ Yes             │ Yes            │
│  Apple Silicon  │ Yes    │ Yes             │ Yes            │
│  Resources      │ Low    │ Medium          │ Low            │
└──────────────────────────────────────────────────────────────┘
```

## Colima

Colima is a lightweight container runtime for macOS and Linux that uses Lima to run containers.

### Installation

```bash
# macOS with Homebrew
brew install colima docker docker-compose

# Linux
curl -LO https://github.com/abiosoft/colima/releases/latest/download/colima-Linux-x86_64
sudo install colima-Linux-x86_64 /usr/local/bin/colima
```

### Basic Usage

```bash
# Start Colima with default settings
colima start

# Start with custom resources
colima start --cpu 4 --memory 8 --disk 60

# Start with Apple Silicon optimizations
colima start \
  --cpu 4 \
  --memory 8 \
  --disk 60 \
  --vm-type vz \
  --vz-rosetta \
  --mount-type virtiofs

# Check status
colima status

# Stop Colima
colima stop
```

### Configuration

```yaml
# ~/.colima/default/colima.yaml
cpu: 4
memory: 8
disk: 60

# Virtual machine type (vz recommended for Apple Silicon)
vm:
  type: vz  # or qemu
  rosetta: true  # For AMD64 compatibility on Apple Silicon

# Mount type (virtiofs is fastest)
mount:
  type: virtiofs  # or 9p, sshfs

# Docker configuration
docker:
  features:
    buildkit: true

# Kubernetes (optional)
kubernetes:
  enabled: false
  version: v1.28.0
```

### Starting with Configuration

```bash
# Edit configuration
colima start --edit

# Apply configuration
colima start

# Reset to defaults
colima delete
colima start
```

### Kubernetes Support

```bash
# Start with Kubernetes
colima start --kubernetes

# Use kubectl
kubectl get nodes
kubectl get pods -A
```

### Multiple Profiles

```bash
# Create profile for development
colima start --profile dev --cpu 2 --memory 4

# Create profile for testing
colima start --profile test --cpu 4 --memory 8 --kubernetes

# Switch between profiles
colima start --profile dev
colima stop --profile dev
colima start --profile test

# List profiles
colima list
```

## Rancher Desktop

Rancher Desktop provides Docker and Kubernetes with a GUI.

### Installation

```bash
# macOS with Homebrew
brew install --cask rancher

# Download from website
# https://rancherdesktop.io/
```

### Configuration via GUI

1. Open Rancher Desktop
2. Go to Preferences:
   - **Container Engine**: Choose dockerd (moby) or containerd
   - **Kubernetes**: Enable/disable, choose version
   - **Resources**: Set CPU, memory, disk

### Command Line Usage

```bash
# With dockerd engine
docker ps
docker run hello-world
docker-compose up

# With containerd engine (use nerdctl)
nerdctl ps
nerdctl run hello-world
```

### rdctl CLI

```bash
# Check status
rdctl list-settings

# Set container engine
rdctl set --container-engine.name=moby
rdctl set --container-engine.name=containerd

# Configure Kubernetes
rdctl set --kubernetes.enabled=true
rdctl set --kubernetes.version=1.28.0

# Set resources
rdctl set --virtualMachine.memoryInGB=8
rdctl set --virtualMachine.numberCPUs=4
```

### Configuration File

```json
// ~/Library/Application Support/rancher-desktop/settings.json (macOS)
{
  "version": 6,
  "containerEngine": {
    "name": "moby"
  },
  "kubernetes": {
    "enabled": true,
    "version": "1.28.0"
  },
  "virtualMachine": {
    "memoryInGB": 8,
    "numberCPUs": 4
  }
}
```

## Podman Desktop

Podman Desktop provides a Docker-compatible container runtime with a GUI.

### Installation

```bash
# macOS with Homebrew
brew install --cask podman-desktop
brew install podman

# Windows
winget install RedHat.Podman-Desktop

# Linux (Flatpak)
flatpak install flathub io.podman_desktop.PodmanDesktop
```

### Initialize Podman Machine

```bash
# Create and start machine
podman machine init
podman machine start

# Or with custom resources
podman machine init \
  --cpus 4 \
  --memory 8192 \
  --disk-size 60

podman machine start

# Check status
podman machine list
```

### Docker Compatibility

```bash
# Podman is Docker-compatible
podman run hello-world
podman ps
podman images

# Create docker alias
echo 'alias docker=podman' >> ~/.zshrc

# Or use podman-docker
brew install podman-docker

# Docker Compose with Podman
podman-compose up -d
# Or
docker-compose up -d  # with DOCKER_HOST set
```

### Docker Socket Compatibility

```bash
# Enable Docker socket for compatibility
podman machine stop
podman machine set --rootful
podman machine start

# Set DOCKER_HOST
export DOCKER_HOST="unix://$HOME/.local/share/containers/podman/machine/podman.sock"

# Now docker commands work
docker ps
docker-compose up -d
```

### Podman Desktop Features

- Container management GUI
- Image management
- Pod creation and management
- Kubernetes integration
- Extension support

## Migration from Docker Desktop

### Export Containers and Images

```bash
# List images to migrate
docker images

# Save images
docker save myimage:latest | gzip > myimage.tar.gz

# Export container
docker export container_name > container.tar
```

### Import to Alternative

```bash
# Colima/Rancher Desktop (uses Docker)
docker load < myimage.tar.gz

# Podman
podman load < myimage.tar.gz
```

### Migrate Volumes

```bash
# List volumes
docker volume ls

# Backup volume
docker run --rm -v myvolume:/source -v $(pwd):/backup alpine \
  tar czf /backup/myvolume.tar.gz -C /source .

# Restore to new system
docker volume create myvolume
docker run --rm -v myvolume:/target -v $(pwd):/backup alpine \
  tar xzf /backup/myvolume.tar.gz -C /target
```

## Complete Setup Scripts

### Colima Setup (macOS)

```bash
#!/bin/bash
# setup-colima.sh

# Install dependencies
brew install colima docker docker-compose docker-buildx

# Start Colima with optimal settings
colima start \
  --cpu 4 \
  --memory 8 \
  --disk 60 \
  --vm-type vz \
  --vz-rosetta \
  --mount-type virtiofs

# Verify installation
docker version
docker run hello-world

echo "Colima setup complete!"
```

### Podman Setup (macOS)

```bash
#!/bin/bash
# setup-podman.sh

# Install Podman
brew install podman podman-compose

# Initialize machine
podman machine init \
  --cpus 4 \
  --memory 8192 \
  --disk-size 60

podman machine start

# Enable Docker compatibility
podman machine stop
podman machine set --rootful
podman machine start

# Set Docker host
echo 'export DOCKER_HOST="unix://$HOME/.local/share/containers/podman/machine/podman.sock"' >> ~/.zshrc
echo 'alias docker=podman' >> ~/.zshrc

source ~/.zshrc

# Verify
podman version
podman run hello-world

echo "Podman setup complete!"
```

## Troubleshooting

### Colima Issues

```bash
# Reset Colima
colima stop
colima delete
colima start

# Check logs
colima status
cat ~/.colima/default/colima.log
```

### Podman Issues

```bash
# Reset machine
podman machine stop
podman machine rm
podman machine init
podman machine start

# Check connection
podman system connection list
```

### Common Fixes

```bash
# Docker socket not found
export DOCKER_HOST="unix://${HOME}/.colima/default/docker.sock"

# Permission denied
sudo chmod 666 /var/run/docker.sock

# Buildx not working
docker buildx create --use
```

## Summary

| Alternative | Best For |
|-------------|----------|
| Colima | Lightweight, CLI-focused development |
| Rancher Desktop | GUI users, Kubernetes development |
| Podman Desktop | Docker-free environments, rootless containers |

All three alternatives provide Docker-compatible container runtimes without Docker Desktop licensing requirements. Choose Colima for minimal overhead, Rancher Desktop for full-featured GUI with Kubernetes, or Podman Desktop for a Docker-free approach. For migrating to Podman specifically, see our post on [Migrating from Docker Desktop to Podman](https://oneuptime.com/blog/post/2026-01-16-docker-to-podman-migration/view).

