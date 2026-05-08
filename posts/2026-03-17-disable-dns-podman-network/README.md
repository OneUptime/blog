# How to Disable DNS in a Podman Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, DNS, Configuration

Description: Learn how to disable the built-in DNS server in Podman networks and when this is useful.

---

> Disabling DNS on a Podman network removes the automatic name resolution service, which can be useful when you manage DNS externally or want to reduce overhead.

By default, bridge-based custom Podman networks use the aardvark-dns plugin for container name resolution. In some cases, you may want to disable this built-in DNS and rely on external DNS servers or IP-based addressing instead.

---

## Creating a Network Without DNS

```bash
# Create a network with DNS disabled

podman network create --disable-dns no-dns-network

# Verify DNS is disabled
podman network inspect no-dns-network --format '{{ .DNSEnabled }}'
# Output: false
```

## Effects of Disabling DNS

```bash
# Containers cannot resolve each other by name
podman run -d --name svc1 --network no-dns-network \
  docker.io/library/alpine:latest tail -f /dev/null

podman run -d --name svc2 --network no-dns-network \
  docker.io/library/alpine:latest tail -f /dev/null

# Name resolution fails
podman exec svc1 ping -c 1 svc2
# ping: bad address 'svc2'

# But IP-based communication still works
SVC2_IP=$(podman inspect svc2 --format '{{ range .NetworkSettings.Networks }}{{ .IPAddress }}{{ end }}')
podman exec svc1 ping -c 2 "$SVC2_IP"
```

## When to Disable DNS

- **External DNS management**: When you use an external DNS server like Consul, CoreDNS, or BIND
- **Performance optimization**: Removing the aardvark-dns overhead for high-throughput networks
- **IP-based communication**: When containers communicate only via static IPs
- **Default bridge behavior**: Matching Docker's default bridge behavior where container-name DNS is not available

## Using External DNS Instead

```bash
# Disable built-in DNS and point to an external DNS server
podman network create --disable-dns external-dns-net

# Point containers to your external DNS
podman run -d --name app \
  --network external-dns-net \
  --dns 10.0.0.53 \
  docker.io/library/alpine:latest tail -f /dev/null

# DNS resolution uses the external server
podman exec app nslookup myservice.internal.example.com
```

## Static IP Communication Without DNS

```bash
# Create a network without DNS using static IPs
podman network create \
  --disable-dns \
  --subnet 10.80.0.0/24 \
  --gateway 10.80.0.1 \
  static-network

# Assign static IPs for direct communication
podman run -d --name web \
  --network static-network \
  --ip 10.80.0.10 \
  docker.io/library/nginx:latest

podman run -d --name api \
  --network static-network \
  --ip 10.80.0.20 \
  docker.io/library/alpine:latest tail -f /dev/null

# Use IPs directly
podman exec api ping -c 2 10.80.0.10
```

## Adding /etc/hosts Entries Manually

Without DNS, you can use `--add-host` to provide name resolution:

```bash
# Add static host entries for name resolution
podman run -d --name client \
  --network static-network \
  --add-host web:10.80.0.10 \
  --add-host api:10.80.0.20 \
  --add-host db:10.80.0.30 \
  docker.io/library/alpine:latest tail -f /dev/null

# Names resolve via /etc/hosts
podman exec client ping -c 1 web
podman exec client cat /etc/hosts
```

## Checking DNS Status

```bash
# Verify DNS status on all networks
for net in $(podman network ls --format "{{ .Name }}"); do
  dns=$(podman network inspect "$net" --format '{{ .DNSEnabled }}')
  echo "$net: DNS=$dns"
done
```

## Summary

Disable DNS on Podman networks with `--disable-dns` when you manage DNS externally, communicate via static IPs, or want to reduce overhead. Without built-in DNS, containers cannot resolve each other by name and must use IP addresses or manual `--add-host` entries. Use external DNS servers via `--dns` to provide name resolution from a centralized service.
