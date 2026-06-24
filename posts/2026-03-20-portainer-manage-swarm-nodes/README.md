# How to Manage Swarm Nodes in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Node, Cluster Management, DevOps

Description: Learn how to add, configure, drain, and remove Docker Swarm nodes using Portainer's node management interface.

## Introduction

Docker Swarm nodes are the foundation of your cluster. Portainer provides comprehensive node management capabilities - from viewing node details and health to changing availability modes and managing labels. This guide covers node management in Portainer, along with the Docker CLI steps needed for structural changes such as joining, promoting, and removing nodes.

## Prerequisites

- A Docker Swarm environment connected to Portainer
- Admin access to Portainer
- SSH access to your servers (for adding new nodes)

## Step 1: View All Nodes

1. Select your Swarm environment in Portainer
2. Click **Swarm** in the sidebar
3. Open **Details** or scroll to the nodes section

Each node row shows:
- Node hostname
- Role (Manager/Worker)
- CPU and memory
- Status (for example, Ready or Down)
- Availability (Active/Pause/Drain)
- Engine version
- IP address

## Step 2: Inspect a Node

Click on any node to see detailed information:

```bash
Node ID:       abc123def456789
Hostname:      worker-01
Address:       10.0.1.11:2377
Role:          Worker
Status:        Ready
Availability:  Active
OS:            Linux
Architecture:  x86_64
CPU:           4 cores
Memory:        7.78 GiB
Docker Engine: 24.0.7
Labels:
  - zone=us-east-1a
  - disk=ssd
```

## Step 3: Add a New Node to the Swarm

Portainer doesn't directly SSH into servers, so you add nodes via CLI:

```bash
# On the Swarm manager, get the join token

docker swarm join-token worker
# Outputs: docker swarm join --token SWMTKN-1-xxxxx <manager-ip>:2377

docker swarm join-token manager  # For adding a manager
```

```bash
# On the new node, run the join command
docker swarm join \
  --token SWMTKN-1-xxxxx-xxxxx \
  10.0.1.10:2377

# Verify in Portainer (refresh the Nodes list)
```

## Step 4: Change Node Availability

Node availability controls whether the Swarm scheduler assigns new tasks:

### Available Modes

| Availability | Behavior |
|-------------|---------|
| **Active** | Normal - accepts new task assignments |
| **Pause** | No new tasks assigned, existing tasks continue running |
| **Drain** | No new tasks, existing tasks are rescheduled to other nodes |

### Change via Portainer

1. Click on a node
2. Change the **Availability** dropdown
3. Click **Apply changes**

### Change via CLI

```bash
# Pause a node (stop new task assignments)
docker node update --availability pause worker-01

# Drain a node (graceful maintenance mode)
docker node update --availability drain worker-01

# Return to active
docker node update --availability active worker-01
```

## Step 5: Promote/Demote Nodes

### Promote a Worker to Manager

For high availability, run 3 or 5 manager nodes:

```bash
# Portainer shows the node role, but promotion is done via CLI:
docker node promote worker-01
```

### Demote a Manager to Worker

```bash
# Portainer shows the node role, but demotion is done via CLI:
docker node demote manager-02

# Maintain manager quorum at all times
# An odd number of managers (1, 3, 5) is recommended
```

## Step 6: Add and Manage Node Labels

Labels are used for placement constraints:

```bash
# Add labels to a node
docker node update --label-add zone=us-east-1a worker-01
docker node update --label-add disk=ssd worker-02
docker node update --label-add gpu=true gpu-node

# View node labels
docker node inspect worker-01 --pretty | grep Labels -A 10

# Remove a label
docker node update --label-rm zone worker-01
```

In Portainer:
1. Click on a node
2. In **Node Labels**, click **+ label**
3. Add key-value pairs
4. Click **Apply changes**

## Step 7: Perform Node Maintenance

To safely update or maintain a node:

```bash
# Step 1: Drain the node (tasks migrate to other nodes)
docker node update --availability drain worker-01

# Wait for tasks to evacuate
watch docker node ps worker-01

# Step 2: Perform maintenance (updates, reboots, etc.)
# ...maintenance work...

# Step 3: Return node to active
docker node update --availability active worker-01

# Step 4: Verify tasks return (optional - Swarm doesn't automatically rebalance)
docker service ls
```

## Step 8: Remove a Node

```bash
# Step 1: Drain the node
docker node update --availability drain worker-01

# Step 2: On the node being removed, leave the swarm
docker swarm leave  # Run on worker-01

# Step 3: Remove the node record from the manager
docker node rm worker-01

# Or force remove if node is unreachable
docker node rm --force worker-01
```

Refresh the nodes list in Portainer to confirm the node is removed.

## Step 9: Rebalance Services

Docker Swarm does NOT automatically rebalance when a new node joins. To spread tasks to the new node:

```bash
# Force update all services to trigger rescheduling
for svc in $(docker service ls -q); do
    docker service update --force $svc
done
```

## Swarm Manager High Availability

For production, run multiple managers:

```bash
# Check Raft consensus health
docker node ls
# All managers should show "Reachable" or "Leader"

# Verify quorum (need majority of managers responding)
# With 3 managers: need 2 up
# With 5 managers: need 3 up
```

## Conclusion

Effective node management is essential for maintaining a healthy Docker Swarm cluster. Portainer simplifies node operations with a visual interface for viewing status, changing availability, and managing labels. For day-to-day operations, use the Portainer UI for visibility and rely on the CLI for structural changes like adding managers or removing nodes. Always drain nodes before maintenance to help minimize disruption during node work.
