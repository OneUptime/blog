# How to Use EXPOSE Instruction in Containerfiles for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, EXPOSE, Networking, Container Ports

Description: Learn how to use the EXPOSE instruction in Podman Containerfiles to document container ports, understand port publishing, and configure networking for containerized applications.

---

> The EXPOSE instruction documents which ports your containerized application listens on. While it does not publish ports by itself, it serves as essential documentation and enables automatic port mapping with the -P flag.

Networking is a fundamental aspect of containerized applications. Web servers, APIs, databases, and message queues all communicate over network ports. The EXPOSE instruction in a Containerfile declares which ports the container listens on at runtime. Understanding what EXPOSE does, what it does not do, and how it interacts with Podman's networking is essential for building well-documented and properly configured container images.

This guide covers the EXPOSE instruction in depth, from basic syntax to advanced networking patterns with Podman.

---

## Basic Syntax

The EXPOSE instruction takes one or more port numbers with an optional protocol:

```dockerfile
# Expose a single TCP port (TCP is the default)

EXPOSE 8080

# Expose with explicit protocol
EXPOSE 8080/tcp

# Expose a UDP port
EXPOSE 53/udp

# Expose multiple ports
EXPOSE 80 443

# Expose both TCP and UDP on the same port
EXPOSE 3000/tcp 3000/udp
```

## What EXPOSE Actually Does

This is the most commonly misunderstood aspect of EXPOSE. The instruction does not publish the port or make it accessible from outside the container. It serves two purposes:

1. **Documentation**: It tells anyone reading the Containerfile which ports the application uses.
2. **Automatic port mapping**: It enables the `-P` (publish all) flag to know which ports to map.

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm ci

# This documents that the app listens on port 3000
# It does NOT make port 3000 accessible from the host
EXPOSE 3000

CMD ["node", "server.js"]
```

To actually make the port accessible, you must publish it when running the container:

```bash
# EXPOSE alone - port is NOT accessible from the host
podman run myapp
# Cannot reach localhost:3000

# Publish a specific port (-p)
podman run -p 3000:3000 myapp
# Now accessible at localhost:3000

# Publish to a different host port
podman run -p 8080:3000 myapp
# Accessible at localhost:8080, maps to container port 3000

# Publish all exposed ports to random host ports (-P)
podman run -P myapp
# Accessible at localhost:<random-port>, maps to container port 3000
```

## Publishing Ports with Podman

Understanding the different ways to publish ports helps you use EXPOSE effectively.

### Specific Port Mapping (-p)

```bash
# Map host port to container port
podman run -p 8080:3000 myapp

# Map to a specific interface
podman run -p 127.0.0.1:8080:3000 myapp

# Map to a random host port
podman run -p 3000 myapp

# Map multiple ports
podman run -p 8080:80 -p 8443:443 myapp

# Map a range of ports
podman run -p 8080-8090:8080-8090 myapp
```

### Automatic Port Publishing (-P)

The `-P` flag publishes all ports declared with EXPOSE to random available host ports:

```dockerfile
FROM nginx:alpine

# These ports will be auto-published with -P
EXPOSE 80
EXPOSE 443
```

```bash
podman run -d --name myapp-container -P myapp

# Check the assigned ports
podman port myapp-container
# 80/tcp -> 0.0.0.0:32768
# 443/tcp -> 0.0.0.0:32769
```

### UDP Ports

```dockerfile
FROM alpine:3.19

# DNS server listening on both TCP and UDP
EXPOSE 53/tcp 53/udp
```

```bash
# Publish UDP port specifically
podman run -p 53:53/udp myapp-dns
```

## Common Application Patterns

### Web Server

```dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY dist/ /usr/share/nginx/html/

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### API Server with Health Check Port

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

# Main API port
EXPOSE 3000

# Health check / metrics port
EXPOSE 9090

HEALTHCHECK --interval=30s --timeout=5s \
    CMD wget -q --spider http://localhost:9090/health || exit 1

USER node
CMD ["node", "server.js"]
```

### Database

```dockerfile
FROM postgres:16-alpine

# PostgreSQL default port
EXPOSE 5432

# Custom environment
ENV POSTGRES_DB=myapp
ENV POSTGRES_USER=appuser
```

### Multi-Service Application

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# HTTP API
EXPOSE 8000

# WebSocket server
EXPOSE 8001

# gRPC service
EXPOSE 50051

CMD ["python", "main.py"]
```

## EXPOSE with Environment Variables

You can use ARG and ENV with EXPOSE for configurable ports:

```dockerfile
FROM node:20-alpine

ARG APP_PORT=3000
ENV PORT=${APP_PORT}

WORKDIR /app
COPY . .
RUN npm ci

EXPOSE ${PORT}

CMD ["sh", "-c", "node server.js --port ${PORT}"]
```

```bash
# Build with default port
podman build -t myapp .

# Build with custom port
podman build --build-arg APP_PORT=8080 -t myapp:8080 .
```

## EXPOSE in Multi-Stage Builds

EXPOSE in a build stage has no effect on the final image. Only EXPOSE instructions in the final stage matter:

```dockerfile
# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY . .
RUN go build -o server .

# This EXPOSE has no effect on the final image
EXPOSE 8080

# Runtime stage
FROM alpine:3.19

COPY --from=builder /app/server /usr/local/bin/

# This EXPOSE is what matters
EXPOSE 8080

USER 1001
CMD ["server"]
```

## Inspecting Exposed Ports

You can inspect which ports an image exposes:

```bash
# Inspect image metadata
podman inspect myapp --format '{{.Config.ExposedPorts}}'

# More readable format
podman inspect myapp | grep -A 10 ExposedPorts

# Check running container port mappings
podman port <container-id>

# List containers with port info
podman ps --format "{{.Names}}\t{{.Ports}}"
```

## Podman Pod Networking

When using Podman pods, containers share a network namespace. EXPOSE becomes relevant at the pod level:

```bash
# Create a pod with published ports
podman pod create --name myapp-pod -p 8080:80 -p 5432:5432

# Run containers in the pod
podman run --pod myapp-pod -d nginx:alpine
podman run --pod myapp-pod -d -e POSTGRES_PASSWORD=example postgres:16-alpine

# Both containers share the same network
# nginx is accessible at localhost:8080
# postgres is accessible at localhost:5432
```

In a pod, containers can communicate via localhost without publishing ports:

```dockerfile
# API server Containerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm ci

# This port is accessible to other containers in the same pod via localhost
EXPOSE 3000

ENV DATABASE_HOST=localhost
ENV DATABASE_PORT=5432

CMD ["node", "server.js"]
```

## EXPOSE vs Port Publishing: Security Implications

Understanding the security implications of EXPOSE and port publishing is important:

```bash
# EXPOSE without -p: Port is only accessible within the container network
podman run myapp

# -p 3000:3000: Port accessible from any interface (0.0.0.0)
podman run -p 3000:3000 myapp
# WARNING: This exposes the port to ALL network interfaces

# -p 127.0.0.1:3000:3000: Only accessible from localhost
podman run -p 127.0.0.1:3000:3000 myapp
# More secure: only local connections allowed

# -p 192.168.1.10:3000:3000: Only on a specific interface
podman run -p 192.168.1.10:3000:3000 myapp
```

For production deployments, always bind to specific interfaces rather than 0.0.0.0:

```bash
# Production: Bind to specific interface
podman run -p 10.0.0.5:8080:3000 myapp

# Or use a reverse proxy and bind to localhost
podman run -p 127.0.0.1:3000:3000 myapp
```

## Documentation Best Practices

Use comments alongside EXPOSE to explain what each port is for:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY . .
RUN npm ci

# HTTP API endpoint
EXPOSE 3000

# Prometheus metrics endpoint
EXPOSE 9090

# WebSocket connections
EXPOSE 3001

USER node
CMD ["node", "server.js"]
```

Also document ports using LABEL for machine-readable metadata:

```dockerfile
LABEL com.example.ports.api="3000" \
      com.example.ports.metrics="9090" \
      com.example.ports.websocket="3001"
```

## Common Mistakes

```dockerfile
# Mistake 1: Assuming EXPOSE publishes the port
EXPOSE 3000
# Still need: podman run -p 3000:3000

# Mistake 2: Mismatched port between EXPOSE and application
EXPOSE 8080
CMD ["node", "server.js"]  # But server.js listens on 3000

# Mistake 3: Forgetting to expose all ports
# App listens on 3000 (API) and 9090 (metrics)
EXPOSE 3000
# Missing: EXPOSE 9090

# Mistake 4: Using EXPOSE for ports the application doesn't use
EXPOSE 80 443 8080 3000  # Exposing unnecessary ports
```

## Conclusion

The EXPOSE instruction serves as documentation for your container image, declaring which ports the application listens on. It does not publish ports or create firewall rules. To make ports accessible from the host, use `podman run -p` for specific mappings or `podman run -P` to publish all exposed ports. Document all ports your application uses with EXPOSE, add comments explaining each port's purpose, and always bind published ports to specific interfaces in production for security. When working with Podman pods, leverage shared networking so containers can communicate via localhost without exposing ports externally. By treating EXPOSE as a communication tool between the image builder and the image user, you create container images that are self-documenting and easy to deploy correctly.
