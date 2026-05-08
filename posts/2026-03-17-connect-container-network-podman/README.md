# How to Connect a Container to a Network with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Multi-Network

Description: Learn how to connect running containers to additional Podman networks for multi-network architectures.

---

> Connecting containers to networks allows you to build layered network architectures where services communicate across different network segments.

Podman allows you to connect a running container to one or more additional networks using `podman network connect`. This is useful for API gateways, reverse proxies, and services that need to communicate across multiple network segments.

---

## Connecting a Running Container to a Network

```bash
# Create two networks

podman network create frontend
podman network create --subnet 10.10.0.0/24 backend

# Start a container on the frontend network
podman run -d --name api-gateway \
  --network frontend \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Connect the container to the backend network as well
podman network connect backend api-gateway

# Verify the container is on both networks
podman inspect api-gateway --format '{{ json .NetworkSettings.Networks }}' | python3 -m json.tool
```

## Connecting at Container Start

```bash
# Attach to multiple networks at start using --network
podman run -d --name multi-net \
  --network frontend \
  --network backend \
  docker.io/library/alpine:latest tail -f /dev/null

# Verify both networks
podman inspect multi-net --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}: {{ $v.IPAddress }}{{ printf "\n" }}{{ end }}'
```

## Connecting with a Static IP

```bash
# Connect to a network with a specific IP address
podman network disconnect backend api-gateway
podman network connect --ip 10.10.0.50 backend api-gateway

# Verify the assigned IP
podman inspect api-gateway --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }}: {{ $v.IPAddress }}{{ printf "\n" }}{{ end }}'
```

## Connecting with Network Aliases

```bash
# Connect with a DNS alias on the new network
podman network disconnect backend api-gateway
podman network connect --alias gateway --alias proxy backend api-gateway

# Other containers on the backend network can reach it by alias
podman run --rm --network backend \
  docker.io/library/alpine:latest ping -c 1 gateway
```

## Multi-Network Architecture Example

```bash
# Create isolated network segments
podman network create --subnet 10.1.0.0/24 public
podman network create --subnet 10.2.0.0/24 --internal private

# Frontend on public network only
podman run -d --name web \
  --network public \
  -p 80:80 \
  docker.io/library/nginx:latest

# API gateway bridges public and private
podman run -d --name api \
  --network public \
  docker.io/library/node:20 tail -f /dev/null
podman network connect private api

# Database on private network only
podman run -d --name db \
  --network private \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# web can reach api, api can reach db, but web cannot reach db
```

## Verifying Network Connectivity

```bash
# Check which networks a container is on
podman inspect api-gateway --format '{{ range $k, $v := .NetworkSettings.Networks }}{{ $k }} {{ end }}'

# Test connectivity between containers
podman run --rm --network container:api docker.io/library/alpine:latest ping -c 2 db
podman run --rm --network container:web docker.io/library/alpine:latest ping -c 2 api

# List all containers on a specific network
podman ps --filter network=backend --format "{{ .Names }}: {{ .Networks }}"
```

## Summary

Connect containers to additional networks using `podman network connect` for running containers or `--network` flags at startup. Assign static IPs and DNS aliases when connecting to control addressing and discovery. Use multi-network architectures to create layered security boundaries where gateway services bridge public and private network segments.
