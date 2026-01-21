# How to Write Integration Tests with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Testing, Integration Tests, Python, Node.js, Testcontainers, pytest

Description: A comprehensive guide to writing integration tests with Redis, covering test containers, fixtures, isolation strategies, and best practices for reliable testing.

---

Integration tests that involve Redis need careful setup to ensure isolation, reproducibility, and fast execution. This guide covers proven strategies for testing Redis-dependent code in Python, Node.js, and other environments.

## Testing Strategies Overview

| Strategy | Isolation | Speed | Production Parity |
|----------|-----------|-------|-------------------|
| Testcontainers | Full | Medium | High |
| Separate Redis DB | Good | Fast | High |
| Mocking | Full | Fastest | Low |
| Shared Redis + Prefixes | Medium | Fast | High |

## Python Testing with pytest

### Basic Setup with pytest Fixtures

```python
# tests/conftest.py
import pytest
import redis
import os

@pytest.fixture(scope="session")
def redis_client():
    """Create a Redis client for testing."""
    client = redis.Redis(
        host=os.getenv('REDIS_HOST', 'localhost'),
        port=int(os.getenv('REDIS_PORT', 6379)),
        db=15,  # Use separate DB for tests
        decode_responses=True
    )

    # Verify connection
    client.ping()

    yield client

    # Cleanup after all tests
    client.flushdb()
    client.close()

@pytest.fixture(autouse=True)
def clean_redis(redis_client):
    """Clean Redis before each test."""
    redis_client.flushdb()
    yield

@pytest.fixture
def cache_service(redis_client):
    """Create a cache service instance for testing."""
    from app.cache import CacheService
    return CacheService(redis_client)
```

### Writing Tests

```python
# tests/test_cache.py
import pytest
import time

class TestCacheService:
    def test_set_and_get(self, cache_service):
        """Test basic set and get operations."""
        cache_service.set("test_key", "test_value")
        result = cache_service.get("test_key")
        assert result == "test_value"

    def test_set_with_ttl(self, cache_service, redis_client):
        """Test that TTL is properly set."""
        cache_service.set("ttl_key", "value", ttl=60)

        ttl = redis_client.ttl("ttl_key")
        assert 55 <= ttl <= 60

    def test_get_nonexistent_key(self, cache_service):
        """Test getting a key that does not exist."""
        result = cache_service.get("nonexistent")
        assert result is None

    def test_delete(self, cache_service):
        """Test deleting a key."""
        cache_service.set("to_delete", "value")
        cache_service.delete("to_delete")
        assert cache_service.get("to_delete") is None

    def test_increment(self, cache_service):
        """Test atomic increment."""
        cache_service.set("counter", "0")

        result = cache_service.increment("counter")
        assert result == 1

        result = cache_service.increment("counter", 5)
        assert result == 6

    def test_hash_operations(self, cache_service):
        """Test hash set and get."""
        cache_service.hset("user:1", {"name": "Alice", "age": "30"})

        result = cache_service.hget("user:1", "name")
        assert result == "Alice"

        all_fields = cache_service.hgetall("user:1")
        assert all_fields == {"name": "Alice", "age": "30"}


class TestCacheConcurrency:
    def test_concurrent_increments(self, cache_service, redis_client):
        """Test that increments are atomic."""
        import threading

        redis_client.set("concurrent_counter", "0")
        threads = []
        increments_per_thread = 100
        num_threads = 10

        def increment_many():
            for _ in range(increments_per_thread):
                redis_client.incr("concurrent_counter")

        for _ in range(num_threads):
            t = threading.Thread(target=increment_many)
            threads.append(t)
            t.start()

        for t in threads:
            t.join()

        final_value = int(redis_client.get("concurrent_counter"))
        assert final_value == num_threads * increments_per_thread
```

### Using Testcontainers

```python
# tests/conftest.py
import pytest
from testcontainers.redis import RedisContainer

@pytest.fixture(scope="session")
def redis_container():
    """Start a Redis container for testing."""
    with RedisContainer("redis:7-alpine") as redis:
        yield redis

@pytest.fixture(scope="session")
def redis_client(redis_container):
    """Create a Redis client connected to the test container."""
    import redis

    client = redis.Redis(
        host=redis_container.get_container_host_ip(),
        port=redis_container.get_exposed_port(6379),
        decode_responses=True
    )

    yield client
    client.close()

@pytest.fixture(autouse=True)
def clean_redis(redis_client):
    """Clean Redis before each test."""
    redis_client.flushall()
    yield
```

Install testcontainers:

```bash
pip install testcontainers[redis]
```

### Testing Redis Cluster

```python
# tests/conftest.py
import pytest
from redis.cluster import RedisCluster

@pytest.fixture(scope="session")
def redis_cluster():
    """Connect to a Redis Cluster for testing."""
    # Assumes cluster is running (use docker-compose)
    cluster = RedisCluster(
        host="localhost",
        port=7001,
        decode_responses=True
    )

    yield cluster
    cluster.close()

@pytest.fixture
def cluster_test_key():
    """Generate a test key with hash tag for cluster."""
    import uuid
    return f"{{test}}:{uuid.uuid4()}"
```

### Testing Pub/Sub

```python
# tests/test_pubsub.py
import pytest
import threading
import time

class TestPubSub:
    def test_publish_subscribe(self, redis_client):
        """Test basic pub/sub functionality."""
        received_messages = []
        channel = "test_channel"

        def subscriber():
            pubsub = redis_client.pubsub()
            pubsub.subscribe(channel)

            for message in pubsub.listen():
                if message['type'] == 'message':
                    received_messages.append(message['data'])
                    if len(received_messages) >= 3:
                        break

            pubsub.close()

        # Start subscriber in background
        sub_thread = threading.Thread(target=subscriber)
        sub_thread.start()

        # Give subscriber time to connect
        time.sleep(0.1)

        # Publish messages
        for i in range(3):
            redis_client.publish(channel, f"message_{i}")

        sub_thread.join(timeout=2)

        assert received_messages == ["message_0", "message_1", "message_2"]

    def test_pattern_subscribe(self, redis_client):
        """Test pattern-based subscription."""
        received = []

        def subscriber():
            pubsub = redis_client.pubsub()
            pubsub.psubscribe("events:*")

            count = 0
            for message in pubsub.listen():
                if message['type'] == 'pmessage':
                    received.append({
                        'channel': message['channel'],
                        'data': message['data']
                    })
                    count += 1
                    if count >= 2:
                        break

            pubsub.close()

        sub_thread = threading.Thread(target=subscriber)
        sub_thread.start()
        time.sleep(0.1)

        redis_client.publish("events:user:created", "user_1")
        redis_client.publish("events:order:placed", "order_1")

        sub_thread.join(timeout=2)

        assert len(received) == 2
        assert received[0]['channel'] == "events:user:created"
```

### Testing Lua Scripts

```python
# tests/test_lua_scripts.py
import pytest

class TestLuaScripts:
    def test_rate_limit_script(self, redis_client):
        """Test a rate limiting Lua script."""
        script = """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])

        local current = redis.call('INCR', key)
        if current == 1 then
            redis.call('EXPIRE', key, window)
        end

        if current > limit then
            return 0
        else
            return 1
        end
        """

        rate_limit = redis_client.register_script(script)

        # First 5 requests should pass
        for i in range(5):
            result = rate_limit(keys=["ratelimit:user1"], args=[5, 60])
            assert result == 1, f"Request {i+1} should pass"

        # 6th request should fail
        result = rate_limit(keys=["ratelimit:user1"], args=[5, 60])
        assert result == 0, "6th request should be rate limited"

    def test_atomic_transfer_script(self, redis_client):
        """Test an atomic balance transfer script."""
        script = """
        local from_key = KEYS[1]
        local to_key = KEYS[2]
        local amount = tonumber(ARGV[1])

        local from_balance = tonumber(redis.call('GET', from_key) or 0)
        if from_balance < amount then
            return -1  -- Insufficient balance
        end

        redis.call('DECRBY', from_key, amount)
        redis.call('INCRBY', to_key, amount)

        return 1  -- Success
        """

        transfer = redis_client.register_script(script)

        # Setup balances
        redis_client.set("balance:alice", "100")
        redis_client.set("balance:bob", "50")

        # Successful transfer
        result = transfer(
            keys=["balance:alice", "balance:bob"],
            args=[30]
        )
        assert result == 1
        assert redis_client.get("balance:alice") == "70"
        assert redis_client.get("balance:bob") == "80"

        # Failed transfer (insufficient balance)
        result = transfer(
            keys=["balance:alice", "balance:bob"],
            args=[100]
        )
        assert result == -1
        assert redis_client.get("balance:alice") == "70"  # Unchanged
```

## Node.js Testing with Jest

### Basic Setup

```javascript
// tests/setup.js
const Redis = require('ioredis');

let redis;

beforeAll(async () => {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    db: 15, // Test database
  });
});

afterAll(async () => {
  await redis.flushdb();
  await redis.quit();
});

beforeEach(async () => {
  await redis.flushdb();
});

module.exports = { getRedis: () => redis };
```

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 10000,
};
```

### Writing Tests

```javascript
// tests/cache.test.js
const { getRedis } = require('./setup');
const CacheService = require('../src/cache');

describe('CacheService', () => {
  let redis;
  let cache;

  beforeEach(() => {
    redis = getRedis();
    cache = new CacheService(redis);
  });

  describe('set and get', () => {
    it('should store and retrieve a value', async () => {
      await cache.set('key', 'value');
      const result = await cache.get('key');
      expect(result).toBe('value');
    });

    it('should return null for non-existent key', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should store JSON objects', async () => {
      const obj = { name: 'Alice', age: 30 };
      await cache.setJSON('user', obj);
      const result = await cache.getJSON('user');
      expect(result).toEqual(obj);
    });
  });

  describe('TTL', () => {
    it('should set TTL correctly', async () => {
      await cache.set('ttl-key', 'value', 60);
      const ttl = await redis.ttl('ttl-key');
      expect(ttl).toBeGreaterThan(55);
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should expire key after TTL', async () => {
      await cache.set('expiring', 'value', 1);
      await new Promise(resolve => setTimeout(resolve, 1100));
      const result = await cache.get('expiring');
      expect(result).toBeNull();
    });
  });

  describe('increment', () => {
    it('should increment a counter', async () => {
      await redis.set('counter', '0');
      const result = await cache.increment('counter');
      expect(result).toBe(1);
    });

    it('should increment by custom amount', async () => {
      await redis.set('counter', '10');
      const result = await cache.increment('counter', 5);
      expect(result).toBe(15);
    });
  });
});
```

### Using Testcontainers with Node.js

```javascript
// tests/integration/setup.js
const { GenericContainer } = require('testcontainers');
const Redis = require('ioredis');

let container;
let redis;

beforeAll(async () => {
  container = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(6379);

  redis = new Redis({ host, port });
}, 60000); // 60 second timeout for container startup

afterAll(async () => {
  await redis.quit();
  await container.stop();
});

beforeEach(async () => {
  await redis.flushall();
});

module.exports = {
  getRedis: () => redis,
  getContainer: () => container,
};
```

Install testcontainers:

```bash
npm install --save-dev testcontainers
```

## Isolation Strategies

### Database Isolation

Use different Redis databases for different test suites:

```python
# tests/conftest.py
import pytest

@pytest.fixture(scope="class")
def redis_db():
    """Assign a unique database to each test class."""
    import redis

    # Track used databases
    if not hasattr(redis_db, 'next_db'):
        redis_db.next_db = 1

    db = redis_db.next_db
    redis_db.next_db = (redis_db.next_db % 14) + 1  # DB 1-14

    client = redis.Redis(host='localhost', port=6379, db=db, decode_responses=True)
    client.flushdb()

    yield client

    client.flushdb()
    client.close()
```

### Key Prefix Isolation

Use unique prefixes for each test run:

```python
# tests/conftest.py
import pytest
import uuid

@pytest.fixture(scope="session")
def test_prefix():
    """Generate a unique prefix for this test run."""
    return f"test:{uuid.uuid4().hex[:8]}:"

@pytest.fixture
def prefixed_client(redis_client, test_prefix):
    """Return a client wrapper that prefixes all keys."""

    class PrefixedRedis:
        def __init__(self, client, prefix):
            self._client = client
            self._prefix = prefix

        def _prefixed(self, key):
            return f"{self._prefix}{key}"

        def set(self, key, value, **kwargs):
            return self._client.set(self._prefixed(key), value, **kwargs)

        def get(self, key):
            return self._client.get(self._prefixed(key))

        def delete(self, *keys):
            prefixed_keys = [self._prefixed(k) for k in keys]
            return self._client.delete(*prefixed_keys)

        def keys(self, pattern="*"):
            return self._client.keys(f"{self._prefix}{pattern}")

        def cleanup(self):
            """Delete all keys with this prefix."""
            keys = self._client.keys(f"{self._prefix}*")
            if keys:
                self._client.delete(*keys)

    client = PrefixedRedis(redis_client, test_prefix)
    yield client
    client.cleanup()
```

## Mocking Redis

For unit tests where you want to isolate from Redis:

### Python with fakeredis

```python
# tests/test_with_mock.py
import pytest
import fakeredis

@pytest.fixture
def mock_redis():
    """Create a fake Redis instance."""
    return fakeredis.FakeRedis(decode_responses=True)

def test_with_fake_redis(mock_redis):
    """Test using fake Redis."""
    from app.cache import CacheService

    cache = CacheService(mock_redis)
    cache.set("key", "value")
    assert cache.get("key") == "value"
```

Install fakeredis:

```bash
pip install fakeredis
```

### Node.js with ioredis-mock

```javascript
// tests/unit/cache.test.js
const RedisMock = require('ioredis-mock');
const CacheService = require('../../src/cache');

describe('CacheService (unit)', () => {
  let redis;
  let cache;

  beforeEach(() => {
    redis = new RedisMock();
    cache = new CacheService(redis);
  });

  it('should cache values', async () => {
    await cache.set('key', 'value');
    expect(await cache.get('key')).toBe('value');
  });
});
```

Install ioredis-mock:

```bash
npm install --save-dev ioredis-mock
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run tests
        env:
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: |
          pytest tests/ -v --cov=app --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### GitLab CI

```yaml
# .gitlab-ci.yml
test:
  image: python:3.11
  services:
    - redis:7-alpine
  variables:
    REDIS_HOST: redis
    REDIS_PORT: 6379
  script:
    - pip install -r requirements.txt
    - pytest tests/ -v
```

## Conclusion

Effective Redis integration testing requires:

- **Proper isolation** between tests (separate DBs, prefixes, or containers)
- **Reliable fixtures** for consistent setup and teardown
- **Testcontainers** for production-like testing environments
- **CI/CD integration** for automated testing

Key takeaways:

- Use **database isolation** or **key prefixes** for parallel test execution
- Use **Testcontainers** for realistic integration tests
- Use **mocks** (fakeredis, ioredis-mock) for fast unit tests
- Always **clean up** after tests
- Configure **proper timeouts** for container startup

## Related Resources

- [pytest Documentation](https://docs.pytest.org/)
- [Testcontainers Python](https://testcontainers-python.readthedocs.io/)
- [Jest Documentation](https://jestjs.io/)
- [fakeredis Documentation](https://github.com/jamesls/fakeredis)
