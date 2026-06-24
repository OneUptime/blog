# How to Mock Redis in Python Unit Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, Testing, Mock, Unit Test

Description: Mock Redis in Python unit tests using fakeredis and unittest.mock to test Redis-dependent code without a running server, covering strings, lists, and pub/sub.

---

Testing Redis-dependent code without a live server makes tests faster, hermetic, and CI-friendly. Python has two primary approaches: `fakeredis` (an in-process Redis emulator) and `unittest.mock` for lightweight stub replacement.

## Option 1 - fakeredis

`fakeredis` implements the Redis protocol in pure Python, supporting most commands without any network calls.

```bash
pip install fakeredis
```

```python
import fakeredis
import pytest

@pytest.fixture
def fake_redis():
    return fakeredis.FakeRedis(decode_responses=True)

def test_set_and_get(fake_redis):
    fake_redis.set("key", "value")
    assert fake_redis.get("key") == "value"

def test_expiry(fake_redis):
    fake_redis.set("temp", "data", ex=10)
    assert fake_redis.ttl("temp") > 0

def test_list_queue(fake_redis):
    fake_redis.rpush("queue", "job1", "job2", "job3")
    assert fake_redis.llen("queue") == 3
    assert fake_redis.lpop("queue") == "job1"
```

## Injecting fakeredis into Application Code

Structure your application to accept a Redis client as a dependency:

```python
# cache.py
import redis as redis_lib

class UserCache:
    def __init__(self, redis_client: redis_lib.Redis):
        self.r = redis_client

    def get_user(self, user_id: int) -> dict | None:
        data = self.r.hgetall(f"user:{user_id}")
        return data if data else None

    def set_user(self, user_id: int, data: dict, ttl: int = 300):
        self.r.hset(f"user:{user_id}", mapping=data)
        self.r.expire(f"user:{user_id}", ttl)
```

```python
# test_cache.py
import fakeredis
from cache import UserCache

def test_user_cache_miss():
    r = fakeredis.FakeRedis(decode_responses=True)
    cache = UserCache(r)
    assert cache.get_user(999) is None

def test_user_cache_hit():
    r = fakeredis.FakeRedis(decode_responses=True)
    cache = UserCache(r)
    user = {"name": "Alice", "email": "alice@example.com"}
    cache.set_user(1001, user)
    result = cache.get_user(1001)
    assert result["name"] == "Alice"
```

## Option 2 - unittest.mock

Use `MagicMock` when you only need to verify that specific commands were called, without simulating state:

```python
from unittest.mock import MagicMock, patch
from cache import UserCache

def test_set_user_calls_hset():
    mock_redis = MagicMock()
    cache = UserCache(mock_redis)
    cache.set_user(42, {"name": "Bob"})

    mock_redis.hset.assert_called_once_with("user:42", mapping={"name": "Bob"})
    mock_redis.expire.assert_called_once_with("user:42", 300)

def test_get_user_returns_none_on_empty():
    mock_redis = MagicMock()
    mock_redis.hgetall.return_value = {}
    cache = UserCache(mock_redis)
    assert cache.get_user(99) is None
```

## Patching redis.Redis in Tests

When code creates its own Redis instance internally:

```python
# service.py
import redis

def get_cached_value(key: str) -> str | None:
    r = redis.Redis(host="localhost", decode_responses=True)
    return r.get(key)
```

```python
# test_service.py
from unittest.mock import patch, MagicMock
from service import get_cached_value

@patch("service.redis.Redis")
def test_get_cached_value(mock_redis_cls):
    mock_client = MagicMock()
    mock_client.get.return_value = "cached_data"
    mock_redis_cls.return_value = mock_client

    result = get_cached_value("my:key")
    assert result == "cached_data"
    mock_client.get.assert_called_with("my:key")
```

## Summary

Use `fakeredis` for tests that depend on Redis state behavior - it supports most Redis commands with no server required. Use `unittest.mock` when you only need to assert call patterns. Always inject the Redis client as a dependency to make your code testable without complex patching.
