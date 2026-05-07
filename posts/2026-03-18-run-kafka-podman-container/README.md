# How to Run Kafka in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Kafka, Event Streaming, Message Broker

Description: Learn how to run Apache Kafka in a Podman container using KRaft mode for distributed event streaming without Zookeeper.

---

> Kafka in Podman provides a high-throughput distributed event streaming platform in an isolated container using the modern KRaft consensus mode.

Apache Kafka is a distributed event streaming platform used for building real-time data pipelines and streaming applications. With KRaft mode (Kafka Raft), you can run Kafka without the traditional Zookeeper dependency, simplifying your container setup. This guide covers running Kafka in KRaft mode, creating topics, producing and consuming messages, and configuring persistence.

---

## Pulling the Kafka Image

Download the official Apache Kafka image.

```bash
# Pull the official Apache Kafka image

podman pull docker.io/apache/kafka:3.7.0

# Verify the image
podman images | grep kafka
```

## Running Kafka in KRaft Mode

Start Kafka without Zookeeper using the built-in KRaft consensus protocol.

```bash
# Run Kafka in KRaft mode (single-node for development)
podman run -d \
  --name my-kafka \
  -p 9092:9092 \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 \
  -e CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk \
  apache/kafka:3.7.0

# Wait for Kafka to start
sleep 10

# Check the container is running
podman ps
```

## Creating Topics

Create Kafka topics for your applications.

```bash
# Create a topic with 3 partitions and replication factor of 1
podman exec my-kafka /opt/kafka/bin/kafka-topics.sh \
  --create \
  --topic my-events \
  --partitions 3 \
  --replication-factor 1 \
  --bootstrap-server localhost:9092

# Create another topic for logs
podman exec my-kafka /opt/kafka/bin/kafka-topics.sh \
  --create \
  --topic app-logs \
  --partitions 1 \
  --replication-factor 1 \
  --bootstrap-server localhost:9092

# List all topics
podman exec my-kafka /opt/kafka/bin/kafka-topics.sh \
  --list \
  --bootstrap-server localhost:9092

# Describe a topic to see partition details
podman exec my-kafka /opt/kafka/bin/kafka-topics.sh \
  --describe \
  --topic my-events \
  --bootstrap-server localhost:9092
```

## Producing and Consuming Messages

Send and receive messages through Kafka topics.

```bash
# Produce one message to a topic
echo "Hello Kafka from Podman!" | podman exec -i my-kafka \
  /opt/kafka/bin/kafka-console-producer.sh \
  --topic my-events \
  --bootstrap-server localhost:9092

# Produce multiple messages at once
printf "event-1\nevent-2\nevent-3\n" | podman exec -i my-kafka \
  /opt/kafka/bin/kafka-console-producer.sh \
  --topic my-events \
  --bootstrap-server localhost:9092

# Consume messages from the beginning of the topic
podman exec my-kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --topic my-events \
  --from-beginning \
  --max-messages 5 \
  --bootstrap-server localhost:9092
```

## Persistent Data Storage

Use volumes to persist Kafka data across restarts.

```bash
# Create a volume for Kafka data
podman volume create kafka-data

# Run Kafka with persistent storage
podman run -d \
  --name kafka-persistent \
  -p 9093:9092 \
  -e KAFKA_NODE_ID=1 \
  -e KAFKA_PROCESS_ROLES=broker,controller \
  -e KAFKA_LISTENERS=PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9094 \
  -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9093 \
  -e KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  -e KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT \
  -e KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9094 \
  -e KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1 \
  -e KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1 \
  -e CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qk \
  -e KAFKA_LOG_DIRS=/var/lib/kafka/data \
  -v kafka-data:/var/lib/kafka/data:Z \
  apache/kafka:3.7.0
```

## Monitoring Kafka

Check the health and status of your Kafka broker.

```bash
# Show broker API versions
podman exec my-kafka /opt/kafka/bin/kafka-broker-api-versions.sh \
  --bootstrap-server localhost:9092 | head -5

# Check consumer group offsets
podman exec my-kafka /opt/kafka/bin/kafka-consumer-groups.sh \
  --list \
  --bootstrap-server localhost:9092

# View topic partition offsets
podman exec my-kafka /opt/kafka/bin/kafka-get-offsets.sh \
  --bootstrap-server localhost:9092 \
  --topic my-events

# Check Kafka logs for errors
podman logs my-kafka 2>&1 | tail -20
```

## Managing the Container

Routine management commands.

```bash
# View Kafka logs
podman logs my-kafka

# Stop and start
podman stop my-kafka
podman start my-kafka

# Remove containers and volumes
podman rm -f my-kafka kafka-persistent
podman volume rm kafka-data
```

## Summary

Running Kafka in a Podman container with KRaft mode eliminates the Zookeeper dependency, simplifying your streaming infrastructure to a single container. You can create topics, produce and consume messages, and monitor broker health using the built-in command-line tools. Named volumes ensure your topic data and offsets persist across restarts. Podman's rootless execution provides additional security for your event streaming platform. This setup is well-suited for development, testing, and single-node deployments.
