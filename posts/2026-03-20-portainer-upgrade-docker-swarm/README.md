# How to Upgrade Portainer CE on Docker Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Upgrade, Docker-swarm, Update

Description: A guide to upgrading Portainer CE deployed on Docker Swarm, covering service updates and maintaining Portainer agent connectivity.

## Overview

Upgrading Portainer CE on Docker Swarm involves updating the Portainer service image. The upgrade process leverages Docker Swarm's rolling update capability while ensuring the Portainer data volume is preserved. This guide covers the complete upgrade process for Swarm deployments.

## Portainer Swarm Architecture

In a Docker Swarm deployment, Portainer typically runs as:
- **Portainer Server**: A service constrained to manager nodes
- **Portainer Agent**: A global service on all nodes

## Step 1: Backup Portainer Data

```bash
# On a swarm manager node

# List the Portainer services and note the actual service names.
# With the default stack deploy these are:
# - Portainer Server: portainer_portainer
# - Portainer Agent: portainer_agent
# - Portainer data volume: portainer_portainer_data
docker service ls | grep portainer

PORTAINER_SERVICE=portainer_portainer
AGENT_SERVICE=portainer_agent
PORTAINER_VOLUME=portainer_portainer_data

# Find which node is running Portainer
docker service ps --filter desired-state=running $PORTAINER_SERVICE

# SSH to that node and backup
docker run --rm \
  -v $PORTAINER_VOLUME:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/portainer-swarm-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## Step 2: Pull the New Images on the Manager Node

```bash
# Pull the matching Portainer Server and Agent images
docker pull portainer/portainer-ce:lts
docker pull portainer/agent:lts
```

## Step 3: Update the Portainer Service

```bash
# Update the Portainer service to the latest LTS image
docker service update \
  --image portainer/portainer-ce:lts \
  --force \
  --update-parallelism 1 \
  --update-delay 30s \
  $PORTAINER_SERVICE

# Monitor the update
docker service ps $PORTAINER_SERVICE
```

## Step 4: Update Portainer Agent

```bash
# Update the Portainer agent on all nodes
docker service update \
  --image portainer/agent:lts \
  --force \
  $AGENT_SERVICE

# Monitor agent updates across all nodes
docker service ps $AGENT_SERVICE
```

## Step 5: Verify Upgrade

```bash
# Check service status
docker service ls | grep portainer

# Check all tasks are running
docker service ps --filter desired-state=running $PORTAINER_SERVICE
docker service ps --filter desired-state=running $AGENT_SERVICE

# Check logs
docker service logs $PORTAINER_SERVICE --tail 50
```

## Using Docker Stack for Managed Upgrades

If using `docker stack deploy`:

```yaml
# portainer-stack.yml
version: '3.8'

services:
  agent:
    image: portainer/agent:lts
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - agent-network
    deploy:
      mode: global
      placement:
        constraints: [node.platform.os == linux]

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
      - agent-network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints: [node.role == manager]

networks:
  agent-network:
    driver: overlay
    attachable: true

volumes:
  portainer_data:
```

```bash
# Re-deploy the stack to update
docker stack deploy -c portainer-stack.yml portainer
```

## Conclusion

Upgrading Portainer on Docker Swarm is handled through Docker's service update mechanism, which provides controlled, rolling updates. Always backup the data volume before upgrading, update both the Portainer server service and the agent service, and verify the upgrade by checking service status and the Portainer UI. The Swarm service update approach is the recommended method for production Swarm environments.
