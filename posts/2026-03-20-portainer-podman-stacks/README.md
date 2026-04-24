# How to Deploy Stacks to Podman via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Docker Compose, Stack, Self-Hosted

Description: Deploy Docker Compose stacks to Podman environments using Portainer, leveraging Podman's Docker-compatible API for stack management.

## Introduction

With Podman's Docker-compatible API, Portainer can deploy and manage multi-container stacks on Podman-backed environments. Portainer's documented Podman support is currently focused on Podman 5.x in rootful mode, and this guide shows how to deploy stacks to Podman via Portainer with the appropriate configuration for Podman's networking and storage model.

## Prerequisites

- Portainer connected to a Podman environment
- Podman 5.x running in rootful mode (Portainer's officially supported configuration is CentOS Stream 9 with rootful Podman)
- A Compose provider installed on the Podman host if you want to run `podman compose` directly

## Step 1: Install a Compose Provider

```bash
# Install a Compose provider on the Podman host if you also want to run
# Compose workloads directly with `podman compose`

pip3 install podman-compose

# Or via package manager
sudo dnf install podman-compose    # RHEL/Fedora
sudo apt install podman-compose    # Ubuntu/Debian (may need PPA)

# Verify
podman compose version
```

## Step 2: Create a Stack in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor** in Portainer (when connected to a supported Podman environment):

```yaml
version: "3.8"
services:
  # Web application
  webapp:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "8080:80"
    volumes:
      - webapp_data:/usr/share/nginx/html
    networks:
      - app-net

  # Database
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppassword
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - app-net

volumes:
  webapp_data:
  db_data:

networks:
  app-net:
    driver: bridge
```

## Step 3: Podman-Specific Compose Considerations

Podman-backed environments have some differences from Docker Compose:

```yaml
# Portainer's documented Podman support is rootful.
# If you use rootless Podman anyway, UID/GID mapping and networking need extra care.
services:
  myapp:
    image: myapp:latest
    # Run as a specific user when you need predictable file ownership
    user: "1000:1000"
    security_opt:
      - label=disable   # Disable SELinux labels only if you intentionally need it

# Rootless Podman uses user-mode networking.
# Current Podman defaults to pasta; slirp4netns is also supported.
networks:
  default:
    driver: bridge
```

## Step 4: Deploy and Monitor

1. Enter the stack name and compose file in Portainer
2. Click **Deploy the stack**
3. Portainer will use the connected Podman environment to deploy the stack

```bash
# Verify deployment on Podman host
podman ps
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## Step 5: Using Podman Pods Instead of Individual Containers

Podman's native concept is pods (like Kubernetes pods), but Portainer stack deployment still uses Compose-format services and containers:

```bash
# Create a pod on the Podman host if you want Podman's native pod workflow
podman pod create --name myapp-pod -p 8080:80 -p 5432:5432

# List pods
podman pod ps
```

## Step 6: Volume Management in Podman

```yaml
# Podman volumes work similarly to Docker volumes
volumes:
  mydata:
    # Optional: specify Podman driver
    driver: local
    driver_opts:
      type: none
      device: /opt/myapp/data  # Bind to host path
      o: bind
```

```yaml
# Or use Podman's default named-volume storage
volumes:
  mydata:
```

```bash
# List Podman volumes
podman volume ls

# Inspect a volume
podman volume inspect mydata

# Create volume manually
podman volume create mydata
```

## Step 7: Networking in Rootless Podman

```yaml
# Portainer's supported Podman configuration is rootful.
# If you use rootless Podman, low host ports (<1024) need extra host configuration.

services:
  webapp:
    image: nginx:alpine
    ports:
      - "8080:80"    # OK for an unprivileged user
      # - "80:80"    # Requires lowering net.ipv4.ip_unprivileged_port_start or running rootful

# Current Podman defaults to user-mode networking with pasta for rootless containers.
# slirp4netns is also supported.
# To allow ports < 1024 in rootless:
# echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee /etc/sysctl.d/99-unprivileged-ports.conf
# sudo sysctl --system
```

## Step 8: Persistent Stacks Configuration

```bash
# Compose files that work with Docker Compose can also be run with `podman compose`

# Deploy directly with podman compose
cd /opt/stacks/myapp
podman compose up -d

# List running services
podman compose ps

# View logs
podman compose logs -f
```

## Step 9: Healthchecks in Podman

```yaml
# Healthchecks work the same as Docker
services:
  webapp:
    image: myapp:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
```

```bash
# Check health status in Podman
podman inspect --format '{{.State.Health.Status}}' webapp-container
```

## Step 10: Handle Podman SELinux Labels

On SELinux-enabled systems:

```yaml
# For volumes mounted from host paths, add SELinux labels
services:
  myapp:
    volumes:
      - /host/path:/container/path:z    # Shared label
      # or
      - /host/path:/container/path:Z    # Private label
```

## Conclusion

Deploying stacks to Podman via Portainer uses the same Docker Compose format, but Portainer's documented Podman support is currently limited to Podman 5.x running rootful on CentOS Stream 9. Portainer communicates with Podman through its Docker-compatible API, so most stack operations work transparently on supported setups. If you use rootless Podman anyway, pay close attention to port binding, user mapping, and SELinux volume labels.
