# How to Configure Port Forwarding in Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Port Forwarding, Networking

Description: Learn how to configure port forwarding in Podman Desktop to expose container services on your local machine for development and testing.

---

> Port forwarding maps container ports to your host machine, making containerized services accessible through localhost for local development and testing.

When running containers, your services are isolated inside their own network namespace by default. Port forwarding bridges the gap between the container network and your host, allowing you to access web servers, APIs, and databases running inside containers through your browser or local tools. Podman Desktop makes this configuration straightforward through its graphical interface.

---

## Basic Port Forwarding Concepts

Port forwarding maps a port on your host machine to a port inside the container. The format is `host_port:container_port`.

```bash
# Basic port forward: host port 8080 maps to container port 80

podman run -d --name web -p 8080:80 nginx:alpine

# Access the service at http://localhost:8080
curl http://localhost:8080
```

## Configuring Ports in Podman Desktop

When creating a container through Podman Desktop:

1. Click **Images** in the left sidebar and find your image.
2. Click the **Run** button next to the image.
3. In the container creation dialog, find the **Port Mapping** section.
4. Enter the host port and container port values.
5. Click **Add** to include additional port mappings.
6. Click **Start** to launch the container with the configured ports.

Podman Desktop shows active port mappings in the container details view with clickable links to open them in your browser.

## Common Port Forwarding Patterns

```bash
# Map the same port on host and container
podman run -d --name api -p 3000:3000 node:18-alpine \
  node -e "require('http').createServer((req,res) => res.end('OK')).listen(3000)"

# Map multiple ports for a single container
podman run -d --name fullstack \
  -p 8080:80 \
  -p 8443:443 \
  -p 9090:9090 \
  nginx:alpine

# Use a random host port (Podman assigns one)
podman run -d --name random-port -p 80 nginx:alpine

# Check which host port was assigned
podman port random-port
```

## Binding to Specific Interfaces

By default, port forwarding binds to all interfaces. You can restrict this:

```bash
# Bind only to localhost (most secure for development)
podman run -d --name local-only \
  -p 127.0.0.1:8080:80 \
  nginx:alpine

# Bind to a specific IP address
podman run -d --name specific-ip \
  -p 192.168.1.100:8080:80 \
  nginx:alpine

# Bind to all interfaces explicitly
podman run -d --name all-interfaces \
  -p 0.0.0.0:8080:80 \
  nginx:alpine
```

## Port Forwarding with Pods

When using pods, port forwarding is configured at the pod level:

```bash
# Create a pod with port forwarding
podman pod create --name my-pod -p 8080:80 -p 5432:5432

# Containers in the pod share the port mappings
podman run -d --pod my-pod --name web nginx:alpine
podman run -d --pod my-pod --name db \
  -e POSTGRES_PASSWORD=secret \
  postgres:16-alpine

# Access web server at localhost:8080
curl http://localhost:8080

# Connect to PostgreSQL at localhost:5432
# psql -h localhost -p 5432 -U postgres
```

## UDP Port Forwarding

Some services use UDP instead of TCP:

```bash
# Forward a UDP port
podman run -d --name dns-server \
  -p 5353:53/udp \
  alpine sh -c "apk add dnsmasq && dnsmasq --no-daemon"

# Forward both TCP and UDP on the same port
podman run -d --name multi-protocol \
  -p 8080:80/tcp \
  -p 8080:80/udp \
  nginx:alpine
```

## Kubernetes Port Forwarding via Podman Desktop

Podman Desktop also supports Kubernetes port forwarding:

```bash
# Forward a port from a Kubernetes pod
kubectl port-forward pod/my-app 8080:80

# Forward from a service
kubectl port-forward svc/my-service 8080:80

# Forward to a specific local address
kubectl port-forward --address 0.0.0.0 pod/my-app 8080:80
```

In Podman Desktop, navigate to the Kubernetes section, right-click a pod, and select **Port Forward** to set this up visually.

## Viewing Active Port Mappings

Check which ports are forwarded for running containers:

```bash
# List all port mappings for a container
podman port web

# List all containers with their port mappings
podman ps --format "{{.Names}}\t{{.Ports}}"

# Check if a specific published port appears in running containers
podman ps --format "{{.Names}}\t{{.Ports}}" | grep 8080

# Detailed network information
podman inspect web --format '{{.NetworkSettings.Ports}}'
```

## Troubleshooting Port Forwarding

Common issues and solutions:

```bash
# Check if the port is already in use on the host
lsof -i :8080

# Check if the container service is actually listening
podman exec web sh -c "apk add --no-cache iproute2 >/dev/null && ss -tlnp"

# Verify the container is running
podman ps -a --filter name=web

# Check container logs for startup errors
podman logs web

# Test connectivity from inside the container
podman exec web wget -qO- http://localhost:80
```

## Summary

Port forwarding in Podman Desktop is essential for local development with containers. Whether you need simple single-port mappings or complex multi-port configurations for pods, Podman Desktop provides both a graphical interface and CLI options. Understanding interface binding, UDP support, and Kubernetes port forwarding ensures your containerized services are accessible exactly where you need them.
