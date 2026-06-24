# How to Add a Podman Environment to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Environment, Rootless Containers

Description: Connect Portainer to a Podman environment for managing rootless containers and pods via the Portainer web interface.

## Introduction

Podman is a daemonless container engine that can run containers in rootful or rootless mode. Portainer supports Podman environments, but its current official support is limited to CentOS Stream 9, Podman 5, and rootful Podman. This guide covers the supported setup and calls out the rootless caveat.

## Prerequisites

- CentOS Stream 9 with Podman 5.x on the target host (other distros and versions may work, but Portainer does not officially support them)
- `sudo` or root access on the Podman host
- Podman socket enabled (system or user)
- Network access between Portainer and the Podman host if you plan to use URL/IP or an Agent or Edge Agent connection

## Step 1: Enable Podman Socket

### System-Level Podman Socket (Rootful)

```bash
# Enable and start the Podman socket

sudo systemctl enable --now podman.socket

# Verify socket is available
ls -la /run/podman/podman.sock

# Test the socket
curl --unix-socket /run/podman/podman.sock http://localhost/v4.0/libpod/info
```

### User-Level Podman Socket (Rootless, Not Officially Supported by Portainer)

```bash
# Enable user socket
systemctl --user enable --now podman.socket

# Verify socket path
ls -la $XDG_RUNTIME_DIR/podman/podman.sock
# Typically: /run/user/1000/podman/podman.sock

```

## Step 2: Run Portainer with Podman Socket Access

For Podman running on the same host as Portainer:

```bash
# Create Portainer's data volume
podman volume create portainer_data

# System Podman socket
podman run -d \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -p 443:9443 \
  --privileged \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

If you are experimenting with rootless Podman, you would mount `$XDG_RUNTIME_DIR/podman/podman.sock` instead, but Portainer does not officially support rootless Podman.

Note: When Portainer itself runs on Podman, the official Portainer install command bind-mounts the Podman socket to `/var/run/docker.sock` inside the container.

## Step 3: Add Podman Environment via Portainer UI

1. Go to **Environments** → **Add environment**
2. Select **Podman**
3. Click **Start Wizard**
4. Under **More options**, choose **Socket**
5. If needed, enable **Override default socket path** and enter `/var/run/docker.sock` (or the Podman socket path you mounted into the Portainer container)
6. Name the environment (e.g., "Production Podman Host")
7. Click **Connect**

Note: Podman socket connections are a local-only option. Portainer also notes that you cannot add a Podman environment via socket when the Portainer Server runs on Docker (and vice versa).

## Using Podman API Over URL/IP

For remote Podman hosts, Portainer can connect over URL/IP, but Podman's documentation strongly recommends against exposing the API over the network without mutual TLS. For most remote deployments, the Portainer Edge Agent is the safer choice.

```bash
# Example: expose the API with mutual TLS
podman system service \
  --time 0 \
  --tls-cert=/path/to/server.crt \
  --tls-key=/path/to/server.key \
  --tls-client-ca=/path/to/ca.crt \
  tcp://0.0.0.0:8080
```

Add it in Portainer as a **Podman** environment via **URL/IP**, using the host name or IP and port `8080`, and configure the matching TLS settings.

## Podman Compatibility Notes

Portainer communicates with Podman through Podman's Docker-compatible API, but the supported configuration is narrower than a typical Docker setup:

| Feature | Status |
|---------|--------|
| Supported platform | CentOS Stream 9 with Podman 5.x |
| Rootless Podman | May work, but is not officially supported by Portainer |
| Podman socket connection | Supported only as a local, legacy option |
| Portainer Server on Docker + Podman socket | Not supported |
| Docker Swarm | Not available with Podman |
| Stacks / Compose | Available in Portainer; Podman itself uses an external Compose provider for `podman compose` |

## Podman-Compose Compatibility

Portainer's **Stacks** workflow is available for Docker, Swarm, and Podman environments. On Podman hosts, Podman's own `podman compose` command is a thin wrapper around an external Compose provider such as `docker-compose` or `podman-compose`:

```yaml
# example-stack.yml
version: "3.8"

services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"

  db:
    image: postgres:14-alpine
    environment:
      POSTGRES_PASSWORD: password
    volumes:
      - db_data:/var/lib/postgresql/data

volumes:
  db_data:
```

Deploy through Portainer's **Stacks** → **Add stack** using the compose editor.

## Checking Connection

```bash
# Test that Portainer can communicate with Podman
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# List containers on Podman environment (endpoint ID 3)
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/3/docker/containers/json?all=true" \
  | python3 -c "import sys,json; [print(c.get('Names')) for c in json.load(sys.stdin)]"
```

## Conclusion

Portainer provides a familiar management interface for Podman deployments through its dedicated Podman environment type. The socket-based connection works for local rootful installations, while remote access is better handled through URL/IP with TLS or the Portainer Edge Agent. Keep Portainer's current support limits in mind: CentOS Stream 9, Podman 5, and rootful Podman.
