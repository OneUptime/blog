# How to Mock Redis in Unit Tests (Best Practices)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Unit Testing, Mocking, Fakeredis, Test Best Practices

Description: Learn the best practices for mocking Redis in unit tests using fakeredis, in-memory fakes, and proper abstraction layers to keep tests fast and isolated.

---

## When to Mock vs. Use a Real Redis Instance

Mocking is appropriate when:
- Testing business logic that happens to use Redis (not the Redis behavior itself)
- You need fast, parallel, deterministic tests
- Tests run in CI without Docker available

Use a real Redis instance (via Testcontainers) when:
- Testing Lua scripts, transactions, or encoding behavior
- Testing TTL precision or eviction policies
- Testing cluster-specific behavior

## Approach 1: fakeredis (Python)

`fakeredis` is a Python library that implements Redis commands in memory, providing a drop-in replacement for the `redis-py` client.

```bash
pip install fakeredis pytest redis
```

Basic usage:

```python
import fakeredis
import pytest

@pytest.fixture
def r():
    server = fakeredis.FakeServer()
    client = fakeredis.FakeRedis(server=server, decode_responses=True)
    yield client
    client.flushall()

def test_set_get(r):
    r.set("foo", "bar")
    assert r.get("foo") == "bar"

def test_sorted_set(r):
    r.zadd("scores", {"alice": 100, "bob": 200})
    top = r.zrevrange("scores", 0, 0)
    assert top == ["bob"]

def test_expiry(r):
    import time
    r.setex("temp", 1, "value")
    time.sleep(1.1)
    assert r.get("temp") is None
```

## Sharing FakeServer Across Tests

Share a `FakeServer` instance across tests to simulate persistent state:

```python
import fakeredis
import pytest

@pytest.fixture(scope="session")
def fake_server():
    return fakeredis.FakeServer()

@pytest.fixture
def r(fake_server):
    client = fakeredis.FakeRedis(server=fake_server, decode_responses=True)
    yield client
    client.flushall()
```

## Abstracting Redis Behind a Repository

The most robust approach is to put Redis behind an interface so tests can inject any implementation:

```python
from abc import ABC, abstractmethod
from typing import Optional

class CacheRepository(ABC):
    @abstractmethod
    def get(self, key: str) -> Optional[str]:
        pass

    @abstractmethod
    def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        pass

    @abstractmethod
    def delete(self, key: str) -> None:
        pass

class RedisCacheRepository(CacheRepository):
    def __init__(self, client):
        self.client = client

    def get(self, key: str) -> Optional[str]:
        return self.client.get(key)

    def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        if ttl:
            self.client.setex(key, ttl, value)
        else:
            self.client.set(key, value)

    def delete(self, key: str) -> None:
        self.client.delete(key)

class InMemoryCacheRepository(CacheRepository):
    def __init__(self):
        self._store = {}

    def get(self, key: str) -> Optional[str]:
        return self._store.get(key)

    def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        self._store[key] = value  # TTL ignored in simple in-memory mock

    def delete(self, key: str) -> None:
        self._store.pop(key, None)
```

Testing the business logic with the in-memory implementation:

```python
import pytest
from myapp.cache import InMemoryCacheRepository, UserService

@pytest.fixture
def cache():
    return InMemoryCacheRepository()

@pytest.fixture
def user_service(cache):
    return UserService(cache=cache)

def test_user_profile_cached(user_service, cache):
    user_service.load_user(1)
    assert cache.get("user:1") is not None

def test_user_cache_invalidated_on_update(user_service, cache):
    user_service.load_user(1)
    user_service.update_user(1, name="Bob")
    assert cache.get("user:1") is None
```

## Mocking with unittest.mock in Python

For simple cases where you don't need Redis fidelity:

```python
from unittest.mock import MagicMock, patch
from myapp.service import UserService

def test_cache_hit():
    mock_redis = MagicMock()
    mock_redis.get.return_value = b'{"id": 1, "name": "Alice"}'

    service = UserService(redis_client=mock_redis)
    user = service.get_user(1)

    mock_redis.get.assert_called_once_with("user:1")
    assert user["name"] == "Alice"

def test_cache_miss_fetches_from_db():
    mock_redis = MagicMock()
    mock_redis.get.return_value = None

    service = UserService(redis_client=mock_redis)
    with patch('myapp.service.db.get_user', return_value={"id": 1, "name": "Alice"}) as mock_db:
        user = service.get_user(1)
        mock_db.assert_called_once_with(1)
        mock_redis.set.assert_called_once()
```

## Node.js Mocking with Jest

```javascript
// __mocks__/ioredis.js
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
  hget: jest.fn(),
  hset: jest.fn(),
  hgetall: jest.fn(),
};

module.exports = jest.fn(() => mockRedisClient);
module.exports.mockClient = mockRedisClient;
```

```javascript
// userService.test.js
jest.mock('ioredis');
const { mockClient } = require('ioredis');
const UserService = require('./userService');

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return cached user on cache hit', async () => {
    mockClient.get.mockResolvedValue(JSON.stringify({ id: 1, name: 'Alice' }));

    const service = new UserService();
    const user = await service.getUser(1);

    expect(mockClient.get).toHaveBeenCalledWith('user:1');
    expect(user.name).toBe('Alice');
  });

  it('should fetch from DB on cache miss', async () => {
    mockClient.get.mockResolvedValue(null);
    mockClient.set.mockResolvedValue('OK');

    const service = new UserService();
    await service.getUser(1);

    expect(mockClient.set).toHaveBeenCalled();
  });
});
```

## Best Practices Summary

```text
1. Use fakeredis for Python tests needing Redis fidelity without Docker
2. Abstract Redis behind a repository interface for maximum testability
3. Use in-memory fakes for pure business logic tests
4. Use unittest.mock or Jest mocks for simple get/set behavior
5. Use Testcontainers for tests needing real Redis (TTL, Lua, cluster)
6. Always flush/reset state between tests - never share state across test cases
7. Test both cache hit and cache miss paths
8. Mock at the repository layer, not at the Redis client layer when possible
```

## Summary

The best practice for mocking Redis in unit tests depends on what you are testing. For pure business logic, use an in-memory implementation behind a repository interface. For tests that need Redis command fidelity, use fakeredis in Python or @testcontainers/redis in Node.js. Always isolate test state with flushdb or fresh mock instances between tests, and reserve real Redis instances for integration tests that verify actual Redis behavior such as TTL expiry, Lua scripts, or encoding transitions.
