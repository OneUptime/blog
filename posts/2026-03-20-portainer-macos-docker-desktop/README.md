# How to Install Portainer on macOS with Docker Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, macOS, Docker-desktop, Installation, Apple-silicon

Description: A guide to installing and running Portainer CE on macOS using Docker Desktop, covering both Apple Silicon and Intel Macs.

## Overview

Docker Desktop for macOS provides a seamless Docker experience on both Apple Silicon and Intel Macs. Portainer CE can be deployed as a container in this environment, providing a visual container management interface for macOS developers. This guide covers the complete setup.

## Prerequisites

- A supported version of macOS (Docker Desktop supports the current and two previous major macOS releases)
- Docker Desktop for macOS installed
- At least 4GB of RAM

## Step 1: Install Docker Desktop for macOS

```bash
# Install via Homebrew (recommended)

brew install --cask docker-desktop

# Or download from: https://www.docker.com/products/docker-desktop
# - Choose Apple Silicon or Intel depending on your Mac
```

Open Docker Desktop from Applications and wait for it to start (whale icon in menu bar).

## Step 2: Verify Docker

```bash
docker --version
docker run hello-world

# Check architecture
docker info --format '{{.Architecture}}'
# Apple Silicon: aarch64
# Intel: x86_64
```

## Step 3: Deploy Portainer CE

```bash
# Create persistent data volume
docker volume create portainer_data

# Deploy Portainer CE
# Port 8000 is optional unless you plan to use Edge agents
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Verify
docker ps | grep portainer
```

## Step 4: Access Portainer

Open your browser and navigate to:
```text
https://localhost:9443
```

Accept the self-signed certificate warning in your browser and complete the setup.

## Step 5: Create a Bookmark or App Shortcut

For quick access, add a bookmark in Safari/Chrome to `https://localhost:9443`.

Or add a shell alias for quick launch:

```bash
# Add to ~/.zshrc for quick Portainer access
alias portainer='open https://localhost:9443'
```

## macOS-Specific Considerations

### Docker Desktop Subscription

Docker Desktop is free for personal use, education, non-commercial open source projects, and small businesses with fewer than 250 employees and less than $10M in annual revenue. Larger organizations and government entities require a paid subscription.

**Alternative: OrbStack (macOS-native Docker)**

```bash
# OrbStack is a fast Docker Desktop alternative for macOS
brew install --cask orbstack
# Personal use is free; business and commercial use require a license
# Portainer works with OrbStack too when the /var/run/docker.sock compatibility symlink is available
```

### Volume Performance

Docker Desktop on macOS uses a VM for Linux compatibility. File system performance for bind mounts is limited:

```bash
# For better performance, use Docker volumes (not bind mounts)
# Portainer's portainer_data volume uses Docker volumes - excellent performance
# Container application data should also use Docker volumes when possible
```

Resource Allocation

Configure Docker Desktop resources:

```bash
Docker Desktop → Settings → Resources → Advanced
- Memory: 4-8GB (more = better container performance)
- CPUs: 4+ for multiple containers
- Disk usage limit: 60GB+
```

## Running Multiple Containers with Docker Desktop

Portainer makes it easy to manage multi-container apps via Stacks:

```yaml
# Create a Stack in Portainer UI → Stacks → Add Stack
services:
  webapp:
    image: nginx:latest
    ports:
      - "8080:80"
    volumes:
      - webapp-data:/usr/share/nginx/html
  
  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD: mypassword
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  webapp-data:
  db-data:
```

## Keeping Portainer Updated

```bash
# Pull latest LTS image
docker pull portainer/portainer-ce:lts

# Stop and remove old container
docker stop portainer && docker rm portainer

# Start new container
# Port 8000 is optional unless you plan to use Edge agents
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Conclusion

Portainer CE on macOS with Docker Desktop provides an excellent development environment for managing local containers. Both Apple Silicon and Intel Macs are supported. The `localhost:9443` access makes it immediately accessible from any macOS browser. For developers transitioning away from Docker Desktop, OrbStack provides an excellent alternative that is compatible with Portainer.
