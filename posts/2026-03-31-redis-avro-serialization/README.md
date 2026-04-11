# How to Use Avro Serialization with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Avro, Serialization

Description: Learn how to use Apache Avro serialization with Redis for compact binary storage with schema registry integration and robust schema evolution support.

---

Apache Avro is a compact binary serialization format with strong schema evolution semantics. It is commonly used in data engineering pipelines and pairs well with Redis for caching structured data that needs to evolve over time.

## Define an Avro Schema

```json
{
  "type": "record",
  "name": "UserProfile",
  "namespace": "com.myapp",
  "fields": [
    { "name": "user_id", "type": "long" },
    { "name": "name", "type": "string" },
    { "name": "score", "type": "double" },
    { "name": "email", "type": ["null", "string"], "default": null },
    { "name": "tags", "type": { "type": "array", "items": "string" }, "default": [] }
  ]
}
```

## Python with fastavro

```bash
pip install fastavro
```

```python
import io
import json
import redis
import fastavro

client = redis.Redis(host="localhost", port=6379)

schema_str = open("user_profile.avsc").read()
schema = fastavro.parse_schema(json.loads(schema_str))

record = {
    "user_id": 42,
    "name": "Alice",
    "score": 98.5,
    "email": "alice@example.com",
    "tags": ["premium", "active"],
}

# Serialize
buf = io.BytesIO()
fastavro.schemaless_writer(buf, schema, record)
serialized = buf.getvalue()

# Store in Redis
client.set("user:42", serialized, ex=3600)

# Retrieve and deserialize
raw = client.get("user:42")
buf = io.BytesIO(raw)
loaded = fastavro.schemaless_reader(buf, schema)
print(loaded["name"])  # Alice
```

## Schema Evolution Example

```python
# v1 schema - original
v1_schema = fastavro.parse_schema({
    "type": "record",
    "name": "UserProfile",
    "fields": [
        {"name": "user_id", "type": "long"},
        {"name": "name", "type": "string"},
    ]
})

# v2 schema - added email with default
v2_schema = fastavro.parse_schema({
    "type": "record",
    "name": "UserProfile",
    "fields": [
        {"name": "user_id", "type": "long"},
        {"name": "name", "type": "string"},
        {"name": "email", "type": ["null", "string"], "default": None},
    ]
})

# Read v1 data using v2 reader schema - works because email has a default
raw = client.get("user:42")
buf = io.BytesIO(raw)
# reader_schema is v2, writer_schema was v1
loaded = fastavro.schemaless_reader(buf, v1_schema, reader_schema=v2_schema)
print(loaded.get("email"))  # None (default)
```

## Java with Apache Avro

```java
import org.apache.avro.Schema;
import org.apache.avro.generic.*;
import org.apache.avro.io.*;

Schema schema = new Schema.Parser().parse(new File("user_profile.avsc"));

// Serialize
GenericRecord record = new GenericData.Record(schema);
record.put("user_id", 42L);
record.put("name", "Alice");
record.put("score", 98.5);
record.put("email", null);
record.put("tags", List.of());

ByteArrayOutputStream bos = new ByteArrayOutputStream();
DatumWriter<GenericRecord> writer = new GenericDatumWriter<>(schema);
BinaryEncoder encoder = EncoderFactory.get().binaryEncoder(bos, null);
writer.write(record, encoder);
encoder.flush();

byte[] bytes = bos.toByteArray();

// Store in Redis
jedis.set("user:42".getBytes(), bytes);
```

## Store Schema ID with Payload

In production, store the schema version alongside the data:

```python
import struct

def store_with_schema_version(client, key, record, schema, version: int):
    buf = io.BytesIO()
    # Prepend 4-byte version number
    buf.write(struct.pack(">I", version))
    fastavro.schemaless_writer(buf, schema, record)
    client.set(key, buf.getvalue(), ex=3600)

def load_with_schema_version(client, key, schema_registry: dict):
    raw = client.get(key)
    buf = io.BytesIO(raw)
    version = struct.unpack(">I", buf.read(4))[0]
    schema = schema_registry[version]
    return fastavro.schemaless_reader(buf, schema), version
```

## Summary

Avro serialization with Redis combines compact binary encoding with explicit schema evolution rules, making it a strong choice for data pipelines where schemas change frequently. Store schemas externally or embed version markers in your Redis keys to manage multiple schema versions in flight simultaneously.
