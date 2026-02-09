# How to Set Up Docker Swarm with Multiple Manager Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Swarm, High Availability, Cluster Management, DevOps, Container Orchestration

Description: Learn how to configure a Docker Swarm cluster with multiple manager nodes for high availability and fault tolerance.

---

A single-manager Docker Swarm works fine for development, but in production, losing that one manager means losing control of the entire cluster. Workers keep running their tasks, but you cannot deploy, scale, or update services until the manager comes back. Multiple manager nodes solve this by distributing the control plane across several machines, allowing the cluster to survive manager failures.

This guide covers setting up a multi-manager Swarm, understanding the Raft consensus algorithm that powers it, and best practices for maintaining a healthy cluster.

## How Swarm Manager Consensus Works

Docker Swarm managers use the Raft consensus algorithm to maintain a consistent cluster state. Raft requires a majority (quorum) of managers to agree before any change takes effect. This means:

- **3 managers**: Tolerates 1 failure (quorum = 2)
- **5 managers**: Tolerates 2 failures (quorum = 3)
- **7 managers**: Tolerates 3 failures (quorum = 4)

Always use an odd number of managers. Even numbers provide no additional fault tolerance over the odd number below them (4 managers still only tolerate 1 failure, same as 3).

For most production deployments, 3 or 5 managers is the sweet spot. Seven is the maximum Docker recommends because more managers increase the overhead of consensus without meaningful benefit.

## Prerequisites

You need at least three machines (physical or virtual) with:

- Docker Engine installed on each
- Network connectivity between all nodes on ports 2377 (cluster management), 7946 (node communication), and 4789 (overlay networking)
- Unique hostnames

For this guide, we will use:

| Hostname | IP Address | Role |
|----------|-----------|------|
| manager1 | 10.0.1.10 | Manager (Leader) |
| manager2 | 10.0.1.11 | Manager |
| manager3 | 10.0.1.12 | Manager |
| worker1  | 10.0.1.20 | Worker |
| worker2  | 10.0.1.21 | Worker |

## Step 1: Initialize the Swarm

On the first manager node, initialize the swarm. The `--advertise-addr` flag tells other nodes which IP to use for cluster communication.

```bash
# On manager1: Initialize the swarm cluster
docker swarm init --advertise-addr 10.0.1.10
```

The output includes two join tokens, one for managers and one for workers. Save both.

```
Swarm initialized: current node (abc123def456) is now a manager.

To add a worker to this swarm, run the following command:
    docker swarm join --token SWMTKN-1-worker-token 10.0.1.10:2377

To add a manager to this swarm, run:
    docker swarm join-token manager
```

If you lose the tokens, retrieve them later:

```bash
# Retrieve the manager join token
docker swarm join-token manager

# Retrieve the worker join token
docker swarm join-token worker
```

## Step 2: Join Additional Managers

On manager2 and manager3, run the join command with the manager token.

```bash
# On manager2: Join the swarm as a manager
docker swarm join \
  --token SWMTKN-1-xxxxx-manager-token \
  --advertise-addr 10.0.1.11 \
  10.0.1.10:2377
```

```bash
# On manager3: Join the swarm as a manager
docker swarm join \
  --token SWMTKN-1-xxxxx-manager-token \
  --advertise-addr 10.0.1.12 \
  10.0.1.10:2377
```

## Step 3: Join Worker Nodes

On the worker machines, use the worker join token.

```bash
# On worker1: Join the swarm as a worker
docker swarm join \
  --token SWMTKN-1-xxxxx-worker-token \
  10.0.1.10:2377
```

```bash
# On worker2: Join the swarm as a worker
docker swarm join \
  --token SWMTKN-1-xxxxx-worker-token \
  10.0.1.10:2377
```

## Step 4: Verify the Cluster

Back on any manager node, list all nodes:

```bash
# List all nodes in the swarm with their roles and status
docker node ls
```

Expected output:

```
ID              HOSTNAME   STATUS   AVAILABILITY   MANAGER STATUS   ENGINE VERSION
abc123 *        manager1   Ready    Active         Leader           24.0.7
def456          manager2   Ready    Active         Reachable        24.0.7
ghi789          manager3   Ready    Active         Reachable        24.0.7
jkl012          worker1    Ready    Active                          24.0.7
mno345          worker2    Ready    Active                          24.0.7
```

Notice the `MANAGER STATUS` column. One manager is the `Leader` (handles all Raft log entries), and the others are `Reachable` (participate in quorum and can become leader if needed).

## Step 5: Open Required Firewall Ports

Make sure all required ports are open between nodes. Here is an example using `ufw`:

```bash
# Allow Docker Swarm cluster management traffic
sudo ufw allow 2377/tcp

# Allow node-to-node communication
sudo ufw allow 7946/tcp
sudo ufw allow 7946/udp

# Allow overlay network traffic (VXLAN)
sudo ufw allow 4789/udp

# Reload the firewall
sudo ufw reload
```

For `firewalld`:

```bash
# Open Swarm ports with firewalld
sudo firewall-cmd --permanent --add-port=2377/tcp
sudo firewall-cmd --permanent --add-port=7946/tcp
sudo firewall-cmd --permanent --add-port=7946/udp
sudo firewall-cmd --permanent --add-port=4789/udp
sudo firewall-cmd --reload
```

## Testing Fault Tolerance

Let us verify that the cluster survives a manager failure.

```bash
# On manager1: Deploy a test service
docker service create --name nginx-test --replicas 6 -p 80:80 nginx:alpine

# Verify the service is running
docker service ps nginx-test
```

Now simulate a failure by stopping Docker on one manager:

```bash
# On manager2: Stop Docker to simulate a failure
sudo systemctl stop docker
```

Back on manager1 or manager3:

```bash
# Check the cluster state - the cluster should still be operational
docker node ls
```

Manager2 shows as `Unreachable`, but the cluster continues operating because two out of three managers maintain quorum. You can still deploy, scale, and manage services.

Bring the failed manager back:

```bash
# On manager2: Restart Docker
sudo systemctl start docker
```

The node automatically rejoins and synchronizes with the current cluster state.

## Promoting and Demoting Nodes

You can change a node's role at any time.

```bash
# Promote a worker to manager
docker node promote worker1

# Demote a manager to worker
docker node demote manager3

# Verify the change
docker node ls
```

This is useful for maintenance. Before taking a manager offline for extended work, promote a worker to maintain the quorum count.

## Leader Election

When the leader becomes unavailable, the remaining managers hold an election. The election takes about 2-5 seconds, during which the cluster cannot process new management commands. Existing workloads continue running uninterrupted.

You cannot choose which manager becomes the leader. Raft handles the election automatically. However, you can force a leader transfer by demoting the current leader (it will step down and another manager takes over).

## Backup and Disaster Recovery

Even with multiple managers, backing up the Swarm state protects against catastrophic failures where all managers are lost simultaneously.

```bash
# On a manager node: Stop Docker and back up the Swarm state
sudo systemctl stop docker
sudo tar -czf swarm-backup.tar.gz /var/lib/docker/swarm
sudo systemctl start docker
```

To restore from a backup on a fresh machine:

```bash
# Restore Swarm state and reinitialize
sudo systemctl stop docker
sudo rm -rf /var/lib/docker/swarm
sudo tar -xzf swarm-backup.tar.gz -C /
sudo systemctl start docker

# Force a new cluster from this single node's state
docker swarm init --force-new-cluster --advertise-addr 10.0.1.10
```

After restoring, rejoin the other managers and workers.

## Best Practices

**Spread managers across failure domains.** Put managers in different availability zones, racks, or data centers. Three managers in the same rack provide no protection against a rack-level failure.

**Keep manager nodes dedicated.** Run workloads on worker nodes only. Managers should focus on cluster management. Restrict scheduling with:

```bash
# Prevent workloads from running on manager nodes
docker node update --availability drain manager1
docker node update --availability drain manager2
docker node update --availability drain manager3
```

**Monitor manager health.** Check the Raft log and manager status regularly:

```bash
# Inspect manager status details
docker info --format '{{.Swarm.Managers}}'
docker node inspect manager1 --format '{{.ManagerStatus}}'
```

**Rotate join tokens periodically.** If a token is compromised, rotate it:

```bash
# Rotate the worker join token
docker swarm join-token --rotate worker

# Rotate the manager join token
docker swarm join-token --rotate manager
```

## Conclusion

A multi-manager Docker Swarm provides the high availability that production workloads demand. Three managers give you tolerance for one failure, and five managers cover two simultaneous failures. The key principles are simple: use odd numbers, spread managers across failure domains, keep managers free from application workloads, and maintain regular backups. With these practices in place, your Swarm cluster stays operational even when individual nodes go down.
