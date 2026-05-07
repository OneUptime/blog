# How to Start the Podman Socket for API Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, API, Socket, Docker Compatibility

Description: Learn how to start and configure the Podman socket to enable REST API access for automation tools, CI/CD pipelines, and Docker-compatible clients.

---

> Starting the Podman socket is the gateway to programmatic container management, enabling everything from Docker Compose to custom automation scripts.

Many container management tools, CI/CD systems, and automation frameworks communicate with the container runtime through a Unix socket. Podman provides a socket-activated service that exposes both a Docker-compatible API and a native Podman API. This guide shows you how to start, configure, and use the Podman socket for API access.

---

## Starting the Podman Socket

The fastest way to enable API access is through the systemd socket unit.

```bash
# Start the Podman socket for the current user (rootless)

systemctl --user start podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Check that the socket file exists
ls -la /run/user/$(id -u)/podman/podman.sock
```

The socket is activated on demand, meaning the Podman service starts only when a connection is made to the socket.

## Enabling the Socket at Boot

To make the socket available automatically after login.

```bash
# Enable the socket to start on user login
systemctl --user enable podman.socket

# Verify it is enabled
systemctl --user is-enabled podman.socket

# Enable lingering so the socket starts even without a login session
loginctl enable-linger $(whoami)

# Verify lingering is enabled
loginctl show-user $(whoami) --property=Linger
```

## Starting the Socket for Root

For system-wide rootful access, manage the socket as a system service.

```bash
# Start the rootful Podman socket
sudo systemctl start podman.socket

# Enable it to start at boot
sudo systemctl enable podman.socket

# Check the socket status
sudo systemctl status podman.socket

# The rootful socket is located at
ls -la /run/podman/podman.sock
```

## Testing the Socket Connection

Verify the socket is working by making API calls.

```bash
# Ping the API to verify connectivity
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/libpod/_ping

# Get system information through the API
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/libpod/info | jq '.version'

# List containers through the API
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/libpod/containers/json | jq '.[].Names'

# Use the Docker-compatible API endpoint
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/v1.40/containers/json | jq '.[].Names'
```

## Configuring the DOCKER_HOST Variable

Point Docker-compatible tools to the Podman socket.

```bash
# Set DOCKER_HOST for the current session
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

# Verify with Docker CLI
docker info
docker ps

# Make it permanent by adding to your shell profile
echo "export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock" >> ~/.bashrc
source ~/.bashrc

# For rootful socket
export DOCKER_HOST=unix:///run/podman/podman.sock
```

## Using the Socket with Docker Compose

Docker Compose works seamlessly with the Podman socket.

```bash
# Ensure the socket is running
systemctl --user start podman.socket

# Set the DOCKER_HOST variable
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

# Create a sample docker-compose.yml
cat > /tmp/docker-compose.yml << 'EOF'
version: "3"
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
EOF

# Run docker-compose using the Podman socket
cd /tmp && docker-compose up -d

# Verify the container is running
docker-compose ps

# Clean up
docker-compose down
```

## Starting the Socket Manually

For temporary or debugging use, start the service directly.

```bash
# Start the Podman system service manually (foreground)
podman system service --time 0 unix:///tmp/podman-debug.sock &

# Test the manual socket
curl --unix-socket /tmp/podman-debug.sock \
    http://localhost/libpod/_ping

# Stop the manual service
kill %1

# Start with a timeout (auto-stops after 60 seconds of inactivity)
podman system service --time 60 &
```

## Socket Activation Details

Understand how systemd socket activation works with Podman.

```bash
# View the socket unit file
systemctl --user cat podman.socket

# View the service unit file that gets activated
systemctl --user cat podman.service

# Check if the service was activated by the socket
systemctl --user show podman.service --property=TriggeredBy

# Monitor socket activation in real time
journalctl --user -u podman.socket -f &
# Make an API call to trigger activation
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/libpod/_ping
```

## Troubleshooting Socket Issues

Common problems and their solutions when working with the Podman socket.

```bash
# Problem: "connection refused" or "no such file"
# Check if the socket unit is loaded
systemctl --user list-units | grep podman

# If the socket file does not exist, restart the socket
systemctl --user restart podman.socket

# Problem: Permission denied when connecting
# Check socket file permissions
ls -la /run/user/$(id -u)/podman/podman.sock

# Problem: Service starts but immediately stops
# Check the service logs for errors
journalctl --user -u podman.service --no-pager -n 20

# Problem: Socket exists but API returns errors
# Check if another process is using the socket
fuser /run/user/$(id -u)/podman/podman.sock

# Clean restart of socket and service
systemctl --user stop podman.service
systemctl --user stop podman.socket
systemctl --user start podman.socket
```

## Summary

The Podman socket is your entry point for API-driven container management. Start it with systemd for production use, enable lingering for persistent availability, and set the DOCKER_HOST variable for seamless Docker tool compatibility. Whether you are running Docker Compose, integrating with CI/CD pipelines, or building custom automation, the Podman socket provides a reliable API endpoint without requiring a persistent daemon.
