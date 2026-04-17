# How to Troubleshoot WSL2 Docker Socket Issues with Portainer - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, WSL2, Docker Socket, Troubleshooting, Window

Description: Learn how to diagnose and fix Docker socket connectivity issues when running Portainer inside WSL2, including permission errors, socket not found errors, and Docker not starting.

## Common WSL2 Docker Socket Issues

| Error | Cause |
|-------|-------|
| `permission denied /var/run/docker.sock` | User not in docker group |
| `connect: no such file or directory` | Docker not running |
| `Cannot connect to Docker daemon` | Docker service not started |
| Container exits immediately | Named pipe vs socket confusion |

## Issue 1: Permission Denied on Docker Socket

```bash
# Error:

# Got permission denied while trying to connect to the Docker daemon socket
# at unix:///var/run/docker.sock

# Fix: Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify group membership
groups | grep docker

# Test
docker ps
```

## Issue 2: Docker Socket Not Found

```bash
# Error:
# Cannot connect to the Docker daemon at unix:///var/run/docker.sock
# Is the docker daemon running?

# Check if Docker service is running
sudo service docker status
# Or with systemd:
sudo systemctl status docker

# Start Docker
sudo service docker start
# Or:
sudo systemctl start docker

# Verify socket exists
ls -la /var/run/docker.sock
```

## Issue 3: Docker Not Auto-Starting in WSL2

By default, WSL2 doesn't run systemd. Configure it:

```bash
# Check if systemd is enabled
cat /proc/1/comm
# If "init" → systemd not active
# If "systemd" → systemd is active

# Enable systemd (Ubuntu 22.04+ with WSL2)
sudo tee /etc/wsl.conf << 'EOF'
[boot]
systemd=true
EOF

# Shutdown WSL2 and restart
# In Windows PowerShell:
# wsl --shutdown
# Then reopen Ubuntu terminal
```

Without systemd, add Docker start to `.bashrc`:

```bash
echo 'if ! pgrep -x "dockerd" > /dev/null; then sudo service docker start; fi' >> ~/.bashrc
source ~/.bashrc
```

## Issue 4: Portainer Can't Connect to Docker Socket

```bash
# Verify Portainer is using the correct socket mount
docker inspect portainer | grep -A 5 "Mounts"
# Should show: /var/run/docker.sock:/var/run/docker.sock

# Test socket from within a container
docker exec portainer ls -la /var/run/docker.sock
# Expected: srw-rw---- 1 root docker ... /var/run/docker.sock

# Test connectivity from the host (curl supports --unix-socket; wget does not)
curl --unix-socket /var/run/docker.sock http://localhost/version
```

## Issue 5: WSL2 and Docker Desktop Conflict

If Docker Desktop is installed, it manages Docker in WSL2. Conflicts occur when you also install Docker Engine inside WSL2:

```bash
# Check if Docker Desktop is managing this WSL instance
# Docker Desktop creates /usr/bin/docker as a wrapper

ls -la /usr/bin/docker
# If it points to Docker Desktop's proxy, that's the source

# Option A: Use Docker Desktop (remove Docker Engine inside WSL2)
sudo apt remove docker-ce

# Option B: Disable WSL integration in Docker Desktop settings
# Docker Desktop → Settings → Resources → WSL Integration
# Disable the specific Ubuntu distro
```

## Issue 6: Socket Permissions After WSL2 Restart

The socket is recreated when Docker restarts, sometimes with wrong permissions:

```bash
# Fix socket permissions
sudo chmod 666 /var/run/docker.sock
# Or better (group-based):
sudo chown root:docker /var/run/docker.sock
sudo chmod 660 /var/run/docker.sock
```

## Diagnostic Script

```bash
#!/bin/bash
echo "=== WSL2 Docker Socket Diagnostics ==="

echo -e "\n1. User groups:"
groups

echo -e "\n2. Docker socket:"
ls -la /var/run/docker.sock 2>/dev/null || echo "Socket not found"

echo -e "\n3. Docker service status:"
service docker status 2>/dev/null || systemctl status docker 2>/dev/null

echo -e "\n4. Docker daemon running:"
pgrep -x dockerd && echo "dockerd is running" || echo "dockerd NOT running"

echo -e "\n5. Docker connection test:"
docker version 2>&1 | head -5
```

## Conclusion

Most WSL2 Docker socket issues fall into three categories: Docker not running, user permission problems, or conflicts with Docker Desktop. The key diagnostic commands are checking group membership (`groups`), verifying the socket exists (`ls /var/run/docker.sock`), and confirming Docker is running (`service docker status`). Once Docker is running correctly, Portainer connects to it seamlessly.
