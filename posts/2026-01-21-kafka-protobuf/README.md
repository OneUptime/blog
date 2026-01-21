# How to Use Protobuf with Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Protocol Buffers, Protobuf, Schema Registry, Serialization

Description: A comprehensive guide to using Protocol Buffers with Apache Kafka for efficient, strongly-typed message serialization with schema evolution support.

---

Protocol Buffers (Protobuf) is Google's language-neutral, platform-neutral serialization mechanism that provides efficient binary encoding and excellent schema evolution capabilities. This guide covers how to integrate Protobuf with Kafka.

## Why Use Protobuf with Kafka

- **Smaller message sizes**: More compact than JSON and Avro
- **Faster serialization**: Better performance than text-based formats
- **Strong typing**: Generated code provides compile-time type safety
- **Schema evolution**: Support for backward and forward compatibility

## Defining Protobuf Schemas

### User Message

```protobuf
// user.proto
syntax = "proto3";

package com.example.kafka;

option java_package = "com.example.kafka.proto";
option java_outer_classname = "UserProtos";

message User {
  string id = 1;
  string name = 2;
  string email = 3;
  int64 created_at = 4;
  map<string, string> metadata = 5;
}
```

### Order Event

```protobuf
// order.proto
syntax = "proto3";

package com.example.kafka.events;

message OrderEvent {
  string order_id = 1;
  string customer_id = 2;
  OrderStatus status = 3;
  repeated OrderItem items = 4;
  int64 total_amount_cents = 5;
  int64 timestamp = 6;
}

enum OrderStatus {
  UNKNOWN = 0;
  CREATED = 1;
  CONFIRMED = 2;
  SHIPPED = 3;
  DELIVERED = 4;
  CANCELLED = 5;
}

message OrderItem {
  string product_id = 1;
  int32 quantity = 2;
  int64 price_cents = 3;
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
        <artifactId>kafka-protobuf-serializer</artifactId>
        <version>7.5.0</version>
    </dependency>
    <dependency>
        <groupId>com.google.protobuf</groupId>
        <artifactId>protobuf-java</artifactId>
        <version>3.25.0</version>
    </dependency>
</dependencies>
```

### Protobuf Producer

```java
import io.confluent.kafka.serializers.protobuf.KafkaProtobufSerializer;
import org.apache.kafka.clients.producer.*;
import com.example.kafka.proto.UserProtos.User;

import java.util.*;

public class ProtobufProducer {

    public static void main(String[] args) throws Exception {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            KafkaProtobufSerializer.class.getName());
        props.put("schema.registry.url", "http://localhost:8081");

        try (KafkaProducer<String, User> producer = new KafkaProducer<>(props)) {

            User user = User.newBuilder()
                .setId("user-123")
                .setName("John Doe")
                .setEmail("john@example.com")
                .setCreatedAt(System.currentTimeMillis())
                .putMetadata("source", "web")
                .build();

            ProducerRecord<String, User> record =
                new ProducerRecord<>("users-proto", user.getId(), user);

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

### Protobuf Consumer

```java
import io.confluent.kafka.serializers.protobuf.KafkaProtobufDeserializer;
import io.confluent.kafka.serializers.protobuf.KafkaProtobufDeserializerConfig;
import org.apache.kafka.clients.consumer.*;
import com.example.kafka.proto.UserProtos.User;

import java.time.Duration;
import java.util.*;

public class ProtobufConsumer {

    public static void main(String[] args) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "protobuf-consumer-group");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            KafkaProtobufDeserializer.class.getName());
        props.put("schema.registry.url", "http://localhost:8081");
        props.put(KafkaProtobufDeserializerConfig.SPECIFIC_PROTOBUF_VALUE_TYPE,
            User.class.getName());
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

        try (KafkaConsumer<String, User> consumer = new KafkaConsumer<>(props)) {

            consumer.subscribe(Collections.singletonList("users-proto"));

            while (true) {
                ConsumerRecords<String, User> records =
                    consumer.poll(Duration.ofMillis(1000));

                for (ConsumerRecord<String, User> record : records) {
                    User user = record.value();
                    System.out.printf("User: id=%s, name=%s, email=%s%n",
                        user.getId(), user.getName(), user.getEmail());
                }
            }
        }
    }
}
```

## Python Implementation

```python
from confluent_kafka import Producer, Consumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.protobuf import ProtobufSerializer, ProtobufDeserializer
from confluent_kafka.serialization import SerializationContext, MessageField

# Import generated protobuf classes
from user_pb2 import User

def create_protobuf_producer():
    schema_registry_conf = {'url': 'http://localhost:8081'}
    schema_registry_client = SchemaRegistryClient(schema_registry_conf)

    protobuf_serializer = ProtobufSerializer(
        User,
        schema_registry_client
    )

    from confluent_kafka import SerializingProducer
    return SerializingProducer({
        'bootstrap.servers': 'localhost:9092',
        'key.serializer': lambda x, _: x.encode() if x else None,
        'value.serializer': protobuf_serializer
    })


def create_protobuf_consumer(group_id: str):
    schema_registry_conf = {'url': 'http://localhost:8081'}
    schema_registry_client = SchemaRegistryClient(schema_registry_conf)

    protobuf_deserializer = ProtobufDeserializer(
        User,
        {'use.deprecated.format': False}
    )

    from confluent_kafka import DeserializingConsumer
    return DeserializingConsumer({
        'bootstrap.servers': 'localhost:9092',
        'group.id': group_id,
        'auto.offset.reset': 'earliest',
        'key.deserializer': lambda x, _: x.decode() if x else None,
        'value.deserializer': protobuf_deserializer
    })


def main():
    # Produce
    producer = create_protobuf_producer()

    user = User()
    user.id = "user-123"
    user.name = "John Doe"
    user.email = "john@example.com"
    user.created_at = int(time.time() * 1000)

    producer.produce(topic='users-proto', key=user.id, value=user)
    producer.flush()
    print(f"Sent user: {user.id}")

    # Consume
    consumer = create_protobuf_consumer('protobuf-consumer-group')
    consumer.subscribe(['users-proto'])

    while True:
        msg = consumer.poll(1.0)
        if msg is None:
            continue
        if msg.error():
            print(f"Error: {msg.error()}")
            continue

        user = msg.value()
        print(f"Received: id={user.id}, name={user.name}")


if __name__ == '__main__':
    import time
    main()
```

## Schema Registry Integration

```bash
# Register Protobuf schema
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schemaType": "PROTOBUF", "schema": "syntax = \"proto3\"; message User { string id = 1; string name = 2; }"}' \
  http://localhost:8081/subjects/users-proto-value/versions

# Get schema
curl http://localhost:8081/subjects/users-proto-value/versions/latest
```

## Best Practices

1. **Use proto3 syntax**: Better defaults and cleaner semantics
2. **Reserve field numbers**: Never reuse deleted field numbers
3. **Use appropriate types**: int64 for timestamps, bytes for binary data
4. **Generate code in CI**: Automate protobuf compilation

## Conclusion

Protobuf with Kafka provides excellent performance and type safety for high-throughput messaging systems. Combined with Schema Registry, it enables robust schema evolution while maintaining strong data contracts.
