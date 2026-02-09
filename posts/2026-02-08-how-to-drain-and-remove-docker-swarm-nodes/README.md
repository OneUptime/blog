# How to Drain and Remove Docker Swarm Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Swarm, Node Management, Maintenance, Cluster Operations, DevOps

Description: Learn how to safely drain workloads from Docker Swarm nodes and remove them from the cluster for maintenance or decommissioning.

---

Servers need maintenance. Hardware fails, operating systems need patching, and sometimes you just need to shrink the cluster. Docker Swarm provides a clean process for removing nodes without disrupting running services. You drain the node first, which migrates all tasks to other nodes, then remove it from the cluster. Done correctly, your users never notice.

This guide covers the full lifecycle: draining nodes, handling different node roles, removing nodes cleanly, and dealing with nodes that have already gone offline.

## Understanding Node Availability States

Every Swarm node has an availability setting that controls whether it accepts new tasks:

- **Active**: The node accepts new tasks and continues running existing ones. This is the default state.
- **Pause**: The node keeps running existing tasks but does not accept new ones. Useful for testing without fully draining.
- **Drain**: The node stops all running tasks and migrates them to other available nodes. No new tasks are scheduled here.

```bash
# Check the current availability of all nodes
docker node ls
```

The output shows the AVAILABILITY column for each node.

## Draining a Worker Node

Before removing a worker node or performing maintenance, drain it to migrate workloads.

```bash
# Drain a worker node - all tasks will be rescheduled to other nodes
docker node update --availability drain worker1
```

Monitor the migration:

```bash
# Watch tasks being rescheduled
docker service ps webapp

# List tasks on the specific node (should show Shutdown state)
docker node ps worker1
```

The drain process follows these steps:

1. Swarm marks all tasks on the node as "Shutdown"
2. The orchestrator schedules replacement tasks on other available nodes
3. Running containers receive a SIGTERM signal
4. After the stop grace period (default 10 seconds), containers that have not stopped receive SIGKILL
5. New tasks start on other nodes

The service remains available throughout this process, assuming you have enough replicas and other nodes with capacity.

## Controlling the Stop Grace Period

Some applications need more time to shut down gracefully, especially those handling long-running requests or batch jobs.

```bash
# Set a longer grace period for the service before draining
docker service update --stop-grace-period 30s webapp
```

This gives containers 30 seconds to finish their work after receiving SIGTERM before they are forcefully killed.

## Draining a Manager Node

Manager nodes need extra care. Draining a manager stops workloads on it but does not remove it from the Raft consensus group. The node continues participating in cluster management.

```bash
# Drain a manager node - it stops running tasks but stays in the Raft group
docker node update --availability drain manager2
```

After draining, the manager still votes in Raft consensus and can become the leader. It just does not run application containers.

If you need to take the manager fully offline, consider the quorum implications:

| Total Managers | Quorum Needed | Can Lose |
|---------------|---------------|----------|
| 3 | 2 | 1 |
| 5 | 3 | 2 |
| 7 | 4 | 3 |

Before stopping Docker on a manager, make sure enough managers remain for quorum.

```bash
# Check how many managers are currently reachable
docker node ls --filter role=manager
```

## Removing a Worker Node

After draining, remove the node in two steps. First, leave the swarm from the node itself:

```bash
# On the worker node: Leave the swarm
docker swarm leave
```

Then remove the node entry from a manager:

```bash
# On a manager node: Remove the node from the cluster
docker node rm worker1
```

If the node has already left, the `docker node rm` command cleans up its entry. If the node is still joined, `docker node rm` fails unless you force it:

```bash
# Force remove a node that has not left gracefully
docker node rm --force worker1
```

## Removing a Manager Node

Removing a manager is a three-step process:

1. Drain the manager
2. Demote it to a worker
3. Remove it

```bash
# Step 1: Drain the manager
docker node update --availability drain manager3

# Step 2: Demote the manager to a worker (from any other manager)
docker node demote manager3

# Step 3: On manager3, leave the swarm
docker swarm leave

# Step 4: From a remaining manager, remove the node entry
docker node rm manager3
```

Demoting before removing is important. If you remove a manager without demoting, the remaining managers need to adjust the Raft consensus group, which can cause brief disruptions.

## Handling Dead Nodes

Sometimes a node crashes or loses network connectivity without a clean shutdown. The node shows as "Down" in the cluster:

```bash
# Check node status - dead nodes show as "Down"
docker node ls
```

For a dead worker, simply force-remove it:

```bash
# Remove a dead worker node
docker node rm --force dead-worker
```

Swarm has already rescheduled the tasks when the node became unreachable (after the task timeout period).

For a dead manager, the situation is more serious. If you still have quorum, the cluster continues operating:

```bash
# If quorum is maintained, demote and remove the dead manager
docker node demote dead-manager
docker node rm --force dead-manager
```

If quorum is lost (more than half the managers are down), you need to recover the cluster:

```bash
# On a surviving manager: Force a new cluster from this node's state
docker swarm init --force-new-cluster --advertise-addr 10.0.1.10
```

This reinitializes the cluster with only this manager. After recovery, rejoin other managers and workers.

## Bringing a Drained Node Back Online

After maintenance, set the node back to active to allow workloads to schedule on it again.

```bash
# Reactivate a drained node
docker node update --availability active worker1
```

Existing services do not automatically rebalance. Tasks only move to the reactivated node when new tasks are created or when you force a rebalance:

```bash
# Force a service to rebalance across all available nodes
docker service update --force webapp
```

The `--force` flag causes a rolling restart of all tasks, redistributing them across all active nodes.

## Automated Maintenance Script

Here is a script that safely drains a node, waits for task migration, and verifies all tasks have moved:

```bash
#!/bin/bash
# drain-node.sh - Safely drain a Swarm node and verify task migration

NODE_NAME=$1

if [ -z "$NODE_NAME" ]; then
  echo "Usage: $0 <node-name>"
  exit 1
fi

echo "Draining node: $NODE_NAME"
docker node update --availability drain "$NODE_NAME"

# Wait for all tasks to leave the node
echo "Waiting for tasks to migrate..."
while true; do
  # Count running tasks on the drained node
  RUNNING=$(docker node ps "$NODE_NAME" --filter "desired-state=running" -q 2>/dev/null | wc -l)

  if [ "$RUNNING" -eq 0 ]; then
    echo "All tasks have been migrated from $NODE_NAME"
    break
  fi

  echo "  $RUNNING tasks still running on $NODE_NAME, waiting..."
  sleep 5
done

# Show final state
echo ""
echo "Node status:"
docker node ls --filter "name=$NODE_NAME"
echo ""
echo "Remaining tasks on node (should be empty or all Shutdown):"
docker node ps "$NODE_NAME"
```

```bash
# Make the script executable and run it
chmod +x drain-node.sh
./drain-node.sh worker1
```

## Monitoring Drain Operations

Keep an eye on drain operations with these commands:

```bash
# Watch tasks being rescheduled in real time
watch -n 2 'docker node ps worker1 --format "table {{.Name}}\t{{.CurrentState}}\t{{.DesiredState}}"'

# Check all services for tasks in a non-running state
docker service ls --format '{{.Name}}' | while read svc; do
  PENDING=$(docker service ps "$svc" --filter "desired-state=running" --format '{{.CurrentState}}' | grep -c "Pending")
  if [ "$PENDING" -gt 0 ]; then
    echo "$svc has $PENDING pending tasks"
  fi
done

# Verify no tasks are stuck in Pending after drain
docker node ps worker1 --filter "desired-state=running"
```

## Best Practices

**Drain one node at a time.** Draining multiple nodes simultaneously can overwhelm the remaining nodes and cause resource contention.

**Check capacity before draining.** Make sure the remaining nodes have enough CPU and memory to absorb the migrated tasks:

```bash
# Check resource usage across the cluster
docker node ls --format '{{.Hostname}}: {{.Status}}'
```

**Use labels for selective draining.** If only certain services run on specific nodes, labels help you understand the impact:

```bash
# List services that will be affected by draining a node
docker node ps worker1 --format '{{.Name}}'
```

**Schedule maintenance during low traffic.** Even though services remain available during draining, the task migration and container restart can cause brief latency spikes.

## Conclusion

Draining and removing Swarm nodes is a routine operation when done methodically. Drain the node first, wait for all tasks to migrate, then remove it from the cluster. For managers, always demote before removing. For dead nodes, force removal works but monitor the cluster afterward to ensure all services recovered their desired replica count. With these procedures in place, cluster maintenance becomes predictable and safe.
