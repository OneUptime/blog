# How to Run Dapr in Self-Hosted Mode with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Podman, Self-Hosted, Container, Local Development

Description: Set up Dapr in self-hosted mode using Podman as the container runtime, enabling rootless container development without Docker daemon dependency.

---

## Overview

Podman is a daemonless container engine that can replace Docker for Dapr's self-hosted mode. Because Podman supports Docker-compatible commands, Dapr's initialization process works with minimal changes.

## Prerequisites

- Podman installed (v4.0+)
- Dapr CLI installed
- `podman-docker` shim (optional but recommended)

## Step 1: Install Podman

```bash
# Fedora / RHEL
sudo dnf install podman

# Ubuntu / Debian
sudo apt install podman

# macOS
brew install podman
podman machine init
podman machine start
```

## Step 2: Configure Docker Socket Compatibility

Dapr CLI uses the Docker socket by default. Set the Docker host to Podman's socket:

```bash
# Linux
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock
systemctl --user start podman.socket

# macOS
export DOCKER_HOST=unix://${HOME}/.local/share/containers/podman/machine/podman.sock
```

Add this to your shell profile (`~/.bashrc` or `~/.zshrc`).

## Step 3: Initialize Dapr

```bash
dapr init
```

Dapr will pull images and start containers via Podman:

```bash
podman ps
# NAMES: dapr_redis, dapr_zipkin, dapr_placement
```

## Step 4: Run an Application

```bash
dapr run --app-id myapp \
  --app-port 8080 \
  --dapr-http-port 3500 \
  python3 server.py
```

Sample Python app:

```python
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify(status='ok')

if __name__ == '__main__':
    app.run(port=8080)
```

## Step 5: Verify With Podman

```bash
podman ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Check Dapr logs:

```bash
podman logs dapr_redis
```

## Step 6: Rootless Containers

Podman runs rootless by default. Ensure your user has permission to bind low ports if needed:

```bash
sudo sysctl net.ipv4.ip_unprivileged_port_start=0
```

Or use ports above 1024 for all services.

## Troubleshooting

If Dapr cannot find the container runtime:

```bash
# Verify socket path
podman info --format '{{.Host.RemoteSocket.Path}}'
export DOCKER_HOST=unix://$(podman info --format '{{.Host.RemoteSocket.Path}}')
dapr init
```

## Summary

Running Dapr with Podman provides a rootless, daemonless alternative to Docker for local microservice development. By pointing the Docker socket environment variable to Podman's socket, the Dapr CLI works transparently. This setup is ideal for environments where Docker is unavailable or where security policies require rootless containers.
