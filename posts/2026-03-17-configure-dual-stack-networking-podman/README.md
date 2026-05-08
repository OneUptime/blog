# How to Configure Dual-Stack Networking in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, IPv4, IPv6, Dual-Stack

Description: Learn how to configure dual-stack networking in Podman so containers have both IPv4 and IPv6 addresses.

---

> Dual-stack networking gives containers both IPv4 and IPv6 addresses simultaneously, ensuring compatibility with all network environments during the IPv6 transition.

Dual-stack networks support both IPv4 and IPv6 on the same network interface. This allows containers to communicate using either protocol, which is essential during the ongoing transition from IPv4 to IPv6.

---

## Creating a Dual-Stack Network

```bash
# Create a network with both IPv4 and IPv6 subnets

podman network create \
  --subnet 10.90.0.0/24 \
  --gateway 10.90.0.1 \
  --ipv6 \
  --subnet fd00:90::/64 \
  --gateway fd00:90::1 \
  dual-stack

# Verify both subnets are configured
podman network inspect dual-stack --format '{{ range .Subnets }}{{ .Subnet }} {{ end }}'
# Output: 10.90.0.0/24 fd00:90::/64
```

## Running Containers on Dual-Stack

```bash
# Run a container that gets both IPv4 and IPv6 addresses
podman run -d --name web-dual \
  --network dual-stack \
  docker.io/library/nginx:latest

# Check both IP addresses
podman inspect web-dual --format '{{ range .NetworkSettings.Networks }}IPv4: {{ .IPAddress }}, IPv6: {{ .GlobalIPv6Address }}{{ end }}'

# Verify both addresses inside a container
podman run --rm --network dual-stack \
  docker.io/library/alpine:latest ip addr show eth0
```

## Static Dual-Stack Addresses

```bash
# Assign both a static IPv4 and IPv6 address
podman run -d --name static-dual \
  --network dual-stack \
  --ip 10.90.0.50 \
  --ip6 fd00:90::50 \
  docker.io/library/nginx:latest

# Verify assignments
podman inspect static-dual --format '{{ range .NetworkSettings.Networks }}IPv4: {{ .IPAddress }}, IPv6: {{ .GlobalIPv6Address }}{{ end }}'
```

## Testing Dual-Stack Connectivity

```bash
# Run two containers
podman run -d --name svc-a --network dual-stack \
  docker.io/library/alpine:latest tail -f /dev/null
podman run -d --name svc-b --network dual-stack \
  docker.io/library/alpine:latest tail -f /dev/null

# Test IPv4 connectivity
podman exec svc-a ping -4 -c 2 svc-b

# Test IPv6 connectivity
podman exec svc-a ping -6 -c 2 svc-b

# DNS resolves to both addresses
podman exec svc-a getent ahosts svc-b
```

## Dual-Stack Port Publishing

```bash
# Publish on both IPv4 and IPv6
podman run -d --name web-public \
  --network dual-stack \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Accessible through the host's published port
# curl http://127.0.0.1:8080
# curl http://[::1]:8080

# Bind to specific addresses
podman run -d --name web-bound \
  --network dual-stack \
  -p "0.0.0.0:8081:80" \
  -p "[::]:8082:80" \
  docker.io/library/nginx:latest
```

## Multi-Service Dual-Stack Architecture

```bash
# Create a dual-stack network for your application
podman network create \
  --subnet 10.100.0.0/24 --gateway 10.100.0.1 \
  --ipv6 --subnet fd00:100::/64 --gateway fd00:100::1 \
  app-dual-stack

# Deploy services with dual-stack
podman run -d --name frontend \
  --network app-dual-stack \
  --ip 10.100.0.10 --ip6 fd00:100::10 \
  docker.io/library/nginx:latest

podman run -d --name backend \
  --network app-dual-stack \
  --ip 10.100.0.20 --ip6 fd00:100::20 \
  docker.io/library/node:20 tail -f /dev/null

podman run -d --name database \
  --network app-dual-stack \
  --ip 10.100.0.30 --ip6 fd00:100::30 \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16
```

## Verifying Dual-Stack Configuration

```bash
# Check routes for both protocols
podman exec svc-a ip -4 route show
podman exec svc-a ip -6 route show

# Verify DNS resolution returns both address families
podman exec svc-a getent ahosts svc-b
```

## Summary

Dual-stack networking in Podman provides containers with both IPv4 and IPv6 addresses by specifying both `--subnet` flags (one for each protocol) along with `--ipv6`. Assign static addresses with `--ip` and `--ip6`, and publish ports on both protocols. Dual-stack ensures containers can communicate with both IPv4 and IPv6 peers, which is essential for modern network deployments.
