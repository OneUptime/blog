# How to Run Portainer on a Raspberry Pi Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Raspberry Pi, Docker Swarm, Cluster, Self-Hosted, Home Lab

Description: Set up a Raspberry Pi cluster running Docker Swarm and deploy Portainer to manage multi-node container workloads with high availability.

## Introduction

A cluster of Raspberry Pis running Docker Swarm gives you a low-cost multi-node container platform. With Portainer managing the Swarm, you get a visual interface for deploying services, monitoring nodes, and managing the cluster state. This guide covers setting up a 3-node Raspberry Pi Swarm with Portainer using 1 manager and 2 workers.

## Prerequisites

- 3 or more Raspberry Pi 4 (4GB or 8GB) with Raspberry Pi OS 64-bit
- Gigabit switch and Ethernet cables
- DHCP reservations or static IPs assigned to each Pi
- SSH access to all nodes

## Step 1: Assign Static IPs

On current Raspberry Pi OS, NetworkManager (`nmcli`) is the supported way to set a static IP on the device. On each Pi, configure a static IP:

```bash
# List connection profiles and identify the one bound to eth0
nmcli connection show

# Example for Pi 1 (manager) at 192.168.1.10
# Replace "Wired connection 1" with your eth0 connection profile name
sudo nmcli connection modify "Wired connection 1" ipv4.method manual
sudo nmcli connection modify "Wired connection 1" ipv4.addresses 192.168.1.10/24
sudo nmcli connection modify "Wired connection 1" ipv4.gateway 192.168.1.1
sudo nmcli connection modify "Wired connection 1" ipv4.dns "8.8.8.8 1.1.1.1"
sudo nmcli connection up "Wired connection 1"
```

Assign:
- Pi 1: `192.168.1.10` (Swarm Manager)
- Pi 2: `192.168.1.11` (Worker 1)
- Pi 3: `192.168.1.12` (Worker 2)

## Step 2: Install Docker on All Nodes

Run on each Pi:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo systemctl enable --now docker
```

Log out and back in, or run `newgrp docker`, before continuing so the remaining `docker` commands work without `sudo`.

## Step 3: Initialize Docker Swarm

On **Pi 1 (Manager)**:

```bash
# Initialize Swarm with the manager's IP
docker swarm init --advertise-addr 192.168.1.10

# Copy the worker join token from the output
# It looks like: docker swarm join --token SWMTKN-1-xxxxx 192.168.1.10:2377
```

## Step 4: Join Worker Nodes

On **Pi 2 and Pi 3**, run the join command from Step 3:

```bash
docker swarm join \
  --token SWMTKN-1-<token-from-step3> \
  192.168.1.10:2377
```

Verify on the manager:

```bash
docker node ls
# Should show all 3 nodes as Ready
```

## Step 5: Deploy Portainer on the Swarm

On the Swarm Manager, deploy Portainer as a Swarm stack:

```bash
curl -L https://downloads.portainer.io/ce-lts/portainer-agent-stack.yml \
  -o portainer-agent-stack.yml

docker stack deploy -c portainer-agent-stack.yml portainer
```

Or create the stack manually:

```bash
cat > portainer-stack.yml << 'EOF'
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
      mode: global    # Run agent on every Swarm node
      placement:
        constraints: [node.platform.os == linux]

  portainer:
    image: portainer/portainer-ce:lts
    command: -H tcp://tasks.agent:9001 --tlsskipverify
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - portainer_data:/data
    networks:
      - agent_network
    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints: [node.role == manager]

networks:
  agent_network:
    driver: overlay
    attachable: true

volumes:
  portainer_data:
EOF

docker stack deploy -c portainer-stack.yml portainer
```

## Step 6: Access Portainer

Navigate to `https://192.168.1.10:9443` and create your admin account.

In Portainer you'll see:
- **Swarm** cluster overview
- All 3 nodes in the **Swarm > Nodes** section
- Ability to deploy **Services** and **Stacks** across the cluster

## Step 7: Deploy a Replicated Service

Test the cluster by deploying a replicated Nginx service:

```yaml
version: "3.8"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "8080:80"
    deploy:
      replicas: 3      # Three replicas across the cluster
      update_config:
        parallelism: 1   # Update one replica at a time
        delay: 10s
      restart_policy:
        condition: on-failure
```

Swarm will schedule the replicas across the available nodes in the cluster.

## Cluster Management with Portainer

### Draining a Node for Maintenance

1. In Portainer, navigate to **Swarm > Nodes**
2. Click on the node to maintenance
3. Set **Availability** to **Drain**
4. Portainer will reschedule eligible Swarm service tasks onto other active nodes

### Scaling Services

1. Navigate to **Services**
2. Click on a service
3. Change **Replicas** count and click **Update**

## Conclusion

A Raspberry Pi cluster running Docker Swarm with Portainer gives you a practical multi-node container platform for under $200. Portainer's Swarm support includes service deployment, node management, and rolling updates - all through a web interface. This setup is perfect for learning container orchestration before moving to production Kubernetes.
