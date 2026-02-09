# How to Implement Pulsar Schema Registry for Message Format Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Pulsar, Schema Registry, Data Validation

Description: Learn how to use Apache Pulsar's built-in schema registry to enforce message format validation, enable schema evolution, and ensure type safety across producers and consumers.

---

Apache Pulsar includes a built-in schema registry that enforces type safety and validates message formats at both production and consumption time. Unlike external schema registries, Pulsar's schema support is deeply integrated with the messaging system, providing automatic serialization, deserialization, and compatibility checking.

In this guide, you'll learn how to define and register schemas, implement schema evolution strategies, validate messages automatically, and build type-safe messaging applications using Pulsar's schema registry on Kubernetes.

## Understanding Pulsar Schema Registry

Pulsar schema registry provides:

- **Type safety** - Enforce message structure at runtime
- **Automatic serialization** - Built-in encoding/decoding
- **Schema evolution** - Controlled changes to message formats
- **Compatibility checking** - Prevent breaking changes
- **Multi-language support** - Schemas work across different client languages
- **Built-in storage** - No external registry required

Supported schema types:
- String, Bytes (raw data)
- JSON (flexible structure)
- Avro (compact binary with schema evolution)
- Protobuf (efficient binary)
- Custom schemas

## Using Built-in Primitive Schemas

Simple schema types:

```python
import pulsar
from pulsar.schema import String, BytesSchema, JsonSchema

client = pulsar.Client('pulsar://localhost:6650')

# String schema
string_producer = client.create_producer(
    'persistent://public/default/messages',
    schema=String()
)
string_producer.send("Hello, Pulsar!")

# Bytes schema
bytes_producer = client.create_producer(
    'persistent://public/default/binary-data',
    schema=BytesSchema()
)
bytes_producer.send(b'\x00\x01\x02\x03')
```

Consume with schema validation:

```python
# Consumer automatically validates schema
consumer = client.subscribe(
    'persistent://public/default/messages',
    subscription_name='string-consumer',
    schema=String()
)

msg = consumer.receive()
print(f"Received string: {msg.value()}")  # Automatically decoded
consumer.acknowledge(msg)
```

## Implementing JSON Schema

Define structured messages with JSON schema:

```python
import pulsar
from pulsar.schema import JsonSchema, Record, String, Integer, Float

# Define message structure
class Order(Record):
    order_id = Integer()
    customer_id = String()
    amount = Float()
    status = String()

client = pulsar.Client('pulsar://localhost:6650')

# Producer with JSON schema
producer = client.create_producer(
    'persistent://public/default/orders',
    schema=JsonSchema(Order)
)

# Send typed message
order = Order(
    order_id=12345,
    customer_id='customer-001',
    amount=99.99,
    status='pending'
)
producer.send(order)

print(f"Sent order: {order.order_id}")
```

Consumer with automatic deserialization:

```python
consumer = client.subscribe(
    'persistent://public/default/orders',
    subscription_name='order-processor',
    schema=JsonSchema(Order)
)

msg = consumer.receive()
order = msg.value()  # Automatically deserialized to Order object

print(f"Processing order {order.order_id} for ${order.amount}")
consumer.acknowledge(msg)
```

## Using Avro Schema

Avro provides compact binary encoding with schema evolution:

```python
import pulsar
from pulsar.schema import AvroSchema, Record, String, Integer

class User(Record):
    user_id = Integer()
    username = String()
    email = String()

client = pulsar.Client('pulsar://localhost:6650')

# Producer with Avro schema
producer = client.create_producer(
    'persistent://public/default/users',
    schema=AvroSchema(User)
)

user = User(
    user_id=1,
    username='john_doe',
    email='john@example.com'
)
producer.send(user)
```

Go implementation with Avro:

```go
package main

import (
    "log"
    "github.com/apache/pulsar-client-go/pulsar"
)

type User struct {
    UserID   int    `json:"user_id"`
    Username string `json:"username"`
    Email    string `json:"email"`
}

func main() {
    client, err := pulsar.NewClient(pulsar.ClientOptions{
        URL: "pulsar://localhost:6650",
    })
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    // Producer with JSON schema (Avro not yet in Go client)
    producer, err := client.CreateProducer(pulsar.ProducerOptions{
        Topic: "persistent://public/default/users",
        Schema: pulsar.NewJSONSchema(`{
            "type": "record",
            "name": "User",
            "fields": [
                {"name": "user_id", "type": "int"},
                {"name": "username", "type": "string"},
                {"name": "email", "type": "string"}
            ]
        }`, nil),
    })
    if err != nil {
        log.Fatal(err)
    }
    defer producer.Close()

    user := User{
        UserID:   1,
        Username: "john_doe",
        Email:    "john@example.com",
    }

    _, err = producer.Send(context.Background(), &pulsar.ProducerMessage{
        Value: user,
    })
    if err != nil {
        log.Fatal(err)
    }
}
```

## Implementing Schema Evolution

Add optional fields with backward compatibility:

```python
# Version 1
class OrderV1(Record):
    order_id = Integer()
    customer_id = String()
    amount = Float()

# Version 2 - Added optional field
class OrderV2(Record):
    order_id = Integer()
    customer_id = String()
    amount = Float()
    discount = Float(default=0.0)  # Optional with default

# Producers using V2 can send to consumers expecting V1
producer_v2 = client.create_producer(
    'persistent://public/default/orders',
    schema=JsonSchema(OrderV2)
)

# Consumers using V1 can still read V2 messages
consumer_v1 = client.subscribe(
    'persistent://public/default/orders',
    subscription_name='old-consumer',
    schema=JsonSchema(OrderV1)
)
```

Configure schema compatibility:

```bash
# Set compatibility mode for namespace
pulsar-admin namespaces set-schema-compatibility-strategy \
  public/default \
  --compatibility BACKWARD

# Compatibility modes:
# - ALWAYS_COMPATIBLE: No validation
# - BACKWARD: New schema can read old data
# - FORWARD: Old schema can read new data
# - FULL: Both backward and forward compatible
```

## Validating Schema Compatibility

Check if schema update is compatible:

```bash
# Upload schema and check compatibility
pulsar-admin schemas upload \
  persistent://public/default/orders \
  --filename order-schema-v2.json

# Get current schema
pulsar-admin schemas get \
  persistent://public/default/orders

# Get schema history
pulsar-admin schemas list \
  persistent://public/default/orders
```

Programmatic compatibility check:

```python
def is_schema_compatible(topic, new_schema):
    """Check if new schema is compatible before deploying"""
    try:
        # Try to create producer with new schema
        test_producer = client.create_producer(
            topic,
            schema=new_schema
        )
        test_producer.close()
        return True
    except pulsar.SchemaIncompatibleException:
        return False

# Test before deployment
if is_schema_compatible('persistent://public/default/orders', JsonSchema(OrderV2)):
    print("Schema is compatible")
    # Deploy new version
else:
    print("Schema is incompatible - cannot deploy")
```

## Implementing Custom Schemas

Create custom serialization logic:

```python
from pulsar.schema import Schema
import json

class CustomJSONSchema(Schema):
    def __init__(self, schema_class):
        self.schema_class = schema_class

    def encode(self, obj):
        """Encode object to bytes"""
        data = {
            'version': 1,
            'timestamp': time.time(),
            'data': obj.__dict__
        }
        return json.dumps(data).encode('utf-8')

    def decode(self, data):
        """Decode bytes to object"""
        parsed = json.loads(data.decode('utf-8'))
        obj = self.schema_class()
        for key, value in parsed['data'].items():
            setattr(obj, key, value)
        return obj

# Use custom schema
producer = client.create_producer(
    'persistent://public/default/custom',
    schema=CustomJSONSchema(Order)
)
```

## Managing Schema Registry

View schemas via admin API:

```bash
# List all schemas
pulsar-admin schemas list public/default

# Get specific schema
pulsar-admin schemas get persistent://public/default/orders

# Delete schema
pulsar-admin schemas delete persistent://public/default/orders
```

Schema registry REST API:

```bash
# Get schema via HTTP
curl http://pulsar-broker:8080/admin/v2/schemas/public/default/orders/schema

# Upload schema
curl -X POST http://pulsar-broker:8080/admin/v2/schemas/public/default/orders/schema \
  -H "Content-Type: application/json" \
  -d '{
    "type": "JSON",
    "schema": "{...}",
    "properties": {}
  }'
```

## Implementing Multi-Language Schema Sharing

Share schemas across different languages:

```python
# Python producer
class Event(Record):
    event_id = String()
    event_type = String()
    timestamp = Integer()

producer = client.create_producer(
    'persistent://public/default/events',
    schema=AvroSchema(Event)
)
```

Java consumer reads same schema:

```java
// Java consumer
@Data
@AllArgsConstructor
@NoArgsConstructor
public class Event {
    private String eventId;
    private String eventType;
    private Long timestamp;
}

PulsarClient client = PulsarClient.builder()
    .serviceUrl("pulsar://localhost:6650")
    .build();

Consumer<Event> consumer = client.newConsumer(Schema.AVRO(Event.class))
    .topic("persistent://public/default/events")
    .subscriptionName("java-consumer")
    .subscribe();

Message<Event> msg = consumer.receive();
Event event = msg.getValue();
System.out.println("Event: " + event.getEventId());
```

## Monitoring Schema Usage

Track schema versions:

```python
def get_schema_stats(topic):
    """Get schema usage statistics"""
    stats = {
        'topic': topic,
        'schema_versions': [],
        'producer_schemas': {},
        'consumer_schemas': {}
    }

    # Query via admin API
    schema_info = pulsar_admin.schemas().get_schema_info(topic)
    stats['current_version'] = schema_info.version

    return stats
```

Create alerts for schema issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pulsar-schema-alerts
spec:
  groups:
  - name: pulsar-schemas
    rules:
    - alert: SchemaValidationErrors
      expr: |
        rate(pulsar_schema_validation_errors_total[5m]) > 0.01
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Schema validation errors detected"

    - alert: IncompatibleSchemaUpdate
      expr: |
        pulsar_schema_compatibility_check_failed > 0
      for: 1m
      labels:
        severity: critical
```

## Best Practices

Follow these practices:

1. **Always use schemas in production** - Prevent data corruption
2. **Plan schema evolution** - Design for backward compatibility
3. **Test compatibility** - Validate before deploying schema changes
4. **Use Avro for efficiency** - Compact binary encoding
5. **Version schemas explicitly** - Track schema changes
6. **Document schema changes** - Maintain changelog
7. **Set appropriate compatibility mode** - Choose based on requirements

## Troubleshooting Schema Issues

Common problems and solutions:

```bash
# Schema validation failing
pulsar-admin topics peek-messages \
  persistent://public/default/orders \
  --count 1 \
  --subscription-name debug

# Check schema compatibility
pulsar-admin schemas test-compatibility \
  persistent://public/default/orders \
  --filename new-schema.json

# Force schema update (dangerous)
pulsar-admin schemas delete persistent://public/default/orders
pulsar-admin schemas upload \
  persistent://public/default/orders \
  --filename correct-schema.json
```

## Conclusion

Apache Pulsar's built-in schema registry provides robust type safety and message validation without external dependencies. By defining schemas, implementing proper evolution strategies, and enforcing compatibility checking, you build reliable messaging systems with strong data contracts.

The combination of automatic serialization, multi-language support, and integrated compatibility checking makes Pulsar's schema registry an essential tool for production messaging applications on Kubernetes. Understanding schema evolution and compatibility modes ensures smooth deployments as your data models evolve over time.
