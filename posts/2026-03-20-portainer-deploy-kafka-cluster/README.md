# How to Deploy Kafka Cluster via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Kafka, Cluster, Event Streaming, High Availability, Self-Hosted

Description: Deploy a 3-broker Kafka cluster with KRaft consensus via Portainer for high-availability event streaming with automatic leader election and partition replication.

## Introduction

A Kafka cluster with multiple brokers provides fault tolerance, parallel processing, and higher throughput than a single-broker setup. This guide deploys a 3-node Kafka cluster using KRaft mode (no ZooKeeper), with each node acting as both controller and broker to provide automatic leader election and partition replication.

## Deploy the Kafka Cluster

In Portainer, create a stack named `kafka-cluster`:

```yaml
version: "3.8"

services:
  kafka-1:
    image: bitnami/kafka:3.7
    container_name: kafka-1
    environment:
      - KAFKA_CFG_NODE_ID=1
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka-1:9092
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_CFG_INTER_BROKER_LISTENER_NAME=PLAINTEXT
      - KAFKA_KRAFT_CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qg
      - KAFKA_CFG_DEFAULT_REPLICATION_FACTOR=3   # 3 replicas for HA
      - KAFKA_CFG_NUM_PARTITIONS=6
      - KAFKA_CFG_MIN_INSYNC_REPLICAS=2           # Require 2 in-sync replicas
    volumes:
      - kafka1_data:/bitnami/kafka
    networks:
      - kafka-network
    restart: unless-stopped

  kafka-2:
    image: bitnami/kafka:3.7
    container_name: kafka-2
    environment:
      - KAFKA_CFG_NODE_ID=2
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka-2:9092
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_CFG_INTER_BROKER_LISTENER_NAME=PLAINTEXT
      - KAFKA_KRAFT_CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qg
      - KAFKA_CFG_DEFAULT_REPLICATION_FACTOR=3
      - KAFKA_CFG_NUM_PARTITIONS=6
      - KAFKA_CFG_MIN_INSYNC_REPLICAS=2
    volumes:
      - kafka2_data:/bitnami/kafka
    networks:
      - kafka-network
    restart: unless-stopped

  kafka-3:
    image: bitnami/kafka:3.7
    container_name: kafka-3
    environment:
      - KAFKA_CFG_NODE_ID=3
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
      - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://kafka-3:9092
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_CFG_INTER_BROKER_LISTENER_NAME=PLAINTEXT
      - KAFKA_KRAFT_CLUSTER_ID=MkU3OEVBNTcwNTJENDM2Qg
      - KAFKA_CFG_DEFAULT_REPLICATION_FACTOR=3
      - KAFKA_CFG_NUM_PARTITIONS=6
      - KAFKA_CFG_MIN_INSYNC_REPLICAS=2
    volumes:
      - kafka3_data:/bitnami/kafka
    networks:
      - kafka-network
    restart: unless-stopped

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    environment:
      - KAFKA_CLUSTERS_0_NAME=production-cluster
      - KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka-1:9092,kafka-2:9092,kafka-3:9092
    ports:
      - "8080:8080"
    networks:
      - kafka-network
    depends_on:
      - kafka-1
      - kafka-2
      - kafka-3
    restart: unless-stopped

networks:
  kafka-network:
    driver: bridge

volumes:
  kafka1_data:
  kafka2_data:
  kafka3_data:
```

## Verify the Cluster

```bash
# Check cluster metadata

docker exec kafka-1 kafka-metadata-quorum.sh \
  --bootstrap-server kafka-1:9092 describe --status

# Create a replicated topic
docker exec kafka-1 kafka-topics.sh \
  --bootstrap-server kafka-1:9092 \
  --create \
  --topic events \
  --partitions 6 \
  --replication-factor 3

# Describe topic (shows replica assignments)
docker exec kafka-1 kafka-topics.sh \
  --bootstrap-server kafka-1:9092 \
  --describe --topic events
```

## Test Failover

```bash
# Stop one broker
docker stop kafka-3

# Produce messages (should still work with 2/3 brokers)
docker exec -it kafka-1 kafka-console-producer.sh \
  --bootstrap-server kafka-1:9092,kafka-2:9092 \
  --topic events

# Check partition leaders (should have redistributed)
docker exec kafka-1 kafka-topics.sh \
  --bootstrap-server kafka-1:9092 \
  --describe --topic events

# Restart broker
docker start kafka-3

# Verify broker rejoins and replicas return to the ISR
docker exec kafka-1 kafka-topics.sh \
  --bootstrap-server kafka-1:9092 \
  --describe --topic events
```

## Performance Tuning

For higher throughput:

```yaml
environment:
  # Broker message size limit
  - KAFKA_CFG_MESSAGE_MAX_BYTES=10485760      # 10MB max message
  
  # Log retention
  - KAFKA_CFG_LOG_RETENTION_HOURS=168         # 7 days
  - KAFKA_CFG_LOG_RETENTION_BYTES=10737418240 # 10GB per partition
  
  # Network/IO threads
  - KAFKA_CFG_NUM_NETWORK_THREADS=8
  - KAFKA_CFG_NUM_IO_THREADS=16
  
  # Socket buffer sizes
  - KAFKA_CFG_SOCKET_SEND_BUFFER_BYTES=102400
  - KAFKA_CFG_SOCKET_RECEIVE_BUFFER_BYTES=102400
```

## Conclusion

A 3-node Kafka cluster via Portainer provides high availability for small self-hosted deployments with automatic partition leader election and replica failover. The KRaft mode eliminates ZooKeeper complexity while maintaining the clustering guarantees. With min.insync.replicas set to 2, producers using acks=all require at least 2 in-sync replicas for a write to succeed, ensuring durability even if one broker fails.
