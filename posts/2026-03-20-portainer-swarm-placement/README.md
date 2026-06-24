# How to Configure Swarm Service Placement Strategies in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Placement, Constraint, DevOps

Description: Configure Docker Swarm service placement strategies using node labels, affinity rules, and spread strategies via Portainer.

## Introduction

Docker Swarm's placement controls determine which nodes run which services. Portainer exposes these controls through both its UI and stack configurations. Proper placement ensures critical services run on appropriate hardware, replicas can be spread across failure domains, and stateful services have storage access.

## Placement Strategies Overview

In Swarm mode, service placement is controlled with:
- **constraints**: Hard requirements that limit tasks to nodes with matching roles, hostnames, platforms, or labels
- **preferences**: Best-effort rules that influence scheduling. Docker Swarm currently supports only **spread**, which distributes tasks across label values as evenly as possible

## Adding Node Labels via Portainer

In Portainer: open the Swarm details page, select a node, then edit labels in **Node Details**

Or via CLI:
```bash
# Add labels to identify node capabilities

docker node update --label-add storage=ssd manager1
docker node update --label-add storage=hdd worker1
docker node update --label-add gpu=true worker2
docker node update --label-add region=us-east worker1
docker node update --label-add region=us-west worker2
docker node update --label-add type=database manager1

# Verify labels
docker node inspect manager1 --format '{{.Spec.Labels}}'
```

## Placement Constraints in Portainer Stacks

```yaml
# placement-demo-stack.yml
version: '3.8'

services:
  # Database: only on nodes with SSD and database label
  postgres:
    image: postgres:15
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.storage == ssd
          - node.labels.type == database
    environment:
      POSTGRES_PASSWORD: secret

  # Cache: avoid database nodes
  redis:
    image: redis:7
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.type != database

  # Web: only on worker nodes, spread across regions
  web:
    image: nginx:latest
    deploy:
      replicas: 4
      placement:
        constraints:
          - node.role == worker
        preferences:
          - spread: node.labels.region   # Spread across regions

  # Portainer Agent: one task on each Linux node
  portainer-agent:
    image: portainer/agent:latest
    deploy:
      mode: global
      placement:
        constraints:
          - node.platform.os == linux

  # GPU workload
  ml-inference:
    image: my-ml-app:latest
    deploy:
      replicas: 2
      placement:
        constraints:
          - node.labels.gpu == true
```

## Placement via Portainer UI

When deploying a service via Portainer:
1. Go to **Services > Add Service**
2. In the advanced service options:
   - Add a placement constraint for `node.labels.type` with value `database`
   - Add a placement preference to spread tasks across `node.labels.region`

## Dynamic Placement with Node Updates

```bash
# Change scheduling eligibility by updating node labels
# Before maintenance: remove the database label from the node
docker node update --label-rm type manager1

# Inspect task placement. If the service is rescheduled while no matching
# node exists, tasks remain pending until a matching node is available again.
docker service ps myapp_postgres

# After maintenance: restore label
docker node update --label-add type=database manager1
```

For planned maintenance where you need to move running tasks off a node immediately, set the node availability to `drain`.

## Common Placement Patterns

```yaml
# Pattern 1: HA database with replica on different physical hosts
db-primary:
  deploy:
    replicas: 1
    placement:
      constraints:
        - node.labels.rack == rack-a

db-replica:
  deploy:
    replicas: 1
    placement:
      constraints:
        - node.labels.rack == rack-b  # Different rack for true HA

# Pattern 2: Stateful service on storage node
stateful-app:
  deploy:
    replicas: 1
    placement:
      constraints:
        - node.labels.has-nfs-mount == true

# Pattern 3: Spread across availability zones
web-tier:
  deploy:
    replicas: 3
    placement:
      preferences:
        - spread: node.labels.availability-zone
```

## Conclusion

Proper placement strategies in Docker Swarm ensure services run on appropriate hardware, maintain high availability across failure domains, and prevent resource contention. Portainer makes managing these strategies accessible through both its stack editor and service configuration UI, allowing operators to define complex placement rules without memorizing Docker CLI flags.
