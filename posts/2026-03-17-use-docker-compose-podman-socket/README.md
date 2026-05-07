# How to Use Docker Compose with Podman Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker Compose, Socket, Compatibility

Description: Learn how to use the official Docker Compose tool with Podman by enabling the Podman socket as a Docker-compatible API endpoint.

---

> The Podman socket provides a Docker-compatible API, letting you use the official Docker Compose CLI without Docker Desktop.

Instead of using podman-compose, you can run the official Docker Compose (`docker compose`, or `docker-compose` where installed) against the Podman socket. Podman exposes a Docker-compatible REST API that Docker Compose can talk to, supporting many Compose v2 workflows.

---

## Enabling the Podman Socket (Rootless)

```bash
# Enable and start the Podman socket for your user

systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Check the socket path
ls -la /run/user/$(id -u)/podman/podman.sock
```

## Enabling the Podman Socket (Rootful)

```bash
# Enable and start the system-wide Podman socket
sudo systemctl enable --now podman.socket

# Verify
sudo systemctl status podman.socket

# Socket path
ls -la /run/podman/podman.sock
```

## Setting DOCKER_HOST

Point Docker Compose at the Podman socket.

```bash
# For rootless Podman
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

# For rootful Podman
export DOCKER_HOST=unix:///run/podman/podman.sock

# Add to your shell profile for persistence
echo 'export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock' >> ~/.bashrc
```

## Running Docker Compose with Podman

```bash
# Verify Docker Compose can connect to Podman
docker compose version

# Run your compose file through the Podman socket
docker compose up -d

# Check running containers
docker compose ps
```

## Example Workflow

```yaml
# docker-compose.yml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - "8080:80"
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
```

```bash
# Start services via Docker Compose + Podman socket
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock
docker compose up -d

# Both docker compose and podman show the same containers
docker compose ps
podman ps
```

## Testing the Socket

```bash
# Test the API directly with curl
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
  http://localhost/v4.0.0/libpod/info | python3 -m json.tool

# List containers via the API
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
  http://localhost/v1.40/containers/json
```

## macOS with Podman Machine

```bash
# On macOS, the socket is forwarded from the Podman machine
podman machine start

# Find the socket path
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'

# Set DOCKER_HOST
export DOCKER_HOST=unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')

# Now docker compose works
docker compose up -d
```

## Summary

Enable the Podman socket with systemd, set `DOCKER_HOST` to point at it, and run the official Docker Compose tool against Podman. This lets you run many Docker Compose v2 workloads without Docker Desktop, using Podman as the container runtime.
