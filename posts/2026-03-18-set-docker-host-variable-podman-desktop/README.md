# How to Set the DOCKER_HOST Variable for Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Docker, DOCKER_HOST, Environment Variable

Description: Learn how to set the DOCKER_HOST environment variable to point Docker-compatible tools at Podman Desktop's container engine socket.

---

> Setting DOCKER_HOST correctly is the single most important step for making Docker-compatible tools work seamlessly with Podman Desktop.

The `DOCKER_HOST` environment variable tells Docker-compatible tools where to find the container engine socket. When using Podman Desktop, setting this variable to point at the Podman socket allows tools like Docker Compose, VS Code Dev Containers, Testcontainers, and other Docker-based utilities to work without modification. This guide covers finding the socket path and configuring it across different platforms.

---

## Understanding DOCKER_HOST

The `DOCKER_HOST` variable specifies the socket or TCP endpoint that container tools use to communicate with the container engine. By default, Docker tools look for the socket at `/var/run/docker.sock` on macOS and Linux, or the `npipe:////./pipe/docker_engine` named pipe on Windows.

```bash
# Check if DOCKER_HOST is currently set

echo $DOCKER_HOST

# If empty, tools default to /var/run/docker.sock on macOS/Linux
# or npipe:////./pipe/docker_engine on Windows
# We need to point it to the Podman socket instead
```

## Finding the Podman Socket Path

The socket location varies by operating system and configuration:

```bash
# On Linux (rootless Podman)
echo "unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# On macOS with Podman machine
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'

# On Windows with Podman machine
podman machine inspect --format '{{.ConnectionInfo.PodmanPipe.Path}}'

# Generic method: check podman info
podman info --format '{{.Host.RemoteSocket.Path}}'

# Verify the socket exists and is accessible
ls -la $(podman info --format '{{.Host.RemoteSocket.Path}}')
```

## Setting DOCKER_HOST on Linux

```bash
# Enable the Podman socket service first
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Set DOCKER_HOST for the current session
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# Make it permanent by adding to your shell profile
echo 'export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"' >> ~/.bashrc
source ~/.bashrc

# Verify the setting
echo $DOCKER_HOST
```

## Setting DOCKER_HOST on macOS

```bash
# Ensure the Podman machine is running
podman machine start

# Find the socket path
SOCKET_PATH=$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')
echo "Socket path: $SOCKET_PATH"

# Set DOCKER_HOST for the current session
export DOCKER_HOST="unix://$SOCKET_PATH"

# Make it permanent in your shell profile
echo "export DOCKER_HOST=\"unix://$SOCKET_PATH\"" >> ~/.zshrc
source ~/.zshrc

# Test the connection
docker info > /dev/null && echo "Connection successful"
```

## Setting DOCKER_HOST on Windows

For Windows with WSL2:

```bash
# In WSL2, find the Podman socket
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# Enable the socket
systemctl --user enable --now podman.socket

# Add to .bashrc for persistence
echo 'export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"' >> ~/.bashrc
```

For PowerShell:

```powershell
# Find the Podman named pipe
$podmanPipe = (podman machine inspect --format '{{.ConnectionInfo.PodmanPipe.Path}}') -replace '\\','/'

# Set for the current session
$env:DOCKER_HOST = "npipe://$podmanPipe"

# Set permanently for the user
[Environment]::SetEnvironmentVariable("DOCKER_HOST", "npipe://$podmanPipe", "User")
```

## Configuring Tools to Use DOCKER_HOST

Once set, Docker-compatible tools should work automatically:

```bash
# Docker Compose reads DOCKER_HOST automatically
docker compose up -d
docker compose ps

# Testcontainers uses DOCKER_HOST
# Also disable Ryuk for Podman compatibility
export TESTCONTAINERS_RYUK_DISABLED=true
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# VS Code Dev Containers
# Add to VS Code settings.json:
# "containers.environment": { "DOCKER_HOST": "unix:///run/user/1000/podman/podman.sock" }

# Verify tools can connect
docker info 2>/dev/null || podman info
```

## Creating a Docker Socket Symlink

Some tools ignore `DOCKER_HOST` and always look for `/var/run/docker.sock`:

```bash
# On Linux: create a symlink to the Podman socket
sudo ln -sf "${XDG_RUNTIME_DIR}/podman/podman.sock" /var/run/docker.sock

# On macOS: symlink to the Podman machine socket
SOCKET_PATH=$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')
sudo ln -sf "$SOCKET_PATH" /var/run/docker.sock

# Verify the symlink
ls -la /var/run/docker.sock
```

## Troubleshooting DOCKER_HOST Issues

Common problems and solutions:

```bash
# Error: "Cannot connect to the Docker daemon"
# Verify the socket exists
ls -la $(echo $DOCKER_HOST | sed 's|unix://||')

# Verify the Podman service is running
systemctl --user status podman.socket  # Linux
podman machine info                     # macOS

# Error: "Permission denied"
# Check socket permissions
stat $(echo $DOCKER_HOST | sed 's|unix://||')

# Ensure you are in the correct user context
id
whoami

# Reset the Podman socket
systemctl --user restart podman.socket  # Linux
podman machine stop && podman machine start  # macOS

# Test with curl to verify the API
curl --unix-socket $(echo $DOCKER_HOST | sed 's|unix://||') \
  http://localhost/v1.40/info 2>/dev/null | head -c 200
```

## Summary

Setting the `DOCKER_HOST` variable correctly is the foundation of Docker compatibility in Podman Desktop. The variable points Docker-compatible tools at the Podman socket, enabling seamless operation of Docker Compose, VS Code Dev Containers, Testcontainers, and other tools. By configuring this in your shell profile, the setting persists across sessions, and creating a symlink at the default Docker socket path handles tools that do not respect the environment variable.
