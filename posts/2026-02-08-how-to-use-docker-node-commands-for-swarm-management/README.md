# How to Use docker node Commands for Swarm Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Swarm, Container Orchestration, Node Management, DevOps

Description: Learn how to manage Docker Swarm nodes with docker node commands for inspecting, promoting, demoting, and removing nodes in your cluster.

---

Docker Swarm gives you native clustering for Docker engines. At the heart of every Swarm cluster sit the nodes - individual Docker hosts that participate in the swarm. Managing these nodes well is the difference between a stable production cluster and a fragile one that breaks at the worst possible time.

This guide walks you through every `docker node` subcommand with practical examples you can run on your own Swarm cluster.

## Prerequisites

Before diving in, you need a working Docker Swarm. If you do not have one, initialize it on your current machine.

This command initializes a new Swarm cluster with the current machine as the manager:

```bash
docker swarm init --advertise-addr 192.168.1.100
```

This produces a join token. Use it on other machines to add worker nodes:

```bash
docker swarm join --token SWMTKN-1-abc123... 192.168.1.100:2377
```

Once you have at least two or three nodes, you are ready to start managing them.

## Listing Nodes

The first command you will use most often is `docker node ls`. It shows every node in the swarm, its status, availability, and role.

List all nodes in the current Swarm cluster:

```bash
docker node ls
```

The output looks something like this:

```
ID                            HOSTNAME   STATUS    AVAILABILITY   MANAGER STATUS   ENGINE VERSION
abc123def456 *                manager1   Ready     Active         Leader           24.0.7
ghi789jkl012                  worker1    Ready     Active                          24.0.7
mno345pqr678                  worker2    Ready     Active                          24.0.7
```

The asterisk marks the node you are currently connected to. Pay attention to the AVAILABILITY column - it tells you whether the node accepts new tasks.

You can also format the output for scripting purposes. This filters the listing to show only node IDs and hostnames in a table format:

```bash
docker node ls --format "table {{.ID}}\t{{.Hostname}}\t{{.Status}}\t{{.Availability}}"
```

For JSON output that you can pipe into `jq` or other tools:

```bash
docker node ls --format json
```

## Inspecting Nodes

When you need detailed information about a specific node, `docker node inspect` is your tool. It returns the full configuration and state of that node in JSON format.

Inspect a node by hostname or ID to see its full configuration:

```bash
docker node inspect worker1
```

The output is verbose. To make it readable, use the `--pretty` flag:

```bash
docker node inspect --pretty worker1
```

This gives you a clean summary including the node's ID, hostname, platform details, resources, engine version, and current status.

You can extract specific fields with Go templates. This pulls just the IP address of a node:

```bash
docker node inspect --format '{{.Status.Addr}}' worker1
```

This is useful when writing automation scripts that need node addresses for health checks or load balancer configuration.

## Viewing Tasks Running on a Node

To see what containers are running on a specific node, use `docker node ps`. This is extremely helpful for debugging when a service is not behaving correctly.

Show all tasks assigned to a specific node:

```bash
docker node ps worker1
```

To see tasks across all nodes at once:

```bash
docker node ps $(docker node ls -q)
```

You can filter tasks by their desired state. This shows only running tasks, excluding completed or failed ones:

```bash
docker node ps worker1 --filter desired-state=running
```

## Promoting and Demoting Nodes

In a production Swarm cluster, you want multiple manager nodes for high availability. Docker recommends an odd number of managers (3, 5, or 7) to maintain quorum.

Promote a worker node to manager status for high availability:

```bash
docker node promote worker1
```

This is equivalent to running:

```bash
docker node update --role manager worker1
```

If you need to take a manager offline for maintenance or reduce the number of managers, demote it first.

Demote a manager node back to worker status:

```bash
docker node demote worker1
```

Never demote a manager if doing so would break quorum. With three managers, you can lose one. With five, you can lose two. Check your manager count before demoting:

```bash
docker node ls --filter role=manager
```

## Updating Node Configuration

The `docker node update` command lets you modify labels, availability, and roles on existing nodes.

### Setting Node Availability

Three availability states exist: `active`, `pause`, and `drain`.

Set a node to drain mode before performing maintenance - this migrates all tasks off the node:

```bash
docker node update --availability drain worker1
```

When maintenance is complete, bring the node back to active:

```bash
docker node update --availability active worker1
```

Pause mode stops new tasks from being scheduled on the node but keeps existing tasks running:

```bash
docker node update --availability pause worker1
```

### Adding and Removing Labels

Labels let you control which nodes run which services. This is critical for placing GPU workloads on GPU nodes, or keeping databases on nodes with SSD storage.

Add a label to a node to control service placement:

```bash
docker node update --label-add env=production worker1
docker node update --label-add disk=ssd worker1
docker node update --label-add gpu=true worker2
```

Remove a label when it no longer applies:

```bash
docker node update --label-rm gpu worker2
```

After setting labels, you can use placement constraints in your services:

```bash
docker service create \
  --name my-db \
  --constraint 'node.labels.disk==ssd' \
  --replicas 1 \
  postgres:16
```

You can verify labels on a node with inspect:

```bash
docker node inspect --format '{{.Spec.Labels}}' worker1
```

## Removing Nodes from the Swarm

Sometimes you need to permanently remove a node. The process differs depending on whether the node is reachable or not.

If the node is still online, leave the swarm from that node first:

```bash
# Run this ON the node being removed
docker swarm leave
```

Then, from a manager, remove the node from the cluster:

```bash
docker node rm worker1
```

If a node crashed and is unreachable, force the removal from a manager:

```bash
docker node rm --force worker1
```

## Practical Example: Rolling Maintenance

Here is a complete workflow for performing maintenance on each worker node in a three-node cluster without downtime.

This script drains each worker node one at a time, waits for tasks to migrate, performs maintenance, and restores the node:

```bash
#!/bin/bash
# rolling-maintenance.sh
# Performs rolling maintenance on all worker nodes

WORKERS=$(docker node ls --filter role=worker --format '{{.Hostname}}')

for NODE in $WORKERS; do
  echo "Starting maintenance on $NODE"

  # Drain the node so tasks migrate to other nodes
  docker node update --availability drain "$NODE"

  # Wait for tasks to migrate off the node
  echo "Waiting for tasks to drain..."
  sleep 30

  # Verify no running tasks remain on this node
  RUNNING=$(docker node ps "$NODE" --filter desired-state=running --format '{{.ID}}' | wc -l)
  if [ "$RUNNING" -gt 0 ]; then
    echo "Warning: $RUNNING tasks still running on $NODE"
    sleep 30
  fi

  # Perform your maintenance here (e.g., apt upgrade, reboot, etc.)
  echo "Perform maintenance on $NODE now..."
  # ssh $NODE "sudo apt update && sudo apt upgrade -y && sudo reboot"
  # sleep 120  # Wait for reboot

  # Bring the node back online
  docker node update --availability active "$NODE"
  echo "Maintenance complete on $NODE"

  # Wait before moving to next node
  sleep 10
done

echo "Rolling maintenance complete on all workers."
```

## Monitoring Node Health

You can build a simple health check script that alerts you when nodes go down.

This script checks node status and prints warnings for any node that is not Ready:

```bash
#!/bin/bash
# check-node-health.sh
# Monitors Swarm node health and reports issues

docker node ls --format '{{.Hostname}} {{.Status}} {{.Availability}}' | while read HOSTNAME STATUS AVAIL; do
  if [ "$STATUS" != "Ready" ]; then
    echo "ALERT: Node $HOSTNAME status is $STATUS"
  fi
  if [ "$AVAIL" == "Drain" ]; then
    echo "INFO: Node $HOSTNAME is in drain mode"
  fi
done
```

## Quick Reference

Here is a summary of every `docker node` subcommand:

| Command | Purpose |
|---------|---------|
| `docker node ls` | List all nodes in the swarm |
| `docker node inspect` | Show detailed info about a node |
| `docker node ps` | List tasks running on a node |
| `docker node promote` | Promote a worker to manager |
| `docker node demote` | Demote a manager to worker |
| `docker node update` | Update node settings (labels, availability, role) |
| `docker node rm` | Remove a node from the swarm |

## Conclusion

The `docker node` commands give you full control over your Swarm cluster topology. Whether you are scaling up by adding nodes, performing rolling maintenance with drain mode, or organizing workloads with labels, these commands are essential tools for cluster operations. Start with `docker node ls` and `docker node inspect` to understand your cluster state, then use `update` and `promote/demote` to shape it to your needs.
