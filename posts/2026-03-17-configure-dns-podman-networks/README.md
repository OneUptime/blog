# How to Configure DNS in Podman Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, DNS, Service Discovery

Description: Learn how to configure DNS settings in Podman networks for container name resolution and custom DNS servers.

---

> DNS configuration in Podman networks enables automatic container name resolution and allows you to specify custom DNS servers for external name lookups.

Podman provides built-in DNS for custom networks, allowing containers to resolve each other by name. You can also configure custom DNS servers, search domains, and DNS options for containers that need to resolve external or internal domain names.

---

## Default DNS on Custom Networks

Custom Podman networks have DNS enabled by default:

```bash
# Create a network (DNS is enabled automatically)

podman network create app-network

# Verify DNS is enabled
podman network inspect app-network --format '{{ .DNSEnabled }}'
# Output: true

# Containers resolve each other by name
podman run -d --name web --network app-network docker.io/library/nginx:latest
podman run -d --name api --network app-network docker.io/library/alpine:latest tail -f /dev/null

podman exec api ping -c 2 web
```

## Setting Custom DNS Servers

```bash
# Use a specific DNS server for external name resolution
podman run -d --name app \
  --network app-network \
  --dns 8.8.8.8 \
  --dns 1.1.1.1 \
  docker.io/library/alpine:latest tail -f /dev/null

# Inspect the resolver configuration
# On DNS-enabled custom networks, resolv.conf may point to aardvark-dns,
# which forwards external lookups to the configured DNS servers.
podman exec app cat /etc/resolv.conf
```

## Configuring DNS Search Domains

```bash
# Add DNS search domains for short name resolution
podman run -d --name app \
  --network app-network \
  --dns-search example.com \
  --dns-search internal.corp \
  docker.io/library/alpine:latest tail -f /dev/null

# "api" will try api.example.com and api.internal.corp
podman exec app cat /etc/resolv.conf
```

## Setting DNS Options

```bash
# Configure DNS resolver options
podman run -d --name app \
  --network app-network \
  --dns-option ndots:5 \
  --dns-option timeout:2 \
  --dns-option attempts:3 \
  docker.io/library/alpine:latest tail -f /dev/null

podman exec app cat /etc/resolv.conf
```

## DNS with Network Aliases

```bash
# Create containers with DNS aliases for service discovery
podman run -d --name postgres-primary \
  --network app-network \
  --network-alias database \
  --network-alias db \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Other containers can reach it by any alias
podman exec api ping -c 1 database
podman exec api ping -c 1 db
podman exec api ping -c 1 postgres-primary
```

## DNS for Pod-Based Services

```bash
# In a pod, containers share the network namespace
podman pod create --name myapp --network app-network

podman run -d --pod myapp --name myapp-web docker.io/library/nginx:latest
podman run -d --pod myapp --name myapp-api docker.io/library/node:20 tail -f /dev/null

# The pod name is resolvable from other containers on the network
podman run --rm --network app-network \
  docker.io/library/alpine:latest ping -c 2 myapp
```

## Configuring DNS at the System Level

```bash
# Set default DNS for all containers in containers.conf
# Edit ~/.config/containers/containers.conf (rootless)
# Or /etc/containers/containers.conf (root)

# [containers]
# dns_servers = ["8.8.8.8", "1.1.1.1"]
# dns_searches = ["example.com"]
# dns_options = ["ndots:1"]
```

## Troubleshooting DNS

```bash
# Check the container's resolv.conf
podman exec app cat /etc/resolv.conf

# Test DNS resolution
podman exec app nslookup web
podman exec app nslookup google.com

# Check if the Podman DNS server (aardvark-dns) is running
ps aux | grep aardvark-dns

# Check journal entries related to aardvark-dns
journalctl --no-pager -n 200 | grep aardvark-dns
```

## Summary

Podman custom networks provide automatic DNS resolution between containers using aardvark-dns. Configure custom DNS servers with `--dns`, search domains with `--dns-search`, and resolver options with `--dns-option`. Use network aliases for service discovery with multiple DNS names per container. System-wide DNS defaults can be set in `containers.conf`.
