# How to Use JSON Schema with Kafka

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, JSON Schema, Schema Registry, Validation, Data Contracts

Description: A comprehensive guide to using JSON Schema with Apache Kafka for schema validation and evolution while maintaining the readability of JSON messages.

---

JSON Schema provides a way to validate JSON messages in Kafka while keeping the human-readable format. This guide covers how to integrate JSON Schema with Kafka using Schema Registry.

## Why JSON Schema with Kafka

- **Human-readable**: Messages remain as JSON, easy to debug
- **Familiar format**: Teams already know JSON
- **Schema validation**: Ensure message structure compliance
- **Schema evolution**: Support backward/forward compatibility

## Defining JSON Schemas

### User Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "http://example.com/user.schema.json",
  "title": "User",
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique user identifier"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "createdAt": {
      "type": "integer",
      "description": "Unix timestamp in milliseconds"
    },
    "metadata": {
      "type": "object",
      "additionalProperties": {"type": "string"}
    }
  }
}
```

## Java Implementation

```java
import io.confluent.kafka.serializers.json.KafkaJsonSchemaSerializer;
import io.confluent.kafka.serializers.json.KafkaJsonSchemaDeserializer;
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.clients.consumer.*;

import java.util.*;

public class User {
    private String id;
    private String name;
    private String email;
    private Long createdAt;
    private Map<String, String> metadata;

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public Long getCreatedAt() { return createdAt; }
    public void setCreatedAt(Long createdAt) { this.createdAt = createdAt; }
    public Map<String, String> getMetadata() { return metadata; }
    public void setMetadata(Map<String, String> metadata) { this.metadata = metadata; }
}

public class JsonSchemaKafkaClient {

    public static KafkaProducer<String, User> createProducer() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringSerializer");
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            KafkaJsonSchemaSerializer.class.getName());
        props.put("schema.registry.url", "http://localhost:8081");
        props.put("auto.register.schemas", true);

        return new KafkaProducer<>(props);
    }

    public static KafkaConsumer<String, User> createConsumer(String groupId) {
        Properties props = new Properties();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG,
            "org.apache.kafka.common.serialization.StringDeserializer");
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG,
            KafkaJsonSchemaDeserializer.class.getName());
        props.put("schema.registry.url", "http://localhost:8081");
        props.put("json.value.type", User.class.getName());

        return new KafkaConsumer<>(props);
    }

    public static void main(String[] args) throws Exception {
        // Producer
        try (KafkaProducer<String, User> producer = createProducer()) {
            User user = new User();
            user.setId("user-123");
            user.setName("John Doe");
            user.setEmail("john@example.com");
            user.setCreatedAt(System.currentTimeMillis());

            producer.send(new ProducerRecord<>("users-json", user.getId(), user)).get();
            System.out.println("Sent user with JSON Schema validation");
        }
    }
}
```

## Python Implementation

```python
from confluent_kafka import Producer, Consumer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.json_schema import JSONSerializer, JSONDeserializer
import json

user_schema_str = """
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "required": ["id", "name", "email"],
  "properties": {
    "id": {"type": "string"},
    "name": {"type": "string"},
    "email": {"type": "string", "format": "email"}
  }
}
"""

class User:
    def __init__(self, id: str, name: str, email: str):
        self.id = id
        self.name = name
        self.email = email

def user_to_dict(user, ctx):
    return {"id": user.id, "name": user.name, "email": user.email}

def dict_to_user(data, ctx):
    return User(id=data["id"], name=data["name"], email=data["email"])

def create_json_producer():
    schema_registry_client = SchemaRegistryClient({'url': 'http://localhost:8081'})
    json_serializer = JSONSerializer(user_schema_str, schema_registry_client, user_to_dict)

    from confluent_kafka import SerializingProducer
    return SerializingProducer({
        'bootstrap.servers': 'localhost:9092',
        'key.serializer': lambda x, _: x.encode() if x else None,
        'value.serializer': json_serializer
    })

def main():
    producer = create_json_producer()
    user = User(id="user-123", name="John Doe", email="john@example.com")
    producer.produce(topic='users-json', key=user.id, value=user)
    producer.flush()
    print("Sent user with JSON Schema validation")

if __name__ == '__main__':
    main()
```

## Schema Registry Operations

```bash
# Register JSON Schema
curl -X POST -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  --data '{"schemaType": "JSON", "schema": "{\"type\":\"object\",\"properties\":{\"id\":{\"type\":\"string\"},\"name\":{\"type\":\"string\"}},\"required\":[\"id\",\"name\"]}"}' \
  http://localhost:8081/subjects/users-json-value/versions
```

## Best Practices

1. **Define required fields**: Ensure critical fields are always present
2. **Use format validations**: email, date-time, uri formats
3. **Set string constraints**: minLength, maxLength, pattern
4. **Add descriptions**: Document field purposes

## Conclusion

JSON Schema with Kafka provides schema validation while maintaining JSON's readability. It's ideal for teams transitioning from unvalidated JSON messaging to schema-enforced contracts.
