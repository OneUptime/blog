# How to Map Docker Ports Correctly (Host, Bridge, and Container Networks)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Networking, DevOps, Containers, Port Mapping

Description: Learn how to correctly map ports in Docker using host, bridge, and container network modes, including port publishing, range mapping, and troubleshooting common networking issues.

---

Port mapping is how you expose containerized applications to the outside world. Getting it wrong means services that can't be reached or security holes from unintended exposure. Understanding Docker's networking modes and port publishing options is essential for production deployments.

## Docker Network Modes

Docker provides several network modes, each with different port mapping behavior:

| Mode | Description | Port Mapping |
|------|-------------|--------------|
| `bridge` | Default. Isolated network with NAT | Required for external access |
| `host` | Container shares host's network | Not needed, all ports exposed |
| `none` | No networking | Not possible |
| `container:<name>` | Share another container's network | Shares ports with target |

## Bridge Network (Default)

The bridge network creates an isolated network where containers get their own IP addresses. You must explicitly publish ports to make them accessible.

### Basic Port Publishing

```bash
# Publish container port 80 to host port 8080
docker run -p 8080:80 nginx

# Syntax: -p [host_ip:]host_port:container_port[/protocol]
```

### Common Port Mapping Patterns

```bash
# Map to same port number
docker run -p 80:80 nginx

# Map to different host port
docker run -p 8080:80 nginx

# Map to random host port
docker run -p 80 nginx
# Find assigned port with: docker port <container>

# Bind to specific interface
docker run -p 127.0.0.1:8080:80 nginx  # Only localhost
docker run -p 0.0.0.0:8080:80 nginx    # All interfaces (default)

# Specify protocol (default is tcp)
docker run -p 8080:80/tcp nginx
docker run -p 53:53/udp dns-server
docker run -p 53:53/tcp -p 53:53/udp dns-server  # Both protocols
```

### Publishing Multiple Ports

```bash
# Multiple -p flags
docker run -p 80:80 -p 443:443 nginx

# Using --publish-all to expose all EXPOSE'd ports to random host ports
docker run -P nginx
```

### Port Ranges

```bash
# Map a range of ports
docker run -p 8000-8010:8000-8010 my-app

# Random host ports for a range
docker run -p 8000-8010 my-app
```

## Host Network Mode

In host mode, the container shares the host's network stack directly. No port mapping is needed or possible.

```bash
# Container binds directly to host ports
docker run --network host nginx
# nginx is now accessible on host's port 80
```

Use host networking when:
- You need maximum network performance (no NAT overhead)
- The application requires binding to many ports
- You're running network monitoring tools

Drawbacks:
- No network isolation
- Port conflicts with host services
- Not available on Docker Desktop (macOS/Windows)

## Container Network Mode

Share another container's network namespace. Both containers share the same IP and ports.

```bash
# Start the first container
docker run -d --name web -p 8080:80 nginx

# Share its network with another container
docker run --network container:web my-sidecar
# my-sidecar can access nginx at localhost:80
```

This is useful for:
- Sidecar patterns (logging, monitoring agents)
- Containers that need to communicate over localhost

## Docker Compose Port Mapping

```yaml
version: '3.8'

services:
  web:
    image: nginx
    ports:
      # Short syntax
      - "8080:80"
      - "443:443"

  api:
    image: my-api
    ports:
      # Long syntax with more options
      - target: 3000        # Container port
        published: 3000     # Host port
        protocol: tcp
        mode: host          # or 'ingress' for swarm

  internal-service:
    image: my-service
    # No ports published - only accessible within Docker network
```

### Expose vs Ports

```yaml
services:
  database:
    image: postgres
    # EXPOSE documents the port but doesn't publish it
    expose:
      - "5432"

  web:
    image: my-web
    # ports actually publishes to the host
    ports:
      - "80:80"
```

`expose` is documentation only. It doesn't publish ports but indicates which ports the container listens on.

## Custom Bridge Networks

Create user-defined networks for better isolation and built-in DNS.

```bash
# Create a network
docker network create my-network

# Run containers on that network
docker run -d --network my-network --name api my-api
docker run -d --network my-network --name web -p 80:80 nginx

# Containers can reach each other by name
# From web: curl http://api:3000
```

### Docker Compose Networks

```yaml
version: '3.8'

services:
  web:
    image: nginx
    ports:
      - "80:80"
    networks:
      - frontend

  api:
    image: my-api
    networks:
      - frontend
      - backend

  database:
    image: postgres
    networks:
      - backend

networks:
  frontend:
  backend:
```

The database is only accessible from the api service, not from web.

## Checking Port Mappings

```bash
# List port mappings for a container
docker port my-container

# Output:
# 80/tcp -> 0.0.0.0:8080
# 443/tcp -> 0.0.0.0:8443

# Check which container is using a port
docker ps --filter "publish=8080"

# Inspect network settings
docker inspect --format='{{json .NetworkSettings.Ports}}' my-container
```

## Troubleshooting Port Issues

### Port Already in Use

```bash
$ docker run -p 80:80 nginx
Error: Bind for 0.0.0.0:80 failed: port is already allocated

# Find what's using the port
sudo lsof -i :80
# or
sudo netstat -tlnp | grep :80

# Solutions:
# 1. Use a different host port
docker run -p 8080:80 nginx

# 2. Stop the conflicting service
sudo systemctl stop apache2

# 3. Bind to a different interface
docker run -p 127.0.0.1:80:80 nginx
```

### Container Port Not Reachable

```bash
# Check if container is running and healthy
docker ps

# Check if port is published
docker port my-container

# Check if service is listening inside container
docker exec my-container netstat -tlnp
# or
docker exec my-container ss -tlnp

# Check firewall rules
sudo iptables -L -n | grep 8080
```

### Connection Refused

1. **Service not started**: Check container logs
2. **Binding to wrong interface**: Service might bind to 127.0.0.1 inside container
3. **Wrong port**: Verify the container's actual listening port

```bash
# Fix: Make service bind to 0.0.0.0 inside container
# Many apps need explicit configuration:
# Node.js: app.listen(3000, '0.0.0.0')
# Python Flask: app.run(host='0.0.0.0')
# Rails: rails server -b 0.0.0.0
```

## Security Best Practices

### Bind to Specific Interfaces

```bash
# BAD: Exposes to all network interfaces
docker run -p 3306:3306 mysql

# GOOD: Only accessible from localhost
docker run -p 127.0.0.1:3306:3306 mysql
```

### Use Internal Networks for Databases

```yaml
version: '3.8'

services:
  web:
    image: my-web
    ports:
      - "80:80"
    networks:
      - public
      - private

  database:
    image: postgres
    # No ports published
    networks:
      - private

networks:
  public:
  private:
    internal: true  # No external access possible
```

### Don't Expose Unnecessary Ports

Only publish ports that need to be accessed from outside the Docker network. Use Docker's internal DNS for service-to-service communication.

## Summary

| Scenario | Solution |
|----------|----------|
| Expose web app to internet | `-p 80:80` on bridge network |
| Internal service communication | Use Docker network, no port publishing |
| Maximum performance | `--network host` (Linux only) |
| Sidecar container | `--network container:<name>` |
| Database access from host only | `-p 127.0.0.1:5432:5432` |
| Multiple services, isolated networks | Docker Compose with multiple networks |

Port mapping seems simple but has many nuances. Start with the default bridge network and explicit port publishing, use custom networks for isolation, and only reach for host networking when you have specific performance requirements.
