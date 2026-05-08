# How to Configure Podman Socket for Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Socket, Docker Compose, API

Description: Learn how to configure and manage the Podman socket for use with Docker Compose and other Docker-compatible tools.

---

> The Podman socket exposes a Docker-compatible REST API that lets Docker Compose and other tools work with Podman.

Podman provides a systemd-managed socket for its REST API, including a compatibility layer for the Docker v1.40 API. This lets tools like Docker Compose, Portainer, and other Docker ecosystem utilities work with Podman without modification. This guide covers setup for both rootless and rootful modes.

---

## Rootless Socket Setup

```bash
# Enable the socket for the current user

systemctl --user enable podman.socket
systemctl --user start podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Check the socket file exists
ls -la /run/user/$(id -u)/podman/podman.sock
```

## Rootful Socket Setup

```bash
# Enable the system-wide socket
sudo systemctl enable podman.socket
sudo systemctl start podman.socket

# Verify
sudo systemctl status podman.socket

# Socket location
ls -la /run/podman/podman.sock
```

## Configuring DOCKER_HOST

```bash
# For rootless Podman
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

# For rootful Podman
export DOCKER_HOST=unix:///run/podman/podman.sock

# Make it persistent
echo 'export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock' >> ~/.bashrc
source ~/.bashrc
```

## Testing the Socket

```bash
# Test with curl
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
  http://localhost/_ping
# Expected output: OK

# Get system info
curl -s --unix-socket /run/user/$(id -u)/podman/podman.sock \
  http://localhost/v4.0.0/libpod/info | python3 -m json.tool | head -20

# List containers via API
curl -s --unix-socket /run/user/$(id -u)/podman/podman.sock \
  http://localhost/v1.40/containers/json
```

## Socket Activation

The Podman socket uses systemd socket activation - the Podman service starts on demand when a client connects.

```bash
# Check the socket unit file
systemctl --user cat podman.socket

# Check if the service was activated
systemctl --user status podman.service
```

## Enabling Lingering for Background Services

```bash
# Without lingering, the socket stops when you log out
# Enable lingering to keep user services running
loginctl enable-linger $(whoami)

# Verify
loginctl show-user $(whoami) | grep Linger
# Output: Linger=yes
```

## TCP Socket (Remote Access)

```bash
# Enable the TCP socket for remote access
podman system service --time=0 tcp://0.0.0.0:2375 &

# Connect from a remote machine
export DOCKER_HOST=tcp://remote-host:2375
docker compose up -d

# WARNING: TCP socket has no authentication by default
# Use SSH tunneling or mutual TLS for production
```

## Socket Troubleshooting

```bash
# Check if the socket is listening
systemctl --user is-active podman.socket

# Restart the socket
systemctl --user restart podman.socket

# Check for errors
journalctl --user -u podman.socket
journalctl --user -u podman.service

# Verify the socket path
podman info --format '{{.Host.RemoteSocket.Path}}'
```

## Using with Docker Compose

```bash
# Ensure the socket is running
systemctl --user start podman.socket

# Set the host
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

# Run Docker Compose
docker compose up -d
docker compose ps
docker compose down
```

## Summary

Configure the Podman socket by enabling it with systemd for rootless or rootful mode. Set `DOCKER_HOST` to point at the socket, enable lingering for persistent access, and test with curl or Docker Compose. The socket provides Docker API compatibility for many Docker ecosystem tools.
