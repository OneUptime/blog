# How to Add a Docker Swarm Environment to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Environment, Cluster Management

Description: Add a Docker Swarm cluster to Portainer for centralized management of services, stacks, and nodes across the entire Swarm.

## Introduction

Docker Swarm turns multiple Docker hosts into a cluster with orchestration, load balancing, and service management. Adding a Swarm environment to Portainer gives you a visual interface to manage services, update deployments, and monitor the cluster without the Docker CLI.

## Prerequisites

- Docker Swarm initialized (`docker swarm init` on the manager node)
- Portainer running (can be inside or outside the Swarm)
- Network access between Portainer and the Swarm manager (and port `9001` on the Swarm nodes if using the Portainer Agent)

## Option 1: Deploy Portainer Inside the Swarm (Recommended)

This is the recommended approach. Portainer runs as a Swarm service and connects to the Portainer Agent running on the Swarm nodes.

```yaml
# portainer-swarm-stack.yml

version: "3.8"

services:
  agent:
    image: portainer/agent:2.39.1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - portainer_net
    deploy:
      mode: global
      placement:
        constraints:
          - node.platform.os == linux

  portainer:
    image: portainer/portainer-ce:2.39.1
    command:
      - "-H"
      - "tcp://tasks.agent:9001"
      - "--tlsskipverify"
      - "--trusted-origins=https://portainer.example.com"
    ports:
      - "9443:9443"
      - "9000:9000"
    volumes:
      - portainer_data:/data
    networks:
      - portainer_net
    deploy:
      placement:
        constraints:
          - node.role == manager
      replicas: 1
      restart_policy:
        condition: on-failure

volumes:
  portainer_data:

networks:
  portainer_net:
    driver: overlay
    attachable: true
```

```bash
# Deploy Portainer to the Swarm
docker stack deploy -c portainer-swarm-stack.yml portainer

# Verify deployment
docker service ls
docker service ps portainer_portainer
```

When Portainer starts inside the Swarm, it creates the local environment automatically and detects that the environment is a Swarm cluster.

## Option 2: Connect to Swarm via Portainer Agent

For connecting an external Portainer to a Swarm, you can use the Portainer Agent:

```yaml
# portainer-agent-stack.yml
version: "3.8"

services:
  agent:
    image: portainer/agent:2.39.1
    ports:
      - target: 9001
        published: 9001
        protocol: tcp
        mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - portainer_net
    deploy:
      mode: global
      placement:
        constraints:
          - node.platform.os == linux

networks:
  portainer_net:
    driver: overlay
    attachable: true
```

```bash
# Deploy agent to all Swarm nodes
docker stack deploy -c portainer-agent-stack.yml portainer-agent

# Get agent service info
docker service ls | grep agent
```

## Option 3: Add Swarm via Portainer API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Add Swarm environment via agent
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  -F "Name=Production Swarm" \
  -F "EndpointCreationType=2" \
  -F "URL=swarm-manager.example.com:9001" \
  -F "TLS=true" \
  -F "TLSSkipVerify=true" \
  -F "TLSSkipClientVerify=true"
```

## Verifying Swarm Detection

After adding the environment:

1. Click on the Swarm environment in Portainer
2. You should see **Swarm** in the left sidebar (not Docker Standalone)
3. Navigate to **Swarm** → **Overview** to see all nodes
4. Nodes should show manager/worker roles and their status

```bash
# Via API - check environment type
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -c "
import sys, json
for env in json.load(sys.stdin):
    snapshot = env['Snapshots'][-1] if env.get('Snapshots') else {}
    # EndpointType 2 = Agent on Docker environment; Swarm=True confirms Swarm detection
    print(f'ID={env[\"Id\"]} Name={env[\"Name\"]} EndpointType={env[\"Type\"]} Swarm={snapshot.get(\"Swarm\")} Status={env[\"Status\"]}')
"
```

## Managing the Swarm from Portainer

Once the Swarm environment is added:

**Services**: Deploy and scale Docker Swarm services
```text
Swarm → Services → Add service
```

**Stacks**: Deploy multi-service applications as a stack
```text
Stacks → Add stack → (paste docker-compose.yml with version "3")
```

**Nodes**: View and manage Swarm nodes
```text
Swarm → Nodes → view manager/worker status
```

## Conclusion

Adding a Docker Swarm environment to Portainer unlocks cluster-level management through the visual UI. Deploy Portainer directly into the Swarm for the best integration, or use the Portainer Agent to connect an existing external Portainer to a Swarm cluster. The standard agent approach requires Portainer to reach the Swarm on port `9001`; if the Swarm is behind a firewall or in a different network, use the Edge Agent instead.
