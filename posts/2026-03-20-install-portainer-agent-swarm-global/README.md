# How to Install Portainer Agent on Docker Swarm as a Global Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Agent, Docker Swarm, Global Service, DevOps

Description: Deploy the Portainer Agent as a global Docker Swarm service to automatically install it on every Swarm node for comprehensive cluster management.

---

In Docker Swarm, deploying the agent as a global service ensures it runs on every node - including nodes added in the future. This is the standard deployment pattern for Swarm environments.

## Deploy Agent as Global Service

```bash
# Deploy Portainer Agent as a global service (runs on ALL nodes)

docker network create --driver overlay portainer_agent_network

docker service create \
  --name portainer_agent \
  --network portainer_agent_network \
  -p mode=host,target=9001,published=9001 \
  --mode global \
  --constraint 'node.platform.os == linux' \
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
  --mount type=bind,src=/var/lib/docker/volumes,dst=/var/lib/docker/volumes \
  portainer/agent:latest
```

## Deploy via Stack File

```yaml
# portainer-agent-stack.yml
version: "3.8"

services:
  agent:
    image: portainer/agent:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    ports:
      - target: 9001
        published: 9001
        mode: host
    networks:
      - portainer_agent_network
    deploy:
      mode: global   # One replica per node
      placement:
        constraints:
          - node.platform.os == linux

networks:
  portainer_agent_network:
    driver: overlay
    attachable: true
```

```bash
# Deploy the agent stack
docker stack deploy -c portainer-agent-stack.yml portainer_agents
```

## Full Portainer + Agent Stack

```yaml
# portainer-swarm-full.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    command: -H tcp://tasks.agent:9001 --tlsskipverify
    ports:
      - "9443:9443"
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
          - node.role == manager

  agent:
    image: portainer/agent:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - agent_network
    deploy:
      mode: global   # Run on all Swarm nodes
      placement:
        constraints:
          - node.platform.os == linux

networks:
  agent_network:
    driver: overlay
    attachable: true

volumes:
  portainer_data:
```

```bash
docker stack deploy -c portainer-swarm-full.yml portainer
```

## Verify Agent Deployment

```bash
# Check all agent tasks are running
docker service ps portainer_agents_agent --no-trunc

# Verify agents on all nodes
docker service ls --filter name=portainer_agents_agent
```

---

*Monitor your entire Swarm cluster with [OneUptime](https://oneuptime.com) infrastructure monitoring.*
