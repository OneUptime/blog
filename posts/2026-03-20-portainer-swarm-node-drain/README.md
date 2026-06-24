# How to Drain and Manage Swarm Nodes from Portainer - Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Node Management, Maintenance, Operation

Description: Drain Docker Swarm nodes for maintenance, manage node availability, and safely remove nodes using Portainer.

## Introduction

Node draining safely removes Swarm service tasks from a Swarm node before maintenance. Portainer provides a GUI for managing node availability states (Active, Pause, Drain). This guide covers the complete node maintenance workflow, including removing nodes from the cluster when needed.

## Node Availability States

- **Active**: Node accepts new tasks and keeps existing ones
- **Pause**: Node keeps existing tasks but doesn't accept new ones
- **Drain**: Node doesn't accept new tasks; existing Swarm service tasks are shut down and rescheduled on available nodes

## Draining a Node via Portainer

1. Go to **Swarm > Details**
2. Under **Nodes**, select the node to drain
3. In **Node Details**, change Availability to **Drain**
4. Apply the update

Watch tasks migrate in **Services**.

## Draining via CLI

```bash
# Run these commands from a swarm manager node

# Check current node status

docker node ls

# Drain a specific node
docker node update --availability drain worker1

# Verify all tasks have migrated
docker node ps worker1 --filter desired-state=running  # Should show no running tasks

# Or check from service perspective
docker service ps myapp_web

# Node is now safe for maintenance
```

## Complete Maintenance Workflow

```bash
#!/bin/bash
# maintenance.sh - Safe node maintenance workflow
# Run this from a swarm manager node

NODE_NAME="${1:-worker1}"

echo "=== Starting maintenance for $NODE_NAME ==="

# Step 1: Get node ID
NODE_ID=$(docker node ls --filter "name=$NODE_NAME" -q)
if [ -z "$NODE_ID" ]; then
  echo "Error: Node $NODE_NAME not found"
  exit 1
fi

echo "[1/5] Node ID: $NODE_ID"

# Step 2: Drain the node
echo "[2/5] Draining node..."
docker node update --availability drain "$NODE_ID"

# Step 3: Wait for tasks to migrate
echo "[3/5] Waiting for task migration..."
TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  RUNNING_TASKS=$(docker node ps "$NODE_ID" --filter desired-state=running -q | wc -l)
  if [ $RUNNING_TASKS -eq 0 ]; then
    echo "All tasks migrated!"
    break
  fi
  echo "  $RUNNING_TASKS tasks still running, waiting..."
  sleep 5
  ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  echo "ERROR: Timed out waiting for task migration."
  echo "Check service constraints, replica counts, and cluster capacity before maintenance."
  exit 1
fi

# Step 4: Perform maintenance (example: OS updates)
echo "[4/5] Performing maintenance..."
# Your maintenance commands here:
# sudo apt-get update && sudo apt-get upgrade -y
# sudo systemctl restart some-service
echo "Maintenance complete"

# Step 5: Return node to service
echo "[5/5] Returning node to active state..."
docker node update --availability active "$NODE_ID"

echo "=== Maintenance complete for $NODE_NAME ==="
docker node ps "$NODE_ID"
```

## Removing a Node from the Swarm

### Remove a Worker Node

```bash
# On the node being removed
docker swarm leave

# From a manager: clean up the departed node
docker node rm worker1
```

### Remove a Manager Node (Demote First)

```bash
# Make sure the swarm will still maintain manager quorum after demotion

# Demote manager to worker first
docker node demote manager3

# Then leave the swarm
# On manager3:
docker swarm leave

# Clean up from remaining manager
docker node rm manager3
```

## Portainer API for Node Management

```bash
# Get all nodes
curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/docker/nodes" \
  | python3 -c "
import sys, json
for n in json.load(sys.stdin):
    print(f'{n[\"Description\"][\"Hostname\"]}: {n[\"Status\"][\"State\"]}, {n[\"Spec\"][\"Availability\"]}')
"

# Get node ID by hostname
NODE_ID=$(curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/docker/nodes" \
  | python3 -c "
import sys, json
nodes = json.load(sys.stdin)
node = next(n for n in nodes if n['Description']['Hostname'] == 'worker1')
print(node['ID'])
")

# Drain via Portainer API
# Fetch the current node object so the update preserves role, labels, and name
NODE_JSON=$(curl -s \
  -H "X-API-Key: your-api-key" \
  "https://portainer.example.com/api/endpoints/1/docker/nodes/$NODE_ID")

VERSION=$(printf '%s' "$NODE_JSON" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['Version']['Index'])")

NODE_SPEC=$(printf '%s' "$NODE_JSON" \
  | python3 -c "
import sys, json
node = json.load(sys.stdin)
spec = node['Spec']
spec['Availability'] = 'drain'
print(json.dumps(spec))
")

curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d "$NODE_SPEC" \
  "https://portainer.example.com/api/endpoints/1/docker/nodes/$NODE_ID/update?version=$VERSION"
```

## Conclusion

Node drain management in Docker Swarm via Portainer enables safer maintenance operations. The drain process gracefully migrates Swarm service tasks before maintenance begins when the cluster has enough capacity and your services can be rescheduled. Portainer's UI and API both provide node availability management, giving operators flexibility in how they manage cluster maintenance workflows.
