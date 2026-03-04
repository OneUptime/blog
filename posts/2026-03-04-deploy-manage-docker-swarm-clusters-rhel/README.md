# How to Deploy and Manage Docker Swarm Clusters on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Docker, Swarm, Containers, Orchestration

Description: Set up a Docker Swarm cluster on RHEL servers for container orchestration with service deployment and scaling.

---

Docker Swarm is a container orchestration tool built into Docker. It is simpler than Kubernetes and well-suited for small to medium deployments. Here is how to set up a Swarm cluster on RHEL.

## Installing Docker on RHEL

```bash
# Remove any old Docker packages
sudo dnf remove docker docker-client docker-common docker-latest

# Add the Docker CE repository
sudo dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo

# Install Docker CE
sudo dnf install docker-ce docker-ce-cli containerd.io -y

# Start and enable Docker
sudo systemctl enable --now docker

# Verify the installation
docker --version
```

## Initializing the Swarm

On the manager node:

```bash
# Initialize the Swarm cluster
# Replace the IP with your manager node's IP
sudo docker swarm init --advertise-addr 192.168.1.10

# The output shows the join command for worker nodes. Save it.
# Example: docker swarm join --token SWMTKN-1-abc123... 192.168.1.10:2377
```

## Joining Worker Nodes

On each worker node, run the join command from the init output:

```bash
# On worker nodes: Join the swarm
sudo docker swarm join --token SWMTKN-1-your-token-here 192.168.1.10:2377
```

## Verifying the Cluster

```bash
# On the manager: List all nodes
sudo docker node ls

# Output shows each node with its status and role
# ID                    HOSTNAME   STATUS  AVAILABILITY  MANAGER STATUS
# abc123 *             manager1    Ready   Active        Leader
# def456               worker1     Ready   Active
# ghi789               worker2     Ready   Active
```

## Deploying a Service

```bash
# Deploy an Nginx service with 3 replicas
sudo docker service create \
  --name web \
  --replicas 3 \
  --publish published=80,target=80 \
  nginx:latest

# Verify the service is running
sudo docker service ls
sudo docker service ps web
```

## Scaling Services

```bash
# Scale up to 5 replicas
sudo docker service scale web=5

# Verify the scaling
sudo docker service ps web
```

## Updating a Service

```bash
# Rolling update to a new image version
sudo docker service update \
  --image nginx:1.25 \
  --update-parallelism 1 \
  --update-delay 10s \
  web

# Monitor the update progress
sudo docker service ps web
```

## Firewall Configuration

Open the required ports on all Swarm nodes:

```bash
# Ports needed for Docker Swarm
sudo firewall-cmd --permanent --add-port=2377/tcp    # Cluster management
sudo firewall-cmd --permanent --add-port=7946/tcp    # Node communication
sudo firewall-cmd --permanent --add-port=7946/udp    # Node communication
sudo firewall-cmd --permanent --add-port=4789/udp    # Overlay network
sudo firewall-cmd --reload
```

## Using Docker Stack Deploy

For multi-service applications, use a Compose file with stack deploy:

```bash
# Create a docker-compose.yml for your stack
cat > /tmp/app-stack.yml << 'EOF'
version: "3.8"
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    deploy:
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

  redis:
    image: redis:alpine
    deploy:
      replicas: 1
EOF

# Deploy the stack
sudo docker stack deploy -c /tmp/app-stack.yml myapp

# List services in the stack
sudo docker stack services myapp
```

Docker Swarm provides a straightforward path to container orchestration without the complexity of Kubernetes.
