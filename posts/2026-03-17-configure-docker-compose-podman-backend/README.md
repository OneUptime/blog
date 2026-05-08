# How to Configure docker-compose to Use Podman Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker Compose, Backend, Configuration

Description: Learn how to configure docker-compose to use Podman as its backend runtime instead of Docker, including context setup and environment configuration.

---

> Switching docker-compose to use Podman as its backend lets your team keep existing Compose workflows while dropping the Docker daemon dependency.

Docker Compose can work with container engines that expose a Docker-compatible API. By configuring it to use Podman's API socket, you get rootless containers, an on-demand Podman service, and Compose support in a single setup.

---

## Method 1: DOCKER_HOST Environment Variable

The simplest approach points Docker Compose at the Podman socket.

```bash
# Enable the Podman socket

systemctl --user enable --now podman.socket

# Set DOCKER_HOST for the current shell
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock

# Test the connection
docker compose version
docker compose ls
```

## Method 2: Docker Context

Create a Docker context that points to Podman.

```bash
# Create a new context for Podman
docker context create podman \
  --docker "host=unix://$XDG_RUNTIME_DIR/podman/podman.sock"

# Switch to the Podman context
docker context use podman

# Verify the active context
docker context ls
# Output shows podman context with an asterisk

# Now all docker compose commands use Podman
docker compose up -d
```

## Method 3: Docker CLI Configuration File

```bash
# Create the Podman context first if it does not already exist
docker context create podman \
  --docker "host=unix://$XDG_RUNTIME_DIR/podman/podman.sock"

# Update the Docker CLI config without overwriting existing settings
mkdir -p ~/.docker
docker context use podman
```

## Verifying the Backend

```bash
# Check which runtime is being used
docker info | grep -i "operating system\|server version"

# The output should reference Podman
# Server Version should match your installed Podman version
```

## Running Compose Commands

```bash
# Common docker compose commands work
docker compose up -d
docker compose ps
docker compose logs -f
docker compose down
```

## Example Compose File

```yaml
# compose.yaml
services:
  app:
    image: docker.io/library/node:20-alpine
    working_dir: /app
    volumes:
      - .:/app
    command: node server.js
    ports:
      - "3000:3000"
  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data
volumes:
  db-data:
```

```bash
# Runs through the Podman API socket
docker compose up -d
docker compose ps
```

## Switching Between Docker and Podman

```bash
# List available contexts
docker context ls

# Switch to Podman
docker context use podman

# Switch back to Docker
docker context use default
```

## Persisting the Configuration

```bash
# Add to your shell profile
cat >> ~/.bashrc << 'EOF'
# Use Podman as Docker backend
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
EOF

source ~/.bashrc
```

## Summary

Configure docker-compose to use Podman by setting `DOCKER_HOST` to the Podman socket, creating a Docker context, or setting the Docker CLI's current context. These methods let you run common Docker Compose commands with Podman as the backend runtime, and you can switch between Docker and Podman contexts as needed.
