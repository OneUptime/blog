# How to Set Up Confluent Schema Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, Schema Registry, Avro, Protobuf, JSON Schema, Data Serialization

Description: Learn how to set up and configure Confluent Schema Registry for Kafka, including schema management, compatibility modes, and integration with producers and consumers.

---

Schema Registry provides centralized schema management for Kafka, enabling data contracts between producers and consumers. This guide covers setup, configuration, and best practices.

## Installation

### Docker Compose

```yaml
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0
    depends_on:
      - kafka
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: PLAINTEXT://kafka:29092
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
```

### Configuration Options

```properties
# schema-registry.properties

listeners=http://0.0.0.0:8081
kafkastore.bootstrap.servers=PLAINTEXT://localhost:9092
kafkastore.topic=_schemas
kafkastore.topic.replication.factor=1
schema.compatibility.level=BACKWARD
```

## Schema Management API

### Register Schema

```bash
# Register Avro schema
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{
    "schema": "{\"type\":\"record\",\"name\":\"User\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"email\",\"type\":\"string\"}]}"
  }' \
  http://localhost:8081/subjects/users-value/versions

# Response: {"id": 1}
```

### Get Schema

```bash
# Get latest schema
curl http://localhost:8081/subjects/users-value/versions/latest

# Get specific version
curl http://localhost:8081/subjects/users-value/versions/1

# Get schema by ID
curl http://localhost:8081/schemas/ids/1
```

### List Subjects

```bash
# List all subjects
curl http://localhost:8081/subjects

# Get versions for subject
curl http://localhost:8081/subjects/users-value/versions
```

## Compatibility Modes

### Compatibility Levels

| Mode | Description | Safe Changes |
|------|-------------|--------------|
| BACKWARD | New schema can read old data | Add fields with defaults, remove fields |
| FORWARD | Old schema can read new data | Add fields, remove fields that had defaults |
| FULL | Both backward and forward | Add/remove fields with defaults |
| NONE | No compatibility checking | Any change |

### Set Compatibility

```bash
# Set global default
curl -X PUT -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility": "BACKWARD"}' \
  http://localhost:8081/config

# Set per-subject compatibility
curl -X PUT -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility": "FULL"}' \
  http://localhost:8081/config/users-value
```

### Check Compatibility

```bash
# Check if new schema is compatible
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{
    "schema": "{\"type\":\"record\",\"name\":\"User\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"name\",\"type\":\"string\"},{\"name\":\"email\",\"type\":\"string\"},{\"name\":\"age\",\"type\":[\"null\",\"int\"],\"default\":null}]}"
  }' \
  http://localhost:8081/compatibility/subjects/users-value/versions/latest

# Response: {"is_compatible": true}
```

## Java Producer with Avro

```java
import io.confluent.kafka.serializers.KafkaAvroSerializer;
import org.apache.avro.generic.GenericRecord;
import org.apache.avro.generic.GenericData;
import org.apache.avro.Schema;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.Producer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.Properties;

public class AvroProducer {
    public static void main(String[] args) throws Exception {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, KafkaAvroSerializer.class);
        props.put("schema.registry.url", "http://localhost:8081");

        // Define schema
        String schemaString = """
            {
              "type": "record",
              "name": "User",
              "fields": [
                {"name": "id", "type": "string"},
                {"name": "name", "type": "string"},
                {"name": "email", "type": "string"}
              ]
            }
            """;

        Schema schema = new Schema.Parser().parse(schemaString);

        try (Producer<String, GenericRecord> producer = new KafkaProducer<>(props)) {
            GenericRecord user = new GenericData.Record(schema);
            user.put("id", "user-123");
            user.put("name", "John Doe");
            user.put("email", "john@example.com");

            ProducerRecord<String, GenericRecord> record =
                new ProducerRecord<>("users", user.get("id").toString(), user);

            producer.send(record).get();
        }
    }
}
```

## Java Consumer with Avro

```java
import io.confluent.kafka.serializers.KafkaAvroDeserializer;
import org.apache.avro.generic.GenericRecord;
import org.apache.kafka.clients.consumer.Consumer;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.KafkaConsumer;
import org.apache.kafka.common.serialization.StringDeserializer;

import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class AvroConsumer {
    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "avro-consumer-group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, KafkaAvroDeserializer.class);
        props.put("schema.registry.url", "http://localhost:8081");

        try (Consumer<String, GenericRecord> consumer = new KafkaConsumer<>(props)) {
            consumer.subscribe(Collections.singletonList("users"));

            while (true) {
                ConsumerRecords<String, GenericRecord> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, GenericRecord> record : records) {
                    GenericRecord user = record.value();
                    System.out.printf("User: id=%s, name=%s, email=%s%n",
                        user.get("id"), user.get("name"), user.get("email"));
                }
            }
        }
    }
}
```

## Protobuf Support

```java
// Producer with Protobuf
props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
    io.confluent.kafka.serializers.protobuf.KafkaProtobufSerializer.class);

// Consumer with Protobuf
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
    io.confluent.kafka.serializers.protobuf.KafkaProtobufDeserializer.class);
props.put("specific.protobuf.value.type", UserProto.User.class);
```

## JSON Schema Support

```bash
# Register JSON Schema
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{
    "schemaType": "JSON",
    "schema": "{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"name\":{\"type\":\"string\"}},\"required\":[\"id\",\"name\"]}"
  }' \
  http://localhost:8081/subjects/orders-value/versions
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Use BACKWARD compatibility | Safest default for most use cases |
| Version schemas | Track schema changes over time |
| Test compatibility | Check before deploying new schemas |
| Use specific types | Prefer generated classes over generic records |
| Secure Schema Registry | Enable authentication in production |

Schema Registry is essential for maintaining data contracts and enabling safe schema evolution in Kafka applications.
