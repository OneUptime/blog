# How to Configure Port Forwarding for Rootless Containers in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Rootless, Port Forwarding

Description: Learn how to configure port forwarding in rootless Podman including privileged port binding and network backend options.

---

> Rootless Podman uses unprivileged port forwarding, which has different behavior and limitations compared to root-mode Podman. Understanding these differences is key to proper container networking.

In rootless mode, Podman cannot use iptables directly for port forwarding. Instead, it relies on user-space networking tools like pasta or slirp4netns. This guide covers port forwarding configuration and workarounds for rootless limitations.

---

## Basic Port Forwarding in Rootless Mode

```bash
# Publish a port (works the same as root mode syntax)

podman run -d --name web \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Access the container
curl http://localhost:8080

# Map multiple ports
podman run -d --name app \
  -p 3000:3000 \
  -p 3001:3001 \
  docker.io/library/node:20 tail -f /dev/null
```

## Privileged Port Binding (Ports Below 1024)

By default, rootless users cannot bind to ports below 1024:

```bash
# This may fail in rootless mode
podman run -d -p 80:80 docker.io/library/nginx:latest
# Error: failed to expose ports: binding to privileged port

# Solution 1: Lower the unprivileged port start
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
# Make it persistent
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee /etc/sysctl.d/99-rootless-ports.conf

# Now rootless binding to port 80 works
podman run -d -p 80:80 docker.io/library/nginx:latest
```

## Port Forwarding with Pasta Backend

Pasta is the modern network backend for rootless Podman:

```bash
# Verify pasta is the default rootless network command
podman info --format '{{ .Host.RootlessNetworkCmd }}'

# Pasta handles port forwarding efficiently
podman run -d --name pasta-web \
  --network pasta \
  -p 8080:80 \
  docker.io/library/nginx:latest
```

## Port Forwarding with slirp4netns

The legacy backend for rootless networking:

```bash
# Use slirp4netns explicitly
podman run -d --name slirp-web \
  --network slirp4netns:port_handler=rootlesskit \
  -p 8080:80 \
  docker.io/library/nginx:latest
```

## Binding to Specific Host Interfaces

```bash
# Bind to all interfaces
podman run -d -p 0.0.0.0:8080:80 docker.io/library/nginx:latest

# Bind to localhost only
podman run -d -p 127.0.0.1:8080:80 docker.io/library/nginx:latest

# Bind to a specific interface IP
podman run -d -p 192.168.1.100:8080:80 docker.io/library/nginx:latest
```

## UDP Port Forwarding

```bash
# Forward UDP ports
podman run -d --name dns \
  -p 5353:53/udp \
  docker.io/library/alpine:latest tail -f /dev/null

# Forward both TCP and UDP
podman run -d --name multi-proto \
  -p 8080:80/tcp \
  -p 8080:80/udp \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Port Range Forwarding

```bash
# Forward a range of ports
podman run -d --name range-app \
  -p 9000-9010:9000-9010 \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Verifying Port Forwarding

```bash
# Check published ports
podman port web

# List all containers with their port mappings
podman ps --format "{{ .Names }}: {{ .Ports }}"

# Test connectivity
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
```

## Troubleshooting Rootless Port Issues

```bash
# Check if the port is in use
ss -tlnp | grep 8080

# Verify the rootless networking command
podman info --format '{{ .Host.RootlessNetworkCmd }}'

# Check for firewall blocking
sudo iptables -L -n | grep 8080

# Restart with debug logging
podman --log-level=debug run -p 8080:80 docker.io/library/nginx:latest
```

## Summary

Rootless Podman port forwarding works similarly to root mode but uses user-space networking backends (pasta or slirp4netns) instead of iptables. Binding to privileged ports requires lowering `net.ipv4.ip_unprivileged_port_start`. Use `podman port` to verify mappings and bind to specific interfaces for security. Pasta is the recommended modern backend for better performance.
