# How to Use Docker Compose ports Long Syntax

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Ports, Networking, Configuration, Containers

Description: Master Docker Compose ports long syntax for precise control over port publishing, protocols, and host binding.

---

Docker Compose supports two formats for publishing container ports: short syntax and long syntax. Most tutorials use the short syntax (`"8080:80"`), but it has limitations. The long syntax gives you explicit control over every aspect of port publishing: the host IP to bind to, the protocol, the port range, and the network mode. When you need anything beyond simple port mapping, long syntax is the way to go.

This guide covers the long syntax format in detail with practical examples for every common and advanced use case.

## Short Syntax Recap

Before diving into long syntax, here is what the short syntax looks like:

```yaml
# docker-compose.yml - Short syntax port examples
services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"           # Map host 8080 to container 80
      - "443:443"           # Map host 443 to container 443
      - "9090:9090/udp"     # UDP port mapping
      - "127.0.0.1:3000:3000"  # Bind only to localhost
```

Short syntax works fine for simple cases, but you cannot set all options and the format gets confusing with IPv6 addresses and complex port configurations.

## Long Syntax Format

The long syntax uses explicit key-value pairs:

```yaml
# docker-compose.yml - Long syntax port structure
services:
  web:
    image: nginx:alpine
    ports:
      - target: 80          # Container port (required)
        published: 8080      # Host port (optional, random if omitted)
        protocol: tcp        # tcp or udp (default: tcp)
        host_ip: 0.0.0.0    # Host interface to bind (default: 0.0.0.0)
        mode: host           # host or ingress (for Swarm)
```

Each field serves a specific purpose:

- **target** - The port inside the container where the application listens
- **published** - The port on the host machine that maps to the target
- **protocol** - Either `tcp` or `udp`
- **host_ip** - The host IP address to bind to (restricts which interfaces accept traffic)
- **mode** - `host` publishes on each node directly, `ingress` uses the Swarm routing mesh

## Basic Port Mapping

The equivalent of `-p 8080:80`:

```yaml
# docker-compose.yml - Basic port mapping in long syntax
services:
  web:
    image: nginx:alpine
    ports:
      - target: 80
        published: 8080
```

This binds port 8080 on all host interfaces (0.0.0.0) and forwards to port 80 in the container.

## Binding to a Specific Interface

Restrict a port to only accept connections from localhost:

```yaml
# docker-compose.yml - Bind to localhost only
services:
  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
    ports:
      - target: 5432
        published: 5432
        host_ip: 127.0.0.1
```

This is important for databases and admin panels that should only be accessible from the host machine, not from the network. In short syntax, this would be `"127.0.0.1:5432:5432"`.

Bind to a specific network interface:

```yaml
# docker-compose.yml - Bind to a specific network interface IP
services:
  internal-api:
    image: my-api:latest
    ports:
      - target: 3000
        published: 3000
        host_ip: 10.0.0.5   # Only accessible from the 10.0.0.x network
```

## UDP Ports

Publish UDP ports explicitly:

```yaml
# docker-compose.yml - UDP port mapping for DNS or game servers
services:
  dns-server:
    image: coredns/coredns:latest
    ports:
      # DNS uses both TCP and UDP on port 53
      - target: 53
        published: 53
        protocol: tcp
      - target: 53
        published: 53
        protocol: udp

  game-server:
    image: game-server:latest
    ports:
      # Game traffic over UDP
      - target: 27015
        published: 27015
        protocol: udp
      # Game query port over UDP
      - target: 27016
        published: 27016
        protocol: udp
      # RCON admin over TCP
      - target: 27020
        published: 27020
        protocol: tcp
```

## Random Host Ports

Omit the `published` field to let Docker assign a random available port:

```yaml
# docker-compose.yml - Random host port assignment
services:
  worker-1:
    image: my-worker:latest
    ports:
      - target: 8080
        # No 'published' field - Docker picks a random available port

  worker-2:
    image: my-worker:latest
    ports:
      - target: 8080
        # Each worker gets its own random port
```

Find the assigned port:

```bash
# Check which host port was assigned
docker compose ps
# NAME       PORTS
# worker-1   0.0.0.0:32768->8080/tcp
# worker-2   0.0.0.0:32769->8080/tcp
```

This is useful when running multiple instances of the same service and you do not care about specific host ports.

## Port Ranges

Publish a range of ports:

```yaml
# docker-compose.yml - Port range publishing
services:
  media-server:
    image: media-server:latest
    ports:
      # RTP media ports range
      - target: 10000-10100
        published: 10000-10100
        protocol: udp
      # HTTP control port
      - target: 8080
        published: 8080
```

The range must be the same size on both host and container sides.

## Swarm Mode: Host vs Ingress

In Docker Swarm, the `mode` field matters:

```yaml
# docker-compose.yml - Swarm deployment with mode options
services:
  web:
    image: nginx:alpine
    ports:
      # Ingress mode: traffic enters through the Swarm routing mesh
      # Any node in the swarm can accept traffic on port 80
      - target: 80
        published: 80
        mode: ingress

  monitoring:
    image: prometheus/node-exporter:latest
    ports:
      # Host mode: bind directly to the node's port
      # Only the specific node running this container serves port 9100
      - target: 9100
        published: 9100
        mode: host
    deploy:
      mode: global  # Run on every node
```

Ingress mode routes traffic through the Swarm load balancer. Host mode bypasses it and binds directly to the node. Use host mode when you need to know which specific node is handling traffic (monitoring, logging agents) or when you need the real client IP.

## Multiple Port Mappings

Combine multiple port configurations for complex services:

```yaml
# docker-compose.yml - Complex multi-port service
services:
  application:
    image: my-complex-app:latest
    ports:
      # Public HTTP - accessible from anywhere
      - target: 80
        published: 80
        host_ip: 0.0.0.0

      # Public HTTPS - accessible from anywhere
      - target: 443
        published: 443
        host_ip: 0.0.0.0

      # Admin panel - localhost only
      - target: 9090
        published: 9090
        host_ip: 127.0.0.1

      # Debug port - internal network only
      - target: 5005
        published: 5005
        host_ip: 10.0.0.5

      # Metrics endpoint - localhost only
      - target: 9100
        published: 9100
        host_ip: 127.0.0.1
```

## Mixing Short and Long Syntax

You can use both syntaxes in the same file:

```yaml
# docker-compose.yml - Mix of short and long syntax
services:
  web:
    image: nginx:alpine
    ports:
      # Simple port - use short syntax
      - "8080:80"
      # Port needing specific binding - use long syntax
      - target: 443
        published: 443
        host_ip: 0.0.0.0

  redis:
    image: redis:7-alpine
    ports:
      # Localhost binding - long syntax is clearer
      - target: 6379
        published: 6379
        host_ip: 127.0.0.1
```

## IPv6 Port Binding

Long syntax handles IPv6 cleanly (short syntax with IPv6 addresses is hard to read):

```yaml
# docker-compose.yml - IPv6 port binding
services:
  web:
    image: nginx:alpine
    ports:
      # Bind to IPv6 localhost
      - target: 80
        published: 80
        host_ip: "::1"

      # Bind to all IPv6 addresses
      - target: 443
        published: 443
        host_ip: "::"

      # Bind to a specific IPv6 address
      - target: 8080
        published: 8080
        host_ip: "fd00:1::10"
```

Compare with short syntax where IPv6 requires brackets and gets messy:

```yaml
# Short syntax with IPv6 - harder to read
ports:
  - "[::1]:80:80"
  - "[::]:443:443"
```

## Real-World Example: Full Stack Application

A complete application using long syntax for precise port control:

```yaml
# docker-compose.yml - Production stack with precise port bindings
services:
  nginx:
    image: nginx:alpine
    ports:
      - target: 80
        published: 80
        host_ip: 0.0.0.0
      - target: 443
        published: 443
        host_ip: 0.0.0.0
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - frontend

  frontend:
    image: frontend:latest
    # No published ports - only accessible through nginx

  api:
    image: api:latest
    # No published ports - only accessible through nginx
    environment:
      DATABASE_URL: postgres://app:secret@postgres:5432/myapp

  postgres:
    image: postgres:16-alpine
    ports:
      # Database accessible only from localhost for admin access
      - target: 5432
        published: 5432
        host_ip: 127.0.0.1
    environment:
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      # Redis accessible only from localhost for debugging
      - target: 6379
        published: 6379
        host_ip: 127.0.0.1

  prometheus:
    image: prom/prometheus:latest
    ports:
      # Prometheus accessible only from the internal management network
      - target: 9090
        published: 9090
        host_ip: 10.0.0.5

  grafana:
    image: grafana/grafana:latest
    ports:
      # Grafana accessible only from the internal management network
      - target: 3000
        published: 3000
        host_ip: 10.0.0.5

volumes:
  pgdata:
```

## Validating Port Configuration

After starting your services, verify the port bindings:

```bash
# Show all port mappings for running services
docker compose ps --format "table {{.Name}}\t{{.Ports}}"

# Check specific port bindings with ss
ss -tlnp | grep docker

# Verify binding to specific interfaces
ss -tlnp | grep 127.0.0.1
ss -tlnp | grep 0.0.0.0
```

## Conclusion

Docker Compose ports long syntax replaces ambiguous string formatting with explicit key-value configuration. Each field has a clear purpose, and the syntax handles complex scenarios like IPv6 binding, interface-specific publishing, and Swarm mode selection without confusion. Use short syntax for simple port mappings where clarity is not an issue. Switch to long syntax when you need interface-specific binding, when working with IPv6, when mixing TCP and UDP, or when your port configuration is complex enough that readability matters. The long syntax makes the intent of each port mapping obvious to anyone reading the Compose file.
