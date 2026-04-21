# How to Manage Swarm Node Labels and Constraints in Portainer - Constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Node Labels, Placement Constraints, Infrastructure

Description: Assign and manage Docker Swarm node labels through Portainer to implement placement constraints that route services to appropriate hardware tiers.

---

Node labels in Docker Swarm are key-value metadata attached to nodes. They enable placement constraints that direct services to specific hardware - GPU nodes for ML workloads, SSD nodes for databases, or geographic zones for latency-sensitive services.

## Step 1: View and Add Labels via Portainer

In Portainer, go to **Swarm > Details**, then select a node from the Nodes section. The detail view shows existing labels and allows you to add new ones.

Run the Docker CLI examples from a swarm manager node. Via terminal:

```bash
# Add labels to nodes

docker node update --label-add tier=gpu node-gpu-1
docker node update --label-add tier=standard node-worker-1
docker node update --label-add zone=us-east-1a node-worker-1
docker node update --label-add zone=us-east-1b node-worker-2
docker node update --label-add storage=ssd node-db-1
docker node update --label-add storage=hdd node-worker-1

# Verify labels
docker node inspect node-gpu-1 --pretty | grep Labels -A 10
```

## Step 2: Use Labels in Placement Constraints

```yaml
version: "3.8"
services:
  # ML service only on GPU nodes
  ml-inference:
    image: ml-api:latest
    deploy:
      placement:
        constraints:
          - node.labels.tier == gpu

  # Database on SSD storage nodes
  postgres:
    image: postgres:16
    deploy:
      placement:
        constraints:
          - node.labels.storage == ssd
          - node.role == worker

  # Spread web tier across availability zones
  web:
    image: nginx:alpine
    deploy:
      replicas: 4
      placement:
        preferences:
          - spread: node.labels.zone
```

## Step 3: Remove a Label

```bash
# Remove a label from a node
docker node update --label-rm tier node-worker-1
```

## Step 4: List Nodes Matching a Label

```bash
# Find all GPU nodes
docker node ls --filter node.label=tier=gpu

# Find all nodes in a specific zone
docker node ls --filter node.label=zone=us-east-1a
```

## Step 5: Dynamic Label Management

For cloud environments where nodes are added and removed frequently, automate label assignment using cloud provider metadata in your node provisioning script. Run the `docker node update` step from a swarm manager or automation with manager access:

```bash
# Example: label node based on instance type
INSTANCE_TYPE=$(curl -s http://169.254.169.254/latest/meta-data/instance-type)
if [[ "$INSTANCE_TYPE" == *"p4d"* ]]; then
  docker node update --label-add tier=gpu $(docker info --format '{{.Swarm.NodeID}}')
fi
```

## Summary

Node labels give you a flexible system for classifying Swarm cluster capacity. By pairing labels with placement constraints in your stack YAML, you ensure each service runs on appropriate infrastructure - making GPU workloads land on GPU nodes, stateful services land on high-IOPS nodes, and replicas spread across failure domains.
