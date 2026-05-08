# How to Access Host Services from a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Host Access, Development

Description: Learn how to access services running on the host machine from inside a Podman container.

---

> Accessing host services from containers is common in development workflows where databases, APIs, or other services run directly on the host machine.

When developing with containers, you often need to connect to services running on the host, such as a local database, message queue, or API server. Podman provides several methods to reach the host from inside a container.

---

## Using host.containers.internal

Podman provides a special hostname that resolves to the host:

```bash
# host.containers.internal resolves to the host machine

podman run --rm docker.io/library/alpine:latest \
  ping -c 3 host.containers.internal

# Connect to a host service (e.g., a database on port 5432)
podman run --rm docker.io/library/postgres:16 \
  psql -h host.containers.internal -p 5432 -U postgres
```

## Using Host Networking

For direct access to all host services:

```bash
# Host network mode shares the host's network namespace
podman run --rm --network host \
  docker.io/library/alpine:latest \
  sh -c "apk add --no-cache curl > /dev/null 2>&1 && curl http://localhost:3000"

# Everything on localhost is directly accessible
podman run --rm --network host \
  docker.io/library/alpine:latest netstat -tlnp
```

## Using --add-host

Add a custom hostname mapping to reach the host:

```bash
# Add a custom host entry pointing to the host IP
podman run --rm \
  --add-host myhost:host-gateway \
  docker.io/library/alpine:latest ping -c 2 myhost

# Use with a descriptive name
podman run -d --name app \
  --add-host database:host-gateway \
  --add-host cache:host-gateway \
  docker.io/library/node:20 tail -f /dev/null
```

## Accessing Host Services via Gateway IP

```bash
# On bridge networks, the gateway IP points to the host
podman run --rm docker.io/library/alpine:latest ip route show
# default via 10.88.0.1 dev eth0

# Use the gateway IP to reach host services
podman run --rm docker.io/library/alpine:latest \
  ping -c 2 10.88.0.1

# With slirp4netns, the host gateway is typically 10.0.2.2
podman run --rm --network slirp4netns \
  docker.io/library/alpine:latest ping -c 2 10.0.2.2
```

## Development Example: Container App to Host Database

```bash
# Host is running PostgreSQL on port 5432
# Start the application container
podman run -d --name myapp \
  --add-host db:host-gateway \
  -e DATABASE_URL=postgresql://postgres:secret@db:5432/myapp \
  -p 3000:3000 \
  myapp:latest

# The container connects to the host's PostgreSQL via "db" hostname
```

## Accessing Host Loopback Services

For rootless containers using pasta:

```bash
# Enable gateway mapping so the container can reach host loopback services
podman run --rm --network pasta:--map-gw \
  docker.io/library/alpine:latest \
  sh -c 'apk add --no-cache curl > /dev/null 2>&1 && GW=$(ip route show default | sed -n "s/^default via \([^ ]*\).*/\1/p") && curl -s "http://$GW:3000"'

# With slirp4netns, enable host loopback access
podman run --rm \
  --network slirp4netns:allow_host_loopback=true \
  docker.io/library/alpine:latest \
  ping -c 2 10.0.2.2
```

## Verifying Host Access

```bash
# Check what host services are available
# On the host
ss -tlnp

# From inside the container
podman exec myapp sh -c "
  # Check if the host database is reachable
  nc -zv host.containers.internal 5432 && echo 'DB reachable' || echo 'DB not reachable'
  nc -zv host.containers.internal 6379 && echo 'Redis reachable' || echo 'Redis not reachable'
"
```

## Security Considerations

```bash
# Limit host access by using specific port bindings on the host
# Instead of binding host services to 0.0.0.0, bind to specific IPs

# Example: PostgreSQL listen on container network only
# In postgresql.conf: listen_addresses = '10.88.0.1'
```

## Summary

Access host services from Podman containers using `host.containers.internal` hostname, `--add-host` with `host-gateway`, or the network gateway IP. For full access, use `--network host`. In development, map descriptive hostnames like `database` to `host-gateway` so container applications can connect to host services by name. For rootless containers using pasta, enable gateway mapping with `pasta:--map-gw` when you need direct access to host loopback services.
