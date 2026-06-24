# How to Use the Swarm Visualizer in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Visualizer, Monitoring, DevOps

Description: Learn how to use Portainer's Swarm Visualizer to get a graphical view of task distribution across your Docker Swarm nodes.

## Introduction

The cluster visualizer in Portainer provides a graphical representation of how Swarm services and tasks are distributed across your cluster nodes. It gives you an at-a-glance view of cluster balance and service placement - making it much easier to understand your cluster's state than reading CLI output.

## Prerequisites

- A Docker Swarm environment connected to Portainer
- One or more nodes in the Swarm cluster
- At least one service deployed on the cluster if you want to visualize task placement

## Step 1: Access the Visualizer

1. In Portainer, select your Swarm environment
2. Click **Swarm** in the left sidebar
3. Open **Cluster visualizer** (or use the link to the cluster visualizer from the Swarm details page or dashboard)

## Step 2: Understand the Visualizer Layout

The visualizer displays your cluster as a grid:

```text
┌─────────────────────────────────────────────────────────────────┐
│                     Docker Swarm Visualizer                      │
├──────────────────┬──────────────────┬──────────────────────────┤
│  manager-01      │  worker-01       │  worker-02               │
│  (Leader)        │                  │                          │
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌──────────────┐         │
│ │web_frontend.1│ │ │web_frontend.2│ │ │web_frontend.3│         │
│ └──────────────┘ │ └──────────────┘ │ └──────────────┘         │
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌──────────────┐         │
│ │portainer     │ │ │api.1         │ │ │api.2         │         │
│ └──────────────┘ │ └──────────────┘ │ └──────────────┘         │
│ ┌──────────────┐ │ ┌──────────────┐ │ ┌──────────────┐         │
│ │agent.1       │ │ │agent.2       │ │ │agent.3       │         │
│ └──────────────┘ │ └──────────────┘ │ └──────────────┘         │
└──────────────────┴──────────────────┴──────────────────────────┘
```

Each column represents a Swarm node. Each box represents a task scheduled on that node.

## Step 3: Read the Visualizer Information

### Node Headers

Each node column shows:
- **Node name** (hostname)
- **Node role** - Leader, Manager, or Worker
- **Node labels** if you enable **Display node labels**

### Task Boxes

Each task box shows:
- **Task or service name** for the workload placed on that node
- Whether you are filtering to **Only display running tasks**

Use the visualizer to identify where a task is placed, then inspect the related service or task details in Portainer for more detail.

## Step 4: Identify Cluster Imbalance

Use the visualizer to spot uneven task distribution:

**Balanced cluster:**
```text
manager-01 (3 tasks) | worker-01 (3 tasks) | worker-02 (3 tasks)
```

**Unbalanced cluster:**
```text
manager-01 (8 tasks) | worker-01 (1 task) | worker-02 (0 tasks)
```

If tasks are concentrated on one node, the Swarm scheduler may be using placement constraints that limit where tasks can run.

## Step 5: Use the Visualizer to Diagnose Failures

When tasks are failing or in an error state:

1. Disable **Only display running tasks** if you want non-running tasks to remain visible in the visualizer
2. Use the service name shown in the visualizer to inspect the related service or task details in Portainer
3. Check if the task has repeated shutdown or rejected entries in its task history

```bash
# Check failed task details from CLI

docker service ps --no-trunc web_frontend

# View task logs
docker service logs web_frontend
```

`docker service logs` works for services that use supported logging drivers such as `json-file` or `journald`.

## Step 6: Monitor After Scaling

After scaling a service, watch the visualizer to confirm tasks distribute as expected:

```bash
# Scale a service from CLI
docker service scale web_frontend=6

# Or scale from Portainer: Services -> scale next to web_frontend
```

In the visualizer, new task boxes appear on different nodes as the Swarm scheduler places them.

## Step 7: Drain a Node and Watch Rescheduling

Put a node into drain mode and observe task migration:

```bash
# Drain worker-01
docker node update --availability drain worker-01
```

In the visualizer, tasks from `worker-01` are removed from the drained node and, for replicated services, replacement tasks appear on active nodes. This confirms:
1. Node drain works correctly
2. Swarm is reconciling the service's desired state
3. Replicated service tasks are being recreated on active nodes

Global services are removed from the drained node rather than rescheduled to another node.

## Alternative: Deploy the Open-Source Docker Visualizer

For a separate visualizer, you can deploy the open-source `dockersamples/visualizer` sample app:

```yaml
# visualizer.yml for deploying the visualizer as a Swarm stack
version: "3"
services:
  visualizer:
    image: dockersamples/visualizer
    ports:
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    deploy:
      placement:
        constraints:
          - node.role == manager  # Must run on manager to see all tasks
```

```bash
docker stack deploy -c visualizer.yml viz
# Access at http://manager-ip:8080
```

Upstream documents this as a learning sample and warns that mounting the Docker socket should not be treated as production-safe without properly securing the Docker daemon socket.

## Practical Use Cases

1. **Capacity planning** - See how many tasks are on each node
2. **Deployment verification** - Confirm all replicas started after deploying
3. **Node maintenance** - Drain a node and confirm tasks relocated
4. **Troubleshooting** - Quickly spot failed tasks across the cluster
5. **Load balance audit** - Check if tasks are evenly distributed

## Conclusion

The Portainer cluster visualizer turns abstract cluster state into an understandable visual layout. Use it after deployments to confirm task placement, during scaling to watch the Swarm scheduler in action, and during troubleshooting to identify failed tasks. It is one of the most useful features for day-to-day Swarm cluster management.
