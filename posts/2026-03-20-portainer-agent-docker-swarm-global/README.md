# How to Install Portainer Agent on Docker Swarm as a Global Service - Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Docker Swarm, Global Service, Cluster Management

Description: Deploy the Portainer Agent as a global Swarm service to automatically install it on every node in the cluster.

## Introduction

In Docker Swarm, a global service runs one replica on every node automatically, including nodes added later. Deploying the Portainer Agent as a global service ensures every Swarm node has an agent, giving Portainer full visibility and management across the cluster.

## Deploy Agent as Global Service

```bash
docker network create --driver overlay portainer_agent_network

docker service create \
  --name portainer_agent \
  --network portainer_agent_network \
  -e AGENT_CLUSTER_ADDR=tasks.portainer_agent \
  --mode global \
  --constraint 'node.platform.os == linux' \
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
  --mount type=bind,src=/var/lib/docker/volumes,dst=/var/lib/docker/volumes \
  --publish published=9001,target=9001,protocol=tcp,mode=ingress \
  portainer/agent:latest
```

## Deploy via Stack File

```yaml
# portainer-agent-stack.yml

version: "3.8"

services:
  agent:
    image: portainer/agent:latest
    environment:
      AGENT_CLUSTER_ADDR: tasks.agent
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - portainer_net
    ports:
      - target: 9001
        published: 9001
        protocol: tcp
        mode: ingress
    deploy:
      mode: global
      placement:
        constraints:
          - node.platform.os == linux
      restart_policy:
        condition: on-failure

networks:
  portainer_net:
    driver: overlay
    attachable: true
```

```bash
# Deploy the agent stack
docker stack deploy -c portainer-agent-stack.yml portainer-agent

# Verify deployment
docker service ls
docker service ps portainer-agent_agent
```

## Adding the Swarm to Portainer

In the Portainer UI:
1. **Environments** → **Add environment**
2. Select **Docker Swarm**
3. Connection: **Agent**
4. Environment address: `SWARM_MANAGER_IP:9001`
5. Click **Connect**

Or via API:
```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  -F 'Name=Production Swarm' \
  -F 'EndpointCreationType=2' \
  -F 'URL=tcp://swarm-manager.example.com:9001' \
  -F 'TLS=true' \
  -F 'TLSSkipVerify=true' \
  -F 'TLSSkipClientVerify=true'
```

## AGENT_CLUSTER_ADDR Explained

The `AGENT_CLUSTER_ADDR` environment variable tells each agent how to discover other agents in the cluster. Using `tasks.agent` (the Swarm DNS for the service) allows agents to form a cluster:

```yaml
environment:
  AGENT_CLUSTER_ADDR: tasks.agent  # DNS resolves to all agent task IPs
```

Portainer then connects to any one agent and gets visibility across all nodes.

## Checking Agent Status on Each Node

```bash
# List all agent tasks and their node assignment
docker service ps portainer-agent_agent --no-trunc

# Check service logs for warnings or errors
docker service logs portainer-agent_agent 2>&1 | grep -i "error\|warn" | head -20
```

## Conclusion

Deploying the Portainer Agent as a global Swarm service ensures complete cluster coverage automatically. Every node that joins the Swarm gets an agent, and Portainer maintains visibility across the entire cluster without manual agent installation on new nodes.
