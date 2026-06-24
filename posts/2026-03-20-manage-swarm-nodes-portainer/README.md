# How to Manage Swarm Nodes in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Docker Swarm, Portainer, Container Management, DevOps

Description: Learn how to view, inspect, and manage Docker Swarm nodes directly from the Portainer UI.

## Overview

Docker Swarm turns a group of Docker hosts into a single virtual Docker engine. Portainer gives you a graphical interface for day-to-day visibility and common node operations, while the Docker CLI still handles some lifecycle tasks.

## Viewing Swarm Nodes

After connecting Portainer to a Docker Swarm endpoint, navigate to **Swarm > Details** in the left sidebar. In the **Nodes** section, you will see a list of all manager and worker nodes with their:

- **Hostname** and **IP address**
- **Status** (Ready/Down)
- **Availability** (Active/Pause/Drain)
- **Role** (Manager/Worker)
- **Engine version**

## Inspecting a Node

Click on any node name to open the detail view. Here you can see the full node spec including labels, resources, and platform information.

The following CLI commands show the equivalent information via the Docker CLI from a swarm manager node:

```bash
# List all swarm nodes with their status and availability

docker node ls

# Inspect a specific node by its ID or node name
docker node inspect <node-id> --pretty
```

## Changing Node Availability

You can drain a node before maintenance directly from Portainer by clicking the node and selecting **Drain** from the Availability dropdown. This moves Swarm service tasks off the node.

```bash
# Equivalent CLI command to drain a node
docker node update --availability drain <node-id>

# Reactivate a node after maintenance
docker node update --availability active <node-id>
```

## Promoting and Demoting Nodes

Portainer shows the node's current role in the detail view. To change a worker to a manager (or vice versa), use the Docker CLI from a swarm manager node, and make sure you maintain manager quorum while changing roles.

```bash
# Promote a worker to manager via CLI
docker node promote <node-id>

# Demote a manager to worker via CLI
docker node demote <node-id>
```

## Adding Labels to Nodes

Node labels are used for placement constraints. In Portainer, open a node and scroll to the **Labels** section to add key-value pairs.

```bash
# Add a label to a node via CLI
docker node update --label-add env=production <node-id>

# Remove a label from a node
docker node update --label-rm env <node-id>
```

## Removing a Node from the Swarm

To remove a worker node cleanly, have that node leave the swarm first. After it appears as `Down`, remove it from the swarm from a manager node. If the node is a manager, demote it to a worker before having it leave the swarm. Draining is useful before maintenance, but draining alone is not enough for `docker node rm`.

```bash
# Run on the node you want to remove
docker swarm leave

# Remove the down node from the swarm via CLI on a manager node
docker node rm <node-id>
```

## Conclusion

Portainer makes Swarm node management accessible without requiring deep knowledge of Docker CLI commands. Use it to monitor node health, drain nodes for maintenance, and apply labels for workload placement, then use the Docker CLI when you need to change node roles or remove nodes from the swarm.
