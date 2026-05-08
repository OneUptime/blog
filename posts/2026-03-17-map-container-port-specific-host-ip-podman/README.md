# How to Map a Container Port to a Specific Host IP in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Port, Security, IP Binding

Description: Learn how to bind container ports to specific host IP addresses in Podman for network security and multi-interface hosts.

---

> Binding container ports to specific host IPs lets you control which network interfaces accept traffic, improving security on multi-homed servers.

By default, Podman binds published ports to all interfaces (0.0.0.0). On servers with multiple network interfaces, you often want to restrict services to specific interfaces for security reasons, such as exposing management ports only on a private interface.

---

## Binding to a Specific IP Address

```bash
# Bind to a specific interface IP

podman run -d --name web \
  -p 192.168.1.100:8080:80 \
  docker.io/library/nginx:latest

# Accessible through the 192.168.1.100 host address
curl http://192.168.1.100:8080
# This works

# Not accessible from other interfaces
curl http://10.0.0.50:8080
# Connection refused
```

## Binding to Localhost Only

```bash
# Restrict to localhost - only accessible from the host itself
podman run -d --name local-db \
  -p 127.0.0.1:5432:5432 \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Accessible from the host
psql -h 127.0.0.1 -p 5432 -U postgres

# Not accessible from other machines
# Remote: psql -h <host-ip> -p 5432  --> Connection refused
```

## Binding to All Interfaces

```bash
# Explicitly bind to all interfaces (default behavior)
podman run -d --name public-web \
  -p 0.0.0.0:8080:80 \
  docker.io/library/nginx:latest

# Accessible from any interface
curl http://localhost:8080
curl http://192.168.1.100:8080
curl http://10.0.0.50:8080
```

## Binding to IPv6 Addresses

```bash
# Bind to a specific IPv6 address
podman run -d --name web6 \
  -p "[::1]:8080:80" \
  docker.io/library/nginx:latest

# Bind to all IPv6 interfaces
podman run -d --name web6-all \
  -p "[::]:8080:80" \
  docker.io/library/nginx:latest
```

## Multiple Bindings for the Same Port

```bash
# Bind the same container port to different host IPs
podman run -d --name multi-bind \
  -p 192.168.1.100:8080:80 \
  -p 10.0.0.50:8080:80 \
  docker.io/library/nginx:latest

# Accessible on both specific interfaces but not others
```

## Multi-Interface Architecture Example

```bash
# Server with public (eth0: 203.0.113.10) and private (eth1: 10.0.0.10) interfaces

# Web server: public interface only
podman run -d --name public-web \
  -p 203.0.113.10:443:443 \
  docker.io/library/nginx:latest

# Database: private interface only
podman run -d --name private-db \
  -p 10.0.0.10:5432:5432 \
  -e POSTGRES_PASSWORD=secret \
  docker.io/library/postgres:16

# Management API: localhost only
podman run -d --name mgmt-api \
  -p 127.0.0.1:9090:9090 \
  management-api:latest
```

## Verifying Port Bindings

```bash
# Check which IP a port is bound to
podman port web
# Output: 80/tcp -> 192.168.1.100:8080

# Inspect the container for detailed port info
podman inspect web --format '{{ json .NetworkSettings.Ports }}'

# Verify with ss/netstat
ss -tlnp | grep 8080
```

## Using --network with Port Binding

```bash
# Combine specific IP binding with other network options
podman run -d --name secure-app \
  --network mynetwork \
  -p 127.0.0.1:3000:3000 \
  -p 192.168.1.100:8080:80 \
  docker.io/library/node:20 tail -f /dev/null
```

## Summary

Bind container ports to specific host IPs using the format `HOST_IP:HOST_PORT:CONTAINER_PORT`. Use `127.0.0.1` for localhost-only access, specific interface IPs for targeted exposure, and `0.0.0.0` for all interfaces. On multi-homed servers, this provides an important security layer by controlling which network interfaces accept container traffic. Always verify bindings with `podman port` and `ss`.
