# How to Configure Container Port Mappings in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Networking, DevOps

Description: Learn how to configure port mappings for Docker containers in Portainer, including TCP/UDP ports, host binding, and common networking patterns.

## Introduction

Port mappings are how Docker containers expose services to the outside world. Without a port mapping, a service running inside a container is generally inaccessible from outside the Docker host. Portainer provides a clean interface for configuring port bindings during container creation or when re-creating a container.

## Prerequisites

- Portainer installed with a connected Docker environment
- Basic understanding of networking (ports, TCP/UDP)

## Understanding Port Mappings

A Docker port mapping connects a port on the Docker host to a port inside the container:

```text
Host IP:Host Port → Container Port/Protocol

# Examples:

0.0.0.0:8080 → 80/tcp   (bind all interfaces, host 8080 to container 80)
127.0.0.1:5432 → 5432/tcp  (bind only localhost, useful for DBs)
0.0.0.0:53 → 53/udp    (UDP port for DNS services)
```

## Step 1: Open the Container Creation Form

1. Log in to Portainer.
2. Select your Docker environment.
3. Navigate to **Containers > Add container**.

## Step 2: Configure Port Mappings in the Network Ports Section

In the container creation form, find the **Network ports** configuration section:

1. Click **+ publish a new network port**.
2. Fill in the fields:

| Field | Description | Example |
|-------|-------------|---------|
| Host Port | Port on the Docker host | `8080` |
| Container Port | Port inside the container | `80` |
| Protocol | TCP or UDP | `TCP` |
| Host IP (optional) | Bind to specific host IP | `127.0.0.1` |

## Step 3: Common Port Mapping Patterns

### Web Application (HTTP/HTTPS)

```text
Host Port: 80    → Container Port: 80    Protocol: TCP
Host Port: 443   → Container Port: 443   Protocol: TCP
```

### Database (Local Access Only)

```text
# Bind to localhost only - prevents external access
Host IP:   127.0.0.1
Host Port: 5432
Container Port: 5432
Protocol: TCP
```

### Random Host Port

In Portainer, use the **Publish all exposed network ports to random host ports** option to have Docker assign available random host ports for the image's exposed ports:

```text
Publish all exposed network ports to random host ports: enabled
```

This is useful in development when multiple containers serve on the same port.

### Multiple Ports

```yaml
# Equivalent docker-compose.yml:
ports:
  - "80:80"      # HTTP
  - "443:443"    # HTTPS
  - "8080:8080"  # Admin API
  - "9090:9090"  # Metrics endpoint
```

### UDP Services

For DNS, RADIUS, or custom UDP services:

```text
Host Port: 53
Container Port: 53
Protocol: UDP
```

## Step 4: Verify Port Mappings After Creation

After creating the container:

1. Navigate to **Containers**.
2. Find your container - port mappings are shown in the **Ports** column.
3. Click on the container name for full details.
4. Under the **Ports** section, you'll see: `0.0.0.0:8080 → 80/tcp`.

```bash
# Equivalent Docker CLI command to verify:
docker port my-container

# Output:
80/tcp -> 0.0.0.0:8080
443/tcp -> 0.0.0.0:8443
```

## Changing Port Mappings on a Running Container

Docker does not allow changing port mappings on a running container without re-creating it. In Portainer:

1. Navigate to the container details page.
2. Click **Duplicate/Edit**.
3. Update the port mappings.
4. Click **Deploy the container** (this creates a new container with updated ports).
5. Remove the old container.

## Security Considerations

```text
# Bad: Exposing a database to all interfaces
Host Port: 3306 (binds to 0.0.0.0 - accessible from anywhere)

# Better: Bind database to localhost only
Host IP:   127.0.0.1
Host Port: 3306

# Best: Use Docker networks instead of host ports for inter-container communication
# No port mapping needed - containers communicate via Docker network DNS
```

For internal services that only need to talk to other containers (same host), avoid host port mappings entirely. Use user-defined Docker networks and container names for communication.

## Port Mapping Across Different Network Modes

| Network Mode | Port Mapping | Notes |
|--------------|-------------|-------|
| `bridge` | Supported | Default mode, port mapping works as described |
| `host` | Not needed | Container shares host network - use container port directly |
| `none` | Not supported | No network connectivity |
| `overlay` | Service ports | Used in Docker Swarm |

For `host` network mode (set in the **Network** section of Portainer):

```yaml
# In host network mode, no port mapping is configured
# The container directly uses the host's network stack
network_mode: host
# Container port 80 is accessible as host port 80
```

## Troubleshooting Port Mapping Issues

- **Port already in use**: Another process or container is using that host port. Use `ss -ltnp | grep :8080` for TCP ports or `ss -lunp | grep :53` for UDP ports to find the conflicting process.
- **Connection refused**: The container might not be listening on that port, or a firewall is blocking it.
- **Binding to 127.0.0.1 but need external access**: Change the host IP to `0.0.0.0` or leave it blank.

## Conclusion

Port mappings in Portainer are straightforward to configure through the web UI. Understanding the relationship between host ports and container ports - and when to use localhost binding versus all-interface binding - is essential for both security and accessibility. For most production deployments, combine selective port mappings with Docker networks to minimize attack surface while maintaining connectivity.
