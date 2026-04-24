# How to Install Portainer on a Docker Swarm Cluster - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Installation, DevOps

Description: Learn how to deploy Portainer as a Swarm service on a Docker Swarm cluster for managing multi-node container deployments.

## Introduction

Installing Portainer on Docker Swarm is different from a standalone Docker installation. Portainer must run as a Swarm service on the manager node, and you also need to deploy the Portainer Agent on all nodes. This guide covers the complete installation and configuration process.

## Prerequisites

- A Docker Swarm cluster with at least one manager node
- A current Docker Engine installation on all nodes
- SSH access to the Swarm manager
- Ports 9443, 9000, and 8000 available on the manager node if you use the default Portainer stack file
- Port 9001 reachable between the manager and worker nodes

## Architecture

```text
Swarm Manager (Portainer + Agent)
        |
        ├── Worker Node 1 (Agent)
        ├── Worker Node 2 (Agent)
        └── Worker Node 3 (Agent)
```

Portainer runs on the manager, and the Portainer Agent runs on every node to collect metrics and manage containers.

## Step 1: Initialize the Swarm (if not already done)

```bash
# On the manager node

docker swarm init --advertise-addr <manager-ip>

# Save the join token output for worker nodes
# docker swarm join --token SWMTKN-1-... <manager-ip>:2377
```

## Step 2: Add Worker Nodes

```bash
# On each worker node
docker swarm join \
  --token SWMTKN-1-xxxxx-xxxxx \
  <manager-ip>:2377

# Back on a manager node, verify all nodes are joined
docker node ls
```

## Step 3: Create the Portainer Agent Stack

Create the agent deployment file:

```bash
# Download the Portainer agent stack file
curl -L https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml -o portainer-agent-stack.yml
```

Or create it manually:

```yaml
# portainer-agent-stack.yml
version: "3.2"

services:
  agent:
    image: portainer/agent:lts
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - agent_network
    deploy:
      mode: global          # Run on EVERY node in the swarm
      placement:
        constraints:
          - node.platform.os == linux

  portainer:
    image: portainer/portainer-ce:lts
    command: -H tcp://tasks.agent:9001 --tlsskipverify
    ports:
      - "9443:9443"
      - "9000:9000"
      - "8000:8000"
    volumes:
      - portainer_data:/data
    networks:
      - agent_network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager   # Run only on manager

networks:
  agent_network:
    driver: overlay
    attachable: true

volumes:
  portainer_data:
```

## Step 4: Deploy the Portainer Stack

```bash
# Deploy from the manager node
docker stack deploy -c portainer-agent-stack.yml portainer

# Verify services are running
docker stack services portainer
```

Expected output:

```text
ID             NAME                MODE       REPLICAS   IMAGE
abc123         portainer_agent     global     3/3        portainer/agent:lts
def456         portainer_portainer replicated 1/1        portainer/portainer-ce:lts
```

## Step 5: Access Portainer

1. Open `https://<manager-ip>:9443` in your browser
2. Create the initial admin user
3. Portainer auto-detects the Swarm environment

## Step 6: Configure Portainer for Swarm

After first login:

1. Go to **Environments**
2. The Swarm environment should already be registered
3. Click on the environment to configure it further

## Step 7: Verify Swarm Visibility

Navigate to the Swarm environment and check:

- **Dashboard** - Shows all Swarm services and node count
- **Swarm → Nodes** - Lists all manager and worker nodes
- **Services** - Shows all Swarm services across nodes

## Upgrading Portainer on Swarm

```bash
# Keep the Portainer Server and Agent on matching LTS versions
docker pull portainer/portainer-ce:lts
docker service update \
  --image portainer/portainer-ce:lts \
  --force \
  portainer_portainer

docker pull portainer/agent:lts
docker service update \
  --image portainer/agent:lts \
  --force \
  portainer_agent

# Or refresh the stack file and redeploy the entire stack
curl -L https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml -o portainer-agent-stack.yml
docker stack deploy -c portainer-agent-stack.yml portainer
```

## Persistent Storage for Portainer Data

Portainer stores its database in the `portainer_data` volume. Since Portainer runs on a manager node, this volume is stored on whichever manager hosts the Portainer service. On swarms with multiple manager nodes, pin the Portainer service to the manager that owns the volume or use shared storage. For high availability, consider using a shared storage solution:

```yaml
volumes:
  portainer_data:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server.company.com,rw
      device: ":/portainer-data"
```

## Troubleshooting

```bash
# Check Portainer service logs
docker service logs portainer_portainer

# Check agent service logs across the swarm
docker service logs portainer_agent

# Verify agent is running on all nodes
docker service ps portainer_agent

# Restart the Portainer service
docker service update --force portainer_portainer
```

## Conclusion

Installing Portainer on Docker Swarm provides centralized management for your entire multi-node cluster. The global agent deployment ensures Portainer can manage containers on every node, while the single Portainer server instance provides a consistent management interface. With Swarm-aware Portainer, you gain visibility into service placement, node health, and cluster-wide resource utilization.
