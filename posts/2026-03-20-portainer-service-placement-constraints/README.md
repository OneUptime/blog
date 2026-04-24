# How to Configure Service Placement Constraints in Portainer on Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Placement, Service, DevOps

Description: Learn how to use placement constraints and preferences in Portainer to control where Swarm service replicas are scheduled.

## Introduction

Placement constraints give you precise control over which nodes run your Swarm service replicas. Whether you need to isolate database workloads on SSD nodes, run services only on worker nodes, or spread replicas across availability zones, placement constraints make it possible. This guide covers configuring constraints through Portainer.

## Prerequisites

- Portainer on Docker Swarm
- Node labels configured on your cluster
- Services to configure

## Understanding Constraints vs Preferences

| Type | Behavior | Example |
|------|---------|---------|
| **Constraint** | Hard rule - task only starts if constraint is satisfied | Only on nodes with `disk=ssd` |
| **Preference** | Soft rule - tries to spread tasks but doesn't fail if impossible | Spread across `zone` labels |

## Available Constraint Keys

```bash
# Built-in node properties

node.id == <node-id>
node.hostname == worker-01
node.role == manager
node.role == worker
node.platform.os == linux
node.platform.arch == x86_64

# Custom node labels (you define these)
node.labels.zone == us-east-1a
node.labels.disk == ssd
node.labels.tier == web
node.labels.gpu == true

# Engine labels (Docker daemon labels)
engine.labels.environment == production
```

## Step 1: Add Labels to Nodes

Before using label-based constraints, add labels to your nodes:

```bash
# Label nodes by zone
docker node update --label-add zone=us-east-1a worker-01
docker node update --label-add zone=us-east-1b worker-02
docker node update --label-add zone=us-east-1c worker-03

# Label nodes by disk type
docker node update --label-add disk=ssd worker-01
docker node update --label-add disk=hdd worker-02

# Label nodes by tier
docker node update --label-add tier=web worker-01
docker node update --label-add tier=web worker-02
docker node update --label-add tier=app worker-03
docker node update --label-add tier=db worker-04

# Verify labels
docker node inspect worker-01 --pretty
```

## Step 2: Configure Constraints in Portainer

When creating or editing a service:

1. Scroll to the **Placement** section
2. Under **Placement constraints**, click **+ Add constraint**
3. Enter the constraint:

```text
Node selector:  node.role
Operator:       ==
Value:          worker
```

Add multiple constraints if needed - all must be satisfied (AND logic).

## Step 3: Common Constraint Patterns

### Run Only on Worker Nodes

```yaml
deploy:
  placement:
    constraints:
      - node.role == worker    # Keep services off the manager
```

### Run Only on Manager (for management tasks)

```yaml
deploy:
  placement:
    constraints:
      - node.role == manager   # Portainer, monitoring dashboards
```

### Pin to SSD Nodes for Databases

```yaml
deploy:
  placement:
    constraints:
      - node.labels.disk == ssd    # PostgreSQL, Redis need fast storage
```

### Separate Web and App Tiers

```yaml
services:
  nginx:
    deploy:
      placement:
        constraints:
          - node.labels.tier == web

  api:
    deploy:
      placement:
        constraints:
          - node.labels.tier == app

  postgres:
    deploy:
      placement:
        constraints:
          - node.labels.tier == db
```

### Run in a Specific Zone

```yaml
deploy:
  placement:
    constraints:
      - node.labels.zone == us-east-1a
```

### Constraint Operators

```bash
== (equals)         node.role == worker
!= (not equals)     node.labels.exclude != true
```

## Step 4: Configure Placement Preferences

Preferences are soft rules for distributing replicas:

```yaml
deploy:
  replicas: 6
  placement:
    preferences:
      - spread: node.labels.zone    # Spread evenly across zones
```

With 6 replicas and 3 zones (`us-east-1a`, `us-east-1b`, `us-east-1c`), Swarm tries to place 2 replicas per zone.

```yaml
# Combine constraints with preferences
deploy:
  replicas: 6
  placement:
    constraints:
      - node.role == worker         # Only on workers (hard rule)
    preferences:
      - spread: node.labels.zone    # Spread across zones (soft rule)
```

## Step 5: Verify Placement

After deploying, verify tasks are placed correctly:

```bash
# Check which node each task is running on
docker service ps my-service

# Output:
# ID             NAME           IMAGE         NODE       DESIRED STATE  CURRENT STATE
# abc123def456   my-service.1   nginx:alpine  worker-01  Running        Running 10 seconds ago
# def456ghi789   my-service.2   nginx:alpine  worker-02  Running        Running 10 seconds ago
# ghi789jkl012   my-service.3   nginx:alpine  worker-03  Running        Running 10 seconds ago
```

In Portainer, use the **Cluster visualizer** to see the task distribution across nodes.

## Step 6: Troubleshoot Constraint Failures

If tasks stay in `Pending` state:

```bash
# Check why tasks aren't scheduling
docker service ps --no-trunc my-service
# Look for: "no suitable node (scheduling constraints not satisfied on N nodes)"

# List nodes and their labels
docker node inspect --format '{{.Description.Hostname}}: {{json .Spec.Labels}}' $(docker node ls -q)
```

Common issues:
- **Label doesn't exist** - Run `docker node update --label-add` to add the label
- **Wrong label value** - Check the exact value with `docker node inspect --format '{{json .Spec.Labels}}' <node-name>`
- **No nodes with required role** - Constraints too restrictive; review or relax

## Step 7: Update Constraints on Running Services

```bash
# Add a new constraint
docker service update \
  --constraint-add node.labels.zone==us-east-1a \
  my-service

# Remove a constraint
docker service update \
  --constraint-rm node.role==worker \
  my-service
```

In Portainer: edit the service, update the constraints, and save.

## Conclusion

Placement constraints are essential for production Swarm deployments. They enable you to segregate workloads by node capabilities, implement infrastructure tiers, and spread replicas across availability zones. Start by adding meaningful labels to your nodes, then use constraints to ensure the right services run on the right infrastructure. Combined with preferences, you can achieve sophisticated scheduling policies entirely through Portainer's UI.
