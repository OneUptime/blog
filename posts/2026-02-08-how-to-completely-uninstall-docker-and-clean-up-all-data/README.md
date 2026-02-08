# How to Completely Uninstall Docker and Clean Up All Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Uninstall, Linux, macOS, Windows, DevOps, Cleanup, Disk Space, Troubleshooting

Description: Complete instructions for fully removing Docker Engine, Docker Desktop, and all associated data from Linux, macOS, and Windows systems.

---

There are good reasons to uninstall Docker completely. Maybe you are switching to Podman, troubleshooting a corrupted installation, freeing up disk space, or simply cleaning up a machine. A partial uninstall can leave behind images, containers, volumes, networks, and configuration files that consume disk space and potentially interfere with future installations. This guide covers the complete removal process for Linux, macOS, and Windows.

## Before You Uninstall

### Back Up Important Data

Docker volumes may contain databases, application state, or other important data. Back up anything you need before proceeding.

```bash
# List all Docker volumes
docker volume ls

# Inspect a specific volume to see its mount point
docker volume inspect my-database-volume

# Copy data out of a volume
docker run --rm -v my-database-volume:/data -v $(pwd):/backup alpine tar czf /backup/volume-backup.tar.gz -C /data .
```

### Export Container Images

If you want to keep any images, export them first.

```bash
# Save an image to a tar file
docker save -o my-image-backup.tar my-image:latest

# Save multiple images
docker save -o all-images.tar image1:latest image2:latest image3:v2
```

You can reimport these later with `docker load -i my-image-backup.tar`.

### Document Your Configuration

Save your Docker daemon configuration and any Compose files.

```bash
# Copy the daemon config
cp /etc/docker/daemon.json ~/docker-daemon-backup.json

# List all running containers and their configurations
docker inspect $(docker ps -q) > ~/running-containers-backup.json
```

## Uninstalling Docker on Ubuntu / Debian

### Step 1: Stop All Containers

```bash
# Stop all running containers
docker stop $(docker ps -aq)

# Remove all containers
docker rm $(docker ps -aq)
```

### Step 2: Stop the Docker Service

```bash
# Stop Docker and containerd
sudo systemctl stop docker
sudo systemctl stop docker.socket
sudo systemctl stop containerd
```

### Step 3: Remove Docker Packages

```bash
# Remove Docker Engine, CLI, containerd, and plugins
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-ce-rootless-extras

# Remove unused dependencies
sudo apt-get autoremove -y --purge
```

The `purge` flag removes the packages along with their configuration files. Regular `remove` would leave configs behind.

### Step 4: Delete Docker Data

The package removal does not delete images, containers, volumes, or custom configuration.

```bash
# Remove all Docker data (images, containers, volumes, build cache)
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# Remove Docker configuration
sudo rm -rf /etc/docker
sudo rm -f /etc/apt/sources.list.d/docker.list
sudo rm -f /etc/apt/keyrings/docker.asc

# Remove Docker socket
sudo rm -f /var/run/docker.sock
```

### Step 5: Remove Docker Group and User Configuration

```bash
# Remove the docker group
sudo groupdel docker

# Remove Docker-related systemd files
sudo rm -rf /etc/systemd/system/docker.service.d
sudo systemctl daemon-reload
```

### Step 6: Clean Up User-Level Configuration

```bash
# Remove Docker CLI configuration for your user
rm -rf ~/.docker
```

### Verify Removal

```bash
# Confirm Docker is gone
which docker
docker --version
```

Both commands should return "not found" or an error.

## Uninstalling Docker on CentOS / RHEL / Rocky Linux / Fedora

### Step 1: Stop Everything

```bash
# Stop all containers and the Docker daemon
docker stop $(docker ps -aq) 2>/dev/null
sudo systemctl stop docker
sudo systemctl stop docker.socket
sudo systemctl stop containerd
```

### Step 2: Remove Packages

```bash
# Remove Docker packages using dnf
sudo dnf remove -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-ce-rootless-extras
```

### Step 3: Delete Data and Configuration

```bash
# Remove all Docker data
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd

# Remove configuration
sudo rm -rf /etc/docker
sudo rm -f /etc/yum.repos.d/docker-ce.repo

# Remove user configuration
rm -rf ~/.docker

# Remove the docker group
sudo groupdel docker
```

## Uninstalling Docker on Arch Linux

### Step 1: Stop Docker

```bash
# Stop and disable Docker
sudo systemctl stop docker
sudo systemctl disable docker
```

### Step 2: Remove the Package

```bash
# Remove Docker using pacman
sudo pacman -Rns docker docker-compose docker-buildx
```

The `-Rns` flag removes the package, its dependencies (if not needed by other packages), and its configuration files.

### Step 3: Delete Data

```bash
# Remove Docker data and configuration
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
sudo rm -rf /etc/docker
rm -rf ~/.docker
sudo groupdel docker
```

## Uninstalling Docker on openSUSE / SLES

```bash
# Stop Docker
sudo systemctl stop docker

# Remove packages
sudo zypper remove -y docker docker-compose

# Remove data
sudo rm -rf /var/lib/docker
sudo rm -rf /var/lib/containerd
sudo rm -rf /etc/docker
rm -rf ~/.docker
sudo groupdel docker
```

## Uninstalling Docker Desktop on macOS

### Using the Docker Desktop App

1. Open Docker Desktop
2. Click the Docker icon in the menu bar
3. Select **Troubleshoot** (the bug icon)
4. Click **Uninstall**

### Manual Removal (If Docker Desktop Is Broken)

```bash
# Remove the Docker Desktop application
sudo rm -rf /Applications/Docker.app

# Remove Docker Desktop data
rm -rf ~/Library/Group\ Containers/group.com.docker
rm -rf ~/Library/Containers/com.docker.docker
rm -rf ~/Library/Application\ Support/Docker\ Desktop
rm -rf ~/Library/Preferences/com.docker.docker.plist
rm -rf ~/Library/Saved\ Application\ State/com.electron.docker-frontend.savedState
rm -rf ~/Library/Logs/Docker\ Desktop
rm -rf ~/Library/Preferences/com.electron.docker-frontend.plist
rm -rf ~/Library/Cookies/com.docker.docker.binarycookies

# Remove Docker CLI and related binaries
sudo rm -f /usr/local/bin/docker
sudo rm -f /usr/local/bin/docker-compose
sudo rm -f /usr/local/bin/docker-credential-desktop
sudo rm -f /usr/local/bin/docker-credential-ecr-login
sudo rm -f /usr/local/bin/docker-credential-osxkeychain
sudo rm -f /usr/local/bin/kubectl
sudo rm -f /usr/local/bin/hub-tool
sudo rm -f /usr/local/bin/com.docker.cli

# Remove Docker socket and config
rm -rf ~/.docker
sudo rm -f /var/run/docker.sock
```

### Removing Colima (If Used Instead of Docker Desktop)

```bash
# Stop and delete Colima
colima stop
colima delete

# Remove Colima and Docker CLI
brew uninstall colima docker docker-compose docker-buildx

# Remove Colima data
rm -rf ~/.colima
rm -rf ~/.lima

# Remove Docker config
rm -rf ~/.docker
```

## Uninstalling Docker Desktop on Windows

### Using Windows Settings

1. Open **Settings** > **Apps** > **Installed apps**
2. Search for "Docker Desktop"
3. Click the three dots and select **Uninstall**

### Manual Cleanup After Uninstall

Open PowerShell as Administrator:

```powershell
# Remove Docker data directories
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Docker"
Remove-Item -Recurse -Force "$env:APPDATA\Docker"
Remove-Item -Recurse -Force "$env:APPDATA\Docker Desktop"
Remove-Item -Recurse -Force "$env:PROGRAMDATA\Docker"
Remove-Item -Recurse -Force "$env:PROGRAMDATA\DockerDesktop"

# Remove Docker from PATH (check your System Environment Variables)
# Open System Properties > Environment Variables and remove Docker entries

# Remove WSL Docker distributions if present
wsl --unregister docker-desktop
wsl --unregister docker-desktop-data
```

## Verifying Complete Removal

After uninstalling on any platform, verify that everything is gone.

### Check for Remaining Processes

```bash
# Linux/macOS: Check for Docker processes
ps aux | grep -i docker
```

### Check for Remaining Files

```bash
# Linux: Check for Docker directories
ls -la /var/lib/docker 2>/dev/null
ls -la /etc/docker 2>/dev/null
ls -la ~/.docker 2>/dev/null
```

### Check Disk Space Recovered

```bash
# Check free disk space
df -h /
```

Docker can easily consume tens of gigabytes. After a full cleanup, you should see a significant amount of recovered space.

### Check for Remaining Network Interfaces

```bash
# Check for Docker network interfaces
ip link show | grep docker
```

If `docker0` still exists after uninstallation, reboot the machine.

## Reinstalling Docker After a Clean Removal

If you uninstalled Docker to fix a problem, you can now reinstall fresh.

```bash
# Fresh install on Ubuntu/Debian after cleanup
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

The fresh installation will create a new `/var/lib/docker` directory with clean data.

## Summary

A complete Docker uninstallation requires more than just removing the package. You need to stop all containers and the daemon, remove the packages with the purge option, delete the data directories under `/var/lib/docker` and `/var/lib/containerd`, clean up configuration files, and remove user-level settings. Skipping any of these steps leaves behind data that wastes disk space and can interfere with future installations. Follow the platform-specific steps above for a thorough cleanup.
