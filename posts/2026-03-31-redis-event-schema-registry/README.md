# How to Implement Event Schema Registry with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Event Sourcing, Schema Registry, Stream, Architecture

Description: Build a lightweight event schema registry using Redis Hashes to enforce schema contracts and validate events across producers and consumers.

---

A schema registry is a central store that defines the structure of events flowing through your system. It ensures producers and consumers agree on event shapes and helps catch incompatible changes before they reach production. Redis Hashes provide a fast, simple foundation for a lightweight registry.

## Registry Data Model

Store each schema as a JSON string in a Redis Hash, keyed by event type and version:

```bash
HSET schema:registry \
  "OrderPlaced:1" '{"type":"object","required":["order_id","total"],"properties":{"order_id":{"type":"string"},"total":{"type":"number"}}}' \
  "OrderPlaced:2" '{"type":"object","required":["order_id","total","discount_code"],"properties":{"order_id":{"type":"string"},"total":{"type":"number"},"discount_code":{"type":"string"}}}'
```

## Registering a New Schema

```python
import redis
import json

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

def register_schema(event_type: str, version: int, schema: dict):
    key = f"{event_type}:{version}"
    existing = client.hget("schema:registry", key)
    if existing:
        raise ValueError(f"Schema {key} already registered. Use a new version.")
    client.hset("schema:registry", key, json.dumps(schema))
    client.zadd("schema:versions", {key: version}, nx=True)
    print(f"Registered schema: {key}")

schema_v1 = {
    "type": "object",
    "required": ["order_id", "total"],
    "properties": {
        "order_id": {"type": "string"},
        "total": {"type": "number"}
    }
}
register_schema("OrderPlaced", 1, schema_v1)
```

## Validating Events Against the Registry

Use `jsonschema` to validate events before publishing:

```python
import jsonschema

def get_schema(event_type: str, version: int) -> dict:
    key = f"{event_type}:{version}"
    schema_json = client.hget("schema:registry", key)
    if not schema_json:
        raise ValueError(f"No schema found for {key}")
    return json.loads(schema_json)

def validate_and_publish(event_type: str, version: int, payload: dict, stream: str):
    schema = get_schema(event_type, version)
    jsonschema.validate(instance=payload, schema=schema)
    fields = {
        "type": event_type,
        "version": str(version),
        **{k: str(v) for k, v in payload.items()}
    }
    msg_id = client.xadd(stream, fields)
    print(f"Published event {msg_id}")
    return msg_id

validate_and_publish("OrderPlaced", 1, {"order_id": "1001", "total": 99.99}, "orders:events")
```

## Looking Up the Latest Version

Track the latest version of each event type using a Hash:

```bash
HSET schema:latest OrderPlaced 2
```

```python
def get_latest_version(event_type: str) -> int:
    version = client.hget("schema:latest", event_type)
    return int(version) if version else 1
```

## Listing All Registered Schemas

```bash
HKEYS schema:registry
```

```python
def list_schemas():
    keys = client.hkeys("schema:registry")
    for key in sorted(keys):
        print(key)

list_schemas()
# Output:
# OrderPlaced:1
# OrderPlaced:2
```

## Schema Compatibility Check

Before registering a new version, verify the change is backward compatible:

```python
def check_backward_compatible(old_schema: dict, new_schema: dict) -> bool:
    old_required = set(old_schema.get("required", []))
    new_required = set(new_schema.get("required", []))
    added = new_required - old_required
    if added:
        print(f"Breaking change: added required fields {added}")
        return False
    return True
```

## Summary

A Redis-based schema registry provides a lightweight but effective mechanism for enforcing event contracts across your event-driven architecture. By storing schemas as JSON in Redis Hashes and validating events before publishing, you catch schema mismatches early. Combining versioned schemas with compatibility checks prevents breaking changes from reaching consumers.
