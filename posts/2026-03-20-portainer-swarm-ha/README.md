# How to Set Up Docker Swarm High Availability with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, High Availability, Infrastructure, Clustering

Description: Configure a highly available Docker Swarm cluster with multiple manager nodes and deploy Portainer to manage it with HA.

## Introduction

Docker Swarm achieves high availability through redundant manager nodes using the Raft consensus algorithm. With 3 or 5 manager nodes, the Swarm control plane tolerates manager failures. This guide covers setting up a production-ready HA Swarm cluster and deploying Portainer to manage it.

## HA Architecture

- **3 manager nodes**: Tolerates 1 manager failure (quorum = 2)
- **5 manager nodes**: Tolerates 2 manager failures (quorum = 3)
- **Worker nodes**: Add as needed for running workloads

## Step 1: Initialize the First Manager

```bash
# On manager1 (192.168.1.10)

docker swarm init \
  --advertise-addr 192.168.1.10 \
  --listen-addr 192.168.1.10:2377

# Save the manager join token
MANAGER_TOKEN=$(docker swarm join-token manager -q)
echo "Manager token: $MANAGER_TOKEN"

# Save the worker join token
WORKER_TOKEN=$(docker swarm join-token worker -q)
echo "Worker token: $WORKER_TOKEN"
```

## Step 2: Add Additional Manager Nodes

```bash
# On manager2 (192.168.1.11)
docker swarm join \
  --token $MANAGER_TOKEN \
  192.168.1.10:2377 \
  --advertise-addr 192.168.1.11

# On manager3 (192.168.1.12)
docker swarm join \
  --token $MANAGER_TOKEN \
  192.168.1.10:2377 \
  --advertise-addr 192.168.1.12

# Add worker nodes
# On worker1, worker2, worker3...
docker swarm join \
  --token $WORKER_TOKEN \
  192.168.1.10:2377
```

## Step 3: Verify the Swarm

```bash
# On any manager: verify cluster state
docker node ls
# ID               HOSTNAME    STATUS    AVAILABILITY  MANAGER STATUS   ENGINE VERSION
# xxx  *  manager1    Ready     Active      Leader
# yyy     manager2    Ready     Active      Reachable
# zzz     manager3    Ready     Active      Reachable
# aaa     worker1     Ready     Active

# Check manager reachability in the Raft cluster
docker node inspect manager1 --format '{{ .ManagerStatus.Reachability }}'
```

## Step 4: Deploy Portainer on the Swarm

Portainer's standard Swarm deployment uses the Portainer agent plus a single Portainer Server service. On a multi-manager Swarm, pin the Portainer service to the manager that stores the Portainer data volume:

```yaml
# portainer-swarm-stack.yml
version: '3.2'

services:
  agent:
    image: portainer/agent:lts
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - agent_network
    deploy:
      mode: global       # Run on ALL nodes
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
      - agent_network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints: [node.hostname == manager1]
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

networks:
  agent_network:
    driver: overlay
    attachable: true

volumes:
  portainer_data:
    driver: local
```

```bash
# Deploy the Portainer stack
docker stack deploy -c portainer-swarm-stack.yml portainer
```

## Step 5: Configure a Load Balancer for Portainer Access

This provides a stable endpoint for Portainer's published port, but it does not make the Portainer Server itself highly available.

```nginx
# /etc/nginx/conf.d/swarm-lb.conf
upstream swarm_managers {
    server 192.168.1.10:9000;
    server 192.168.1.11:9000;
    server 192.168.1.12:9000;
}

server {
    listen 9000;
    location / {
        proxy_pass http://swarm_managers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Step 6: Use Dedicated Managers Carefully

```bash
# Leave manager1 active because Portainer is pinned there
# Drain the other managers so they don't receive regular service tasks
docker node update --availability drain manager2
docker node update --availability drain manager3

# Verify
docker node ls
# manager2 and manager3 should show AVAILABILITY = Drain
```

## Step 7: Test HA Failover

```bash
# Simulate a manager failure on a manager that is not hosting Portainer
# On manager2: stop Docker
sudo systemctl stop docker

# From manager1: verify cluster is still operational
docker node ls  # Should show manager2 as "Down"
docker service ls  # Services should still be running

# Restart manager2
sudo systemctl start docker

# Verify it rejoins
docker node ls  # manager2 should return as "Ready"
```

## Conclusion

A 3-manager Docker Swarm cluster provides high availability for the Swarm control plane. The Raft consensus algorithm ensures the cluster remains operational even if one manager fails. Portainer's agent mode lets a single Portainer Server manage the Swarm through the distributed agent network rather than a single Docker socket. In a multi-manager Swarm, keep the Portainer Server pinned to the manager that stores its data volume unless you provide shared storage designed for failover.
