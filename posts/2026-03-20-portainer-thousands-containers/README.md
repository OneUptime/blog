# How to Configure Portainer for Thousands of Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Large Scale, Performance, Enterprise, Architecture

Description: Design a Portainer architecture that scales to thousands of containers across multiple hosts using agents, increased snapshot intervals, and database optimization.

## Introduction

Managing thousands of containers through a single Portainer instance requires architectural decisions beyond the default configuration. The key constraints are: Portainer's embedded BoltDB database throughput, snapshot polling frequency, and the CPU and memory available to the Portainer server. This guide covers designing a multi-tier Portainer architecture and tuning each component for environments with thousands of containers.

## Step 1: Multi-Tier Portainer Architecture

```text
Architecture for 1000+ containers:

[Portainer Server]
    |-- Long snapshot intervals (10m)
    |-- SSD-backed database
    |-- 4GB+ RAM allocation
    |
    |-- [Portainer Agent - Host 1]  (250 containers)
    |-- [Portainer Agent - Host 2]  (250 containers)
    |-- [Portainer Agent - Host 3]  (250 containers)
    |-- [Portainer Agent - Host 4]  (250 containers)
    |
    |-- [Swarm Manager - Cluster 1] (500 services)
    |-- [Swarm Manager - Cluster 2] (500 services)
```

## Step 2: Deploy Portainer Server with Large-Scale Settings

```yaml
# docker-compose.yml - Portainer for thousands of containers

version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    command:
      # Long snapshot interval reduces API load dramatically
      - "--snapshot-interval=10m"
      # Compact the BoltDB database on startup
      - "--compact-db"
    volumes:
      # SSD is critical - database I/O is the bottleneck
      - portainer_data:/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
    ports:
      - "9443:9443"
    deploy:
      resources:
        limits:
          cpus: "4.0"
          memory: 4G     # 4GB for large environments
        reservations:
          cpus: "1.0"
          memory: 1G

volumes:
  portainer_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/portainer/data   # Mount on SSD
```

## Step 3: Optimize Agent Deployment at Scale

```yaml
# On each Docker standalone host: deploy agent with optimized settings
version: "3.8"

services:
  portainer_agent:
    image: portainer/agent:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    ports:
      - "9001:9001"
    environment:
      # Reduce agent log verbosity
      - LOG_LEVEL=ERROR
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M   # Agent is lightweight
```

```bash
# Create the overlay network once on the Swarm manager
docker network create --driver overlay portainer_agent_network

# Deploy agent to all Swarm nodes at once
docker service create \
  --name portainer_agent \
  --mode global \
  --constraint "node.platform.os == linux" \
  --publish mode=host,target=9001,published=9001 \
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
  --mount type=bind,src=/var/lib/docker/volumes,dst=/var/lib/docker/volumes \
  --env AGENT_CLUSTER_ADDR=tasks.portainer_agent \
  --network portainer_agent_network \
  portainer/agent:latest
```

## Step 4: Database Optimization for Scale

```bash
# Portainer uses BoltDB (embedded key-value store)
# For thousands of containers, compact the DB during planned restarts

# Back up the Portainer data directory first
tar -C /opt/portainer -czf /opt/portainer/portainer-backup-$(date +%Y%m%d).tar.gz data

# Restart Portainer after enabling --compact-db in the server command
docker compose up -d --force-recreate portainer
```

## Step 5: Filtering at Scale

```bash
# Use Portainer's Docker API gateway with filtering to reduce response size
PORTAINER_URL="https://portainer.example.com"
TOKEN="your_token"

# Filter by label to find specific containers
curl -s \
  -H "X-API-Key: $TOKEN" \
  "$PORTAINER_URL/api/endpoints/1/docker/containers/json?filters=%7B%22label%22%3A%5B%22app%3Dmyservice%22%5D%7D" | \
  jq '.[].Names[]'

# Get only running containers (reduce payload size)
curl -s \
  -H "X-API-Key: $TOKEN" \
  "$PORTAINER_URL/api/endpoints/1/docker/containers/json?all=false" | \
  jq 'length'
```

## Step 6: Expose Portainer Behind a Reverse Proxy

Portainer does not support running multiple Portainer Server instances against the same set of clusters, so keep a single server instance and place Nginx in front of it if you need controlled public access.

```yaml
# Single Portainer Server behind Nginx
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    command:
      - "--snapshot-interval=10m"
      - "--trusted-origins=portainer.example.com"
    volumes:
      - portainer_data:/data
    expose:
      - "9000"
    networks:
      - portainer_net

  # Nginx reverse proxy for Portainer (SSL termination + health checks)
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "9443:443"
    networks:
      - portainer_net
    depends_on:
      - portainer

volumes:
  portainer_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /opt/portainer/data

networks:
  portainer_net:
    driver: bridge
```

## Conclusion

Scaling Portainer to thousands of containers requires a multi-host agent architecture, longer snapshot intervals (10-30 minutes), SSD-backed storage for the embedded database, and database compaction during planned restarts. The agent model distributes Docker API requests across hosts rather than centralizing everything through one Docker socket. With these optimizations, Portainer can remain responsive at larger scales. Monitor the BoltDB file size and Portainer memory usage weekly to catch growth trends before they cause performance issues.
