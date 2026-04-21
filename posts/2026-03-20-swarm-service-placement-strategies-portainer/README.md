# How to Configure Swarm Service Placement Strategies in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Service Placement, Constraint, Infrastructure

Description: Configure Docker Swarm service placement constraints and preferences to control where containers run across the cluster using Portainer's stack management.

---

Docker Swarm placement strategies control which nodes run your service replicas. Constraints enforce hard rules (this service must run on GPU nodes), while preferences express soft preferences (spread replicas across availability zones). Both are configured in the `deploy.placement` section of your stack YAML.

## Placement Concepts

- **Constraints**: Hard filters - a node must match for a replica to run on it
- **Preferences**: Soft suggestions - spread replicas across values of a label

## Step 1: Add Node Labels

From a Swarm manager shell or Portainer's node view, add labels to classify nodes:

```bash
# Label nodes by hardware type

docker node update --label-add tier=gpu node-gpu-1
docker node update --label-add tier=standard node-worker-2
docker node update --label-add zone=us-east-1a node-worker-2
docker node update --label-add zone=us-east-1b node-worker-3
```

In Portainer, labels can also be added via **Swarm > Details > [node] > Node Details**.

## Step 2: Placement Constraints in Stack YAML

```yaml
version: "3.8"
services:
  ml-inference:
    image: my-registry/ml-api:latest
    deploy:
      replicas: 2
      placement:
        constraints:
          # Only run on nodes with the gpu label
          - node.labels.tier == gpu
          # Only run on worker nodes (not managers)
          - node.role == worker

  web-frontend:
    image: nginx:alpine
    deploy:
      replicas: 6
      placement:
        constraints:
          - node.role == worker
        # Spread replicas across availability zones
        preferences:
          - spread: node.labels.zone
```

## Step 3: Built-in Placement Filters

Swarm provides built-in node properties for constraints:

| Property | Example |
|---|---|
| `node.role` | `node.role == worker` |
| `node.hostname` | `node.hostname == node-worker-1` |
| `node.id` | `node.id == xyzabc` |
| `node.platform.os` | `node.platform.os == linux` |

## Step 4: Deploy via Portainer

Paste the stack YAML in **Stacks > Add Stack**. Portainer deploys replicas according to the placement rules. In the Services view, you can see which node each replica is running on.

## Step 5: Troubleshoot Placement Failures

If replicas stay Pending because of placement constraints, check which nodes satisfy the labels:

```bash
# Check which nodes match your constraint
docker node ls --filter node.label=tier=gpu

# Inspect service placement failure
docker service ps <service-name> --no-trunc
```

The `--no-trunc` output shows the full error message for failed placement attempts.

## Summary

Placement constraints ensure critical workloads run on appropriate hardware and prevent co-location of services that should be isolated. Portainer's stack interface makes it straightforward to express these rules in YAML, and the service detail view shows exactly where each replica is scheduled.
