# How to Configure Static IPs for Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Static IP, Configuration

Description: Learn how to assign static IP addresses to Podman containers for predictable addressing and service configuration.

---

> Static IP addresses give containers predictable, consistent addresses that simplify service configuration, firewall rules, and inter-container communication.

By default, Podman assigns IP addresses dynamically from the network's subnet pool. When you need containers to have fixed, known addresses, you can assign static IPs at creation time or when connecting to networks.

---

## Assigning a Static IP at Container Start

```bash
# Create a network with a defined subnet

podman network create --subnet 10.50.0.0/24 --gateway 10.50.0.1 app-network

# Assign a static IP to the container
podman run -d --name web \
  --network app-network \
  --ip 10.50.0.10 \
  docker.io/library/nginx:latest

# Verify the assigned IP
podman inspect web --format '{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}'
# Output: 10.50.0.10
```

## Static IPs for Multiple Services

```bash
# Assign predictable IPs to each service
podman run -d --name frontend \
  --network app-network \
  --ip 10.50.0.11 \
  -p 8080:80 \
  docker.io/library/nginx:latest

podman run -d --name backend \
  --network app-network \
  --ip 10.50.0.21 \
  docker.io/library/node:20 tail -f /dev/null

podman run -d --name database \
  --network app-network \
  --ip 10.50.0.31 \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

podman run -d --name cache \
  --network app-network \
  --ip 10.50.0.41 \
  docker.io/library/redis:latest

# Verify all IPs
for ctr in frontend backend database cache; do
  ip=$(podman inspect "$ctr" --format '{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}')
  echo "$ctr: $ip"
done
```

## Static IP When Connecting to a Network

```bash
# Start a container on one network
podman run -d --name api \
  --network app-network \
  --ip 10.50.0.22 \
  docker.io/library/node:20 tail -f /dev/null

# Connect to a second network with a static IP
podman network create --subnet 10.60.0.0/24 backend-network
podman network connect --ip 10.60.0.20 backend-network api

# Verify IPs on both networks
podman inspect api --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}: {{ $v.IPAddress }}{{ printf "\n" }}{{ end }}'
```

## Static IPv6 Addresses

```bash
# Create a dual-stack network
podman network create \
  --subnet 10.70.0.0/24 --gateway 10.70.0.1 \
  --ipv6 --subnet fd00:50::/64 --gateway fd00:50::1 \
  dual-net

# Assign both static IPv4 and IPv6
podman run -d --name dual-app \
  --network dual-net \
  --ip 10.70.0.100 \
  --ip6 fd00:50::100 \
  docker.io/library/nginx:latest
```

## IP Address Planning

A structured IP plan for a typical application:

```bash
# Network: 10.80.0.0/24
# Gateway: 10.80.0.1
# Load balancers: 10.80.0.10-19
# Web servers: 10.80.0.20-29
# API servers: 10.80.0.30-39
# Databases: 10.80.0.40-49
# Caches: 10.80.0.50-59

podman network create --subnet 10.80.0.0/24 --gateway 10.80.0.1 production

podman run -d --name lb --network production --ip 10.80.0.10 haproxy:latest
podman run -d --name web1 --network production --ip 10.80.0.20 docker.io/library/nginx:latest
podman run -d --name api1 --network production --ip 10.80.0.30 docker.io/library/node:20 tail -f /dev/null
podman run -d --name db1 --network production --ip 10.80.0.40 -e POSTGRES_PASSWORD=secret docker.io/library/postgres:16
podman run -d --name redis1 --network production --ip 10.80.0.50 docker.io/library/redis:latest
```

## Verifying Static IP Persistence

```bash
# Static IPs persist across container restarts
podman stop web
podman start web

podman inspect web --format '{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}'
# Output: 10.50.0.10 (same as before)
```

## Troubleshooting Static IP Issues

```bash
# Error: IP already in use
podman ps --format "{{ .Names }}" | while read -r ctr; do
  ip=$(podman inspect "$ctr" --format '{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}')
  echo "$ctr: $ip"
done

# Error: IP not in subnet range
podman network inspect app-network --format '{{ range .Subnets }}{{ .Subnet }}{{ end }}'

# Ensure the IP is within the network's subnet
# 10.50.0.10 is valid for 10.50.0.0/24
# 10.51.0.10 is NOT valid for 10.50.0.0/24
```

## Summary

Assign static IPs to Podman containers with `--ip` when starting containers or `--ip` when connecting to networks via `podman network connect`. Create networks with explicit subnets before assigning static IPs when you want predictable address pools. Plan your IP addressing scheme to avoid conflicts and make service addressing predictable. Static IPs persist across container restarts and must be within the network's IP address pool.
