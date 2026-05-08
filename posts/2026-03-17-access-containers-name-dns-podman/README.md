# How to Access Containers by Name via DNS in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, DNS, Service Discovery

Description: Learn how to access Podman containers by name using built-in DNS resolution on custom networks.

---

> Podman's built-in DNS allows containers on the same custom network to reach each other by container name, eliminating the need to track IP addresses.

Container name resolution is one of the most useful features of custom Podman networks. Instead of managing IP addresses, containers can connect to services by name, which makes application configuration simpler and more portable.

---

## Setting Up Name-Based Access

```bash
# Create a custom network (DNS is enabled by default)

podman network create myapp-net

# Run named containers
podman run -d --name web \
  --network myapp-net \
  docker.io/library/nginx:latest

podman run -d --name api \
  --network myapp-net \
  docker.io/library/alpine:latest tail -f /dev/null

podman run -d --name db \
  --network myapp-net \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Access by name
podman exec api ping -c 2 web
podman exec api ping -c 2 db
```

## How DNS Resolution Works

Podman uses the aardvark-dns plugin to provide DNS resolution on custom networks:

```bash
# Check the DNS server in a container's resolv.conf
podman exec api cat /etc/resolv.conf
# nameserver 10.89.0.1  (the network gateway acts as DNS)

# Resolve a container name
podman exec api nslookup web
# Name:      web
# Address 1: 10.89.0.2 web

# Reverse DNS also works
podman exec api nslookup 10.89.0.2
```

## DNS Does Not Work on the Default Network

```bash
# The default network mode does not provide container DNS discovery
podman run -d --name test1 docker.io/library/alpine:latest tail -f /dev/null
podman run -d --name test2 docker.io/library/alpine:latest tail -f /dev/null

# Name resolution fails on the default network
podman exec test1 ping -c 1 test2
# ping: bad address 'test2'

# Always use a custom network for DNS-based discovery
podman rm -f test1 test2
```

## Using DNS in Application Configuration

```bash
# Application can use container names as hostnames
podman run -d --name app \
  --network myapp-net \
  -e DATABASE_HOST=db \
  -e DATABASE_PORT=5432 \
  docker.io/library/node:20 tail -f /dev/null

# The app connects to "db" by name
# No need to know or configure IP addresses
```

## DNS with Network Aliases

```bash
# Give containers additional DNS names
podman run -d --name postgres-primary \
  --network myapp-net \
  --network-alias database \
  --network-alias db-primary \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Any of these names work
podman exec api ping -c 1 postgres-primary
podman exec api ping -c 1 database
podman exec api ping -c 1 db-primary
```

## DNS Across Multiple Networks

```bash
# Containers only resolve names on shared networks
podman network create frontend-net
podman network create backend-net

podman run -d --name frontend-web --network frontend-net \
  docker.io/library/alpine:latest tail -f /dev/null

podman run -d --name backend-db --network backend-net \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# frontend-web cannot resolve backend-db (different networks)
podman exec frontend-web nslookup backend-db

# Connect frontend-web to backend-net
podman network connect backend-net frontend-web

# Now frontend-web can resolve backend-db
podman exec frontend-web nslookup backend-db
```

## Troubleshooting DNS Resolution

```bash
# Check if DNS is enabled on the network
podman network inspect myapp-net --format '{{ .DNSEnabled }}'

# Check the container's DNS configuration
podman exec api cat /etc/resolv.conf

# Test resolution with nslookup
podman exec api nslookup web

# Verify the aardvark-dns process is running
ps aux | grep aardvark

# Restart the container if DNS stops working
podman restart api
```

## Summary

Podman provides automatic DNS-based container name resolution on custom networks through the aardvark-dns plugin. Create a custom network, run named containers on it, and they can reach each other by name. The default podman network does not support DNS, so always create custom networks for service discovery. Use network aliases for additional DNS names and ensure containers share a network for cross-service resolution.
