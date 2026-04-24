# How to Deploy Kafka via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Kafka, Message Broker, Event Streaming, Self-Hosted

Description: Deploy Apache Kafka via Portainer using KRaft mode (no ZooKeeper required) for a modern, simplified event streaming platform deployment.

## Introduction

Apache Kafka is a distributed event streaming platform for high-throughput, fault-tolerant message processing. Starting with Kafka 3.3, KRaft mode is production-ready for new clusters and eliminates the ZooKeeper dependency, simplifying deployment significantly. This guide deploys Kafka with KRaft using Bitnami's well-maintained Docker images.

## Deploy as a Stack

In Portainer, create a stack named `kafka`:

```yaml
version: "3.8"

services:
  kafka:
    image: bitnami/kafka:3.7
    container_name: kafka
    environment:
      # KRaft settings (no ZooKeeper needed)
      - KAFKA_CFG_NODE_ID=0
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@kafka:9093
      
      # Listeners
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093,EXTERNAL://:9094
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092,EXTERNAL://localhost:9094
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT,EXTERNAL:PLAINTEXT
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_CFG_INTER_BROKER_LISTENER_NAME=PLAINTEXT
      
      # Cluster ID (generate with: kafka-storage.sh random-uuid)
      - KAFKA_KRAFT_CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qg
      
      # Broker settings
      - KAFKA_CFG_NUM_PARTITIONS=3
      - KAFKA_CFG_DEFAULT_REPLICATION_FACTOR=1
      - KAFKA_CFG_OFFSETS_TOPIC_REPLICATION_FACTOR=1
      - KAFKA_CFG_LOG_RETENTION_HOURS=168  # 7 days
      - KAFKA_CFG_LOG_SEGMENT_BYTES=1073741824  # 1GB
      
    volumes:
      - kafka_data:/bitnami/kafka
    ports:
      - "9094:9094"    # External client access port
    restart: unless-stopped

  # Kafka UI - web-based management
  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    environment:
      - KAFKA_CLUSTERS_0_NAME=local
      - KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka:9092
    ports:
      - "8080:8080"
    depends_on:
      - kafka
    restart: unless-stopped

volumes:
  kafka_data:
```

## Verify Kafka is Running

```bash
# Access Kafka container via Portainer Console or:

docker exec -it kafka bash

# List topics
kafka-topics.sh --bootstrap-server localhost:9092 --list

# Create a test topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --topic test-topic \
  --partitions 3 \
  --replication-factor 1

# Describe the topic
kafka-topics.sh --bootstrap-server localhost:9092 \
  --describe --topic test-topic
```

## Producing and Consuming Messages

```bash
# Start a console producer
kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic test-topic

# In another terminal, start a consumer
kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic test-topic \
  --from-beginning
```

## Kafka Producer Example (Python)

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9094'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Send a message
producer.send('test-topic', {
    'event': 'user_signup',
    'user_id': 12345,
    'timestamp': '2026-03-20T10:00:00Z'
})

producer.flush()
print("Message sent!")
```

## Kafka Consumer Example (Python)

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'test-topic',
    bootstrap_servers=['localhost:9094'],
    group_id='my-consumer-group',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    print(f"Received: {message.value}")
```

## Monitoring Kafka

```bash
# Check consumer group lag
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group my-consumer-group

# Check log directory usage
kafka-log-dirs.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --topic-list test-topic
```

## Conclusion

Apache Kafka deployed via Portainer with KRaft mode provides a modern, simplified event streaming platform without ZooKeeper complexity. Kafka UI gives you visual topic management, consumer group monitoring, and message inspection. The persistent volume helps preserve broker data across container restarts and updates.
