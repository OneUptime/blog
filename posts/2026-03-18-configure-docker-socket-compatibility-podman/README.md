# How to Configure Docker Socket Compatibility with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker, Socket, API Compatibility, Systemd

Description: Learn how to configure Podman's Docker-compatible socket so that tools expecting the Docker daemon can work seamlessly with Podman.

---

> Podman provides a Docker-compatible socket that emulates the Docker API, letting third-party tools and SDKs work with Podman without modification.

Many development tools, CI/CD systems, and libraries are built to communicate with Docker through its Unix socket at `/var/run/docker.sock`. Podman can provide a compatible socket that serves the same API, enabling these tools to work with Podman transparently. This guide covers how to set up, configure, and troubleshoot Docker socket compatibility with Podman.

---

## Understanding the Docker Socket

Docker tools communicate with the Docker daemon through a Unix socket that exposes a REST API.

```bash
# The standard Docker socket location

ls -la /var/run/docker.sock

# Tools that use the Docker socket include:
# - Docker Compose
# - Docker SDKs (Python, Go, Node.js)
# - Portainer
# - Watchtower
# - Traefik (for auto-discovery)
# - VS Code Dev Containers
# - Testcontainers
```

## Enabling the Rootless Podman Socket

For rootless (non-root) operation, enable the user-level Podman socket.

```bash
# Enable and start the Podman socket for your user
systemctl --user enable podman.socket
systemctl --user start podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Find the socket path
echo "${XDG_RUNTIME_DIR}/podman/podman.sock"
# Typically: /run/user/1000/podman/podman.sock

# Test the socket with curl
curl --unix-socket "${XDG_RUNTIME_DIR}/podman/podman.sock" \
  http://localhost/v1.40/info | jq .
```

## Enabling the Rootful Podman Socket

For system-wide access (root-level), enable the system Podman socket.

```bash
# Enable and start the system-level Podman socket
sudo systemctl enable podman.socket
sudo systemctl start podman.socket

# Verify the socket is active
sudo systemctl status podman.socket

# The rootful Podman socket is created here
ls -la /run/podman/podman.sock

# Create a symlink at the Docker socket path for maximum compatibility
sudo ln -sf /run/podman/podman.sock /var/run/docker.sock

# Test the socket
sudo curl --unix-socket /run/podman/podman.sock \
  http://localhost/v1.40/version | jq .
```

## Setting DOCKER_HOST

Point tools to the Podman socket using the DOCKER_HOST environment variable.

```bash
# For rootless Podman
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# For rootful Podman
export DOCKER_HOST="unix:///run/podman/podman.sock"

# Add to your shell profile for persistence
echo "export DOCKER_HOST=\"unix://\${XDG_RUNTIME_DIR}/podman/podman.sock\"" \
  >> ~/.bashrc

# Verify the setting works
docker info   # Should show Podman info
docker ps     # Should work through the socket
```

## Configuring Docker Compose with the Podman Socket

Docker Compose can communicate with Podman through the socket.

```bash
# Ensure the Podman socket is running
systemctl --user start podman.socket

# Set DOCKER_HOST
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# Docker Compose now works with Podman
docker compose version
docker compose up -d
docker compose ps

# Example docker-compose.yml works unchanged
cat > docker-compose.yml << 'EOF'
services:
  web:
    image: docker.io/library/nginx:latest
    ports:
      - "8080:80"
  redis:
    image: docker.io/library/redis:7
EOF

docker compose up -d
```

## Configuring the Socket for Development Tools

Set up the Podman socket for common development tools.

```bash
# VS Code Dev Containers - set in settings.json
# "containers.environment": {
#   "DOCKER_HOST": "unix:///run/user/1000/podman/podman.sock"
# }

# Testcontainers (Java/Python/Go)
# Set the environment variable
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# Testcontainers also needs the Ryuk container to be disabled
# when using rootless Podman
export TESTCONTAINERS_RYUK_DISABLED=true

# Python Docker SDK
# Install the SDK
pip install docker

# The SDK automatically uses DOCKER_HOST
python3 -c "
import docker
client = docker.from_env()
print(client.version())
"
```

## Setting Up a TCP Socket

For local tools that need a TCP connection, configure a TCP listener.

```bash
# Run the Podman API service on a local TCP port
podman system service --time=0 tcp://127.0.0.1:2375 &

# Set DOCKER_HOST to use TCP
export DOCKER_HOST="tcp://localhost:2375"

# Test the TCP connection
curl http://localhost:2375/v1.40/version | jq .

# For secure remote access, use SSH instead of an unauthenticated TCP listener
export DOCKER_HOST="ssh://user@remote-host:22/run/user/1000/podman/podman.sock"
```

## Creating a Systemd Service for the Socket

Ensure the socket starts automatically and stays available.

```bash
# The Podman socket service is already provided by the package
# View the service configuration
systemctl --user cat podman.socket

# For a custom socket configuration, create an override
mkdir -p ~/.config/systemd/user/podman.socket.d/

cat > ~/.config/systemd/user/podman.socket.d/override.conf << 'EOF'
[Socket]
# Set socket permissions
SocketMode=0660
EOF

# Reload and restart
systemctl --user daemon-reload
systemctl --user restart podman.socket

# Enable lingering so the socket survives logout
loginctl enable-linger $(whoami)
```

## Handling API Differences

The Podman API is largely compatible with Docker, but there are some differences.

```bash
# Check the supported API version
curl --unix-socket "${XDG_RUNTIME_DIR}/podman/podman.sock" \
  http://localhost/version | jq '{ApiVersion, MinAPIVersion}'

# Podman also exposes its own extended API
curl --unix-socket "${XDG_RUNTIME_DIR}/podman/podman.sock" \
  http://localhost/v4.0.0/libpod/info | jq .

# List containers using the Docker-compatible endpoint
curl --unix-socket "${XDG_RUNTIME_DIR}/podman/podman.sock" \
  http://localhost/v1.40/containers/json | jq .

# List containers using the Podman-native endpoint
curl --unix-socket "${XDG_RUNTIME_DIR}/podman/podman.sock" \
  http://localhost/v4.0.0/libpod/containers/json | jq .
```

## Troubleshooting Socket Issues

Common problems and their solutions when using the Podman socket.

```bash
# Problem: Socket file does not exist
# Solution: Start the socket service
systemctl --user start podman.socket

# Problem: Permission denied on the socket
# Solution: Check socket permissions
ls -la "${XDG_RUNTIME_DIR}/podman/podman.sock"
# Ensure your user owns the socket

# Problem: Connection refused
# Solution: Check if the service is running
systemctl --user status podman.socket
journalctl --user -u podman.socket

# Problem: API version mismatch
# Solution: Set the API version explicitly
export DOCKER_API_VERSION=1.40

# Problem: Socket stops after logout
# Solution: Enable lingering
loginctl enable-linger $(whoami)
```

## Summary

Podman's Docker-compatible socket enables seamless integration with tools that expect the Docker daemon. Enable it with systemd for both rootless and rootful operation, set the DOCKER_HOST environment variable to point tools to the right socket, and enable user lingering for persistent availability. The socket supports Docker Compose, Docker SDKs, VS Code Dev Containers, Testcontainers, and most other Docker-ecosystem tools. While the API is largely compatible, be aware of minor differences and set the API version explicitly if you encounter compatibility issues.
