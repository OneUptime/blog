# How to Migrate from Docker Desktop to Podman

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Podman, Migration, Containers, DevOps

Description: Learn how to migrate from Docker Desktop to Podman, including command translation, Docker Compose compatibility, and handling edge cases.

---

Podman is a daemonless container engine that's compatible with Docker. Migrating from Docker Desktop to Podman can eliminate licensing costs while maintaining a familiar workflow. This guide covers the complete migration process.

## Podman vs Docker Architecture

```
Docker Architecture:
┌─────────────────────────────────────────────────────────────┐
│  docker CLI ──► Docker Daemon ──► containerd ──► Containers │
│                (root process)                                │
└─────────────────────────────────────────────────────────────┘

Podman Architecture:
┌─────────────────────────────────────────────────────────────┐
│  podman CLI ──► (no daemon) ──► conmon ──► Containers       │
│                                   (per container)            │
└─────────────────────────────────────────────────────────────┘
```

## Installing Podman

### macOS

```bash
# Install Podman
brew install podman

# Initialize machine
podman machine init --cpus 4 --memory 8192 --disk-size 60
podman machine start

# Verify installation
podman version
podman info
```

### Linux (Ubuntu/Debian)

```bash
# Install Podman
sudo apt-get update
sudo apt-get install -y podman

# Verify
podman version
```

### Linux (RHEL/Fedora)

```bash
# Podman is pre-installed on RHEL/Fedora
sudo dnf install -y podman

# Verify
podman version
```

### Windows

```bash
# Using winget
winget install RedHat.Podman

# Initialize machine
podman machine init
podman machine start
```

## Command Translation

### Basic Commands

| Docker | Podman |
|--------|--------|
| docker run | podman run |
| docker ps | podman ps |
| docker images | podman images |
| docker build | podman build |
| docker pull | podman pull |
| docker push | podman push |
| docker logs | podman logs |
| docker exec | podman exec |
| docker stop | podman stop |
| docker rm | podman rm |
| docker rmi | podman rmi |

### Docker Alias

```bash
# Add to ~/.bashrc or ~/.zshrc
alias docker=podman

# Or install podman-docker
# macOS
brew install podman-docker

# Linux
sudo apt-get install podman-docker
```

## Docker Compose Compatibility

### Using podman-compose

```bash
# Install podman-compose
pip3 install podman-compose

# Use like docker-compose
podman-compose up -d
podman-compose down
podman-compose logs
```

### Using docker-compose with Podman

```bash
# Set Docker host to Podman socket
# macOS
export DOCKER_HOST="unix://$HOME/.local/share/containers/podman/machine/podman.sock"

# Linux
export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"

# Now docker-compose works with Podman
docker-compose up -d
```

### Enable Podman Socket

```bash
# Linux - enable user socket
systemctl --user enable podman.socket
systemctl --user start podman.socket

# Verify
podman system connection list
```

## Migrating Images

### Export from Docker

```bash
# List images to migrate
docker images

# Save images
docker save nginx:latest -o nginx.tar
docker save myapp:latest -o myapp.tar

# Or compress
docker save nginx:latest | gzip > nginx.tar.gz
```

### Import to Podman

```bash
# Load images
podman load -i nginx.tar
podman load -i myapp.tar

# Or from compressed
gunzip -c nginx.tar.gz | podman load

# Verify
podman images
```

### Bulk Migration Script

```bash
#!/bin/bash
# migrate-images.sh

# Export all images from Docker
for image in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>"); do
    filename=$(echo $image | tr '/:' '_')
    echo "Exporting $image..."
    docker save "$image" | gzip > "${filename}.tar.gz"
done

# Import to Podman
for file in *.tar.gz; do
    echo "Importing $file..."
    gunzip -c "$file" | podman load
done

echo "Migration complete!"
podman images
```

## Migrating Volumes

### Export Volume Data

```bash
# Docker volume backup
docker run --rm \
  -v myvolume:/source \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/myvolume.tar.gz -C /source .
```

### Import to Podman

```bash
# Create volume in Podman
podman volume create myvolume

# Restore data
podman run --rm \
  -v myvolume:/target \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/myvolume.tar.gz -C /target

# Verify
podman volume inspect myvolume
```

## Docker Compose Files

### Compatibility Adjustments

```yaml
# docker-compose.yml
# Most configurations work unchanged

version: '3.8'

services:
  web:
    image: nginx
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
      # Z flag for SELinux (Linux)
      # - ./html:/usr/share/nginx/html:ro,Z

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### Podman-Specific Options

```yaml
# For rootless Podman on Linux, use user namespace
services:
  app:
    image: myapp
    userns_mode: "keep-id"  # Map container UID to host UID
```

## Handling Differences

### Docker Socket

```bash
# Docker expects /var/run/docker.sock
# Podman provides different socket locations

# macOS (Podman machine)
export DOCKER_HOST="unix://$HOME/.local/share/containers/podman/machine/podman.sock"

# Linux (rootless)
export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"

# Linux (rootful)
export DOCKER_HOST="unix:///run/podman/podman.sock"
```

### Buildx/BuildKit

```bash
# Podman has native multi-arch support
podman build --platform linux/amd64,linux/arm64 -t myimage .

# For buildx compatibility, use podman-buildx
# Or build with manifest
podman manifest create myimage:latest
podman build --platform linux/amd64 --manifest myimage:latest .
podman build --platform linux/arm64 --manifest myimage:latest .
podman manifest push myimage:latest
```

### Networking Differences

```yaml
# Docker default bridge network
services:
  app:
    networks:
      - default

# Podman may need explicit network
services:
  app:
    networks:
      - podman  # or create custom network
```

### Root vs Rootless

```bash
# Rootless Podman (default, more secure)
podman run nginx  # Runs as current user

# Rootful Podman (when needed)
sudo podman run nginx

# macOS Podman machine - enable rootful
podman machine stop
podman machine set --rootful
podman machine start
```

## CI/CD Compatibility

### GitHub Actions

```yaml
name: Build with Podman

on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build with Podman
        run: |
          podman build -t myapp .
          podman push myapp ${{ secrets.REGISTRY }}/myapp
```

### GitLab CI

```yaml
build:
  image: quay.io/podman/stable
  script:
    - podman build -t myapp .
    - podman login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - podman push myapp $CI_REGISTRY/myapp
```

## Troubleshooting

### Permission Denied

```bash
# Linux rootless - configure subuid/subgid
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
podman system migrate

# Reset storage
podman system reset
```

### Network Issues

```bash
# Recreate default network
podman network rm podman
podman network create podman

# Check network
podman network ls
podman network inspect podman
```

### Volume Mount Issues

```bash
# SELinux (Linux) - add :Z or :z suffix
podman run -v ./data:/data:Z myapp

# Or disable SELinux for volumes
podman run --security-opt label=disable -v ./data:/data myapp
```

### Image Pull Failures

```bash
# Podman searches multiple registries
# Configure default registry
cat >> ~/.config/containers/registries.conf << EOF
unqualified-search-registries = ["docker.io", "quay.io"]
EOF

# Or specify full image name
podman pull docker.io/library/nginx
```

## Complete Migration Checklist

```bash
#!/bin/bash
# migration-checklist.sh

echo "=== Docker to Podman Migration Checklist ==="

# 1. Install Podman
echo "1. Installing Podman..."
# (platform-specific installation)

# 2. Configure aliases
echo "2. Setting up Docker compatibility..."
echo 'alias docker=podman' >> ~/.zshrc
echo 'alias docker-compose=podman-compose' >> ~/.zshrc

# 3. Export Docker images
echo "3. Exporting Docker images..."
mkdir -p ~/docker-migration
for img in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep -v none); do
    safe_name=$(echo $img | tr '/:' '_')
    docker save $img | gzip > ~/docker-migration/${safe_name}.tar.gz
done

# 4. Export Docker volumes
echo "4. Exporting Docker volumes..."
for vol in $(docker volume ls -q); do
    docker run --rm -v $vol:/source -v ~/docker-migration:/backup alpine \
        tar czf /backup/vol_${vol}.tar.gz -C /source .
done

# 5. Stop Docker
echo "5. Stopping Docker Desktop..."
# osascript -e 'quit app "Docker"'  # macOS

# 6. Start Podman
echo "6. Starting Podman..."
podman machine init --cpus 4 --memory 8192
podman machine start

# 7. Import images
echo "7. Importing images to Podman..."
for img in ~/docker-migration/*.tar.gz; do
    [[ $img == *"vol_"* ]] && continue
    gunzip -c $img | podman load
done

# 8. Import volumes
echo "8. Importing volumes to Podman..."
for vol_file in ~/docker-migration/vol_*.tar.gz; do
    vol_name=$(basename $vol_file .tar.gz | sed 's/vol_//')
    podman volume create $vol_name
    podman run --rm -v $vol_name:/target -v ~/docker-migration:/backup alpine \
        tar xzf /backup/vol_${vol_name}.tar.gz -C /target
done

# 9. Verify
echo "9. Verifying migration..."
podman images
podman volume ls

echo "=== Migration Complete ==="
```

## Summary

| Aspect | Docker | Podman |
|--------|--------|--------|
| Daemon | Required | None |
| Root | Default | Rootless default |
| Commands | docker | podman (compatible) |
| Compose | docker-compose | podman-compose |
| Socket | /var/run/docker.sock | User-specific |
| License | Proprietary (Desktop) | Apache 2.0 |

Podman provides Docker-compatible commands with a daemonless architecture. Most Docker workflows work unchanged with Podman after setting up proper aliases and environment variables. The main adjustments are for socket paths and rootless permissions on Linux. For other Docker Desktop alternatives, see our post on [Docker Desktop Alternatives](https://oneuptime.com/blog/post/2026-01-16-docker-desktop-alternatives/view).

