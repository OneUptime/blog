# How to Install and Configure Apache Kafka on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Apache Kafka, Message Broker, Streaming, Java

Description: Learn how to install and configure Apache Kafka on RHEL for real-time event streaming and message processing.

---

Apache Kafka is a distributed event streaming platform used for building real-time data pipelines. It uses a publish-subscribe model and stores messages in a durable, fault-tolerant log.

## Prerequisites

Kafka requires Java:

```bash
# Install Java 17
sudo dnf install -y java-17-openjdk java-17-openjdk-devel
java -version
```

## Installing Kafka

```bash
# Download Kafka (includes KRaft mode, no separate ZooKeeper needed)
curl -L https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz \
  -o /tmp/kafka.tgz
sudo tar xzf /tmp/kafka.tgz -C /opt/
sudo mv /opt/kafka_2.13-3.7.0 /opt/kafka

# Create a kafka user
sudo useradd -r -s /sbin/nologin kafka
sudo chown -R kafka:kafka /opt/kafka
```

## Configuring Kafka with KRaft (No ZooKeeper)

```bash
# Generate a cluster UUID
KAFKA_CLUSTER_ID=$(/opt/kafka/bin/kafka-storage.sh random-uuid)

# Format the storage directory
sudo -u kafka /opt/kafka/bin/kafka-storage.sh format \
  -t $KAFKA_CLUSTER_ID \
  -c /opt/kafka/config/kraft/server.properties
```

Edit the configuration:

```bash
# Edit /opt/kafka/config/kraft/server.properties
# Key settings to modify:

# Broker ID
# node.id=1

# Listeners
# listeners=PLAINTEXT://:9092,CONTROLLER://:9093
# advertised.listeners=PLAINTEXT://your-hostname:9092

# Log directory
# log.dirs=/var/kafka-logs

# Create log directory
sudo mkdir -p /var/kafka-logs
sudo chown kafka:kafka /var/kafka-logs
```

## Creating a systemd Service

```bash
cat << 'SERVICE' | sudo tee /etc/systemd/system/kafka.service
[Unit]
Description=Apache Kafka
After=network.target

[Service]
Type=simple
User=kafka
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-failure
LimitNOFILE=100000

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now kafka
```

## Creating and Testing Topics

```bash
# Create a topic
/opt/kafka/bin/kafka-topics.sh --create \
  --topic test-topic \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 1

# List topics
/opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092

# Produce messages
echo "Hello Kafka" | /opt/kafka/bin/kafka-console-producer.sh \
  --topic test-topic \
  --bootstrap-server localhost:9092

# Consume messages
/opt/kafka/bin/kafka-console-consumer.sh \
  --topic test-topic \
  --bootstrap-server localhost:9092 \
  --from-beginning
```

## Firewall Configuration

```bash
sudo firewall-cmd --add-port=9092/tcp --permanent
sudo firewall-cmd --add-port=9093/tcp --permanent
sudo firewall-cmd --reload
```

Kafka with KRaft mode eliminates the ZooKeeper dependency, simplifying deployment and operations. For production clusters, configure multiple broker nodes with appropriate replication factors.
