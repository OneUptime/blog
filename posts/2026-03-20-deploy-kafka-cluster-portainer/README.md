# How to Deploy Kafka Cluster via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kafka, Cluster, High Availability, Message Broker

Description: Learn how to deploy a multi-broker Kafka cluster via Portainer using KRaft mode for fault tolerance, partition replication, and high-throughput message processing.

## 3-Broker Kafka Cluster Stack

**Stacks → Add Stack → kafka-cluster**

```yaml
version: "3.8"

services:
  kafka-1:
    image: apache/kafka:3.7.0
    restart: unless-stopped
    hostname: kafka-1
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_LOG_DIRS: /var/lib/kafka/data
    volumes:
      - kafka1_data:/var/lib/kafka/data

  kafka-2:
    image: apache/kafka:3.7.0
    restart: unless-stopped
    hostname: kafka-2
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-2:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_LOG_DIRS: /var/lib/kafka/data
    volumes:
      - kafka2_data:/var/lib/kafka/data

  kafka-3:
    image: apache/kafka:3.7.0
    restart: unless-stopped
    hostname: kafka-3
    environment:
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-3:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
      KAFKA_LOG_DIRS: /var/lib/kafka/data
    volumes:
      - kafka3_data:/var/lib/kafka/data

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - KAFKA_CLUSTERS_0_NAME=production-cluster
      - KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka-1:9092,kafka-2:9092,kafka-3:9092

volumes:
  kafka1_data:
  kafka2_data:
  kafka3_data:
```

## Verifying Cluster Formation

```bash
# Check controller node (via Portainer exec on any broker)

kafka-metadata-shell.sh --snapshot /var/lib/kafka/data/__cluster_metadata-0/00000000000000000000.log

# List brokers via topics
kafka-topics.sh --bootstrap-server kafka-1:9092 --describe --topic __consumer_offsets | head -5
# Should show: ReplicationFactor:3, Isr: 1,2,3
```

## Create a Replicated Topic

```bash
kafka-topics.sh --create \
  --bootstrap-server kafka-1:9092 \
  --topic orders \
  --partitions 6 \
  --replication-factor 3

# Verify replication
kafka-topics.sh --describe --bootstrap-server kafka-1:9092 --topic orders
# Each partition should have 3 replicas across all 3 brokers
```

## Connecting with Broker List

```yaml
services:
  producer:
    image: myapp:latest
    environment:
      # Provide all brokers for fault tolerance
      - KAFKA_BOOTSTRAP_SERVERS=kafka-1:9092,kafka-2:9092,kafka-3:9092
      - KAFKA_ACKS=all        # Wait for all replicas to acknowledge
      - KAFKA_RETRIES=3
```

## Consumer Group Monitoring

```bash
# Check consumer group lag
kafka-consumer-groups.sh --bootstrap-server kafka-1:9092 \
  --describe \
  --group my-consumer-group
```

## Conclusion

A 3-broker Kafka cluster with KRaft mode via Portainer provides fault tolerance (1 broker can fail), message replication, and partition distribution for high throughput. The `MIN_INSYNC_REPLICAS=2` setting ensures messages are only acknowledged once written to at least 2 of 3 replicas, preventing data loss even during broker failures.
