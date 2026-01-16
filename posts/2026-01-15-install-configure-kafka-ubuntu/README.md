# How to Install and Configure Kafka on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Kafka, Streaming, Message Queue, Big Data, Tutorial

Description: Comprehensive guide to installing Apache Kafka on Ubuntu for high-throughput distributed streaming and event-driven architectures.

---

Apache Kafka is a distributed streaming platform for building real-time data pipelines and streaming applications. It handles trillions of events per day in production at companies like LinkedIn, Netflix, and Uber. This guide covers installation, configuration, and basic operations on Ubuntu.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Java 11 or later
- At least 4GB RAM (8GB+ for production)
- Root or sudo access

## Install Java

Kafka requires Java:

```bash
# Install OpenJDK 11
sudo apt update
sudo apt install openjdk-11-jdk -y

# Verify Java installation
java -version

# Set JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64' | sudo tee -a /etc/profile.d/java.sh
source /etc/profile.d/java.sh
```

## Download and Install Kafka

```bash
# Create Kafka user
sudo useradd -r -s /usr/sbin/nologin kafka

# Download Kafka (check for latest version)
cd /opt
sudo wget https://downloads.apache.org/kafka/3.6.1/kafka_2.13-3.6.1.tgz

# Extract
sudo tar -xzf kafka_2.13-3.6.1.tgz
sudo mv kafka_2.13-3.6.1 kafka

# Set ownership
sudo chown -R kafka:kafka /opt/kafka

# Create data directories
sudo mkdir -p /var/lib/kafka/data
sudo mkdir -p /var/lib/zookeeper
sudo chown -R kafka:kafka /var/lib/kafka
sudo chown -R kafka:kafka /var/lib/zookeeper
```

## Configure ZooKeeper

Kafka uses ZooKeeper for cluster coordination (KRaft mode available in newer versions).

```bash
# Edit ZooKeeper configuration
sudo nano /opt/kafka/config/zookeeper.properties
```

```properties
# Data directory
dataDir=/var/lib/zookeeper

# Client port
clientPort=2181

# Disable admin server
admin.enableServer=false

# Tick time in milliseconds
tickTime=2000

# Init limit (ticks to sync)
initLimit=5

# Sync limit (ticks to sync)
syncLimit=2

# Maximum connections
maxClientCnxns=60
```

### Create ZooKeeper Service

```bash
sudo nano /etc/systemd/system/zookeeper.service
```

```ini
[Unit]
Description=Apache ZooKeeper
Documentation=http://zookeeper.apache.org
Requires=network.target
After=network.target

[Service]
Type=simple
User=kafka
Group=kafka
Environment="JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64"
ExecStart=/opt/kafka/bin/zookeeper-server-start.sh /opt/kafka/config/zookeeper.properties
ExecStop=/opt/kafka/bin/zookeeper-server-stop.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Configure Kafka Broker

```bash
sudo nano /opt/kafka/config/server.properties
```

```properties
# Broker ID (unique per broker)
broker.id=0

# Listeners
listeners=PLAINTEXT://localhost:9092
advertised.listeners=PLAINTEXT://localhost:9092

# Log directories
log.dirs=/var/lib/kafka/data

# Number of partitions for auto-created topics
num.partitions=3

# Replication factor for offsets topic
offsets.topic.replication.factor=1

# Transaction state replication
transaction.state.log.replication.factor=1
transaction.state.log.min.isr=1

# Log retention
log.retention.hours=168
log.retention.bytes=1073741824
log.segment.bytes=1073741824

# Log cleanup
log.cleanup.policy=delete

# ZooKeeper connection
zookeeper.connect=localhost:2181
zookeeper.connection.timeout.ms=18000

# Auto create topics
auto.create.topics.enable=true

# Delete topics
delete.topic.enable=true

# Group coordinator
group.initial.rebalance.delay.ms=0

# Socket settings
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
socket.request.max.bytes=104857600

# Network threads
num.network.threads=3
num.io.threads=8
```

### Create Kafka Service

```bash
sudo nano /etc/systemd/system/kafka.service
```

```ini
[Unit]
Description=Apache Kafka
Documentation=http://kafka.apache.org
Requires=zookeeper.service
After=zookeeper.service

[Service]
Type=simple
User=kafka
Group=kafka
Environment="JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64"
Environment="KAFKA_HEAP_OPTS=-Xmx1G -Xms1G"
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Start ZooKeeper
sudo systemctl start zookeeper
sudo systemctl enable zookeeper

# Start Kafka
sudo systemctl start kafka
sudo systemctl enable kafka

# Check status
sudo systemctl status zookeeper
sudo systemctl status kafka
```

## Basic Operations

### Create Topic

```bash
# Create topic with 3 partitions
/opt/kafka/bin/kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --partitions 3 \
  --replication-factor 1
```

### List Topics

```bash
/opt/kafka/bin/kafka-topics.sh --list \
  --bootstrap-server localhost:9092
```

### Describe Topic

```bash
/opt/kafka/bin/kafka-topics.sh --describe \
  --bootstrap-server localhost:9092 \
  --topic my-topic
```

### Produce Messages

```bash
# Start producer (interactive)
/opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic my-topic

# Type messages, press Enter to send
# Ctrl+C to exit
```

### Consume Messages

```bash
# Consume from beginning
/opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --from-beginning

# Consume new messages only
/opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic my-topic
```

### Delete Topic

```bash
/opt/kafka/bin/kafka-topics.sh --delete \
  --bootstrap-server localhost:9092 \
  --topic my-topic
```

## KRaft Mode (Without ZooKeeper)

Kafka 3.3+ supports KRaft mode without ZooKeeper:

```bash
# Generate cluster ID
KAFKA_CLUSTER_ID=$(/opt/kafka/bin/kafka-storage.sh random-uuid)

# Format storage
/opt/kafka/bin/kafka-storage.sh format \
  -t $KAFKA_CLUSTER_ID \
  -c /opt/kafka/config/kraft/server.properties

# Update KRaft config
sudo nano /opt/kafka/config/kraft/server.properties
```

```properties
# KRaft server properties
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
advertised.listeners=PLAINTEXT://localhost:9092
controller.listener.names=CONTROLLER
log.dirs=/var/lib/kafka/kraft-data
```

```bash
# Start in KRaft mode
/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties
```

## Multi-Broker Cluster

For production, run multiple brokers:

### Broker 1 (server-1.properties)

```properties
broker.id=1
listeners=PLAINTEXT://192.168.1.10:9092
log.dirs=/var/lib/kafka/data
zookeeper.connect=192.168.1.10:2181,192.168.1.11:2181,192.168.1.12:2181
```

### Broker 2 (server-2.properties)

```properties
broker.id=2
listeners=PLAINTEXT://192.168.1.11:9092
log.dirs=/var/lib/kafka/data
zookeeper.connect=192.168.1.10:2181,192.168.1.11:2181,192.168.1.12:2181
```

### Create Replicated Topic

```bash
/opt/kafka/bin/kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic replicated-topic \
  --partitions 6 \
  --replication-factor 3
```

## Security Configuration

### Enable SASL Authentication

```bash
sudo nano /opt/kafka/config/server.properties
```

```properties
# SASL configuration
listeners=SASL_PLAINTEXT://localhost:9092
advertised.listeners=SASL_PLAINTEXT://localhost:9092
security.inter.broker.protocol=SASL_PLAINTEXT
sasl.mechanism.inter.broker.protocol=PLAIN
sasl.enabled.mechanisms=PLAIN
```

Create JAAS config:

```bash
sudo nano /opt/kafka/config/kafka_server_jaas.conf
```

```
KafkaServer {
    org.apache.kafka.common.security.plain.PlainLoginModule required
    username="admin"
    password="admin-secret"
    user_admin="admin-secret"
    user_producer="producer-secret"
    user_consumer="consumer-secret";
};
```

### Enable SSL/TLS

```bash
# Generate certificates (see Kafka documentation for detailed steps)
keytool -keystore kafka.server.keystore.jks -alias localhost -keyalg RSA -validity 365 -genkey
```

```properties
# SSL configuration
listeners=SSL://localhost:9093
ssl.keystore.location=/opt/kafka/config/kafka.server.keystore.jks
ssl.keystore.password=keystore-password
ssl.key.password=key-password
ssl.truststore.location=/opt/kafka/config/kafka.server.truststore.jks
ssl.truststore.password=truststore-password
```

## Monitoring

### JMX Metrics

```bash
# Enable JMX
export KAFKA_JMX_OPTS="-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.port=9999 -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false"
```

### Consumer Group Status

```bash
# List consumer groups
/opt/kafka/bin/kafka-consumer-groups.sh --list \
  --bootstrap-server localhost:9092

# Describe consumer group
/opt/kafka/bin/kafka-consumer-groups.sh --describe \
  --bootstrap-server localhost:9092 \
  --group my-consumer-group
```

### Check Broker Health

```bash
# Check cluster metadata
/opt/kafka/bin/kafka-metadata.sh --snapshot /var/lib/kafka/data/__cluster_metadata-0/00000000000000000000.log --command "cat"
```

## Performance Tuning

### Producer Settings

```properties
# High throughput
batch.size=32768
linger.ms=5
buffer.memory=33554432
compression.type=lz4
```

### Consumer Settings

```properties
# High throughput
fetch.min.bytes=1048576
fetch.max.wait.ms=500
max.partition.fetch.bytes=1048576
```

### Broker Tuning

```properties
# Increase network threads
num.network.threads=8
num.io.threads=16

# Socket buffers
socket.send.buffer.bytes=1048576
socket.receive.buffer.bytes=1048576

# Log settings
log.flush.interval.messages=10000
log.flush.interval.ms=1000
```

## Troubleshooting

### Kafka Won't Start

```bash
# Check logs
sudo journalctl -u kafka -f
cat /opt/kafka/logs/server.log

# Verify ZooKeeper is running
/opt/kafka/bin/zookeeper-shell.sh localhost:2181 ls /
```

### Consumer Lag

```bash
# Check consumer lag
/opt/kafka/bin/kafka-consumer-groups.sh --describe \
  --bootstrap-server localhost:9092 \
  --group my-group

# Reset offsets (use carefully!)
/opt/kafka/bin/kafka-consumer-groups.sh --reset-offsets \
  --bootstrap-server localhost:9092 \
  --group my-group \
  --topic my-topic \
  --to-earliest \
  --execute
```

### Disk Full

```bash
# Check disk usage
df -h /var/lib/kafka

# Adjust retention
/opt/kafka/bin/kafka-configs.sh --alter \
  --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name my-topic \
  --add-config retention.ms=86400000
```

---

Kafka provides a robust foundation for event-driven architectures and real-time data streaming. For production deployments, run at least 3 brokers with appropriate replication factors, monitor consumer lag, and implement proper security measures. Consider managed Kafka services (Confluent Cloud, AWS MSK) for reduced operational overhead.
