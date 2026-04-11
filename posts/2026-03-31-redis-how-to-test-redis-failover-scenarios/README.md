# How to Test Redis Failover Scenarios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Failover, Sentinel, High Availability, Testing

Description: Learn how to test Redis failover scenarios using Docker Compose, Redis Sentinel, and chaos testing to verify your application handles primary failures gracefully.

---

## Why Test Failover

Redis failover behavior is non-trivial: client reconnection timing, sentinel election delays, and connection pool behavior all affect how quickly your application recovers. Testing failover in development prevents surprises in production where downtime is costly.

## Setting Up a Redis Sentinel Test Environment

Docker Compose makes it easy to spin up a primary + replica + sentinel cluster for testing:

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis-primary:
    image: redis:7-alpine
    container_name: redis-primary
    ports:
      - "6379:6379"
    command: redis-server --save "" --appendonly no

  redis-replica:
    image: redis:7-alpine
    container_name: redis-replica
    ports:
      - "6380:6379"
    command: redis-server --replicaof redis-primary 6379 --save "" --appendonly no
    depends_on:
      - redis-primary

  sentinel-1:
    image: redis:7-alpine
    container_name: sentinel-1
    ports:
      - "26379:26379"
    command: >
      redis-sentinel /etc/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/sentinel.conf
    depends_on:
      - redis-primary
      - redis-replica

  sentinel-2:
    image: redis:7-alpine
    container_name: sentinel-2
    ports:
      - "26380:26379"
    command: >
      redis-sentinel /etc/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/sentinel.conf
    depends_on:
      - redis-primary
      - redis-replica

  sentinel-3:
    image: redis:7-alpine
    container_name: sentinel-3
    ports:
      - "26381:26379"
    command: >
      redis-sentinel /etc/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/sentinel.conf
    depends_on:
      - redis-primary
      - redis-replica
```

Create the sentinel.conf file:

```text
sentinel monitor mymaster redis-primary 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 10000
sentinel parallel-syncs mymaster 1
port 26379
```

Start the cluster:

```bash
docker-compose up -d
```

## Writing a Failover Test in Python

```python
import redis
import redis.sentinel
import time
import threading
import subprocess

# Connect via Sentinel
sentinel = redis.sentinel.Sentinel(
    [('localhost', 26379), ('localhost', 26380), ('localhost', 26381)],
    socket_timeout=0.1
)

def get_master():
    return sentinel.master_for('mymaster', socket_timeout=0.5, decode_responses=True)

def test_failover():
    master = get_master()
    master.set("test_key", "before_failover")

    # Start a background writer to detect when failover completes
    write_errors = []
    successful_writes = []

    def continuous_writer():
        for i in range(100):
            try:
                m = get_master()
                m.set(f"failover_test:{i}", f"value:{i}")
                successful_writes.append(i)
            except redis.exceptions.ConnectionError as e:
                write_errors.append((i, str(e)))
            time.sleep(0.2)

    writer_thread = threading.Thread(target=continuous_writer)
    writer_thread.start()

    # Wait for some writes to succeed
    time.sleep(1)

    # Kill the primary
    print("Killing Redis primary...")
    subprocess.run(["docker", "stop", "redis-primary"], check=True)

    # Wait for failover to complete (typically 5-10 seconds with these settings)
    print("Waiting for failover...")
    time.sleep(15)

    writer_thread.join()

    print(f"Successful writes: {len(successful_writes)}")
    print(f"Write errors during failover: {len(write_errors)}")

    # Verify new primary is working
    new_master = get_master()
    result = new_master.get(f"failover_test:{successful_writes[-1]}")
    assert result is not None, "Data not accessible on new primary"

    print(f"Failover test PASSED - new primary is accepting writes")

test_failover()
```

## Testing Application-Level Reconnection

Your application code should handle connection errors gracefully:

```python
import redis
import redis.sentinel
import time
import logging

logger = logging.getLogger(__name__)

class ResilientRedisClient:
    def __init__(self, sentinels, master_name: str, max_retries: int = 3, retry_delay: float = 0.5):
        self.sentinel = redis.sentinel.Sentinel(sentinels, socket_timeout=0.1)
        self.master_name = master_name
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._client = None

    def _get_client(self):
        return self.sentinel.master_for(self.master_name, socket_timeout=1.0, decode_responses=True)

    def execute(self, command, *args, **kwargs):
        for attempt in range(self.max_retries):
            try:
                client = self._get_client()
                return getattr(client, command)(*args, **kwargs)
            except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError) as e:
                if attempt == self.max_retries - 1:
                    raise
                logger.warning(f"Redis command failed (attempt {attempt+1}): {e}")
                time.sleep(self.retry_delay * (2 ** attempt))

# Test the resilient client
def test_resilient_client():
    client = ResilientRedisClient(
        sentinels=[('localhost', 26379), ('localhost', 26380), ('localhost', 26381)],
        master_name='mymaster',
        max_retries=5,
        retry_delay=1.0
    )

    # Normal operation
    client.execute('set', 'health', 'ok')
    assert client.execute('get', 'health') == 'ok'
    print("Normal operation: PASSED")

    # This would be tested during failover
    # The client should retry and eventually succeed after sentinel elects a new primary
```

## Testing Replica Promotion

Verify that the promoted replica has all expected data:

```bash
#!/bin/bash
# test_failover.sh
# Uses docker exec to run redis-cli inside the Docker network,
# since Sentinel returns internal container IPs and ports.

echo "Setting data on primary..."
docker exec redis-primary redis-cli SET pre_failover_key "value_before"
docker exec redis-primary redis-cli SET counter 100

echo "Current primary:"
docker exec sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

echo "Stopping primary..."
docker stop redis-primary
sleep 12

echo "New primary after failover:"
docker exec sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster

echo "Checking data on new primary..."
NEW_IP=$(docker exec sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster | head -1 | tr -d '\r')
NEW_PORT=$(docker exec sentinel-1 redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster | tail -1 | tr -d '\r')
docker exec sentinel-1 redis-cli -h $NEW_IP -p $NEW_PORT GET pre_failover_key
docker exec sentinel-1 redis-cli -h $NEW_IP -p $NEW_PORT GET counter

echo "Failover test complete"
```

## Automated Failover Testing with pytest

```python
import pytest
import redis
import redis.sentinel
import subprocess
import time

@pytest.fixture(scope="module")
def sentinel_client():
    s = redis.sentinel.Sentinel(
        [('localhost', 26379), ('localhost', 26380), ('localhost', 26381)],
        socket_timeout=0.5
    )
    return s

def test_data_survives_failover(sentinel_client):
    master = sentinel_client.master_for('mymaster', decode_responses=True)

    # Write data before failover
    master.set("survivor_key", "important_data")
    master.zadd("survivor_sorted", {"alpha": 1, "beta": 2})

    # Trigger failover
    subprocess.run(["docker", "stop", "redis-primary"], check=True)
    time.sleep(15)  # Wait for sentinel election

    # Get new master and verify data
    new_master = sentinel_client.master_for('mymaster', decode_responses=True)
    assert new_master.get("survivor_key") == "important_data"
    assert new_master.zscore("survivor_sorted", "beta") == 2.0

    # Restore primary
    subprocess.run(["docker", "start", "redis-primary"], check=True)
    time.sleep(5)
```

## Summary

Testing Redis failover requires a realistic environment with Sentinel configured for automatic primary election. Use Docker Compose to create a primary-replica-sentinel topology, then simulate failures by stopping the primary container. Verify that your application's retry logic and sentinel-aware clients reconnect within an acceptable time window and that data loss is minimized (note that Redis replication is asynchronous by default, so writes acknowledged just before a failure may not have been replicated to the promoted replica). Always test both the automatic failover path and your application's connection recovery logic.
