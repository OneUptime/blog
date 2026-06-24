# How to Use JSON Serialization with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, JSON, Serialization

Description: Learn how to use JSON serialization with Redis across Python, Node.js, and Java, including tips for handling special types and schema versioning.

---

JSON is the most widely used serialization format for Redis because it is human-readable, debuggable directly in redis-cli, and supported in every language. The tradeoff is larger payload size compared to binary formats.

## Python: json + dataclasses

```python
import json
import redis
from dataclasses import dataclass, asdict
from datetime import datetime, timezone

@dataclass
class Order:
    order_id: str
    user_id: int
    total: float
    created_at: str  # ISO 8601 string

client = redis.Redis(host="localhost", port=6379, decode_responses=True)

order = Order(
    order_id="ORD-001",
    user_id=42,
    total=99.99,
    created_at=datetime.now(timezone.utc).isoformat()
)

# Store as JSON string
client.set(f"order:{order.order_id}", json.dumps(asdict(order)), ex=3600)

# Retrieve and reconstruct
raw = client.get("order:ORD-001")
data = json.loads(raw)
restored = Order(**data)
```

## Store Partial Updates Efficiently

Rather than deserializing and re-serializing the whole object for a small change, use Redis Hashes:

```python
# Store fields individually in a hash
client.hset("order:ORD-001", mapping={
    "status": "shipped",
    "tracking": "1Z999AA1012345678",
})

# Update only one field
client.hset("order:ORD-001", "status", "delivered")

# Get all fields as dict
order_data = client.hgetall("order:ORD-001")
```

## Node.js: JSON.stringify / JSON.parse

```javascript
const Redis = require("ioredis");
const client = new Redis();

const order = {
  orderId: "ORD-001",
  userId: 42,
  total: 99.99,
  createdAt: new Date().toISOString(),
};

// Store
await client.set(`order:${order.orderId}`, JSON.stringify(order), "EX", 3600);

// Retrieve
const raw = await client.get("order:ORD-001");
const restored = JSON.parse(raw);
```

## Handle Special Types

JSON does not natively handle `Date`, `BigInt`, `undefined`, or custom classes. Use a replacer/reviver:

```javascript
function jsonStringify(obj) {
  return JSON.stringify(obj, function (key, value) {
    const rawValue = this[key];
    if (rawValue instanceof Date) return { __type: "Date", value: rawValue.toISOString() };
    if (typeof value === "bigint") return { __type: "BigInt", value: value.toString() };
    return value;
  });
}

function jsonParse(str) {
  return JSON.parse(str, (key, value) => {
    if (value && value.__type === "Date") return new Date(value.value);
    if (value && value.__type === "BigInt") return BigInt(value.value);
    return value;
  });
}
```

## Add Schema Version for Evolution

```python
@dataclass
class Order:
    order_id: str
    user_id: int
    total: float
    created_at: str
    schema_version: int = 1  # bump when fields change

def deserialize_order(raw: str) -> Order:
    data = json.loads(raw)
    version = data.get("schema_version", 1)

    if version == 1:
        # Handle legacy format
        data.setdefault("schema_version", 1)

    return Order(**data)
```

## Summary

JSON is the practical default for Redis serialization due to its universal readability and tooling support. Use `decode_responses=True` in redis-py so you work with strings directly, store complex objects as JSON strings or decompose them into Redis Hashes for field-level updates, and embed a schema version field to handle model evolution without breaking existing cached data.
