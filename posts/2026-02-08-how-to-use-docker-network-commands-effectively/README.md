# How to Use docker network Commands Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Networking, Containers, Bridge Network, Overlay Network, DevOps

Description: Master Docker network commands to create, inspect, connect, and troubleshoot container networks for reliable service communication.

---

Networking is one of the most important aspects of running containers in production. Docker ships with a flexible networking subsystem that lets you isolate containers, connect services across hosts, and control traffic flow. The `docker network` command family gives you full control over this subsystem.

This guide covers every `docker network` subcommand with real examples that you can run immediately.

## Understanding Docker Network Drivers

Before diving into commands, it helps to understand the network drivers Docker provides.

- **bridge** - The default driver. Containers on the same bridge network can talk to each other by name. Best for single-host deployments.
- **host** - Removes network isolation. The container shares the host's network stack. Useful when you need raw performance and do not need isolation.
- **overlay** - Spans multiple Docker hosts. Required for Docker Swarm services that need cross-host communication.
- **macvlan** - Assigns a MAC address to each container, making it appear as a physical device on your network. Useful for legacy applications.
- **none** - Disables networking entirely. Useful for batch processing containers that need no network access.

## Listing Networks

Start by seeing what networks already exist on your Docker host.

List all Docker networks on the current host:

```bash
docker network ls
```

Typical output on a fresh installation:

```
NETWORK ID     NAME      DRIVER    SCOPE
a1b2c3d4e5f6   bridge    bridge    local
f6e5d4c3b2a1   host      host      local
1a2b3c4d5e6f   none      null      local
```

Filter networks by driver type:

```bash
docker network ls --filter driver=bridge
```

Format the output for scripting:

```bash
docker network ls --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}"
```

## Creating Networks

Creating custom networks is a best practice. The default bridge network does not support automatic DNS resolution between containers. Custom bridge networks do.

Create a custom bridge network for your application containers:

```bash
docker network create my-app-network
```

Create a network with specific subnet and gateway configuration:

```bash
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --gateway 172.20.0.1 \
  --ip-range 172.20.240.0/20 \
  my-custom-network
```

Create an overlay network for Swarm services that spans multiple hosts:

```bash
docker network create \
  --driver overlay \
  --attachable \
  --subnet 10.0.9.0/24 \
  my-overlay-network
```

The `--attachable` flag lets standalone containers (not just Swarm services) connect to the overlay network. This is useful during development and debugging.

Create a network with custom options like MTU settings:

```bash
docker network create \
  --driver bridge \
  --opt com.docker.network.driver.mtu=9000 \
  jumbo-network
```

### Internal Networks

If you want containers to communicate with each other but not reach the outside internet, create an internal network:

```bash
docker network create --internal isolated-network
```

This is excellent for database containers that should only be reachable from your application containers, not from the public internet.

## Inspecting Networks

The `inspect` command reveals full details about a network, including connected containers and configuration.

Inspect a network to see its configuration and connected containers:

```bash
docker network inspect my-app-network
```

Extract specific fields with Go template formatting:

```bash
# Get the subnet of a network
docker network inspect --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' my-app-network
```

List all containers connected to a specific network:

```bash
docker network inspect --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{end}}' my-app-network
```

## Connecting and Disconnecting Containers

You can attach running containers to networks and detach them without restarting. This makes it possible to change network topology on the fly.

Connect a running container to an additional network:

```bash
docker network connect my-app-network my-container
```

Connect with a specific IP address:

```bash
docker network connect --ip 172.20.0.50 my-custom-network my-container
```

Add network aliases so other containers can reach this one by multiple names:

```bash
docker network connect --alias db --alias database my-app-network postgres-container
```

Disconnect a container from a network:

```bash
docker network disconnect my-app-network my-container
```

Force disconnect even if the container has active connections:

```bash
docker network disconnect --force my-app-network my-container
```

A container can be connected to multiple networks simultaneously. This is a common pattern for proxy containers that bridge a frontend network and a backend network.

## Running Containers on Specific Networks

When you start a new container, specify which network it should join:

```bash
docker run -d \
  --name web-server \
  --network my-app-network \
  nginx:latest
```

Run a container on multiple networks using connect after creation:

```bash
# Start on the frontend network
docker run -d \
  --name api-gateway \
  --network frontend \
  nginx:latest

# Also connect to the backend network
docker network connect backend api-gateway
```

## Practical Example: Multi-Tier Application

Here is a realistic setup with separate networks for frontend and backend tiers.

Create isolated frontend and backend networks, then deploy services with proper network segmentation:

```bash
# Create two separate networks
docker network create frontend
docker network create --internal backend

# Start the database on the backend network only
docker run -d \
  --name postgres \
  --network backend \
  -e POSTGRES_PASSWORD=secretpass \
  postgres:16

# Start the API server connected to both networks
docker run -d \
  --name api \
  --network backend \
  -e DATABASE_URL=postgresql://postgres:secretpass@postgres:5432/app \
  my-api-image:latest

# Connect the API to the frontend network too
docker network connect frontend api

# Start nginx on the frontend network only
docker run -d \
  --name nginx \
  --network frontend \
  -p 80:80 \
  nginx:latest
```

In this setup, nginx can reach the API, the API can reach postgres, but nginx cannot directly reach postgres. That is proper network segmentation.

## Troubleshooting Network Issues

When containers cannot communicate, use these debugging techniques.

Verify two containers share a network by inspecting the network:

```bash
docker network inspect frontend --format '{{range .Containers}}{{.Name}} {{end}}'
```

Test DNS resolution between containers using a temporary container:

```bash
docker run --rm --network my-app-network busybox nslookup api
```

Test connectivity with ping:

```bash
docker run --rm --network my-app-network busybox ping -c 3 api
```

Check a container's network settings:

```bash
docker inspect --format '{{json .NetworkSettings.Networks}}' my-container | jq .
```

## Cleaning Up Networks

Remove a specific unused network:

```bash
docker network rm my-app-network
```

Remove all unused networks at once (networks not connected to any container):

```bash
docker network prune
```

Skip the confirmation prompt:

```bash
docker network prune --force
```

Remove unused networks older than 24 hours:

```bash
docker network prune --filter "until=24h"
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker network ls` | List all networks |
| `docker network create` | Create a new network |
| `docker network inspect` | Show detailed network info |
| `docker network connect` | Attach a container to a network |
| `docker network disconnect` | Detach a container from a network |
| `docker network rm` | Remove a network |
| `docker network prune` | Remove all unused networks |

## Conclusion

Docker networking commands give you precise control over how containers communicate. The key takeaway is to always use custom networks instead of the default bridge. Custom bridge networks provide DNS resolution, better isolation, and cleaner network architecture. For multi-host deployments, overlay networks extend this across your Swarm cluster. Start with simple bridge networks, practice connecting and disconnecting containers, and you will be ready to design production-grade network topologies.
