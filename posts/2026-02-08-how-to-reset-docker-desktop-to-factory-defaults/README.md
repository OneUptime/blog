# How to Reset Docker Desktop to Factory Defaults

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Desktop, Factory Reset, Troubleshooting, macOS, Windows, Linux

Description: Reset Docker Desktop to factory defaults on macOS, Windows, and Linux while understanding what gets deleted and how to back up first.

---

Sometimes Docker Desktop gets into a state where nothing works right. Builds fail for no reason. The VM consumes all your memory. Networking breaks between containers. Settings changes do not stick. When targeted troubleshooting fails, a factory reset clears everything and gives you a fresh start.

But a factory reset is destructive. It removes all containers, images, volumes, networks, build cache, and custom settings. Before hitting that button, you need to understand exactly what gets deleted and how to preserve what matters. This guide covers the full reset process on every platform, including backup strategies and what to do after the reset.

## What a Factory Reset Deletes

A factory reset removes:

- All Docker images (pulled and built)
- All containers (running and stopped)
- All volumes (named and anonymous)
- All networks (custom networks)
- All build cache
- Docker Desktop settings (resource limits, proxy config, etc.)
- Kubernetes cluster data (if Kubernetes was enabled)
- Docker credentials stored locally

It does NOT remove:

- Docker Desktop application itself
- Your Dockerfiles and docker-compose.yml files (those live in your project directories)
- Source code or project files
- Docker Hub account or remote registry images
- The Docker Desktop license/subscription

## Backing Up Before Reset

Save everything you need before resetting.

### Back Up Docker Volumes

Volumes contain persistent data like database content. List and back up important volumes.

```bash
# List all Docker volumes
docker volume ls

# Back up a specific volume to a tar archive
docker run --rm \
  -v my-database-volume:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/my-database-volume.tar.gz -C /source .

# Back up all named volumes
mkdir -p backups
for vol in $(docker volume ls -q); do
  echo "Backing up volume: $vol"
  docker run --rm \
    -v "$vol":/source:ro \
    -v "$(pwd)/backups":/backup \
    alpine tar czf "/backup/${vol}.tar.gz" -C /source .
done
echo "All volumes backed up to ./backups/"
```

### Save List of Images

Record which images you have so you can pull them again after the reset.

```bash
# Save a list of all images with their tags
docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' > image-list.txt

# View the list
cat image-list.txt
```

If you have custom-built images not available in a registry, save them as tar files.

```bash
# Export a custom image to a tar file
docker save myapp:latest -o backups/myapp-latest.tar

# Export multiple images at once
docker save $(docker images --format '{{.Repository}}:{{.Tag}}' | grep 'myapp') -o backups/my-images.tar
```

### Save Docker Desktop Settings

```bash
# macOS: Back up Docker Desktop settings
cp ~/Library/Group\ Containers/group.com.docker/settings.json backups/docker-settings.json

# View current settings to note resource allocations
cat backups/docker-settings.json | python3 -m json.tool
```

```powershell
# Windows: Back up Docker Desktop settings
Copy-Item "$env:APPDATA\Docker\settings.json" ".\backups\docker-settings.json"
```

### Save Docker Compose State

```bash
# If you have running Compose stacks, note them
docker compose ls

# For each stack, save the current state
docker compose -f /path/to/your/docker-compose.yml config > backups/compose-config.yml
```

## Performing the Factory Reset

### Reset via Docker Desktop GUI

The easiest method works on all platforms:

1. Open Docker Desktop
2. Click the gear icon (Settings)
3. Navigate to the "Troubleshoot" section (or look for a bug icon)
4. Click "Reset to factory defaults"
5. Confirm the action

Docker Desktop shuts down, removes all data, and restarts with a clean state.

### Reset via Command Line on macOS

If Docker Desktop is not responding and you cannot access the GUI:

```bash
# Force quit Docker Desktop
osascript -e 'quit app "Docker"'
sleep 5
killall Docker 2>/dev/null
killall com.docker.hyperkit 2>/dev/null
killall com.docker.backend 2>/dev/null

# Remove all Docker Desktop data
rm -rf ~/Library/Containers/com.docker.docker
rm -rf ~/Library/Group\ Containers/group.com.docker
rm -rf ~/.docker

# Remove the Docker VM disk image
rm -rf ~/Library/Containers/com.docker.docker/Data/vms/

# Restart Docker Desktop fresh
open -a Docker
```

### Reset via Command Line on Windows

```powershell
# Stop Docker Desktop
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "com.docker.backend" -Force -ErrorAction SilentlyContinue

# Shut down WSL 2
wsl --shutdown

# Unregister Docker's WSL distributions (this removes all data)
wsl --unregister docker-desktop
wsl --unregister docker-desktop-data

# Remove Docker Desktop configuration
Remove-Item -Recurse -Force "$env:APPDATA\Docker" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Docker" -ErrorAction SilentlyContinue

# Remove Docker credential store
Remove-Item -Recurse -Force "$env:USERPROFILE\.docker" -ErrorAction SilentlyContinue

# Restart Docker Desktop
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Reset via Command Line on Linux

```bash
# Stop Docker Desktop
systemctl --user stop docker-desktop

# Remove Docker Desktop data
rm -rf ~/.docker/desktop
rm -rf ~/.local/share/docker

# Remove Docker configuration
rm -rf ~/.docker

# Restart Docker Desktop
systemctl --user start docker-desktop
```

## After the Reset

Docker Desktop starts with a clean state. Follow these steps to get back to a working environment.

### Restore Settings

```bash
# macOS: Restore your backed-up settings
# Wait for Docker Desktop to fully start first
cp backups/docker-settings.json ~/Library/Group\ Containers/group.com.docker/settings.json

# Restart Docker Desktop to apply restored settings
osascript -e 'quit app "Docker"'
sleep 3
open -a Docker
```

### Re-pull Images

```bash
# Pull all images from your saved list
while read image; do
  echo "Pulling $image..."
  docker pull "$image" || echo "Failed to pull $image"
done < image-list.txt
```

### Restore Saved Images

```bash
# Load custom images from tar files
docker load -i backups/myapp-latest.tar

# Verify the image was loaded
docker images myapp
```

### Restore Volumes

```bash
# Create a volume and restore data into it
docker volume create my-database-volume

docker run --rm \
  -v my-database-volume:/dest \
  -v $(pwd)/backups:/backup:ro \
  alpine sh -c "cd /dest && tar xzf /backup/my-database-volume.tar.gz"

# Verify the restore
docker run --rm -v my-database-volume:/data alpine ls -la /data
```

### Re-enable Kubernetes

If you were using Docker Desktop's Kubernetes cluster, re-enable it through Settings > Kubernetes > "Enable Kubernetes." The cluster reinitializes from scratch.

### Reconfigure Docker Login

```bash
# Log back into Docker Hub
docker login

# Log into any other registries you use
docker login ghcr.io
docker login registry.example.com
```

## Partial Reset Options

You do not always need a full factory reset. Try these targeted cleanups first.

```bash
# Remove all containers, images, and build cache (keeps settings and volumes)
docker system prune -a -f

# Remove everything including volumes
docker system prune -a -f --volumes

# Remove only build cache
docker builder prune -a -f

# Remove only stopped containers
docker container prune -f

# Remove only dangling images
docker image prune -f

# Remove only unused volumes (dangerous if you have data you need)
docker volume prune -f
```

### Reset Kubernetes Only

If Kubernetes is the problem, reset just the cluster without touching Docker.

In Docker Desktop Settings > Kubernetes, click "Reset Kubernetes Cluster." This removes the Kubernetes cluster and reinstalls it without affecting your Docker containers or images.

## When to Reset vs. When to Reinstall

A factory reset fixes most configuration and data corruption issues. But some problems require a full reinstallation:

- Docker Desktop crashes immediately on launch even after reset
- The Docker Desktop installer reports corruption
- Upgrading from a very old version to the latest

To reinstall:

```bash
# macOS: Remove Docker Desktop completely
sudo rm -rf /Applications/Docker.app
rm -rf ~/Library/Containers/com.docker.docker
rm -rf ~/Library/Group\ Containers/group.com.docker
rm -rf ~/.docker

# Download and install the latest version from docker.com
```

```powershell
# Windows: Uninstall through Settings > Apps, then remove leftover data
wsl --unregister docker-desktop
wsl --unregister docker-desktop-data
Remove-Item -Recurse -Force "$env:APPDATA\Docker" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Docker" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.docker" -ErrorAction SilentlyContinue
# Download and install the latest version from docker.com
```

A factory reset is the last resort in troubleshooting, but with proper backups it is not scary. Back up your volumes and image list, reset, then restore. The whole process takes 15-20 minutes, and you end up with a clean Docker environment that works predictably.
