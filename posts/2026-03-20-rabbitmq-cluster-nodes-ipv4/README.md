# How to Set Up a RabbitMQ Cluster on IPv4 Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, Cluster, IPv4, High Availability, Erlang Distribution, Messaging

Description: Configure a RabbitMQ cluster across multiple IPv4 nodes, set up the Erlang cookie for cluster authentication, and join nodes to form a highly available message broker.

## Introduction

A RabbitMQ cluster shares queue definitions, exchanges, bindings, users, and other metadata across nodes. Queue contents are not replicated by clustering alone. All cluster nodes must be able to communicate over the Erlang distribution protocol (default port 25672, also called the cluster bus port). Nodes identify each other by node name, so the hostname part of each node name must resolve correctly on every node.

## Architecture

```text
Node 1: 10.0.0.1 (rabbit@node1)
Node 2: 10.0.0.2 (rabbit@node2)  ─── All connected via Erlang distribution
Node 3: 10.0.0.3 (rabbit@node3)
          ↕ AMQP clients on port 5672
          ↕ Erlang cluster bus on port 25672
```

## Pre-Requisites: Shared Erlang Cookie

```bash
# The Erlang cookie must be identical on all nodes

# Read the existing cookie on node 1:
sudo cat /var/lib/rabbitmq/.erlang.cookie
# Example: ABCDEFGHIJKLMNOP

# Copy to other nodes:
COOKIE=$(sudo cat /var/lib/rabbitmq/.erlang.cookie)
for node in 10.0.0.2 10.0.0.3; do
  ssh $node "echo '$COOKIE' | sudo tee /var/lib/rabbitmq/.erlang.cookie"
  ssh $node "sudo chmod 400 /var/lib/rabbitmq/.erlang.cookie"
  ssh $node "sudo chown rabbitmq:rabbitmq /var/lib/rabbitmq/.erlang.cookie"
  ssh $node "sudo systemctl restart rabbitmq-server"
done
```

## /etc/hosts Configuration (All Nodes)

```bash
# Add all cluster nodes to /etc/hosts on every node
# (Or use DNS with hostnames matching the node names)

# /etc/hosts (on all nodes)
10.0.0.1    node1
10.0.0.2    node2
10.0.0.3    node3
```

## RabbitMQ Configuration

```bash
# /etc/rabbitmq/rabbitmq.conf (on all nodes)

# Cluster formation
cluster_formation.peer_discovery_backend = classic_config
cluster_formation.classic_config.nodes.1 = rabbit@node1
cluster_formation.classic_config.nodes.2 = rabbit@node2
cluster_formation.classic_config.nodes.3 = rabbit@node3

# Listeners
listeners.tcp.default = 5672

# Cluster communication
cluster_partition_handling = pause_minority
```

## Joining Nodes to the Cluster

```bash
# Alternative to peer discovery: manually join nodes

# On Node 2:
sudo rabbitmqctl stop_app
sudo rabbitmqctl join_cluster rabbit@node1
sudo rabbitmqctl start_app

# On Node 3:
sudo rabbitmqctl stop_app
sudo rabbitmqctl join_cluster rabbit@node1
sudo rabbitmqctl start_app

# Verify cluster status (from any node):
sudo rabbitmqctl cluster_status
```

## Firewall Rules for Cluster

```bash
# Ports needed between cluster nodes:
# 4369  - epmd (Erlang Port Mapper Daemon)
# 25672 - Erlang distribution / cluster bus
# 35672-35682 - CLI tool distribution client ports (if CLI tools are used remotely)
# 5672  - AMQP client traffic (open to client networks as needed)
# 15672 - Management UI / HTTP API (optional, open to admin networks as needed)

CLUSTER_NODES="10.0.0.1 10.0.0.2 10.0.0.3"

for node in $CLUSTER_NODES; do
  sudo ufw allow from $node to any port 4369 proto tcp
  sudo ufw allow from $node to any port 25672 proto tcp
done
```

## High Availability Policies

```bash
# Classic mirrored queue policies were removed in RabbitMQ 4.x.
# For high availability, declare quorum queues instead by setting
# x-queue-type = quorum when the queue is declared. Queue type cannot
# be changed later using a policy.

# Quorum queues still support policies for settings such as delivery limits.
sudo rabbitmqctl set_policy qq-overrides "^qq\." \
  '{"delivery-limit":50}' \
  --priority 1 \
  --apply-to "quorum_queues"

# View policies
sudo rabbitmqctl list_policies
```

## Conclusion

RabbitMQ clustering requires the same Erlang cookie on all nodes, matching hostnames in `/etc/hosts`, and open ports 4369 and 25672 between cluster members. Use `join_cluster` or peer discovery in `rabbitmq.conf` to form the cluster. Clustering shares metadata across nodes, but queue contents are replicated only when you use a replicated queue type such as quorum queues; a non-replicated classic queue's messages remain on its leader node and can be lost if that node fails permanently.
