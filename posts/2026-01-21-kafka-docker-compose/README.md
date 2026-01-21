# How to Run Kafka in Docker and Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Docker, Docker Compose, Message Queue, Streaming, DevOps

Description: A comprehensive guide to running Apache Kafka in Docker containers, covering single-node development setups, multi-broker production configurations, and best practices for containerized Kafka deployments.

---

Apache Kafka is the industry standard for building real-time data pipelines and streaming applications. Running Kafka in Docker containers simplifies development, testing, and even production deployments. This guide covers everything from simple single-node setups to production-ready multi-broker configurations.

## Prerequisites

Before starting, ensure you have:

- Docker installed (version 20.10 or later)
- Docker Compose installed (version 2.0 or later)
- At least 4GB of available RAM
- Basic understanding of Kafka concepts

## Single-Node Kafka Setup with Docker Compose

Let's start with a simple development setup using Kafka with KRaft mode (no ZooKeeper required).

### Basic docker-compose.yml

```yaml
version: '3.8'

services:
  kafka:
    image: apache/kafka:3.7.0
    container_name: kafka
    ports:
      - "9092:9092"
      - "9093:9093"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_NUM_PARTITIONS: 3
    volumes:
      - kafka-data:/var/lib/kafka/data

volumes:
  kafka-data:
```

Start the container:

```bash
docker-compose up -d
```

Verify Kafka is running:

```bash
docker exec -it kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --list
```

## Multi-Broker Kafka Cluster

For production-like environments, you need multiple brokers for high availability.

### Multi-Broker docker-compose.yml

```yaml
version: '3.8'

services:
  kafka-1:
    image: apache/kafka:3.7.0
    container_name: kafka-1
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-1:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_NUM_PARTITIONS: 3
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
    volumes:
      - kafka-1-data:/var/lib/kafka/data
    networks:
      - kafka-network

  kafka-2:
    image: apache/kafka:3.7.0
    container_name: kafka-2
    ports:
      - "9093:9092"
    environment:
      KAFKA_NODE_ID: 2
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-2:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_NUM_PARTITIONS: 3
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
    volumes:
      - kafka-2-data:/var/lib/kafka/data
    networks:
      - kafka-network

  kafka-3:
    image: apache/kafka:3.7.0
    container_name: kafka-3
    ports:
      - "9094:9092"
    environment:
      KAFKA_NODE_ID: 3
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka-3:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka-1:9093,2@kafka-2:9093,3@kafka-3:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 3
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 2
      KAFKA_NUM_PARTITIONS: 3
      KAFKA_DEFAULT_REPLICATION_FACTOR: 3
      KAFKA_MIN_INSYNC_REPLICAS: 2
    volumes:
      - kafka-3-data:/var/lib/kafka/data
    networks:
      - kafka-network

volumes:
  kafka-1-data:
  kafka-2-data:
  kafka-3-data:

networks:
  kafka-network:
    driver: bridge
```

## Adding Kafka UI for Management

Kafka UI provides a web interface for managing topics, consumers, and messages.

```yaml
version: '3.8'

services:
  kafka:
    image: apache/kafka:3.7.0
    container_name: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
    volumes:
      - kafka-data:/var/lib/kafka/data
    networks:
      - kafka-network

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    depends_on:
      - kafka
    networks:
      - kafka-network

volumes:
  kafka-data:

networks:
  kafka-network:
    driver: bridge
```

Access Kafka UI at `http://localhost:8080`.

## Using Kafka with Schema Registry

For production environments, Schema Registry helps manage message schemas.

```yaml
version: '3.8'

services:
  kafka:
    image: apache/kafka:3.7.0
    container_name: kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
    volumes:
      - kafka-data:/var/lib/kafka/data
    networks:
      - kafka-network

  schema-registry:
    image: confluentinc/cp-schema-registry:7.6.0
    container_name: schema-registry
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka:9092
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
    depends_on:
      - kafka
    networks:
      - kafka-network

volumes:
  kafka-data:

networks:
  kafka-network:
    driver: bridge
```

## Testing Your Kafka Setup

### Creating a Topic

```bash
docker exec -it kafka /opt/kafka/bin/kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create \
  --topic test-topic \
  --partitions 3 \
  --replication-factor 1
```

### Producing Messages with Python

```python
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Send a message
producer.send('test-topic', {'message': 'Hello, Kafka!'})
producer.flush()
print("Message sent successfully!")
```

### Consuming Messages with Python

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'test-topic',
    bootstrap_servers=['localhost:9092'],
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8'))
)

for message in consumer:
    print(f"Received: {message.value}")
```

### Producing Messages with Java

```java
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class SimpleProducer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("key.serializer",
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer",
            "org.apache.kafka.common.serialization.StringSerializer");

        Producer<String, String> producer = new KafkaProducer<>(props);

        ProducerRecord<String, String> record =
            new ProducerRecord<>("test-topic", "key", "Hello, Kafka!");

        producer.send(record, (metadata, exception) -> {
            if (exception == null) {
                System.out.println("Message sent to partition " +
                    metadata.partition() + " with offset " + metadata.offset());
            } else {
                exception.printStackTrace();
            }
        });

        producer.close();
    }
}
```

### Consuming Messages with Java

```java
import org.apache.kafka.clients.consumer.*;
import java.util.*;
import java.time.Duration;

public class SimpleConsumer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put("bootstrap.servers", "localhost:9092");
        props.put("group.id", "test-group");
        props.put("key.deserializer",
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("value.deserializer",
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put("auto.offset.reset", "earliest");

        Consumer<String, String> consumer = new KafkaConsumer<>(props);
        consumer.subscribe(Collections.singletonList("test-topic"));

        while (true) {
            ConsumerRecords<String, String> records =
                consumer.poll(Duration.ofMillis(100));
            for (ConsumerRecord<String, String> record : records) {
                System.out.printf("Received: key=%s, value=%s, partition=%d%n",
                    record.key(), record.value(), record.partition());
            }
        }
    }
}
```

## Production Considerations

### Memory Settings

Configure JVM heap settings for production:

```yaml
environment:
  KAFKA_HEAP_OPTS: "-Xmx2g -Xms2g"
```

### Log Retention

Configure log retention based on your needs:

```yaml
environment:
  KAFKA_LOG_RETENTION_HOURS: 168
  KAFKA_LOG_RETENTION_BYTES: 1073741824
  KAFKA_LOG_SEGMENT_BYTES: 1073741824
```

### Health Checks

Add health checks to ensure containers are ready:

```yaml
kafka:
  healthcheck:
    test: ["CMD", "/opt/kafka/bin/kafka-broker-api-versions.sh",
           "--bootstrap-server", "localhost:9092"]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 60s
```

## Docker Compose Commands Reference

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f kafka

# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Scale brokers (if using separate service definitions)
docker-compose up -d --scale kafka=3
```

## Troubleshooting Common Issues

### Connection Refused

If you get connection refused errors, check:

1. Ensure `KAFKA_ADVERTISED_LISTENERS` matches how clients connect
2. For local development, use `localhost` in advertised listeners
3. For Docker networks, use the container name

### Out of Memory

If Kafka runs out of memory:

1. Increase Docker memory limits
2. Adjust `KAFKA_HEAP_OPTS`
3. Reduce log retention settings

### Slow Startup

Kafka may take 30-60 seconds to fully initialize. Use health checks and `depends_on` with conditions:

```yaml
kafka-ui:
  depends_on:
    kafka:
      condition: service_healthy
```

## Conclusion

Running Kafka in Docker simplifies development and testing workflows. Start with a single-node setup for development, and scale to multi-broker configurations as your needs grow. Remember to properly configure persistence, networking, and resource limits for production deployments.

For production use, consider managed Kafka services or dedicated Kubernetes operators like Strimzi that provide additional operational features like automated upgrades, monitoring, and security configurations.
