# How to Configure Service Replicas in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Replica, Service, High Availability

Description: Set and manage the number of Docker Swarm service replicas in Portainer for availability and performance tuning.

---

Docker Swarm mode enables container orchestration across multiple hosts. Portainer provides a comprehensive UI for managing all aspects of Swarm clusters, services, configs, and secrets.

## Setting Up Portainer on Docker Swarm

```bash
# Initialize Docker Swarm (if not already done)

docker swarm init --advertise-addr <manager-ip>

# Join workers to the Swarm
docker swarm join --token <worker-token> <manager-ip>:2377

# Deploy Portainer on Swarm
curl -L https://downloads.portainer.io/ce2-21/portainer-agent-stack.yml -o portainer-stack.yml
docker stack deploy -c portainer-stack.yml portainer
```

## Service Management Commands

```bash
# Create a Swarm service
docker service create \
  --name myapp \
  --replicas 3 \
  --publish published=80,target=80 \
  --update-delay 10s \
  --update-parallelism 1 \
  --rollback-parallelism 1 \
  nginx:latest

# Scale a service
docker service scale myapp=5

# Update a service
docker service update \
  --image nginx:1.25 \
  --update-delay 5s \
  myapp

# Roll back a service
docker service rollback myapp

# View service tasks
docker service ps myapp

# View service logs
docker service logs myapp --tail 100 -f
```

## Docker Configs and Secrets

```bash
# Create a Docker config
echo "server { listen 80; }" | docker config create nginx-config -

# Create a Docker secret
echo "mysecretpassword" | docker secret create db-password -

# Use config and secret in a service
docker service create \
  --name webapp \
  --config nginx-config \
  --secret db-password \
  mywebapp:latest

# List configs and secrets
docker config ls
docker secret ls
```

## Swarm Cluster Details

```bash
# View cluster information
docker info | grep -A 20 "Swarm:"

# List all nodes
docker node ls

# Inspect a node
docker node inspect --pretty <node-id>

# View node resource usage
docker node ps <node-id>
```

## Service Rollback Configuration

```bash
# Configure rollback policy for automated rollback on failure
# --update-failure-action rollback: Auto-rollback on failure
# --update-max-failure-ratio 0.25: Allow 25% failure before rollback
docker service create \
  --name myapp \
  --replicas 3 \
  --update-failure-action rollback \
  --update-max-failure-ratio 0.25 \
  --rollback-parallelism 1 \
  --rollback-delay 5s \
  myapp:latest
```

## Service Webhooks in Portainer

1. Navigate to **Services > [Service Name]**
2. Scroll to **Service webhook**
3. Enable and copy the webhook URL
4. Trigger updates from CI/CD:

```bash
curl -X POST "https://portainer.example.com/api/webhooks/<uuid>?tag=v2.0.0"
```

---

*Monitor your Docker Swarm services and cluster health with [OneUptime](https://oneuptime.com).*
