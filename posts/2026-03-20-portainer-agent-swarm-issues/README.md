# How to Fix Agent Communication Issues on Docker Swarm - Portainer Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Troubleshooting, Docker Swarm, Agent, Networking

Description: Troubleshoot and resolve Portainer Agent communication failures in Docker Swarm clusters, including overlay network issues, service placement constraints, and inter-node connectivity.

## Introduction

Running the Portainer Agent as a Docker Swarm service introduces additional complexity over standalone Docker deployments. Communication issues on Swarm often stem from overlay network configuration, node reachability, service placement, or port conflicts within the Swarm mesh routing.

## Step 1: Verify Swarm Cluster Health

```bash
# Check Swarm nodes

docker node ls

# Look for nodes in state "Down" or "Unreachable"
# All nodes should show "Ready" and "Active"

# Check node details
docker node inspect <node-id> --pretty
```

## Step 2: Deploy Portainer Agent as a Global Service

The Portainer Agent should run on **every** Swarm node as a global service. Create the overlay network in Step 3 first, then deploy the service:

```bash
docker service create \
  --name portainer-agent \
  --network portainer-agent-network \
  -e AGENT_CLUSTER_ADDR=tasks.portainer-agent \
  --mode global \
  --constraint 'node.platform.os == linux' \
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
  --mount type=bind,src=/var/lib/docker/volumes,dst=/var/lib/docker/volumes \
  --publish mode=host,target=9001,published=9001 \
  portainer/agent:latest
```

Key flags:
- `--mode global` - runs on every node
- `--publish mode=host` - publishes port `9001` on the node running the task, bypassing Swarm's routing mesh
- `AGENT_CLUSTER_ADDR` - optional on current Portainer Agent releases; if you set it manually, use the service DNS name

## Step 3: Create the Required Overlay Network

```bash
# Create an overlay network for Portainer agent communication
docker network create \
  --driver overlay \
  --attachable \
  portainer-agent-network

# Verify the network exists and inspect it from a manager node
docker network ls | grep portainer-agent
docker network inspect portainer-agent-network
```

## Step 4: Full Portainer + Agent Swarm Stack

```yaml
# portainer-swarm.yml
version: "3.8"

services:
  # Portainer server - runs on a manager node
  portainer:
    image: portainer/portainer-ce:latest
    command: -H tcp://tasks.portainer-agent:9001 --tlsskipverify
    ports:
      - "9443:9443"
      - "9000:9000"
      - "8000:8000"
    volumes:
      - portainer_data:/data
    networks:
      - portainer-agent-network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager

  # Portainer Agent - runs on every node
  portainer-agent:
    image: portainer/agent:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - portainer-agent-network
    environment:
      AGENT_CLUSTER_ADDR: tasks.portainer-agent
    deploy:
      mode: global
      placement:
        constraints:
          - node.platform.os == linux

networks:
  portainer-agent-network:
    driver: overlay
    attachable: true

volumes:
  portainer_data:
```

Deploy with:

```bash
docker stack deploy -c portainer-swarm.yml portainer
```

## Step 5: Diagnose Overlay Network Issues

```bash
# Check if the overlay network is healthy
docker network inspect portainer-agent-network

# Look at "Peers" section - should list all Swarm nodes
# If nodes are missing, they can't communicate

# Test name resolution and connectivity from a temporary container on the overlay network
docker run --rm --network portainer-agent-network busybox ping -c 3 tasks.portainer-agent
```

## Step 6: Fix Node Communication Issues

```bash
# Check required Swarm and Portainer ports are open
# Port 2377 - Swarm management (TCP, manager nodes)
# Port 7946 - Node communication (TCP/UDP, all Swarm nodes)
# Port 4789 - Overlay network traffic (UDP, all Swarm nodes)

# Allow these ports through the firewall as needed
sudo ufw allow 2377/tcp
sudo ufw allow 7946/tcp
sudo ufw allow 7946/udp
sudo ufw allow 4789/udp
sudo ufw allow 9001/tcp  # Portainer Agent
```

## Step 7: Check Service Logs Across All Nodes

```bash
# View logs for the agent service across all nodes
docker service logs portainer_portainer-agent

# View logs for a specific task on a specific node
docker service ps portainer_portainer-agent
docker service logs <task-id>

# Follow logs in real time
docker service logs -f portainer_portainer-agent
```

## Step 8: Fix AGENT_CLUSTER_ADDR Issues

The `AGENT_CLUSTER_ADDR` variable can be used to tell each agent where to find its peers. On current Portainer Agent releases running in Swarm mode, it is optional because the agent can infer the service DNS name automatically when it is unset:

```bash
# Wrong: using a fixed IP (breaks when containers restart)
# AGENT_CLUSTER_ADDR=192.168.1.100:9001

# Correct: using the service's DNS name in Swarm
# AGENT_CLUSTER_ADDR=tasks.portainer-agent

# If you need to correct a wrong value, update the service:
docker service update \
  --env-add AGENT_CLUSTER_ADDR=tasks.portainer-agent \
  portainer_portainer-agent
```

## Step 9: Verify Agent Cluster Formation

```bash
# Check the agent service has one Running task per eligible node
docker service ps portainer_portainer-agent

# Review recent logs for DNS or cluster startup errors
docker service logs --tail 50 portainer_portainer-agent

# Repeated "unable to retrieve a list of IP associated to the host",
# "unable to create cluster", or task restarts indicate discovery problems
```

## Step 10: Force Restart Agent Service

```bash
# Force restart the agent service to re-initialize cluster discovery
docker service update --force portainer_portainer-agent

# Check service tasks
docker service ps portainer_portainer-agent
```

## Conclusion

Agent communication issues on Docker Swarm usually come down to overlay network problems, missing inter-node port access, or service placement issues. If you expose the agent on port `9001`, publishing it with `mode=host` avoids Swarm's routing mesh. On current Portainer Agent releases, `AGENT_CLUSTER_ADDR` is optional on Swarm, but if you set it manually it should match the Swarm service DNS name.
