# How to Set Up Multi-Host Networking with Portainer and Docker Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Overlay Network, Multi-Host, Networking, Clustering

Description: Configure overlay networks in a Docker Swarm cluster managed by Portainer to enable secure, encrypted container communication across multiple physical or virtual hosts.

---

Docker Swarm's overlay networks allow containers on different hosts to communicate as if they were on the same network. Portainer provides a UI for managing these overlay networks and the Swarm services that use them.

## Prerequisites

- A Docker Swarm cluster with at least 2 nodes
- Portainer (Community or Business Edition) with a Swarm environment configured
- Ports 2377 (TCP), 7946 (TCP/UDP), 4789 (UDP) open between Swarm nodes

## Step 1: Create an Overlay Network in Portainer

Navigate to **Networks > Add Network** in your Swarm environment:

```yaml
# Create via Portainer stack

version: "3.8"
networks:
  app-overlay:
    driver: overlay
    driver_opts:
      # Encrypt VXLAN traffic between nodes
      encrypted: "true"
    attachable: true    # Allow non-Swarm containers to join
    ipam:
      config:
        - subnet: "10.0.1.0/24"
```

## Step 2: Deploy a Multi-Host Stack

```yaml
# swarm-multi-host-stack.yml
version: "3.8"
services:
  frontend:
    image: nginx:1.25
    deploy:
      replicas: 3
      placement:
        constraints:
          - node.role == worker
    ports:
      - "80:80"
    networks:
      - app-overlay

  backend:
    image: myapi:1.2.3
    deploy:
      replicas: 5
      placement:
        constraints:
          - node.labels.tier == backend   # Place on nodes labeled "tier=backend"
    networks:
      - app-overlay

  database:
    image: postgres:16
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.storage == ssd    # Place on SSD storage nodes
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - app-overlay

networks:
  app-overlay:
    external: true    # Use the pre-created overlay network

volumes:
  db-data:
    driver: local
```

## Step 3: Add Node Labels

Use Portainer to add placement labels to Swarm nodes:

1. Go to **Swarm > Nodes**
2. Click on a node
3. Under **Labels**, add: `tier=backend`, `storage=ssd`

Or via command line:

```bash
docker node update --label-add tier=backend worker-node-01
docker node update --label-add storage=ssd worker-node-01
```

## Step 4: Service Discovery

Services on the same overlay network can reach each other by service name:

```bash
# From any container in app-overlay, these work:
curl http://backend:8080/api/health
pg_isready -h database

# Docker's internal DNS resolves service names to overlay VIPs
# Traffic is load-balanced across all healthy replicas
```

## Step 5: Inspect Overlay Traffic

Monitor overlay network traffic and connectivity:

```bash
# Check overlay network status
docker network inspect app-overlay

# Verify containers can reach each other across nodes
docker exec -it frontend_container ping backend_container_on_different_host
```

## Summary

Docker Swarm overlay networks with Portainer management enable transparent multi-host container networking. Encrypted overlays protect inter-node traffic, and Portainer's Swarm management UI provides visibility into which containers are running on which nodes and how they're connected.
