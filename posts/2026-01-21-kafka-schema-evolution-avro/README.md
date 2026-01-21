# How to Implement Schema Evolution with Kafka and Avro

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Avro, Schema Registry, Schema Evolution, Data Serialization, Java, Python

Description: A comprehensive guide to implementing schema evolution in Kafka using Avro and Schema Registry, covering compatibility modes, schema design, evolution patterns, and best practices for managing changing data structures.

---

Schema evolution allows you to change message schemas over time without breaking existing consumers. Using Avro with Confluent Schema Registry provides robust schema management for Kafka applications. This guide covers schema design, compatibility modes, and evolution patterns.

## Understanding Schema Evolution

### Why Schema Evolution Matters

- **Producers and consumers evolve independently**: Different deployment schedules
- **Backward compatibility**: New consumers can read old messages
- **Forward compatibility**: Old consumers can read new messages
- **Data contracts**: Explicit agreements between services

### Avro Benefits

- **Compact binary format**: Efficient serialization
- **Schema included**: Self-describing messages
- **Rich type system**: Primitives, complex types, logical types
- **Schema evolution**: Built-in compatibility rules

## Setting Up Schema Registry

### Docker Compose Setup

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
```

## Compatibility Modes

### Available Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| BACKWARD | New schema can read old data | Consumer upgrades first |
| FORWARD | Old schema can read new data | Producer upgrades first |
| FULL | Both backward and forward | Maximum flexibility |
| NONE | No compatibility checking | Development only |

### Setting Compatibility

```bash
# Set global default
curl -X PUT -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility": "BACKWARD"}' \
  http://localhost:8081/config

# Set per-subject
curl -X PUT -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"compatibility": "FULL"}' \
  http://localhost:8081/config/orders-value
```

## Defining Avro Schemas

### Basic Schema

```json
{
  "type": "record",
  "name": "Order",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"}
  ]
}
```

### Schema with Optional Fields

```json
{
  "type": "record",
  "name": "Order",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"},
    {"name": "currency", "type": ["null", "string"], "default": null},
    {"name": "notes", "type": ["null", "string"], "default": null}
  ]
}
```

### Complex Schema

```json
{
  "type": "record",
  "name": "Order",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customer", "type": {
      "type": "record",
      "name": "Customer",
      "fields": [
        {"name": "id", "type": "string"},
        {"name": "name", "type": "string"},
        {"name": "email", "type": ["null", "string"], "default": null}
      ]
    }},
    {"name": "items", "type": {
      "type": "array",
      "items": {
        "type": "record",
        "name": "OrderItem",
        "fields": [
          {"name": "productId", "type": "string"},
          {"name": "quantity", "type": "int"},
          {"name": "price", "type": "double"}
        ]
      }
    }},
    {"name": "metadata", "type": ["null", {
      "type": "map",
      "values": "string"
    }], "default": null}
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
        <version>3.7.0</version>
    </dependency>
    <dependency>
        <groupId>io.confluent</groupId>
        <artifactId>kafka-avro-serializer</artifactId>
        <version>7.6.0</version>
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
import io.confluent.kafka.serializers.KafkaAvroSerializerConfig;
import org.apache.avro.Schema;
import org.apache.avro.generic.GenericData;
import org.apache.avro.generic.GenericRecord;
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class AvroProducer {
    private final Producer<String, GenericRecord> producer;
    private final Schema schema;

    public AvroProducer(String bootstrapServers, String schemaRegistryUrl) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            KafkaAvroSerializer.class.getName());
        props.put(KafkaAvroSerializerConfig.SCHEMA_REGISTRY_URL_CONFIG,
            schemaRegistryUrl);
        props.put(KafkaAvroSerializerConfig.AUTO_REGISTER_SCHEMAS, true);

        this.producer = new KafkaProducer<>(props);

        // Define schema
        String schemaString = """
            {
              "type": "record",
              "name": "Order",
              "namespace": "com.example.orders",
              "fields": [
                {"name": "orderId", "type": "string"},
                {"name": "customerId", "type": "string"},
                {"name": "amount", "type": "double"},
                {"name": "currency", "type": ["null", "string"], "default": null}
              ]
            }
            """;
        this.schema = new Schema.Parser().parse(schemaString);
    }

    public void sendOrder(String orderId, String customerId,
                         double amount, String currency) {
        GenericRecord order = new GenericData.Record(schema);
        order.put("orderId", orderId);
        order.put("customerId", customerId);
        order.put("amount", amount);
        order.put("currency", currency);

        ProducerRecord<String, GenericRecord> record =
            new ProducerRecord<>("orders", orderId, order);

        producer.send(record, (metadata, exception) -> {
            if (exception != null) {
                System.err.println("Send failed: " + exception.getMessage());
            } else {
                System.out.printf("Sent to %s-%d @ %d%n",
                    metadata.topic(), metadata.partition(), metadata.offset());
            }
        });
    }

    public void close() {
        producer.close();
    }

    public static void main(String[] args) {
        AvroProducer producer = new AvroProducer(
            "localhost:9092",
            "http://localhost:8081"
        );

        producer.sendOrder("order-1", "customer-1", 99.99, "USD");
        producer.sendOrder("order-2", "customer-2", 149.99, null);

        producer.close();
    }
}
```

### Avro Consumer

```java
import io.confluent.kafka.serializers.KafkaAvroDeserializer;
import io.confluent.kafka.serializers.KafkaAvroDeserializerConfig;
import org.apache.avro.generic.GenericRecord;
import org.apache.kafka.clients.consumer.*;
import java.time.Duration;
import java.util.Collections;
import java.util.Properties;

public class AvroConsumer {
    private final Consumer<String, GenericRecord> consumer;

    public AvroConsumer(String bootstrapServers, String schemaRegistryUrl,
                       String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            KafkaAvroDeserializer.class.getName());
        props.put(KafkaAvroDeserializerConfig.SCHEMA_REGISTRY_URL_CONFIG,
            schemaRegistryUrl);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        this.consumer = new KafkaConsumer<>(props);
    }

    public void consume(String topic) {
        consumer.subscribe(Collections.singletonList(topic));

        try {
            while (true) {
                ConsumerRecords<String, GenericRecord> records =
                    consumer.poll(Duration.ofMillis(100));

                for (ConsumerRecord<String, GenericRecord> record : records) {
                    GenericRecord order = record.value();

                    System.out.printf("Order: id=%s, customer=%s, amount=%.2f%n",
                        order.get("orderId"),
                        order.get("customerId"),
                        order.get("amount"));

                    // Handle optional field
                    Object currency = order.get("currency");
                    if (currency != null) {
                        System.out.println("  Currency: " + currency);
                    }
                }
            }
        } finally {
            consumer.close();
        }
    }

    public static void main(String[] args) {
        AvroConsumer consumer = new AvroConsumer(
            "localhost:9092",
            "http://localhost:8081",
            "order-consumer"
        );

        consumer.consume("orders");
    }
}
```

### Generated Classes (Specific Record)

```java
// Using Avro Maven plugin to generate classes
import com.example.orders.Order;
import io.confluent.kafka.serializers.KafkaAvroSerializer;
import org.apache.kafka.clients.producer.*;
import java.util.Properties;

public class SpecificRecordProducer {
    private final Producer<String, Order> producer;

    public SpecificRecordProducer(String bootstrapServers,
                                  String schemaRegistryUrl) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            KafkaAvroSerializer.class.getName());
        props.put("schema.registry.url", schemaRegistryUrl);

        this.producer = new KafkaProducer<>(props);
    }

    public void sendOrder(Order order) {
        ProducerRecord<String, Order> record =
            new ProducerRecord<>("orders", order.getOrderId().toString(), order);

        producer.send(record);
    }

    public void close() {
        producer.close();
    }
}
```

## Python Implementation

### Installation

```bash
pip install confluent-kafka[avro]
pip install fastavro
```

### Avro Producer

```python
from confluent_kafka import Producer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.serialization import (
    StringSerializer,
    SerializationContext,
    MessageField
)

# Schema definition
schema_str = """
{
  "type": "record",
  "name": "Order",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "currency", "type": ["null", "string"], "default": null}
  ]
}
"""


class AvroProducer:
    def __init__(self, bootstrap_servers, schema_registry_url):
        # Schema Registry client
        schema_registry_conf = {'url': schema_registry_url}
        schema_registry_client = SchemaRegistryClient(schema_registry_conf)

        # Avro serializer
        self.avro_serializer = AvroSerializer(
            schema_registry_client,
            schema_str,
            self._order_to_dict
        )

        # String serializer for keys
        self.string_serializer = StringSerializer('utf-8')

        # Producer
        producer_conf = {'bootstrap.servers': bootstrap_servers}
        self.producer = Producer(producer_conf)

    def _order_to_dict(self, order, ctx):
        return order

    def delivery_report(self, err, msg):
        if err:
            print(f"Delivery failed: {err}")
        else:
            print(f"Delivered to {msg.topic()} [{msg.partition()}] @ {msg.offset()}")

    def send_order(self, topic, order):
        self.producer.produce(
            topic=topic,
            key=self.string_serializer(order['orderId']),
            value=self.avro_serializer(
                order,
                SerializationContext(topic, MessageField.VALUE)
            ),
            callback=self.delivery_report
        )

    def flush(self):
        self.producer.flush()


def main():
    producer = AvroProducer(
        'localhost:9092',
        'http://localhost:8081'
    )

    orders = [
        {
            'orderId': 'order-1',
            'customerId': 'customer-1',
            'amount': 99.99,
            'currency': 'USD'
        },
        {
            'orderId': 'order-2',
            'customerId': 'customer-2',
            'amount': 149.99,
            'currency': None
        }
    ]

    for order in orders:
        producer.send_order('orders', order)

    producer.flush()


if __name__ == '__main__':
    main()
```

### Avro Consumer

```python
from confluent_kafka import Consumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroDeserializer
from confluent_kafka.serialization import (
    StringDeserializer,
    SerializationContext,
    MessageField
)


class AvroConsumer:
    def __init__(self, bootstrap_servers, schema_registry_url, group_id):
        # Schema Registry client
        schema_registry_conf = {'url': schema_registry_url}
        schema_registry_client = SchemaRegistryClient(schema_registry_conf)

        # Avro deserializer
        self.avro_deserializer = AvroDeserializer(
            schema_registry_client,
            schema_str=None  # Will fetch from registry
        )

        # String deserializer for keys
        self.string_deserializer = StringDeserializer('utf-8')

        # Consumer
        consumer_conf = {
            'bootstrap.servers': bootstrap_servers,
            'group.id': group_id,
            'auto.offset.reset': 'earliest'
        }
        self.consumer = Consumer(consumer_conf)

    def consume(self, topic):
        self.consumer.subscribe([topic])

        try:
            while True:
                msg = self.consumer.poll(timeout=1.0)

                if msg is None:
                    continue

                if msg.error():
                    print(f"Consumer error: {msg.error()}")
                    continue

                # Deserialize
                key = self.string_deserializer(msg.key())
                value = self.avro_deserializer(
                    msg.value(),
                    SerializationContext(topic, MessageField.VALUE)
                )

                print(f"Order: {value}")

        except KeyboardInterrupt:
            pass
        finally:
            self.consumer.close()


def main():
    consumer = AvroConsumer(
        'localhost:9092',
        'http://localhost:8081',
        'order-consumer'
    )

    consumer.consume('orders')


if __name__ == '__main__':
    main()
```

## Schema Evolution Examples

### Adding a Field (Backward Compatible)

```json
// Version 1
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "amount", "type": "double"}
  ]
}

// Version 2 - Add optional field with default
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "currency", "type": ["null", "string"], "default": null}
  ]
}
```

### Removing a Field (Forward Compatible)

```json
// Version 1 - Has status field
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "amount", "type": "double"},
    {"name": "status", "type": "string", "default": "PENDING"}
  ]
}

// Version 2 - Status removed (must have had default)
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "amount", "type": "double"}
  ]
}
```

### Renaming a Field (Using Aliases)

```json
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "totalAmount", "type": "double", "aliases": ["amount"]}
  ]
}
```

### Changing Field Type (Widening)

```json
// Version 1 - int
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "quantity", "type": "int"}
  ]
}

// Version 2 - Widen to long
{
  "type": "record",
  "name": "Order",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "quantity", "type": "long"}
  ]
}
```

## Schema Registry API

### Register Schema

```bash
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"}]}"}' \
  http://localhost:8081/subjects/orders-value/versions
```

### Get Schema

```bash
# Get latest version
curl http://localhost:8081/subjects/orders-value/versions/latest

# Get specific version
curl http://localhost:8081/subjects/orders-value/versions/1
```

### Check Compatibility

```bash
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"},{\"name\":\"amount\",\"type\":\"double\"}]}"}' \
  http://localhost:8081/compatibility/subjects/orders-value/versions/latest
```

### Delete Schema

```bash
# Soft delete
curl -X DELETE http://localhost:8081/subjects/orders-value/versions/1

# Hard delete
curl -X DELETE http://localhost:8081/subjects/orders-value/versions/1?permanent=true
```

## Best Practices

### 1. Always Use Defaults for New Fields

```json
// Good - has default
{"name": "currency", "type": ["null", "string"], "default": null}

// Bad - no default (breaks backward compatibility)
{"name": "currency", "type": "string"}
```

### 2. Never Remove Required Fields

```json
// Only remove fields that had defaults
// Keep required fields forever or use aliases
```

### 3. Use Namespaces

```json
{
  "type": "record",
  "name": "Order",
  "namespace": "com.example.orders.v1",
  "fields": [...]
}
```

### 4. Document Schema Changes

```json
{
  "type": "record",
  "name": "Order",
  "doc": "Represents a customer order. Added currency in v2.",
  "fields": [
    {"name": "currency", "type": ["null", "string"], "default": null,
     "doc": "ISO 4217 currency code. Added in schema v2."}
  ]
}
```

### 5. Test Compatibility Before Deploying

```bash
# Always check compatibility before registering
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data @new-schema.json \
  http://localhost:8081/compatibility/subjects/orders-value/versions/latest
```

## Conclusion

Schema evolution with Avro and Schema Registry provides a robust foundation for managing changing data structures in Kafka:

1. **Choose appropriate compatibility mode** based on your deployment strategy
2. **Design schemas for evolution** with optional fields and defaults
3. **Use Schema Registry** for centralized schema management
4. **Test compatibility** before deploying schema changes
5. **Document changes** for team awareness

By following these patterns, you can evolve your message schemas safely while maintaining compatibility between producers and consumers.
