# How to Install and Configure Apache Kafka on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kafka, Message Broker, Linux

Description: Learn how to install and Configure Apache Kafka on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Apache Kafka is a distributed event streaming platform used for building real-time data pipelines and streaming applications. It handles high-throughput, fault-tolerant message processing at scale.

## Prerequisites

- RHEL 9
- Java 17 installed
- Root or sudo access
- At least 4 GB RAM

## Step 1: Install Java

```bash
sudo dnf install -y java-17-openjdk java-17-openjdk-devel
java -version
```

## Step 2: Download and Install Kafka

```bash
cd /opt
sudo curl -L https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz | sudo tar xz
sudo ln -s kafka_2.13-3.7.0 kafka
```

## Step 3: Create Kafka User

```bash
sudo useradd -r -s /sbin/nologin kafka
sudo chown -R kafka:kafka /opt/kafka*
```

## Step 4: Configure Kafka with KRaft (No ZooKeeper)

Kafka 3.x supports KRaft mode, eliminating the ZooKeeper dependency:

```bash
sudo vi /opt/kafka/config/kraft/server.properties
```

```properties
process.roles=broker,controller
node.id=1
controller.quorum.voters=1@localhost:9093
listeners=PLAINTEXT://:9092,CONTROLLER://:9093
inter.broker.listener.name=PLAINTEXT
controller.listener.names=CONTROLLER
log.dirs=/var/lib/kafka/data
num.partitions=3
default.replication.factor=1
log.retention.hours=168
```

## Step 5: Format the Storage

```bash
KAFKA_CLUSTER_ID=$(/opt/kafka/bin/kafka-storage.sh random-uuid)
sudo -u kafka /opt/kafka/bin/kafka-storage.sh format   -t $KAFKA_CLUSTER_ID   -c /opt/kafka/config/kraft/server.properties
```

## Step 6: Create systemd Service

```bash
sudo vi /etc/systemd/system/kafka.service
```

```ini
[Unit]
Description=Apache Kafka
After=network.target

[Service]
Type=simple
User=kafka
Group=kafka
ExecStart=/opt/kafka/bin/kafka-server-start.sh /opt/kafka/config/kraft/server.properties
ExecStop=/opt/kafka/bin/kafka-server-stop.sh
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo mkdir -p /var/lib/kafka/data
sudo chown -R kafka:kafka /var/lib/kafka
sudo systemctl daemon-reload
sudo systemctl enable --now kafka
```

## Step 7: Test Kafka

Create a topic:

```bash
/opt/kafka/bin/kafka-topics.sh --create --topic test   --bootstrap-server localhost:9092 --partitions 3
```

Produce messages:

```bash
echo "Hello Kafka" | /opt/kafka/bin/kafka-console-producer.sh   --broker-list localhost:9092 --topic test
```

Consume messages:

```bash
/opt/kafka/bin/kafka-console-consumer.sh   --bootstrap-server localhost:9092 --topic test --from-beginning
```

## Step 8: Configure Firewall

```bash
sudo firewall-cmd --permanent --add-port=9092/tcp
sudo firewall-cmd --reload
```

## Conclusion

Apache Kafka on RHEL 9 with KRaft mode provides a simplified deployment without ZooKeeper dependencies. It is well-suited for event streaming, log aggregation, and real-time data pipeline applications.
