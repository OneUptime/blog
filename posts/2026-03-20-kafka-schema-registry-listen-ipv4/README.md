# How to Configure Kafka Schema Registry to Listen on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kafka, Schema Registry, Confluent, IPv4, Avro, Configuration, Messaging

Description: Learn how to configure Confluent Schema Registry to listen on a specific IPv4 address and integrate with a Kafka cluster for Avro schema management.

---

Schema Registry stores and manages Avro, JSON Schema, and Protobuf schemas for Kafka topics. Configuring it to listen on a specific IPv4 address enables controlled access from producers and consumers in your network.

## Installation

```bash
# Add Confluent repository

mkdir -p /etc/apt/keyrings
wget -qO - https://packages.confluent.io/deb/8.2/archive.key | gpg --dearmor > /etc/apt/keyrings/confluent.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/confluent.gpg] https://packages.confluent.io/deb/8.2 stable main" > /etc/apt/sources.list.d/confluent-platform.list
apt update && apt install confluent-schema-registry -y
```

## Configuration

```properties
# /etc/schema-registry/schema-registry.properties

# --- Listening address ---
# Bind to a specific IPv4 address (not 0.0.0.0 to restrict access)
listeners=http://10.0.0.15:8081

# --- Kafka cluster connection ---
kafkastore.bootstrap.servers=PLAINTEXT://10.0.0.10:9092,PLAINTEXT://10.0.0.11:9092

# --- Internal Kafka topic for schema storage ---
kafkastore.topic=_schemas
kafkastore.topic.replication.factor=3

# --- Schema compatibility (backward, forward, full, none, *_transitive) ---
schema.compatibility.level=backward

# --- Security (if Kafka uses SASL) ---
# kafkastore.security.protocol=SASL_PLAINTEXT
# kafkastore.sasl.mechanism=SCRAM-SHA-256
# kafkastore.sasl.jaas.config=...
```

## Starting Schema Registry

```bash
systemctl enable --now confluent-schema-registry

# Verify it's listening
ss -tlnp | grep :8081
curl -s http://10.0.0.15:8081/subjects | python3 -m json.tool
```

## Using the Schema Registry API

```bash
# List all registered subjects (topic schemas)
curl -s http://10.0.0.15:8081/subjects | python3 -m json.tool

# Register an Avro schema for a topic
curl -X POST http://10.0.0.15:8081/subjects/orders-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"int\"},{\"name\":\"amount\",\"type\":\"double\"}]}"
  }'

# Get the latest schema for a subject
curl -s http://10.0.0.15:8081/subjects/orders-value/versions/latest | python3 -m json.tool

# Check compatibility of a new schema
curl -X POST http://10.0.0.15:8081/compatibility/subjects/orders-value/versions/latest \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{"schema": "{\"type\":\"record\",\"name\":\"Order\",\"fields\":[{\"name\":\"id\",\"type\":\"int\"},{\"name\":\"amount\",\"type\":\"double\"},{\"name\":\"currency\",\"type\":\"string\",\"default\":\"USD\"}]}"}'
```

## Configuring Producers to Use Schema Registry

```java
// Java Kafka Producer configuration (connect to Schema Registry over IPv4)
Properties props = new Properties();
props.put("bootstrap.servers", "10.0.0.10:9092");
props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
props.put("value.serializer", "io.confluent.kafka.serializers.KafkaAvroSerializer");

// Point to the Schema Registry IPv4 address
props.put("schema.registry.url", "http://10.0.0.15:8081");
```

## Key Takeaways

- `listeners=http://ip:8081` restricts Schema Registry to a specific IPv4 address.
- Schemas are stored in the `_schemas` Kafka topic with the replication factor set by `kafkastore.topic.replication.factor`.
- The `backward` compatibility mode allows adding new fields with defaults without breaking existing consumers.
- Protect the Schema Registry API with authentication in production (use the Confluent Platform security features).
