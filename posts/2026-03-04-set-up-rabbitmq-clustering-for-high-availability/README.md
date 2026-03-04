# How to Set Up RabbitMQ Clustering for High Availability on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RabbitMQ, Message Broker, High Availability, Linux

Description: Learn how to set Up RabbitMQ Clustering for High Availability on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

RabbitMQ clustering connects multiple broker nodes into a single logical broker, providing high availability and increased throughput. With quorum queues, messages are replicated across cluster members for fault tolerance.

## Prerequisites

- Three RHEL 9 servers with RabbitMQ installed
- Network connectivity between nodes
- Matching Erlang cookies on all nodes

## Step 1: Configure Hostnames

On each node, add all cluster members to /etc/hosts:

```bash
sudo vi /etc/hosts
```

```
10.0.1.10 rabbit1
10.0.1.11 rabbit2
10.0.1.12 rabbit3
```

## Step 2: Synchronize Erlang Cookie

Copy the cookie from node 1 to all other nodes:

```bash
# On rabbit1
sudo cat /var/lib/rabbitmq/.erlang.cookie
```

On rabbit2 and rabbit3:

```bash
sudo systemctl stop rabbitmq-server
echo "COOKIE_VALUE" | sudo tee /var/lib/rabbitmq/.erlang.cookie
sudo chown rabbitmq:rabbitmq /var/lib/rabbitmq/.erlang.cookie
sudo chmod 400 /var/lib/rabbitmq/.erlang.cookie
sudo systemctl start rabbitmq-server
```

## Step 3: Join Nodes to Cluster

On rabbit2:

```bash
sudo rabbitmqctl stop_app
sudo rabbitmqctl reset
sudo rabbitmqctl join_cluster rabbit@rabbit1
sudo rabbitmqctl start_app
```

On rabbit3:

```bash
sudo rabbitmqctl stop_app
sudo rabbitmqctl reset
sudo rabbitmqctl join_cluster rabbit@rabbit1
sudo rabbitmqctl start_app
```

## Step 4: Verify Cluster

```bash
sudo rabbitmqctl cluster_status
```

You should see all three nodes listed.

## Step 5: Create Quorum Queues

Quorum queues replicate messages across cluster members:

```bash
rabbitmqadmin declare queue name=ha-queue durable=true   arguments='{"x-queue-type": "quorum"}'
```

## Step 6: Configure a Load Balancer

Point clients to a load balancer that distributes connections across all nodes:

```
# HAProxy or Nginx configuration
upstream rabbitmq {
    server rabbit1:5672;
    server rabbit2:5672;
    server rabbit3:5672;
}
```

## Conclusion

RabbitMQ clustering on RHEL 9 provides high availability through node redundancy and quorum queues for message replication. A three-node cluster tolerates one node failure while maintaining message durability and availability.
