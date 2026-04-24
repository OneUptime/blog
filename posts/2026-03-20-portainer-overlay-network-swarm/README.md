# How to Create an Overlay Network in Portainer for Swarm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Swarm, DevOps

Description: Learn how to create and use overlay networks in Portainer for Docker Swarm deployments that span multiple hosts.

## Introduction

Overlay networks enable containers running on different Docker Swarm nodes to communicate with each other as if they were on the same host. This is the foundation of multi-host container networking in Docker Swarm. Portainer provides an interface for creating and managing overlay networks across your Swarm cluster.

## Prerequisites

- Docker Swarm cluster initialized (at least one manager + worker nodes)
- Portainer connected to the Swarm manager
- Ports 4789 (UDP), 7946 (TCP/UDP), and 2377 (TCP) open between Swarm nodes
- If you plan to use encrypted overlay networks, allow IP protocol 50 (IPSec ESP) between Swarm nodes as well

## When to Use Overlay Networks

- **Multi-host services**: Service containers spread across multiple Swarm nodes.
- **Service-to-service communication**: Microservices need to find each other across nodes.
- **Distributed stacks**: Complete application stacks deployed across the Swarm.

## Step 1: Initialize Docker Swarm (If Not Done)

```bash
# On the manager node:

docker swarm init --advertise-addr 192.168.1.10

# Get the worker join token:
docker swarm join-token worker

# On worker nodes, run the join command:
docker swarm join \
  --token SWMTKN-1-xxxxx \
  192.168.1.10:2377
```

## Step 2: Create Overlay Network via Portainer

1. In Portainer, make sure you're managing a Docker Swarm environment.
2. Navigate to **Networks**.
3. Click **Add network**.
4. Configure:

```text
Name:    myapp-overlay
Driver:  overlay
```

5. Network configuration:

```text
Subnet:  10.0.1.0/24
Gateway: 10.0.1.1
```

6. Options:

```text
Enable manual container attachment: true   (allows standalone containers to attach to this network)
Driver option: encrypted=true              (encrypt overlay traffic)
```

7. Click **Create the network**.

## Step 3: Create Overlay Network via CLI

```bash
# Basic overlay network:
docker network create \
  --driver overlay \
  --subnet 10.0.1.0/24 \
  myapp-overlay

# Encrypted overlay (traffic between nodes is encrypted):
docker network create \
  --driver overlay \
  --subnet 10.0.2.0/24 \
  --opt encrypted=true \
  myapp-encrypted-overlay

# Attachable (allows standalone containers to use the network):
docker network create \
  --driver overlay \
  --attachable \
  --subnet 10.0.3.0/24 \
  myapp-attachable-overlay
```

## Step 4: Deploy Swarm Services on Overlay Network

```yaml
# docker-stack.yml (deployed as a Swarm stack)
version: "3.8"

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s

  api:
    image: myorg/api:latest
    networks:
      - frontend
      - backend
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.role==worker

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - backend
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.storage==ssd   # Place on SSD node

  redis:
    image: redis:7-alpine
    networks:
      - backend
    deploy:
      replicas: 1

networks:
  frontend:
    driver: overlay
  backend:
    driver: overlay
    driver_opts:
      encrypted: "true"   # Encrypt backend traffic

volumes:
  postgres_data:
```

Deploy via Portainer:
1. Navigate to **Stacks**.
2. Click **Add stack**.
3. Paste the compose content.
4. Click **Deploy the stack**.

## Step 5: Service Discovery with Overlay Networks

Services on the same overlay network can reach each other by service name:

```bash
# The API service can reach postgres by name:
# Connection string in API container:
DATABASE_URL=postgresql://user:pass@postgres:5432/mydb

# The web service can reach the API:
# In web container config:
API_URL=http://api:8080

# Docker Swarm's internal DNS resolves service names to virtual IPs (VIPs)
# The VIP load-balances across all service replicas automatically
```

## Step 6: Portainer Server and Agent on an Overlay Network

For Portainer-managed Swarm deployments:

```yaml
# Portainer manages this stack, deployed to Swarm
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:lts
    command: -H tcp://tasks.portainer-agent:9001 --tlsskipverify
    ports:
      - "9443:9443"
      - "9000:9000"
    volumes:
      - portainer_data:/data
    networks:
      - portainer-overlay
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role==manager

  portainer-agent:
    image: portainer/agent:lts
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - portainer-overlay
    deploy:
      mode: global   # Run on every Swarm node
      placement:
        constraints:
          - node.platform.os==linux

networks:
  portainer-overlay:
    driver: overlay
    attachable: true
```

## Step 7: Inspect Overlay Network

```bash
# Inspect the overlay network:
docker network inspect myapp-overlay

# Output shows:
# - All containers/services connected
# - IP addresses assigned per node
# - VXLAN settings

# Check the overlay peers participating in the network:
docker network inspect myapp-overlay | jq '.[0].Peers'
```

## Step 8: Firewall Requirements for Overlay Networks

Ensure these ports are open between Swarm nodes:

```bash
# Required ports for Docker Swarm overlay:
# TCP 2377 - cluster management and node join traffic
# TCP/UDP 7946 - node discovery
# UDP 4789 - overlay network traffic (VXLAN)
# IP protocol 50 (ESP) - required for encrypted overlay networks

# Linux iptables:
iptables -A INPUT -p tcp --dport 2377 -j ACCEPT
iptables -A INPUT -p tcp --dport 7946 -j ACCEPT
iptables -A INPUT -p udp --dport 7946 -j ACCEPT
iptables -A INPUT -p udp --dport 4789 -j ACCEPT

# Or with UFW:
ufw allow 2377/tcp
ufw allow 7946
ufw allow 4789/udp

# If you use --opt encrypted, also allow IP protocol 50 (IPSec ESP) between nodes.
```

## Conclusion

Overlay networks in Portainer Swarm deployments are the key to multi-host container networking. They provide automatic service discovery, load balancing across replicas, and optional encryption for inter-node traffic. Create overlay networks when deploying Swarm stacks that span multiple hosts, and leverage Docker Swarm's built-in DNS for zero-config service-to-service communication.
