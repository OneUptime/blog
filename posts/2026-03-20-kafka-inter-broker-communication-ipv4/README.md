# How to Configure Kafka Inter-Broker Communication on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, IPv4, Inter-Broker, Replication, Clustering, Messaging

Description: Configure Apache Kafka inter-broker communication using dedicated IPv4 listeners, set the inter.broker.listener.name, and secure broker-to-broker traffic.

## Introduction

In a Kafka cluster, brokers communicate with each other for partition leadership, log replication, and metadata synchronization. Isolating this traffic on a dedicated listener and internal network improves security and allows separate firewall rules for broker-to-broker vs. client traffic.

## Configuration

```properties
# /etc/kafka/server.properties (Broker 1: 10.0.0.1)

broker.id=1

# Two listeners: one for clients, one for broker-to-broker

listeners=CLIENT://10.0.0.1:9092,BROKER://10.0.0.1:9091

# Advertise both endpoints; clients use CLIENT, brokers use BROKER
advertised.listeners=CLIENT://10.0.0.1:9092,BROKER://10.0.0.1:9091

# Map listener names to security protocols
listener.security.protocol.map=CLIENT:PLAINTEXT,BROKER:PLAINTEXT

# Use BROKER listener for replication and metadata
inter.broker.listener.name=BROKER
```

```properties
# Broker 2: 10.0.0.2
broker.id=2
listeners=CLIENT://10.0.0.2:9092,BROKER://10.0.0.2:9091
advertised.listeners=CLIENT://10.0.0.2:9092,BROKER://10.0.0.2:9091
listener.security.protocol.map=CLIENT:PLAINTEXT,BROKER:PLAINTEXT
inter.broker.listener.name=BROKER
```

## Zookeeper or KRaft for Controller

```properties
# KRaft mode with a static controller quorum - no ZooKeeper needed
# Controller communication uses a dedicated port too
process.roles=broker,controller
node.id=1

listeners=CLIENT://10.0.0.1:9092,BROKER://10.0.0.1:9091,CONTROLLER://10.0.0.1:9093
advertised.listeners=CLIENT://10.0.0.1:9092,BROKER://10.0.0.1:9091

listener.security.protocol.map=CLIENT:PLAINTEXT,BROKER:PLAINTEXT,CONTROLLER:PLAINTEXT

controller.quorum.voters=1@10.0.0.1:9093,2@10.0.0.2:9093,3@10.0.0.3:9093
controller.listener.names=CONTROLLER
inter.broker.listener.name=BROKER
```

## Firewall Rules

```bash
#!/bin/bash
# Kafka inter-broker firewall rules

BROKER_IPS="10.0.0.1 10.0.0.2 10.0.0.3"

# Open broker-to-broker port (9091) only between brokers
for broker in $BROKER_IPS; do
  sudo iptables -A INPUT -p tcp --dport 9091 -s $broker -j ACCEPT
done
sudo iptables -A INPUT -p tcp --dport 9091 -j DROP   # Block from clients

# Open controller port between brokers/controllers
for broker in $BROKER_IPS; do
  sudo iptables -A INPUT -p tcp --dport 9093 -s $broker -j ACCEPT
done
sudo iptables -A INPUT -p tcp --dport 9093 -j DROP

# Client access on 9092
sudo iptables -A INPUT -p tcp --dport 9092 -s 10.0.1.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 9092 -j DROP
```

## Verifying Inter-Broker Communication

```bash
# Check replication status
kafka-topics.sh --bootstrap-server 10.0.0.1:9092 --describe --topic my-topic
# Look for: Replicas, Isr (In-Sync Replicas)

# Check broker connectivity
kafka-broker-api-versions.sh --bootstrap-server 10.0.0.1:9091

# Check consumer lag separately
kafka-consumer-groups.sh --bootstrap-server 10.0.0.1:9092 \
  --describe --group my-group

# Check Kafka logs for inter-broker errors
sudo grep -i "replica\|fetch\|leader" /var/log/kafka/server.log | tail -20
```

## Conclusion

Separate Kafka client and inter-broker traffic using dedicated listeners (e.g., CLIENT on port 9092, BROKER on port 9091), and advertise both listeners so clients use CLIENT while brokers use BROKER. Set `inter.broker.listener.name=BROKER` so broker-to-broker replication uses the internal listener. Apply firewall rules to allow port 9091 only between broker IPs and block it from client networks. In KRaft mode, add a CONTROLLER listener for the metadata quorum traffic.
