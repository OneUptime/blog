# How to Drain and Manage Swarm Nodes from Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Node Management, Maintenance, Infrastructure

Description: Drain Docker Swarm nodes for maintenance, adjust node availability, and manage the cluster's active node set from Portainer's Swarm management interface.

---

Node draining in Docker Swarm reschedules swarm service tasks off a node before you take it down for maintenance. Portainer's Swarm node view lets you manage node availability without using the Docker CLI directly.

## Node Availability States

| State | Behavior |
|---|---|
| Active | Node accepts new tasks and runs existing ones |
| Pause | Node stops receiving new tasks; existing tasks continue |
| Drain | Node stops receiving new tasks; existing swarm service tasks are shut down and rescheduled on other eligible active nodes |

## Step 1: Drain a Node via Portainer

Navigate to **Swarm**, select the node you want to drain, and change its **Availability** to **Drain**.

Via terminal equivalent (run on a swarm manager):

```bash
# Drain a specific node

docker node update --availability drain node-worker-2

# Verify service tasks have been rescheduled off this node
docker node ps node-worker-2
# Any service tasks on this node should show as Shutdown
```

## Step 2: Perform Maintenance

After draining, swarm service tasks from that node are rescheduled onto other eligible active nodes if capacity and placement rules allow. You can now:

- Apply OS patches and reboot
- Upgrade Docker Engine
- Replace hardware
- Expand storage

## Step 3: Return the Node to Service

After maintenance, set the node back to Active:

```bash
# Run on a swarm manager
docker node update --availability active node-worker-2
```

In Portainer, change Availability back to **Active**. The scheduler will start placing new tasks on the node, but existing tasks that were rescheduled will not automatically move back.

## Step 4: Remove a Node from the Swarm

To permanently remove a worker node:

```bash
# On the node being removed - leave the swarm
docker swarm leave

# On a swarm manager - remove the departed node
docker node rm node-worker-2
```

To remove a manager node, first demote it:

```bash
# On a swarm manager - demote the manager you want to remove
docker node demote node-manager-3

# On the node being removed - leave the swarm
docker swarm leave

# On a remaining swarm manager - remove the departed node
docker node rm node-manager-3
```

Make sure the swarm still has manager quorum before removing a manager node.

## Step 5: Add a New Node

To add a worker to the existing Swarm:

```bash
# On a swarm manager - print the worker join command
docker swarm join-token worker

# Run on the new node
docker swarm join --token <token> <manager-ip>:2377
```

The new node appears in Portainer's node list after it joins the Swarm.

## Step 6: Force Remove an Unreachable Node

If a node crashed and cannot communicate:

```bash
# On a swarm manager - force remove the stuck node
docker node rm --force node-worker-crashed
```

## Summary

Portainer's node management view provides a clear picture of Swarm node health and availability. Draining nodes before maintenance reschedules swarm service tasks off the node when other eligible active nodes are available, and returning nodes to Active is a single-click operation. For critical maintenance windows, Portainer's visual confirmation of task rescheduling helps prevent premature shutdowns.
