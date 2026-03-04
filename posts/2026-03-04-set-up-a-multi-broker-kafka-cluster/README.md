# How to Set Up a Multi-Broker Kafka Cluster on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Message Broker, Linux

Description: Learn how to set Up a Multi-Broker Kafka Cluster on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

A multi-broker Kafka cluster provides fault tolerance and higher throughput by distributing partitions across multiple nodes. This guide covers setting up a 3-node Kafka cluster using KRaft mode on RHEL 9.

## Prerequisites

- Three RHEL 9 servers
- Java 17 on all nodes
- Network connectivity between nodes

## Step 1: Install Kafka on All Nodes

Repeat on each node:

```bash
sudo dnf install -y java-17-openjdk
cd /opt
sudo curl -L https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz | sudo tar xz
sudo ln -s kafka_2.13-3.7.0 kafka
sudo useradd -r -s /sbin/nologin kafka
sudo chown -R kafka:kafka /opt/kafka*
```

## Step 2: Configure Node 1

```bash
sudo vi /opt/kafka/config/kraft/server.properties
```

```properties
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@node1:9093,2@node2:9093,3@node3:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
advertised.listeners=PLAINTEXT://node1:9092
inter.broker.listener.name=PLAINTEXT
controller.listener.names=CONTROLLER
log.dirs=/var/lib/kafka/data
num.partitions=3
default.replication.factor=3
min.insync.replicas=2
```

## Step 3: Configure Node 2

Same as Node 1 but change:

```properties
node.id=2
advertised.listeners=PLAINTEXT://node2:9092
```

## Step 4: Configure Node 3

```properties
node.id=3
advertised.listeners=PLAINTEXT://node3:9092
```

## Step 5: Format Storage on All Nodes

Generate the cluster ID on one node and use it everywhere:

```bash
KAFKA_CLUSTER_ID=$(/opt/kafka/bin/kafka-storage.sh random-uuid)
echo $KAFKA_CLUSTER_ID   # Copy this value
```

On each node:

```bash
sudo -u kafka /opt/kafka/bin/kafka-storage.sh format   -t <CLUSTER_ID>   -c /opt/kafka/config/kraft/server.properties
```

## Step 6: Start All Nodes

On each node:

```bash
sudo systemctl enable --now kafka
```

## Step 7: Verify the Cluster

```bash
/opt/kafka/bin/kafka-metadata.sh --snapshot /var/lib/kafka/data/__cluster_metadata-0/00000000000000000000.log --cluster-id <CLUSTER_ID>
```

Create a replicated topic:

```bash
/opt/kafka/bin/kafka-topics.sh --create --topic replicated-test   --bootstrap-server node1:9092,node2:9092,node3:9092   --partitions 6 --replication-factor 3
```

Describe the topic to see partition distribution:

```bash
/opt/kafka/bin/kafka-topics.sh --describe --topic replicated-test   --bootstrap-server node1:9092
```

## Conclusion

A 3-node Kafka cluster with KRaft on RHEL 9 provides fault tolerance for up to one node failure (with replication factor 3 and min.insync.replicas 2). This configuration is the minimum recommended for production deployments.
