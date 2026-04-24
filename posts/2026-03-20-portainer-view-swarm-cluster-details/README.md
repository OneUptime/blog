# How to View Swarm Cluster Details in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Monitoring, DevOps

Description: Learn how to view and interpret Docker Swarm cluster details, node information, and cluster health in Portainer.

## Introduction

Portainer provides a comprehensive view of your Docker Swarm cluster, including node status, available CPU and memory, and cluster-wide service distribution. Understanding how to navigate these views helps you monitor cluster health and quickly identify issues. This guide covers the main ways to inspect your Swarm cluster through Portainer.

## Prerequisites

- A Docker Swarm environment added to Portainer
- At least one manager node
- Access to the environment in Portainer

## Step 1: Access the Swarm Environment

1. Log in to Portainer
2. On the **Home** screen, click on your Swarm environment
3. The Swarm environment dashboard loads

## Step 2: View the Dashboard Overview

The Swarm dashboard shows cluster information and summary tiles for:

- Nodes in the cluster and a link to the cluster visualizer
- Stacks
- Services
- Containers
- Images
- Networks
- Volumes

## Step 3: View Swarm Node Details

Navigate to **Swarm** in the sidebar to see cluster and node details:

### Cluster Information

```text
Nodes:              5
Docker API Version: 1.45
Total CPU:          20
Total Memory:       39.0 GiB
```

### Node Table

Each node shows:

| Column | Description |
|--------|-------------|
| Hostname | Node hostname |
| Role | Manager or Worker |
| IP Address | Node IP address |
| CPUs / Memory | Resources available on the node |
| Status | Node state such as Ready or Down |
| Availability | Active, Pause, or Drain |
| Engine Version | Docker engine version |

## Step 4: Inspect a Specific Node

Click on a node name to see detailed information:

```text
Hostname:          worker-01
Role:              Worker
Status:            Ready
Availability:      Active
OS:                linux
CPU Count:         4
Memory:            7.78 GiB
Engine Version:    24.0.7
Labels:
  - zone=us-east-1a
  - ssd=true
```

## Step 5: View Running Service Tasks

To inspect the tasks that make up a Swarm service:

```text
Service: web_frontend
──────────────────────────────────────────────────────
Task                 Current State
web_frontend.1       Running 2 minutes ago
web_frontend.2       Running 2 minutes ago
web_frontend.3       Running 2 minutes ago
```

1. Navigate to **Services**
2. Click the down-arrow to the left of the service you want to inspect
3. The tasks that make up the service are shown

For a cluster-wide view of which node tasks are running on, use the cluster visualizer in the next step.

## Step 6: View Swarm Visualizer

Portainer includes a visual representation of your Swarm cluster. To access it:

1. Navigate to **Swarm → Cluster visualizer**
2. The visualizer shows the nodes in your cluster and the tasks on each node

## Step 7: Review Node Resource Information

Portainer's Swarm views show the CPUs and total memory available on each node:

1. Go to **Swarm**
2. Review the **Nodes** table for per-node CPU and memory
3. Click a node name to open its overview for host and engine details

For live per-node CPU and memory utilization, deploy a monitoring stack such as Prometheus + Grafana.

## Step 8: Check Cluster Network Information

View overlay networks used for inter-service communication:

1. Navigate to **Networks** in the sidebar
2. Look for networks with **Overlay** driver
3. Click a network to see:
   - Network ID
   - Driver and scope
   - IP address ranges (IPAM)

```bash
# View overlay networks from CLI

docker network ls --filter driver=overlay

# Inspect a specific overlay network
docker network inspect ingress
```

## Step 9: View Swarm Configs and Secrets

Docker Swarm configs and secrets are cluster-wide:

- **Configs** → Navigate to **Configs**
- **Secrets** → Navigate to **Secrets**

These are distinct from environment variables - configs and secrets are distributed to containers that reference them in service definitions.

## Interpreting Node Status

| Status | Availability | Meaning |
|--------|-------------|---------|
| Ready | Active | Node is healthy and accepts tasks |
| Ready | Pause | Node is healthy but won't receive new tasks |
| Ready | Drain | Node is draining; service tasks are rescheduled |
| Down | - | Node is unreachable and cannot run new service tasks |

## Troubleshooting Unhealthy Nodes

```bash
# Check why a node is down
docker node inspect worker-01 --pretty

# Force remove an inaccessible node
docker node rm --force worker-01

# Update a node's availability
docker node update --availability pause worker-01
docker node update --availability active worker-01
```

## Conclusion

Portainer's Swarm cluster views give you solid visibility into your multi-node Docker infrastructure. Regularly review node status, task distribution, and available cluster capacity to proactively identify and resolve issues before they impact your applications. Use the cluster visualizer for a quick cluster overview and the node detail views for host and engine details.
