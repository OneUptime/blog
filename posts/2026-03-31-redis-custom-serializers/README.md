# How to Implement Custom Serializers for Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Serialization, Python

Description: Learn how to implement custom Redis serializers that handle complex types, encryption, compression, and schema versioning in a reusable and testable way.

---

Custom serializers give you a single place to control how data enters and leaves Redis - adding compression, encryption, type handling, or versioning without scattering that logic through your codebase.

## Python: Abstract Serializer Interface

```python
from abc import ABC, abstractmethod
from typing import Any, Optional

class RedisSerializer(ABC):
    @abstractmethod
    def serialize(self, value: Any) -> bytes:
        pass

    @abstractmethod
    def deserialize(self, data: bytes) -> Any:
        pass
```

## JSON Serializer with Custom Type Support

```python
import json
from datetime import datetime
from uuid import UUID
from decimal import Decimal

class TypeAwareJsonSerializer(RedisSerializer):
    def serialize(self, value: Any) -> bytes:
        return json.dumps(value, default=self._encode).encode("utf-8")

    def deserialize(self, data: bytes) -> Any:
        return json.loads(data, object_hook=self._decode)

    def _encode(self, obj):
        if isinstance(obj, datetime):
            return {"__t": "dt", "v": obj.isoformat()}
        if isinstance(obj, UUID):
            return {"__t": "uuid", "v": str(obj)}
        if isinstance(obj, Decimal):
            return {"__t": "decimal", "v": str(obj)}
        raise TypeError(f"Cannot serialize {type(obj)}")

    def _decode(self, obj: dict):
        if "__t" not in obj:
            return obj
        t = obj["__t"]
        if t == "dt":
            return datetime.fromisoformat(obj["v"])
        if t == "uuid":
            return UUID(obj["v"])
        if t == "decimal":
            return Decimal(obj["v"])
        return obj
```

## Compressed Serializer (Decorator Pattern)

```python
import zlib

class CompressingSerializer(RedisSerializer):
    def __init__(self, inner: RedisSerializer, threshold_bytes: int = 256):
        self.inner = inner
        self.threshold = threshold_bytes
        self.COMPRESS_FLAG = b"\x01"
        self.RAW_FLAG = b"\x00"

    def serialize(self, value: Any) -> bytes:
        raw = self.inner.serialize(value)
        if len(raw) > self.threshold:
            compressed = zlib.compress(raw, level=6)
            return self.COMPRESS_FLAG + compressed
        return self.RAW_FLAG + raw

    def deserialize(self, data: bytes) -> Any:
        flag, payload = data[:1], data[1:]
        if flag == self.COMPRESS_FLAG:
            payload = zlib.decompress(payload)
        return self.inner.deserialize(payload)
```

## Encrypted Serializer

```python
from cryptography.fernet import Fernet

class EncryptingSerializer(RedisSerializer):
    def __init__(self, inner: RedisSerializer, key: bytes):
        self.inner = inner
        self.fernet = Fernet(key)

    def serialize(self, value: Any) -> bytes:
        raw = self.inner.serialize(value)
        return self.fernet.encrypt(raw)

    def deserialize(self, data: bytes) -> Any:
        decrypted = self.fernet.decrypt(data)
        return self.inner.deserialize(decrypted)
```

## Composing Serializers

```python
import redis

# Chain: JSON -> compress -> encrypt
key = Fernet.generate_key()
serializer = EncryptingSerializer(
    CompressingSerializer(
        TypeAwareJsonSerializer(),
        threshold_bytes=256
    ),
    key=key,
)

client = redis.Redis(host="localhost", port=6379)

def cache_set(redis_key: str, value: Any, ex: int = 3600):
    client.set(redis_key, serializer.serialize(value), ex=ex)

def cache_get(redis_key: str) -> Optional[Any]:
    raw = client.get(redis_key)
    if raw is None:
        return None
    return serializer.deserialize(raw)
```

## Testing Your Serializer

```python
import pytest

def test_roundtrip():
    s = TypeAwareJsonSerializer()
    data = {
        "id": UUID("12345678-1234-5678-1234-567812345678"),
        "created": datetime(2026, 1, 15, 12, 0, 0),
        "amount": Decimal("99.99"),
    }
    assert s.deserialize(s.serialize(data)) == data
```

## Summary

Custom serializers encapsulate complex encoding logic - type handling, compression, encryption - into composable, testable units. Use the decorator pattern to layer behaviors (compress then encrypt) without coupling concerns together, and write roundtrip tests to verify correctness before deploying to production.
