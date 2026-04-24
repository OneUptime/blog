# How to Set Up Overlay Networks for Swarm Services in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Networking, Overlay Network, DevOps

Description: Learn how to create and configure overlay networks for Docker Swarm services using Portainer for secure inter-service communication.

## Introduction

Overlay networks are the backbone of Docker Swarm communication, enabling containers running on different nodes to communicate as if they are on the same network. Portainer provides tools for creating, configuring, and attaching overlay networks to services. This guide covers overlay network setup and management in a Swarm environment.

## Prerequisites

- Portainer on Docker Swarm
- Multi-node Swarm cluster
- Admin access to Portainer

## How Overlay Networks Work

Overlay networks use VXLAN tunneling to create a virtual layer-2 network that spans all Swarm nodes. When a service joins an overlay network:

1. Each task (container) gets an IP on the overlay subnet
2. Swarm services on the same overlay network can reach each other by service name, and standalone containers on attachable overlay networks can use container names
3. The Swarm DNS resolver automatically handles service name resolution
4. Swarm management traffic is encrypted by default, but overlay application data is only encrypted when you enable it

## Step 1: Create an Overlay Network in Portainer

1. Select your Swarm environment
2. Click **Networks** in the sidebar
3. Click **+ Add network**
4. Configure the network:

```text
Name:                               my-overlay-net
Driver:                             overlay
Enable manual container attachment: true (or false for Swarm-only)
```

### Advanced Options

```text
Subnet:         10.10.1.0/24
Gateway:        10.10.1.1
```

5. Click **Create the network**

## Step 2: Create an Overlay Network via CLI

```bash
# Basic overlay network

docker network create \
  --driver overlay \
  --attachable \
  my-overlay-net

# With custom IPAM configuration
docker network create \
  --driver overlay \
  --subnet 10.10.1.0/24 \
  --gateway 10.10.1.1 \
  --opt encrypted=true \
  --attachable \
  my-encrypted-overlay

# Internal network (no external connectivity)
docker network create \
  --driver overlay \
  --internal \
  db-internal-net
```

## Step 3: Network Types for Different Use Cases

### Public-Facing Network

```yaml
networks:
  public-net:
    driver: overlay
    attachable: true    # Allow standalone containers to join
```

For services that need to communicate with reverse proxies or standalone containers that join the overlay network.

### Internal Service Network

```yaml
networks:
  app-net:
    driver: overlay
    attachable: false   # Swarm services only
```

For communication between application tiers (frontend → API).

### Database Network

```yaml
networks:
  db-net:
    driver: overlay
    internal: true      # No internet access
    attachable: false
```

Database servers should only be reachable from application services, not from outside.

## Step 4: Attach Services to Overlay Networks

In the Portainer service editor, under **Networks**:

```text
Selected networks:
  [x] my-overlay-net
  [x] another-overlay-net
```

In a Compose file:

```yaml
version: "3.8"

services:
  frontend:
    image: nginx:alpine
    networks:
      - public-net       # Public-facing
      - app-net          # Can reach API

  api:
    image: myapi:latest
    networks:
      - app-net          # Reachable from frontend
      - db-net           # Can reach database

  database:
    image: postgres:15
    networks:
      - db-net           # Only reachable from API

networks:
  public-net:
    driver: overlay
    attachable: true
  app-net:
    driver: overlay
    internal: false
  db-net:
    driver: overlay
    internal: true      # Extra security: no external connectivity
```

## Step 5: DNS Resolution in Overlay Networks

Docker Swarm's built-in DNS resolver enables service discovery:

```bash
# Query the embedded DNS server from a container on the same network
nslookup database
nslookup frontend

# By default, Swarm uses a Virtual IP (VIP) for service discovery
# and load-balances across all replicas behind that VIP
```

## Step 6: Overlay Network Encryption

Enable encryption for sensitive traffic:

```yaml
networks:
  secure-net:
    driver: overlay
    driver_opts:
      encrypted: "true"    # Encrypt overlay application data with IPsec over VXLAN
```

**Note:** Encryption adds a non-negligible performance penalty. Test before using it in production.

```bash
# Create encrypted overlay from CLI
docker network create \
  --driver overlay \
  --opt encrypted \
  secure-overlay-net
```

## Step 7: Troubleshoot Overlay Network Issues

### Service Cannot Reach Another Service

```bash
# Verify services are on the same overlay network
docker service inspect service-a --format '{{.Spec.TaskTemplate.Networks}}'
docker service inspect service-b --format '{{.Spec.TaskTemplate.Networks}}'

# On a node where an api task is running, identify the container ID
docker ps --filter name=api

# Check DNS resolution from inside a task container
docker exec -it <api-container-id> nslookup database
```

### MTU Issues

In some environments, overlay networks need custom MTU settings:

```yaml
networks:
  app-net:
    driver: overlay
    driver_opts:
      com.docker.network.driver.mtu: "1400"    # Reduce for cloud environments
```

### Overlay Network Not Accessible on Worker Node

Swarm nodes must have connectivity on these ports:

```bash
# Ensure these ports are open between all Swarm nodes:
# TCP 2377 - Swarm management
# TCP 7946 - Node communication
# UDP 7946 - Node communication
# UDP 4789 - VXLAN overlay traffic
```

## Step 8: Remove an Overlay Network

```bash
# Remove from Portainer: Networks → select → Remove
# Or via CLI:
docker network rm my-overlay-net

# Cannot remove if services are still using it
# First, remove or update all services using the network
```

## Conclusion

Overlay networks are essential for secure, scalable communication between Swarm services. By creating separate networks for different traffic tiers - public, application, and database - you implement network segmentation that limits the blast radius of security incidents. Portainer makes it easy to create and manage these networks, while the Swarm DNS resolver handles service discovery automatically.
