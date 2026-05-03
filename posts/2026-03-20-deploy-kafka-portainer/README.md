# How to Deploy Kafka via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kafka, Message Broker, Docker, Deployment

Description: Learn how to deploy Apache Kafka via Portainer using KRaft mode (no ZooKeeper) for a modern, simplified Kafka deployment with Kafka UI for management.

## Kafka in KRaft Mode (No ZooKeeper)

Kafka 3.x supports KRaft (Kafka Raft) mode, eliminating the need for ZooKeeper. This simplifies the deployment significantly.

## Kafka Stack via Portainer

**Stacks → Add Stack → kafka**

```yaml
version: "3.8"

services:
  kafka:
    image: apache/kafka:3.7.0
    restart: unless-stopped
    environment:
      # KRaft mode - no ZooKeeper needed
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,CONTROLLER:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_LOG_RETENTION_HOURS: 168    # 7 days
      KAFKA_LOG_RETENTION_BYTES: 1073741824    # 1GB per partition
      KAFKA_LOG_DIRS: /var/lib/kafka/data
    volumes:
      - kafka_data:/var/lib/kafka/data
    ports:
      - "9092:9092"    # Broker port
    healthcheck:
      test: ["CMD-SHELL", "/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list"]
      interval: 30s
      timeout: 10s
      retries: 5

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - KAFKA_CLUSTERS_0_NAME=local
      - KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS=kafka:9092
    depends_on:
      kafka:
        condition: service_healthy

volumes:
  kafka_data:
```

## Verify Kafka via Portainer Console

```bash
# Create a topic

/opt/kafka/bin/kafka-topics.sh --create \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --partitions 3 \
  --replication-factor 1

# List topics
/opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092

# Produce a test message
echo "Hello Kafka" | /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server localhost:9092 \
  --topic my-topic

# Consume messages
/opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic my-topic \
  --from-beginning
```

## Connecting Applications

```yaml
services:
  app:
    image: myapp:latest
    environment:
      - KAFKA_BOOTSTRAP_SERVERS=kafka:9092
      - KAFKA_TOPIC=events
```

## Common Kafka Configuration

```bash
# Set topic retention (via Portainer exec)
/opt/kafka/bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name my-topic \
  --alter \
  --add-config retention.ms=86400000    # 24 hours

# View topic configuration
/opt/kafka/bin/kafka-configs.sh --bootstrap-server localhost:9092 \
  --entity-type topics \
  --entity-name my-topic \
  --describe
```

## Kafka UI Features

Access Kafka UI at `http://server:8080`:
- Browse topics and messages
- Create/delete topics
- View consumer groups and lag
- Monitor broker health

## Conclusion

Kafka in KRaft mode via Portainer eliminates the ZooKeeper dependency, reducing the minimum Kafka deployment from multiple services to a single container. Kafka UI provides the management interface without needing CLI access. This setup is appropriate for development, testing, and small production workloads that don't require multi-broker replication.
