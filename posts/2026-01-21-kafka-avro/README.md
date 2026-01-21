# How to Use Avro with Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Avro, Schema Registry, Serialization, Data Contracts

Description: A comprehensive guide to using Apache Avro with Kafka for efficient, schema-based serialization with backward and forward compatibility.

---

Apache Avro is a data serialization framework that provides compact binary encoding and schema evolution support, making it ideal for Kafka messaging. This guide covers Avro setup, schema design, and integration with Kafka.

## Why Use Avro with Kafka

Avro offers several advantages over JSON or other formats:

- **Compact binary format**: Smaller message sizes than JSON
- **Schema evolution**: Add/remove fields without breaking consumers
- **Strong typing**: Catch errors at compile time
- **Schema Registry integration**: Centralized schema management

## Setting Up Schema Registry

### Docker Compose Setup

```yaml
version: '3'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0
    depends_on:
      - kafka
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka:9092
```

## Defining Avro Schemas

### User Schema Example

```json
{
  "type": "record",
  "name": "User",
  "namespace": "com.example.kafka",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "name", "type": "string"},
    {"name": "email", "type": "string"},
    {"name": "createdAt", "type": "long", "logicalType": "timestamp-millis"},
    {"name": "metadata", "type": {"type": "map", "values": "string"}, "default": {}}
  ]
}
```

### Order Event Schema

```json
{
  "type": "record",
  "name": "OrderEvent",
  "namespace": "com.example.kafka.events",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "status", "type": {"type": "enum", "name": "OrderStatus", "symbols": ["CREATED", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]}},
    {"name": "items", "type": {"type": "array", "items": {
      "type": "record",
      "name": "OrderItem",
      "fields": [
        {"name": "productId", "type": "string"},
        {"name": "quantity", "type": "int"},
        {"name": "price", "type": {"type": "bytes", "logicalType": "decimal", "precision": 10, "scale": 2}}
      ]
    }}},
    {"name": "totalAmount", "type": {"type": "bytes", "logicalType": "decimal", "precision": 12, "scale": 2}},
    {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"}
  ]
}
```

## Java Implementation

### Maven Dependencies

```xml
<dependencies>
    <dependency>
        <groupId>org.apache.kafka</groupId>
        <artifactId>kafka-clients</artifactId>
        <version>3.6.0</version>
    </dependency>
    <dependency>
        <groupId>io.confluent</groupId>
        <artifactId>kafka-avro-serializer</artifactId>
        <version>7.5.0</version>
    </dependency>
    <dependency>
        <groupId>org.apache.avro</groupId>
        <artifactId>avro</artifactId>
        <version>1.11.3</version>
    </dependency>
</dependencies>

<repositories>
    <repository>
        <id>confluent</id>
        <url>https://packages.confluent.io/maven/</url>
    </repository>
</repositories>
```

### Avro Producer

```java
import io.confluent.kafka.serializers.KafkaAvroSerializer;
import org.apache.avro.Schema;
import org.apache.avro.generic.GenericData;
import org.apache.avro.generic.GenericRecord;
import org.apache.kafka.clients.producer.*;

import java.util.*;

public class AvroProducer {

    public static void main(String[] args) throws Exception {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            KafkaAvroSerializer.class.getName());
        props.put("schema.registry.url", "http://localhost:8081");

        // Define schema
        String schemaString = """
            {
              "type": "record",
              "name": "User",
              "namespace": "com.example",
              "fields": [
                {"name": "id", "type": "string"},
                {"name": "name", "type": "string"},
                {"name": "email", "type": "string"}
              ]
            }
            """;

        Schema schema = new Schema.Parser().parse(schemaString);

        try (KafkaProducer<String, GenericRecord> producer =
                new KafkaProducer<>(props)) {

            // Create record
            GenericRecord user = new GenericData.Record(schema);
            user.put("id", "user-123");
            user.put("name", "John Doe");
            user.put("email", "john@example.com");

            ProducerRecord<String, GenericRecord> record =
                new ProducerRecord<>("users", "user-123", user);

            producer.send(record, (metadata, exception) -> {
                if (exception == null) {
                    System.out.printf("Sent to partition %d, offset %d%n",
                        metadata.partition(), metadata.offset());
                } else {
                    exception.printStackTrace();
                }
            });
        }
    }
}
```

### Avro Consumer

```java
import io.confluent.kafka.serializers.KafkaAvroDeserializer;
import org.apache.avro.generic.GenericRecord;
import org.apache.kafka.clients.consumer.*;

import java.time.Duration;
import java.util.*;

public class AvroConsumer {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "avro-consumer-group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            KafkaAvroDeserializer.class.getName());
        props.put("schema.registry.url", "http://localhost:8081");
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        try (KafkaConsumer<String, GenericRecord> consumer =
                new KafkaConsumer<>(props)) {

            consumer.subscribe(Collections.singletonList("users"));

            while (true) {
                ConsumerRecords<String, GenericRecord> records =
                    consumer.poll(Duration.ofMillis(1000));

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

### Using Generated Classes

```java
// First, generate Java classes from Avro schema
// mvn avro:schema

import com.example.User;  // Generated class
import io.confluent.kafka.serializers.KafkaAvroSerializer;
import org.apache.kafka.clients.producer.*;

public class SpecificAvroProducer {

    public static void main(String[] args) throws Exception {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            KafkaAvroSerializer.class.getName());
        props.put("schema.registry.url", "http://localhost:8081");

        try (KafkaProducer<String, User> producer = new KafkaProducer<>(props)) {

            User user = User.newBuilder()
                .setId("user-123")
                .setName("John Doe")
                .setEmail("john@example.com")
                .build();

            producer.send(new ProducerRecord<>("users", user.getId(), user)).get();
            System.out.println("Sent user: " + user);
        }
    }
}
```

## Python Implementation

```python
from confluent_kafka import Producer, Consumer
from confluent_kafka.avro import AvroProducer, AvroConsumer
from confluent_kafka.avro.cached_schema_registry_client import CachedSchemaRegistryClient

# Schema definition
user_schema_str = """
{
  "type": "record",
  "name": "User",
  "namespace": "com.example",
  "fields": [
    {"name": "id", "type": "string"},
    {"name": "name", "type": "string"},
    {"name": "email", "type": "string"}
  ]
}
"""

# Modern approach using SerializingProducer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer, AvroDeserializer
from confluent_kafka.serialization import SerializationContext, MessageField

class User:
    def __init__(self, id: str, name: str, email: str):
        self.id = id
        self.name = name
        self.email = email

def user_to_dict(user, ctx):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email
    }

def dict_to_user(data, ctx):
    return User(id=data["id"], name=data["name"], email=data["email"])


def create_avro_producer():
    schema_registry_conf = {'url': 'http://localhost:8081'}
    schema_registry_client = SchemaRegistryClient(schema_registry_conf)

    avro_serializer = AvroSerializer(
        schema_registry_client,
        user_schema_str,
        user_to_dict
    )

    producer_conf = {
        'bootstrap.servers': 'localhost:9092',
    }

    from confluent_kafka import SerializingProducer
    return SerializingProducer({
        **producer_conf,
        'key.serializer': lambda x, _: x.encode() if x else None,
        'value.serializer': avro_serializer
    })


def create_avro_consumer(group_id: str):
    schema_registry_conf = {'url': 'http://localhost:8081'}
    schema_registry_client = SchemaRegistryClient(schema_registry_conf)

    avro_deserializer = AvroDeserializer(
        schema_registry_client,
        user_schema_str,
        dict_to_user
    )

    from confluent_kafka import DeserializingConsumer
    return DeserializingConsumer({
        'bootstrap.servers': 'localhost:9092',
        'group.id': group_id,
        'auto.offset.reset': 'earliest',
        'key.deserializer': lambda x, _: x.decode() if x else None,
        'value.deserializer': avro_deserializer
    })


def main():
    # Produce
    producer = create_avro_producer()
    user = User(id="user-123", name="John Doe", email="john@example.com")

    producer.produce(
        topic='users',
        key=user.id,
        value=user
    )
    producer.flush()
    print(f"Sent user: {user.id}")

    # Consume
    consumer = create_avro_consumer('avro-consumer-group')
    consumer.subscribe(['users'])

    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            print(f"Error: {msg.error()}")
            continue

        user = msg.value()
        print(f"Received: id={user.id}, name={user.name}, email={user.email}")


if __name__ == '__main__':
    main()
```

## Schema Registry Operations

### Register Schema

```bash
# Register a schema
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema": "{\"type\":\"record\",\"name\":\"User\",\"fields\":[{\"name\":\"id\",\"type\":\"string\"},{\"name\":\"name\",\"type\":\"string\"}]}"}' \
  http://localhost:8081/subjects/users-value/versions

# Get schema by ID
curl http://localhost:8081/schemas/ids/1

# Get latest schema for subject
curl http://localhost:8081/subjects/users-value/versions/latest

# List all subjects
curl http://localhost:8081/subjects

# Set compatibility level
curl -X PUT -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility": "BACKWARD"}' \
  http://localhost:8081/config/users-value
```

## Best Practices

1. **Use specific record types**: Generate Java/Python classes for type safety
2. **Set appropriate compatibility**: BACKWARD is recommended for most cases
3. **Version your schemas**: Use Schema Registry for centralized management
4. **Include default values**: For optional fields to support evolution
5. **Use logical types**: For dates, timestamps, decimals

## Conclusion

Avro with Kafka provides efficient, schema-based serialization with excellent support for schema evolution. Combined with Schema Registry, it enables robust data contracts between producers and consumers while maintaining backward and forward compatibility.
