# How to Create a Quadlet Network Unit File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Networking

Description: Learn how to create a Quadlet .network unit file to define Podman networks as systemd-managed resources for container communication.

---

> Quadlet network unit files let you define custom Podman networks in systemd, ensuring containers can communicate by name with proper isolation.

Quadlet `.network` files declare Podman networks that are referenced by container unit files. When a container starts, the associated network is created automatically. This gives you DNS-based service discovery and network isolation managed through systemd.

---

## Basic Network Unit File

```ini
# ~/.config/containers/systemd/app-network.network

[Network]
# Creates a basic bridge network
```

## Network with Subnet

```ini
# ~/.config/containers/systemd/app-network.network
[Network]
Subnet=10.90.0.0/24
Gateway=10.90.0.1
```

## Network with Options

```ini
# ~/.config/containers/systemd/internal-net.network
[Network]
Subnet=172.20.0.0/16
Gateway=172.20.0.1
# Disable external access
Internal=true
Label=environment=development
```

## Referencing Networks in Containers

```ini
# ~/.config/containers/systemd/app-network.network
[Network]
Subnet=10.90.0.0/24

# ~/.config/containers/systemd/web.container
[Container]
Image=docker.io/library/nginx:alpine
Network=app-network.network
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/api.container
[Container]
Image=docker.io/library/python:3.12-slim
Network=app-network.network
Exec=python -m http.server 5000

[Service]
Restart=always

[Install]
WantedBy=default.target
```

```bash
# Reload and start
systemctl --user daemon-reload
systemctl --user start web
systemctl --user start api

# web can reach api by container name
podman exec systemd-web wget -qO- http://systemd-api:5000
```

## Multi-Tier Network Setup

```ini
# ~/.config/containers/systemd/frontend-net.network
[Network]
Subnet=10.91.0.0/24
Label=tier=frontend

# ~/.config/containers/systemd/backend-net.network
[Network]
Subnet=10.92.0.0/24
Internal=true
Label=tier=backend

# ~/.config/containers/systemd/proxy.container
[Container]
Image=docker.io/library/nginx:alpine
Network=frontend-net.network
PublishPort=8080:80

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/app.container
[Container]
Image=docker.io/library/python:3.12-slim
Network=frontend-net.network
Network=backend-net.network
Exec=python -m http.server 5000

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/db.container
[Container]
Image=docker.io/library/postgres:16-alpine
Environment=POSTGRES_PASSWORD=secret
Network=backend-net.network

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Network with DNS

```ini
# ~/.config/containers/systemd/dns-net.network
[Network]
Subnet=10.93.0.0/24
DNS=8.8.8.8
DNS=8.8.4.4
```

## Verifying the Network

```bash
# Check the network was created
podman network ls

# Inspect the network
podman network inspect systemd-app-network

# Test connectivity between containers
podman exec systemd-web ping -c 1 systemd-api
```

## Summary

Quadlet `.network` files define Podman networks with custom subnets, gateways, and internal-only modes. Reference networks in `.container` files with `Network=name.network`, and Quadlet ensures networks are created when containers start. Use multiple networks for tiered architectures with proper isolation.
