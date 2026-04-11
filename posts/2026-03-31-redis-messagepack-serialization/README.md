# How to Use MessagePack Serialization with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, MessagePack, Serialization

Description: Learn how to use MessagePack with Redis to store data in a compact binary format that is 30-50% smaller than JSON and faster to serialize and deserialize.

---

MessagePack is a binary serialization format that is semantically similar to JSON but significantly more compact and faster to process. It is an excellent choice when JSON payload sizes are hurting Redis memory usage or network throughput.

## Python with msgpack

```bash
pip install msgpack
```

```python
import json
import msgpack
import redis

client = redis.Redis(host="localhost", port=6379)

data = {
    "user_id": 42,
    "name": "Alice",
    "score": 98.5,
    "tags": ["premium", "active"],
    "metadata": {"region": "us-east", "tier": 3},
}

# Pack to bytes
packed = msgpack.packb(data, use_bin_type=True)
print(f"JSON size: {len(json.dumps(data).encode())}, MsgPack size: {len(packed)}")
# JSON size: 124, MsgPack size: 88

# Store
client.set("user:42", packed, ex=3600)

# Retrieve and unpack
raw = client.get("user:42")
restored = msgpack.unpackb(raw, raw=False)  # raw=False returns str, not bytes
```

## Handle Timestamps

MessagePack has a native timestamp extension type (ext type -1):

```python
from datetime import datetime, timezone

data = {
    "event": "login",
    "user_id": 42,
    "timestamp": datetime.now(timezone.utc),
}

# Use default=str to convert unsupported types
packed = msgpack.packb(data, default=str, use_bin_type=True)
restored = msgpack.unpackb(packed, raw=False)
# timestamp will be a string - add a reviver if you need datetime
```

## Node.js with @msgpack/msgpack

```bash
npm install @msgpack/msgpack
```

```javascript
import { encode, decode } from "@msgpack/msgpack";
import Redis from "ioredis";

const client = new Redis();

const data = {
  userId: 42,
  name: "Alice",
  score: 98.5,
  tags: ["premium", "active"],
};

// Encode returns Uint8Array
const packed = encode(data);
await client.set("user:42", Buffer.from(packed), "EX", 3600);

// Retrieve and decode
const raw = await client.getBuffer("user:42"); // Get as Buffer, not string
const restored = decode(raw);
```

## Java with MessagePack-Java

```java
import org.msgpack.core.MessagePack;
import org.msgpack.core.MessagePacker;
import org.msgpack.core.MessageUnpacker;

// Serialize
ByteArrayOutputStream bos = new ByteArrayOutputStream();
MessagePacker packer = MessagePack.newDefaultPacker(bos);
packer.packMapHeader(2);
packer.packString("userId");
packer.packInt(42);
packer.packString("name");
packer.packString("Alice");
packer.close();

byte[] packed = bos.toByteArray();

// Deserialize
MessageUnpacker unpacker = MessagePack.newDefaultUnpacker(packed);
int size = unpacker.unpackMapHeader();
Map<String, Object> result = new HashMap<>();
for (int i = 0; i < size; i++) {
    String key = unpacker.unpackString();
    Object value = unpacker.unpackValue().toJson(); // simplified
    result.put(key, value);
}
```

## Compare Sizes

```python
import json, msgpack

sample = {"users": [{"id": i, "name": f"User{i}", "score": i * 1.1} for i in range(100)]}

json_bytes = json.dumps(sample).encode()
msgpack_bytes = msgpack.packb(sample, use_bin_type=True)

print(f"JSON: {len(json_bytes)} bytes")
print(f"MessagePack: {len(msgpack_bytes)} bytes")
print(f"Reduction: {(1 - len(msgpack_bytes)/len(json_bytes))*100:.1f}%")
# JSON: 5141 bytes
# MessagePack: 3200 bytes
# Reduction: 37.8%
```

## Summary

MessagePack reduces Redis storage and network overhead by 30-50% compared to JSON while maintaining schema flexibility. Use `use_bin_type=True` in Python and `getBuffer()` in Node.js to avoid encoding issues, and consider MessagePack when your Redis memory usage or network throughput is constrained by serialization overhead.
