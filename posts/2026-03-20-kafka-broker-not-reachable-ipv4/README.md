# How to Troubleshoot Kafka Broker Not Reachable on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, IPv4, Troubleshooting, Connection, Broker, Debug

Description: Diagnose and fix Kafka broker connectivity issues on IPv4, including advertised.listeners misconfiguration, port blocks, ZooKeeper/KRaft registration failures, and consumer group errors.

## Introduction

Kafka "broker not reachable" errors can stem from incorrect `advertised.listeners`, firewall blocks, legacy ZooKeeper connectivity issues, KRaft controller connectivity issues, or broker startup failures. This guide provides a systematic diagnosis from basic connectivity through Kafka-specific configuration.

## Initial Connectivity Check

```bash
# Step 1: Is the broker process running?

sudo systemctl status kafka
sudo ps aux | grep kafka

# Step 2: What port is it listening on?
sudo ss -tlnp | grep java | grep -E "9092|9093"

# Step 3: Can you reach the port?
nc -zv 10.0.0.1 9092

# Step 4: Check broker logs
sudo tail -50 /var/log/kafka/server.log
```

## Common Error: Wrong advertised.listeners

```bash
# Symptom: clients connect to bootstrap but then fail
# Error in client: "bootstrap_servers = 10.0.0.1:9092" but
# broker metadata returns different IP

# Check current advertised.listeners
grep advertised.listeners /etc/kafka/server.properties

# Test what metadata clients receive
kafka-broker-api-versions.sh --bootstrap-server 10.0.0.1:9092 2>&1 | head -20

# Fix: ensure advertised.listeners matches the IP clients connect to
# advertised.listeners=PLAINTEXT://10.0.0.1:9092

sudo systemctl restart kafka
```

## Firewall Blocking

```bash
# Kafka uses the listener ports you configured:
# 9092 - common broker/client listener
# 9091 - example separate inter-broker listener
# 9093 - common KRaft controller or alternate broker listener

# Check iptables
sudo iptables -L INPUT -n | grep -E "9091|9092|9093"

# Test from client host
nc -zv 10.0.0.1 9092

# Add firewall rule
sudo ufw allow from 10.0.0.0/24 to any port 9092
```

## ZooKeeper Connectivity (Legacy Kafka 3.x / Classic Mode)

```bash
# Only for legacy ZooKeeper-based Kafka clusters (Kafka 3.x and earlier)
# ZooKeeper-based brokers must register in ZooKeeper
# Check ZooKeeper connection
grep zookeeper.connect /etc/kafka/server.properties
# zookeeper.connect=10.0.0.1:2181,10.0.0.2:2181,10.0.0.3:2181

# Test ZooKeeper connectivity
nc -zv 10.0.0.1 2181

# List broker registrations in ZooKeeper
zookeeper-shell.sh 10.0.0.1:2181 ls /brokers/ids
# Shows: [1, 2, 3] if all brokers registered

# Get broker 1's metadata from ZooKeeper
zookeeper-shell.sh 10.0.0.1:2181 get /brokers/ids/1
# Shows: {"listener_security_protocol_map":{"PLAINTEXT":"PLAINTEXT"},
#         "endpoints":["PLAINTEXT://10.0.0.1:9092"], ...}
```

## KRaft Mode Issues

```bash
# Check KRaft controller connectivity
kafka-metadata-quorum.sh --bootstrap-server 10.0.0.1:9092 describe --status

# Verify KRaft quorum settings
grep -E 'process.roles|controller.quorum.voters|controller.quorum.bootstrap.servers|controller.listener.names' /etc/kafka/server.properties

# Check KRaft logs
sudo grep -i "CONTROLLER\|raft\|leader" /var/log/kafka/server.log | tail -20
```

## Advanced Debugging

```bash
# Enable Kafka debug logging
# Kafka 4.x example config: /etc/kafka/log4j2.yaml
# Set a relevant logger to DEBUG or TRACE, for example:
# - name: kafka.network.Processor
#   level: TRACE

# Or set environment variable:
# export KAFKA_LOG4J_OPTS="-Dlog4j2.configurationFile=/etc/kafka/log4j2.yaml"
#
# Kafka 3.x packages may still use /etc/kafka/log4j.properties with
# export KAFKA_LOG4J_OPTS="-Dlog4j.configuration=file:/etc/kafka/log4j.properties"

# Monitor specific consumer group
kafka-consumer-groups.sh --bootstrap-server 10.0.0.1:9092 \
  --describe --group my-group

# Check topic status and partition leaders
kafka-topics.sh --bootstrap-server 10.0.0.1:9092 --describe --topic my-topic

# Test produce → consume end-to-end
echo "test" | kafka-console-producer.sh --bootstrap-server 10.0.0.1:9092 --topic debug-test
kafka-console-consumer.sh --bootstrap-server 10.0.0.1:9092 --topic debug-test \
  --from-beginning --max-messages 1
```

## Conclusion

Kafka connectivity issues are usually caused by misconfigured `advertised.listeners` (most common), firewall rules blocking listener ports, legacy ZooKeeper outages, KRaft quorum issues, or broker startup failures. Always diagnose in order: process running → port open → firewall → advertised.listeners → ZooKeeper/controller. The `kafka-broker-api-versions.sh` tool is a useful way to verify a broker is reachable and responding to Kafka client requests.
