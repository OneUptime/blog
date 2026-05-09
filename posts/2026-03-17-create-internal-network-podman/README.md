# How to Create an Internal Network with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Internal, Isolation, Security

Description: Learn how to create internal networks in Podman that allow container-to-container communication but block external access.

---

> Internal networks allow containers to communicate with each other while restricting access to external networks, providing a strong security boundary for backend services.

An internal bridge network in Podman does not add a default route to the outside world for attached containers. Containers on the network can talk to each other but cannot reach the internet through that network or be reached from external networks. This is ideal for databases, caches, and other backend services.

---

## Creating an Internal Network

```bash
# Create an internal-only network

podman network create --internal backend

# Verify the network is internal
podman network inspect backend --format '{{ .Internal }}'
# Output: true
```

## Testing Internal Network Isolation

```bash
# Run a container on the internal network
podman run -d --name db \
  --network backend \
  docker.io/library/alpine:latest tail -f /dev/null

# Containers can communicate with each other
podman run -d --name cache \
  --network backend \
  docker.io/library/alpine:latest tail -f /dev/null

podman exec db ping -c 2 cache
# Success - internal communication works

# But cannot reach the internet
podman exec db ping -c 1 8.8.8.8
# ping: sendto: Network unreachable

podman exec db wget -q -O- http://example.com
# wget: can't connect
```

## Internal Network with Custom Subnet

```bash
# Create an internal network with a specific subnet
podman network create \
  --internal \
  --subnet 10.99.0.0/24 \
  --gateway 10.99.0.1 \
  secure-backend

# Run services with static IPs
podman run -d --name database \
  --network secure-backend \
  --ip 10.99.0.10 \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

podman run -d --name redis \
  --network secure-backend \
  --ip 10.99.0.11 \
  docker.io/library/redis:latest
```

## Multi-Network Architecture with Internal Networks

The common pattern is to combine internal and external networks:

```bash
# External network for public-facing services
podman network create --subnet 10.1.0.0/24 public

# Internal network for backend services
podman network create --internal --subnet 10.2.0.0/24 private

# Frontend: connected to public only
podman run -d --name frontend \
  --network public \
  -p 8080:80 \
  docker.io/library/nginx:latest

# API gateway: bridges public and private networks
podman run -d --name api \
  --network public \
  docker.io/library/node:20 tail -f /dev/null
podman network connect private api

# Database: private only, no external access
podman run -d --name db \
  --network private \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# frontend -> api (works via public network)
# api -> db (works via private network)
# frontend -> db (fails - no shared network)
# db -> internet (fails - internal network)
```

## DNS on Internal Networks

With Podman's current Netavark/aardvark-dns backend, internal networks still support DNS resolution between containers:

```bash
# DNS works within the internal network
podman exec api ping -c 1 db
# Success - name resolution works on internal networks

# But external DNS names do not resolve on the internal network
podman exec db nslookup google.com
# NXDOMAIN / cannot resolve
```

## Verifying Internal Network Status

```bash
# List all internal networks
for net in $(podman network ls --format "{{ .Name }}"); do
  internal=$(podman network inspect "$net" --format '{{ .Internal }}')
  if [ "$internal" = "true" ]; then
    echo "INTERNAL: $net"
  fi
done
```

## Summary

Internal networks in Podman block all external connectivity while allowing container-to-container communication. Create them with `--internal` for databases, caches, and backend services that should never be exposed to the internet. Combine internal networks with public networks using multi-network containers to create layered security architectures where only gateway services bridge the boundary.
