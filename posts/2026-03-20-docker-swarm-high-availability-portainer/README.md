# How to Set Up Docker Swarm High Availability with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, High Availability, Clustering, DevOps

Description: Configure a Docker Swarm cluster with multiple manager nodes for high availability, using Portainer to manage services, monitor node health, and handle failovers.

---

Docker Swarm high availability requires multiple manager nodes so the cluster survives individual node failures. The Raft consensus algorithm used by Swarm requires a quorum of managers - always use an odd number (3 or 5). Portainer manages the entire HA Swarm from a single web interface.

## Swarm HA Architecture

```mermaid
graph TB
    Portainer[Portainer] --> Swarm[Docker Swarm Cluster]
    Swarm --> Manager1[Manager Node 1 - Leader]
    Swarm --> Manager2[Manager Node 2]
    Swarm --> Manager3[Manager Node 3]
    Swarm --> Worker1[Worker 1]
    Swarm --> Worker2[Worker 2]
    Swarm --> Worker3[Worker 3]
    Manager1 --- Manager2
    Manager2 --- Manager3
    Manager3 --- Manager1
```

## Step 1: Initialize the Swarm

On the first manager node:

```bash
docker swarm init --advertise-addr <manager1-ip>
```

Save the join tokens:

```bash
# Get manager join token

docker swarm join-token manager

# Get worker join token
docker swarm join-token worker
```

## Step 2: Add Manager Nodes

On the second and third manager nodes:

```bash
docker swarm join \
  --token <manager-join-token> \
  <manager1-ip>:2377
```

## Step 3: Connect Portainer to the Swarm

Deploy Portainer on one manager node and add the Swarm environment. For new multi-node Swarm installs, Portainer recommends the Portainer Agent on each node rather than connecting directly to the Docker socket. Portainer then detects the Swarm and shows all nodes.

## Step 4: Monitor Node Availability in Portainer

Navigate to **Swarm > Details** to see:

- Node role (Manager/Worker)
- Availability (Active/Pause/Drain)
- Node status
- Engine version

## Step 5: Deploy HA Services

Services deployed with multiple replicas are scheduled across eligible worker nodes:

```yaml
version: "3.8"
services:
  api:
    image: my-api:latest
    deploy:
      replicas: 6        # Scheduled on active worker nodes
      restart_policy:
        condition: on-failure
      update_config:
        parallelism: 2
        delay: 10s
      placement:
        constraints:
          - node.role == worker
```

## Step 6: Test Failover

Simulate service failover by setting a worker node to drain:

1. In Portainer > Swarm > Details, select a worker node
2. Set Availability to **Drain**
3. Watch Portainer reschedule replicas to remaining active worker nodes

The cluster remains operational as long as the majority of managers are reachable (2 of 3). Draining a manager keeps it in the quorum and only prevents new tasks from being scheduled there.

## Summary

Docker Swarm HA with an odd number of manager nodes lets the control plane tolerate manager failures, and replicated services can be rescheduled when a worker becomes unavailable. Portainer's Swarm details view gives operators real-time visibility into cluster health, making it easy to identify and respond to node failures before they cascade.
