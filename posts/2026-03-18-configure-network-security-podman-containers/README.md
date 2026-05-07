# How to Configure Network Security for Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Networking, Firewall

Description: Learn how to configure network security for Podman containers including network isolation, firewall rules, and traffic control.

---

> Network security is the outer wall of your container defense. If an attacker cannot reach your container, most exploits become irrelevant.

Podman containers can be connected to various network configurations, from fully isolated networks to host networking. Proper network security ensures that containers only communicate with the services they need and that sensitive ports are not exposed to the public internet. This guide covers network isolation, firewall rules, and traffic segmentation for Podman containers.

---

## Understanding Podman Networking

Podman supports several network modes: bridge (the default for rootful containers), pasta/private networking for rootless containers, host, none, and custom Netavark networks. Each mode provides different levels of isolation and connectivity.

```bash
# View the default Podman network

podman network ls

# Inspect the default network configuration
podman network inspect podman
```

## Using Network Mode None for Full Isolation

For containers that do not need any network access, use `--network=none`.

```bash
# Run a completely network-isolated container
podman run --rm \
  --network=none \
  docker.io/library/alpine:latest \
  sh -c "
    # Verify no network interfaces (except loopback)
    ip addr show
    echo '---'
    # Confirm no external connectivity
    ping -c 1 8.8.8.8 2>&1 || echo 'No network access (expected)'
  "
```

## Creating Isolated Custom Networks

Custom networks allow you to control which containers can communicate with each other.

```bash
# Create an isolated network for backend services
podman network create --internal backend-net

# Create a network for frontend services that has external access
podman network create frontend-net
```

```bash
# Run a database container on the internal-only backend network
podman run --rm -d \
  --network=backend-net \
  --name db \
  docker.io/library/alpine:latest \
  sh -c "
    # Simulate a database service
    echo 'DB running on internal network'
    sleep 3600
  "

# Run an application connected to both networks
podman run --rm -d \
  --network=backend-net \
  --network=frontend-net \
  --name app \
  docker.io/library/alpine:latest \
  sleep 3600
```

```bash
# Verify the database cannot reach the internet
podman exec db sh -c "ping -c 1 8.8.8.8 2>&1 || echo 'No external access (internal network)'"

# Verify the app can reach the database
podman exec app sh -c "ping -c 1 db 2>&1 || echo 'Cannot reach db'"
```

## Restricting Port Exposure

Only expose ports that need to be accessible from outside.

```bash
# Expose a port only on localhost (not all interfaces)
podman run --rm -d \
  -p 127.0.0.1:8080:80 \
  --name local-only \
  docker.io/library/nginx:alpine

# Verify the port is only bound to localhost
podman port local-only
# Expected: 80/tcp -> 127.0.0.1:8080
```

```bash
# AVOID: Exposing on all interfaces (0.0.0.0)
# podman run -p 8080:80 ...  # This binds to all interfaces

# BETTER: Bind to a specific interface
podman run --rm -d \
  -p 192.168.1.100:8080:80 \
  --name interface-bound \
  docker.io/library/nginx:alpine 2>/dev/null || \
  echo "Specify an IP to restrict which interface the port binds to"
```

## Setting Up Network Segmentation

Isolate different application tiers on separate networks.

```bash
# Create separate networks for each tier
podman network create --internal db-tier
podman network create --internal app-tier
podman network create web-tier

# Database: only accessible from app tier
podman run --rm -d \
  --network=db-tier \
  --name tier-db \
  docker.io/library/alpine:latest sleep 3600

# Application: bridges app and db tiers
podman run --rm -d \
  --network=db-tier \
  --network=app-tier \
  --name tier-app \
  docker.io/library/alpine:latest sleep 3600

# Web server: bridges web and app tiers
podman run --rm -d \
  --network=app-tier \
  --network=web-tier \
  -p 127.0.0.1:8081:80 \
  --name tier-web \
  docker.io/library/nginx:alpine
```

```bash
# Verify the database is not reachable from the web tier
podman exec tier-web sh -c "ping -c 1 tier-db 2>&1 || echo 'DB not reachable from web (correct)'"
```

## Configuring DNS Security

Control DNS resolution within container networks.

```bash
# Run a container with a specific DNS server
podman run --rm \
  --dns=1.1.1.1 \
  --dns=8.8.8.8 \
  docker.io/library/alpine:latest \
  cat /etc/resolv.conf

# Run a container without Podman's generated resolv.conf
podman run --rm \
  --dns=none \
  docker.io/library/alpine:latest \
  sh -c "cat /etc/resolv.conf && nslookup google.com 2>&1 || echo 'DNS unavailable with image resolv.conf'"
```

## Dropping Network Capabilities

Restrict network-related capabilities to limit what containers can do on the network.

```bash
# Drop network capabilities
podman run --rm \
  --cap-drop=NET_ADMIN \
  --cap-drop=NET_RAW \
  docker.io/library/alpine:latest \
  sh -c "
    # Cannot modify network interfaces
    ip link set lo down 2>&1 || echo 'NET_ADMIN denied'
    # Cannot create raw sockets (no ping)
    ping -c 1 8.8.8.8 2>&1 || echo 'NET_RAW denied (raw sockets blocked)'
  "
```

## Auditing Container Network Exposure

```bash
#!/bin/bash
# audit-network.sh - Audit network exposure of all running containers

echo "=== Container Network Security Audit ==="

podman ps -q | while read cid; do
  name=$(podman inspect "$cid" --format '{{.Name}}')
  netmode=$(podman inspect "$cid" --format '{{.HostConfig.NetworkMode}}')
  ports=$(podman port "$cid" 2>/dev/null)

  echo ""
  echo "Container: $name"
  echo "  Network Mode: $netmode"

  if [ "$netmode" = "host" ]; then
    echo "  [WARN] Using host network - all ports are exposed"
  fi

  if [ -n "$ports" ]; then
    echo "  Published Ports:"
    echo "$ports" | while read port_line; do
      echo "    $port_line"
      if echo "$port_line" | grep -q "0.0.0.0"; then
        echo "    [WARN] Port bound to all interfaces"
      fi
    done
  else
    echo "  No published ports"
  fi
done
```

```bash
chmod +x audit-network.sh
./audit-network.sh
```

## Cleanup

```bash
podman stop db app local-only interface-bound tier-db tier-app tier-web 2>/dev/null
podman rm db app local-only interface-bound tier-db tier-app tier-web 2>/dev/null
podman network rm backend-net frontend-net db-tier app-tier web-tier 2>/dev/null
rm -f audit-network.sh
```

## Summary

Network security for Podman containers involves multiple layers: using `--network=none` for containers that need no connectivity, creating internal networks for inter-container communication, binding ports to specific interfaces, segmenting application tiers on separate networks, and dropping network-related capabilities. Always expose the minimum number of ports, bind only to localhost when external access is not needed, and use internal networks to prevent containers from reaching the internet when they should not.
