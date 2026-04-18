# How to Troubleshoot WSL2 Docker Socket Issues with Portainer - Troubleshoot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WSL2, Docker, Portainer, Window, Troubleshooting, Docker Socket

Description: Learn how to diagnose and fix Docker socket connectivity issues between WSL2 and Portainer on Windows, including socket path problems, permissions, and Docker Desktop integration.

## Introduction

Running Portainer on WSL2 with Docker Desktop on Windows can cause Docker socket connectivity issues. The socket path and permissions differ from native Linux, and Docker Desktop's WSL integration adds additional complexity.

## Understanding the WSL2 Docker Setup

Docker Desktop on Windows provides Docker in WSL2 by:
- Running a lightweight Linux VM
- Exposing a Docker socket at `/var/run/docker.sock` inside WSL2
- Integrating with WSL2 distros so they share the same Docker daemon

## Step 1: Verify Docker is Working in WSL2

Open your WSL2 terminal:

```bash
docker version
docker ps
```

If Docker commands fail, Docker Desktop's WSL integration may not be enabled:

1. Open Docker Desktop → Settings → Resources → WSL Integration
2. Enable integration for your WSL2 distro
3. Restart Docker Desktop

## Step 2: Check the Socket Path

```bash
ls -la /var/run/docker.sock
```

Expected output:

```bash
srw-rw---- 1 root docker 0 ... /var/run/docker.sock
```

If the socket doesn't exist:

```bash
# Try the WSL shared socket mount

ls /mnt/wsl/shared-docker-socket/
```

## Step 3: Check Docker Group Membership

```bash
groups
# Should include: docker
```

If not in the docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Step 4: Running Portainer in WSL2

```bash
docker run -d \
  -p 9000:9000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Step 5: Socket Permission Issues

If Portainer fails with permission denied:

```bash
# Check socket permissions
stat /var/run/docker.sock

# Fix permissions (temporary)
sudo chmod 666 /var/run/docker.sock
```

For a permanent fix, ensure your user is in the `docker` group (see Step 3).

## Step 6: WSL2 Networking for Portainer Access

Portainer running in WSL2 is accessible at `localhost:9000` from Windows due to WSL2's automatic port forwarding. If that doesn't work:

```bash
# Find WSL2 IP
hostname -I

# Access Portainer at that IP from Windows browser
```

## Step 7: Docker Context Issues

```bash
docker context ls
docker context use default
```

## Restarting WSL2

```powershell
# In PowerShell (Windows)
wsl --shutdown
# Then restart your WSL2 terminal
```

## Conclusion

WSL2 Docker socket issues with Portainer usually come down to Docker Desktop WSL integration, group membership, or socket permissions. Enabling WSL integration in Docker Desktop settings and adding your user to the docker group resolves most cases.
