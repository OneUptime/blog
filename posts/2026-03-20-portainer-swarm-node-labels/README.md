# How to Manage Swarm Node Labels and Constraints in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Node Labels, Constraint, Infrastructure

Description: Add, manage, and use Docker Swarm node labels and placement constraints to control service scheduling via Portainer.

## Introduction

Docker Swarm node labels are key-value metadata attached to nodes that enable placement constraints. They allow you to tag nodes with their capabilities (GPU, SSD, region) and then constrain services to run only on nodes with matching labels.

## Managing Labels via Portainer

In Portainer: **Swarm > Details > Select Node > Node Details > Labels**

Add labels in the format: `key = value`

## Managing Labels via CLI

```bash
# Add labels to nodes

docker node update --label-add environment=production worker1
docker node update --label-add environment=staging worker2
docker node update --label-add storage=ssd worker1
docker node update --label-add storage=hdd worker2
docker node update --label-add region=us-east worker1
docker node update --label-add region=us-west worker2
docker node update --label-add tier=frontend worker3
docker node update --label-add tier=database worker4

# Remove a label
docker node update --label-rm storage worker2

# List all node labels
docker node ls -q | xargs docker node inspect --format '{{.Description.Hostname}}: {{.Spec.Labels}}'

# Inspect a specific node
docker node inspect worker1 --format '{{json .Spec.Labels}}' | python3 -m json.tool
```

## Using Labels in Service Constraints

```yaml
# services-with-constraints.yml
version: '3.8'

services:
  # Only run on production-labeled nodes
  production-app:
    image: myapp:stable
    deploy:
      replicas: 3
      placement:
        constraints:
          - node.labels.environment == production

  # Only run on staging nodes
  staging-app:
    image: myapp:canary
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.environment == staging

  # Database: SSD storage required, not frontend tier
  database:
    image: postgres:15
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.storage == ssd
          - node.labels.tier != frontend

  # Frontend: spread across regions
  frontend:
    image: nginx:latest
    deploy:
      replicas: 4
      placement:
        constraints:
          - node.labels.tier == frontend
        preferences:
          - spread: node.labels.region
```

## Available Constraint Expressions

```yaml
# Common expressions for placement constraints
constraints:
  - node.id == <id>              # Specific node ID
  - node.hostname == worker1     # Specific hostname
  - node.role == worker          # Node role
  - node.labels.key == value     # Custom label equals
  - node.labels.key != value     # Custom label not equals
  - engine.labels.key == value   # Docker engine labels
```

## Label-Based Node Groups Script

```bash
#!/bin/bash
# manage-node-groups.sh
# Apply labels to groups of nodes based on hostname patterns

# Label pattern: server-type-num (e.g., web-01, db-01, worker-01)

docker node ls --format "{{.Hostname}}" | while read hostname; do
  case $hostname in
    web-*)
      docker node update --label-add tier=frontend "$hostname"
      docker node update --label-add environment=production "$hostname"
      ;;
    db-*)
      docker node update --label-add tier=database "$hostname"
      docker node update --label-add storage=ssd "$hostname"
      ;;
    worker-*)
      docker node update --label-add tier=worker "$hostname"
      ;;
    *)
      echo "Unknown node pattern: $hostname"
      ;;
  esac
  echo "Labeled: $hostname"
done
```

## Portainer API for Label Management

```bash
# Get node info including labels
NODE_ID=$(docker node ls --filter name=worker1 -q)

curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/docker/nodes/$NODE_ID" \
  | python3 -c "import sys,json; n=json.load(sys.stdin); print(json.dumps(n['Spec']['Labels'], indent=2))"

# Update node labels via Portainer API
NODE_VERSION=$(docker node inspect --format '{{.Version.Index}}' worker1)

curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "Labels": {
      "storage": "ssd",
      "region": "us-east",
      "tier": "database"
    },
    "Role": "worker",
    "Availability": "active"
  }' \
  "https://portainer.example.com/api/endpoints/1/docker/nodes/$NODE_ID/update?version=$NODE_VERSION"
```

## Conclusion

Node labels and constraints in Docker Swarm provide powerful workload scheduling control. Portainer makes label management accessible through its Swarm node UI, while placement constraints in Compose files used for stacks enable precise service placement. By labeling nodes with their capabilities and constraints in service definitions, you create a self-documenting infrastructure where service placement decisions are explicit and version-controlled.
