# How to Use Compose Port Mapping with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, podman-compose, Port, Networking

Description: Learn how to configure port mappings in podman-compose to expose container services on the host network.

---

> Port mappings in compose files control how container services are accessible from the host and external networks.

Port mapping connects a port on your host machine to a port inside the container, making containerized services accessible from the outside. podman-compose supports the common Compose port mapping syntax shown below, including short and long forms, protocol selection, and IP binding.

---

## Basic Port Mapping

```yaml
# compose.yaml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      # Map host port 8080 to container port 80
      - "8080:80"
```

```bash
podman-compose up -d
curl http://localhost:8080
```

## Multiple Port Mappings

```yaml
services:
  app:
    image: docker.io/library/node:20-alpine
    ports:
      - "3000:3000"   # Application port
      - "9229:9229"   # Debug port
      - "8443:443"    # HTTPS port
```

## Binding to a Specific IP

```yaml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      # Bind to localhost only - not accessible from external
      - "127.0.0.1:8080:80"

      # Bind to a specific interface
      - "192.168.1.100:8080:80"

      # Bind to all interfaces (default)
      - "0.0.0.0:8080:80"
```

## Protocol Selection

```yaml
services:
  dns:
    image: docker.io/library/coredns:latest
    ports:
      # TCP port (default)
      - "5353:53/tcp"
      # UDP port
      - "5353:53/udp"
```

## Random Host Port

```yaml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      # Let Podman assign a random host port
      - "80"
```

```bash
# Find the assigned port
podman-compose ps
# Or
podman port <project>_web_1
```

## Port Ranges

```yaml
services:
  app:
    image: docker.io/library/python:3.12-slim
    ports:
      # Map a range of ports
      - "8000-8005:8000-8005"
```

## Long Syntax

```yaml
services:
  web:
    image: docker.io/library/nginx:alpine
    ports:
      - target: 80
        published: "8080"
        protocol: tcp
        # host_ip: optionally bind to a specific host IP
        # mode: host/ingress is for swarm-style publishing (not used in Podman)
```

## Expose vs Ports

```yaml
services:
  api:
    image: docker.io/library/python:3.12-slim
    # ports: makes the service accessible from the host
    ports:
      - "5000:5000"

  worker:
    image: docker.io/library/python:3.12-slim
    # expose: documents the port but does not map it to the host
    # Other containers on the same network can still access it
    expose:
      - "5000"
```

## Avoiding Port Conflicts

```bash
# Check which ports are in use on the host
ss -tlnp | grep 8080

# If a port is taken, use a different host port
# - "8081:80" instead of "8080:80"
```

## Common Port Mappings

```yaml
services:
  web:
    ports:
      - "8080:80"     # HTTP
  api:
    ports:
      - "3000:3000"   # Node.js / Express
  db:
    ports:
      - "5432:5432"   # PostgreSQL
  redis:
    ports:
      - "6379:6379"   # Redis
  mysql:
    ports:
      - "3306:3306"   # MySQL
```

## Summary

Port mappings in podman-compose use `HOST:CONTAINER` syntax to expose container services on the host. Bind to specific IPs for security, specify protocols for UDP services, and use `expose` for inter-container communication without host exposure. Use random host ports when running scaled services.
