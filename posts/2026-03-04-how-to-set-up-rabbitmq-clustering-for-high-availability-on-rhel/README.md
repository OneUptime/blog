# How to Set Up RabbitMQ Clustering for High Availability on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RabbitMQ, Clustering, High Availability, Message Broker

Description: Learn how to set up a RabbitMQ cluster on RHEL with quorum queues for high availability and fault tolerance.

---

RabbitMQ clustering allows multiple nodes to form a single logical broker. Combined with quorum queues, this provides high availability and data safety for your messaging infrastructure.

## Prerequisites

You need at least three RHEL servers with RabbitMQ installed. Ensure DNS or `/etc/hosts` resolution works between all nodes.

```bash
# On all nodes, add host entries
cat << 'HOSTS' | sudo tee -a /etc/hosts
192.168.1.101 rabbit1
192.168.1.102 rabbit2
192.168.1.103 rabbit3
HOSTS
```

## Synchronizing the Erlang Cookie

All cluster nodes must share the same Erlang cookie:

```bash
# On rabbit1, copy the cookie to other nodes
sudo cat /var/lib/rabbitmq/.erlang.cookie
# Copy this value

# On rabbit2 and rabbit3, set the same cookie
sudo systemctl stop rabbitmq-server
echo "SHARED_COOKIE_VALUE" | sudo tee /var/lib/rabbitmq/.erlang.cookie
sudo chown rabbitmq:rabbitmq /var/lib/rabbitmq/.erlang.cookie
sudo chmod 400 /var/lib/rabbitmq/.erlang.cookie
sudo systemctl start rabbitmq-server
```

## Joining Nodes to the Cluster

On rabbit2 and rabbit3:

```bash
# Stop the RabbitMQ application (not the Erlang VM)
sudo rabbitmqctl stop_app

# Reset the node
sudo rabbitmqctl reset

# Join the cluster
sudo rabbitmqctl join_cluster rabbit@rabbit1

# Start the application
sudo rabbitmqctl start_app
```

## Verifying the Cluster

```bash
# Check cluster status from any node
sudo rabbitmqctl cluster_status

# The output should show all three nodes
```

## Configuring Quorum Queues

Quorum queues are Raft-based replicated queues that provide data safety:

```bash
# Create a quorum queue policy
sudo rabbitmqctl set_policy ha-all ".*" \
  '{"queue-type": "quorum"}' \
  --priority 1 \
  --apply-to queues
```

Or declare quorum queues from your application:

```python
import pika

connection = pika.BlockingConnection(
    pika.ConnectionParameters('rabbit1')
)
channel = connection.channel()

# Declare a quorum queue
channel.queue_declare(
    queue='my-queue',
    durable=True,
    arguments={'x-queue-type': 'quorum'}
)
```

## Load Balancing Client Connections

```bash
# Install HAProxy for load balancing
sudo dnf install -y haproxy

# Configure HAProxy for RabbitMQ
cat << 'HAPROXY' | sudo tee /etc/haproxy/haproxy.cfg
frontend rabbitmq_frontend
    bind *:5672
    default_backend rabbitmq_backend

backend rabbitmq_backend
    balance roundrobin
    server rabbit1 192.168.1.101:5672 check
    server rabbit2 192.168.1.102:5672 check
    server rabbit3 192.168.1.103:5672 check
HAPROXY

sudo systemctl enable --now haproxy
```

## Monitoring the Cluster

```bash
# Check node health
sudo rabbitmq-diagnostics check_running
sudo rabbitmq-diagnostics check_local_alarms

# List cluster nodes and their status
sudo rabbitmqctl cluster_status --formatter json | python3 -m json.tool
```

Quorum queues require a majority of nodes to be available (2 out of 3) for writes. Always deploy an odd number of nodes (3 or 5) for proper Raft consensus.
