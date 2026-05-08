# How to Access Host Loopback from a Rootless Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Rootless, Loopback, Development

Description: Learn how to access host localhost services from rootless Podman containers using different networking backends.

---

> Accessing host loopback (127.0.0.1) from rootless containers requires specific configuration depending on the networking backend in use.

In rootless Podman, containers run in a separate user and network namespace. Services listening on the host's 127.0.0.1 are not directly reachable from inside the container. This guide covers the methods for accessing host loopback services from rootless containers.

---

## The Loopback Access Problem

```bash
# A service running on host localhost

# Example: Node.js dev server on http://127.0.0.1:3000

# By default, rootless containers cannot reach host localhost
podman run --rm docker.io/library/alpine:latest \
  sh -c "apk add --no-cache curl > /dev/null 2>&1 && curl http://127.0.0.1:3000"
# curl: (7) Failed to connect
```

## Method 1: Using host.containers.internal

```bash
# The special hostname resolves to the host gateway
podman run --rm --network pasta:--map-gw \
  docker.io/library/alpine:latest \
  ping -c 2 host.containers.internal

# Access a host service after enabling host gateway access
podman run --rm --network pasta:--map-gw \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache curl > /dev/null 2>&1 && curl http://host.containers.internal:3000"
```

## Method 2: Pasta with Loopback Access

Pasta is the default rootless networking backend in current Podman releases, but Podman disables direct host gateway access by default. Use `--map-gw` to allow access through the gateway, or forward specific host loopback ports with pasta's `-T` option:

```bash
# Allow the container to reach the host through the gateway address
podman run --rm --network pasta:--map-gw \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache curl > /dev/null 2>&1 && curl -s http://host.containers.internal:3000"

# Forward host loopback TCP port 3000 to the container loopback
podman run --rm --network pasta:-T,3000 \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache curl > /dev/null 2>&1 && curl -s http://127.0.0.1:3000"
```

## Method 3: slirp4netns with allow_host_loopback

```bash
# Enable loopback access in slirp4netns
podman run --rm \
  --network slirp4netns:allow_host_loopback=true \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache curl > /dev/null 2>&1 && curl -s http://10.0.2.2:3000"

# The host gateway is 10.0.2.2 in slirp4netns
```

## Method 4: Using --add-host

```bash
# Map a friendly hostname to the host gateway
podman run --rm \
  --network pasta:--map-gw \
  --add-host host:host-gateway \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache curl > /dev/null 2>&1 && curl -s http://host:3000"
```

## Method 5: Host Network Mode

```bash
# Host networking gives direct loopback access
podman run --rm --network host \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache curl > /dev/null 2>&1 && curl -s http://127.0.0.1:3000"

# But loses network isolation
```

## Development Workflow Example

```bash
# Start your backend on the host
# cd /home/user/api && npm start  (listening on 127.0.0.1:4000)

# Run your frontend container with host access
podman run -d --name frontend \
  --network pasta:--map-gw \
  --add-host api:host-gateway \
  -e API_URL=http://api:4000 \
  -p 3000:3000 \
  my-frontend:dev

# The frontend container can reach the host's API server
```

## Configuring Default Loopback Access

```bash
# Set in containers.conf for automatic loopback access
# Edit ~/.config/containers/containers.conf

# For slirp4netns:
# [network]
# default_rootless_network_cmd = "slirp4netns"
#
# [engine]
# network_cmd_options = ["allow_host_loopback=true"]

# For pasta:
# [network]
# default_rootless_network_cmd = "pasta"
# pasta_options = ["--map-gw"]
```

## Verifying Host Loopback Access

```bash
# Check which services are on host loopback
ss -tlnp | grep 127.0.0.1

# Test from the container
podman run --rm \
  --network pasta:--map-gw \
  --add-host host:host-gateway \
  docker.io/library/alpine:latest \
  sh -c "
    apk add --no-cache curl > /dev/null 2>&1
    echo 'Testing host loopback services:'
    curl -s -o /dev/null -w '%{http_code}' http://host:3000 && echo ' - Port 3000: OK' || echo ' - Port 3000: FAIL'
    curl -s -o /dev/null -w '%{http_code}' http://host:5432 && echo ' - Port 5432: OK' || echo ' - Port 5432: FAIL'
  "
```

## Summary

Access host loopback services from rootless Podman containers using `host.containers.internal` with a backend that permits host access, pasta networking with `--map-gw` or `-T`, slirp4netns with `allow_host_loopback=true`, or `--add-host` with `host-gateway`. Pasta is the recommended approach for the easiest setup. For development workflows, map descriptive hostnames to `host-gateway` so application configuration stays clean and readable.
