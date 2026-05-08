# How to Configure Network Aliases in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, DNS, Alias, Service Discovery

Description: Learn how to configure network aliases in Podman for flexible DNS-based service discovery.

---

> Network aliases provide additional DNS names for containers, enabling service discovery patterns where multiple containers can respond to the same service name.

Network aliases allow containers to be reached by alternative DNS names beyond their container name. This is useful for load balancing patterns, service abstraction, and rolling deployments where you need multiple names pointing to the same or different containers.

---

## Adding Aliases at Container Start

```bash
# Create a network

podman network create app-net

# Run a container with multiple aliases
podman run -d --name postgres-primary \
  --network app-net \
  --network-alias database \
  --network-alias db \
  --network-alias datastore \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# All aliases resolve to the same container
podman run --rm --network app-net \
  docker.io/library/alpine:latest sh -c "
    ping -c 1 database
    ping -c 1 db
    ping -c 1 datastore
    ping -c 1 postgres-primary
  "
```

## Adding Aliases When Connecting to a Network

```bash
# Start a container first
podman run -d --name myservice \
  --network app-net \
  docker.io/library/nginx:latest

# Add aliases when connecting to an additional network
podman network create backend-net
podman network connect --alias api --alias gateway backend-net myservice

# The aliases are specific to the network they were added on
podman run --rm --network backend-net \
  docker.io/library/alpine:latest ping -c 1 api
```

## Service Abstraction with Aliases

Aliases let you swap implementations without changing client configuration:

```bash
# V1 of the service
podman run -d --name api-v1 \
  --network app-net \
  --network-alias api \
  myapp-api:v1

# Clients connect to "api" - they don't know the container name
podman run --rm --network app-net \
  docker.io/library/alpine:latest ping -c 1 api

# Upgrade: stop v1, start v2 with the same alias
podman stop api-v1
podman run -d --name api-v2 \
  --network app-net \
  --network-alias api \
  myapp-api:v2

# Clients still connect to "api" after the replacement
```

## Multiple Containers with the Same Alias

When multiple containers share an alias, DNS queries for that alias resolve to all matching containers:

```bash
# Run multiple backend instances with the same alias
podman run -d --name backend-1 \
  --network app-net \
  --network-alias backend \
  docker.io/library/nginx:latest

podman run -d --name backend-2 \
  --network app-net \
  --network-alias backend \
  docker.io/library/nginx:latest

podman run -d --name backend-3 \
  --network app-net \
  --network-alias backend \
  docker.io/library/nginx:latest

# DNS returns multiple IPs for the alias
podman run --rm --network app-net \
  docker.io/library/alpine:latest nslookup backend
```

## Inspecting Container Aliases

```bash
# Check aliases for a specific container on a network
podman inspect postgres-primary \
  --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}: {{ $v.Aliases }}{{ printf "\n" }}{{ end }}'

# List all containers and their aliases
for ctr in $(podman ps --format "{{ .Names }}"); do
  aliases=$(podman inspect "$ctr" --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $v.Aliases }}{{ end }}')
  echo "$ctr: $aliases"
done
```

## Aliases in Compose-Like Workflows

```bash
# Simulate a compose service name pattern
podman network create myapp

podman run -d --name myapp-web-1 \
  --network myapp \
  --network-alias web \
  docker.io/library/nginx:latest

podman run -d --name myapp-db-1 \
  --network myapp \
  --network-alias db \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Services communicate by alias
podman run --rm --network myapp \
  docker.io/library/alpine:latest ping -c 1 db
```

## Summary

Network aliases in Podman provide additional DNS names for containers on specific networks. Add aliases with `--network-alias` at startup or `--alias` when connecting to networks. Use aliases for service abstraction, rolling deployments, and DNS-based service grouping when multiple containers share the same alias. Aliases are network-specific, so a container can have different aliases on different networks.
