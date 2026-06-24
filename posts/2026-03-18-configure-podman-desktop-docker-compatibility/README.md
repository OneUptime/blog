# How to Configure Podman Desktop for Docker Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Docker, Compatibility, Migration

Description: Learn how to configure Podman Desktop for full Docker compatibility so existing Docker workflows, tools, and scripts work without modification.

---

> Podman Desktop can serve as a Docker-compatible container environment, letting you run many existing Docker commands, Compose files, and tools with minimal changes.

Many development teams have existing Docker-based workflows, CI scripts, and tooling. Podman Desktop provides Docker compatibility features that allow many of these tools to work with Podman as the underlying engine. This guide covers configuring the Docker socket, CLI aliases, Docker Compose support, and ensuring your existing workflows continue to function.

---

## Understanding Docker Compatibility

Podman implements a Docker-compatible API, which means most Docker CLI commands and API clients work with Podman without modification. The key to compatibility is ensuring tools that expect Docker can communicate with Podman.

```bash
# Podman supports most Docker CLI commands natively

podman pull nginx:alpine
podman run -d --name test nginx:alpine
podman ps
podman stop test
podman rm test
```

## Setting Up the Docker Socket

The Docker socket is how tools communicate with the container engine. Configure Podman to provide a compatible socket:

```bash
# Enable the Podman socket service on Linux
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Check the socket location
ls -la /run/user/$(id -u)/podman/podman.sock

# On macOS, the Podman machine provides the socket
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'
```

## Configuring the Docker CLI Alias

Create an alias so the `docker` command uses Podman:

```bash
# Option 1: Shell alias (add to ~/.zshrc or ~/.bashrc)
echo 'alias docker=podman' >> ~/.zshrc
source ~/.zshrc

# Option 2: Symbolic link (system-wide)
sudo ln -sf $(which podman) /usr/local/bin/docker

# Verify the alias works
docker --version
docker ps
docker images
```

## Enabling Docker Compatibility in Podman Desktop

Podman Desktop includes a Docker compatibility mode:

1. Open Podman Desktop and go to **Settings**.
2. Navigate to **Preferences** > **Docker Compatibility**.
3. Enable the **Docker Compatibility** toggle if it is not already enabled.
4. Open **Docker Compatibility** in the Settings list to check the socket mapping status.
5. On macOS, enable **Third-Party Docker Tool Compatibility** if it was disabled. On Linux and Windows, use `DOCKER_HOST` when tools need to connect directly to the Podman socket.

When socket compatibility is enabled, Podman Desktop maps the standard Docker socket path to Podman where the platform supports it.

## Docker Compose Support

Podman supports Docker Compose through `podman compose` with an external Compose provider such as Docker Compose or `podman-compose`, or by running the Docker Compose plugin with the Podman socket:

```bash
# Option 1: Install podman-compose
pip install podman-compose

# Use Podman's Compose wrapper with your existing compose.yaml
podman compose up -d
podman compose ps
podman compose down

# Option 2: Use Docker Compose with the Podman socket
export DOCKER_HOST=unix://${XDG_RUNTIME_DIR}/podman/podman.sock
docker compose up -d
docker compose ps
docker compose down
```

Example `docker-compose.yml` that works with both:

```yaml
# docker-compose.yml
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./html:/usr/share/nginx/html:ro
  api:
    image: node:18-alpine
    working_dir: /app
    command: node server.js
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
```

## Configuring Environment Variables

Set environment variables for Docker compatibility:

```bash
# Point DOCKER_HOST to the Podman socket
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# On macOS with Podman machine
export DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')"

# Leave Docker API version negotiation enabled unless you need a specific API version
unset DOCKER_API_VERSION

# Add to your shell profile for persistence
cat >> ~/.zshrc << 'EOF'
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock"
EOF
```

## Testing Compatibility with Docker Tools

Verify that popular Docker tools work with Podman:

```bash
# Test with Docker Compose
docker compose version

# Test with Testcontainers on rootless Linux
export TESTCONTAINERS_RYUK_DISABLED=true
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# Test with Testcontainers on macOS
export DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')"
export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock

# Test with VS Code Dev Containers
# Set the docker.host setting in VS Code
# "docker.host": "unix:///run/user/1000/podman/podman.sock"

# Docker Buildx is a Docker CLI plugin, not a Podman subcommand
docker buildx version 2>/dev/null || echo "Use podman build instead"
```

## Handling Compatibility Differences

Some Docker features behave slightly differently in Podman:

```bash
# Podman runs rootless by default (no sudo needed)
podman run --rm alpine whoami
# Output: root (inside container, but rootless on host)

# Docker networks use different default drivers
podman network create my-network
podman network ls

# Dockerfile syntax is supported through Podman build
podman build --layers -t my-app .

# Podman does not have a daemon; containers run as child processes
# This affects how containers behave on system restart
```

## Summary

Configuring Podman Desktop for Docker compatibility lets you leverage many existing Docker workflows, scripts, and tools with minimal changes. The Docker-compatible socket, CLI aliases, and Compose support provide a practical transition path. By setting the right environment variables and enabling compatibility features in Podman Desktop, your team can adopt Podman while preserving investments in Docker-based tooling.
