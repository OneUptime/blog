# How to Test Redis Cluster Resharding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Resharding, Testing, High Availability

Description: Learn how to test Redis cluster resharding operations to verify data integrity, client transparency, and application behavior during slot migration.

---

## What Is Redis Cluster Resharding

Redis Cluster distributes keys across 16384 hash slots, with each slot assigned to a primary node. Resharding moves hash slots from one node to another - adding capacity or rebalancing the cluster. During resharding, clients accessing keys in migrating slots receive MOVED or ASK redirects, which cluster-aware clients handle automatically.

Testing resharding verifies that:
- Data is not lost during migration
- Your client handles MOVED/ASK redirects correctly
- Application operations complete successfully despite migration

## Setting Up a Test Cluster

Use Docker to create a 6-node cluster (3 primaries, 3 replicas):

```bash
# Create a Redis Cluster with Docker
for port in 7001 7002 7003 7004 7005 7006; do
  mkdir -p /tmp/redis-cluster/$port
  cat > /tmp/redis-cluster/$port/redis.conf << EOF
port $port
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
appendonly yes
save ""
EOF
done

# Start all nodes
for port in 7001 7002 7003 7004 7005 7006; do
  docker run -d --name redis-$port --net=host \
    -v /tmp/redis-cluster/$port:/data \
    redis:7-alpine redis-server /data/redis.conf
done

# Wait for nodes to start
sleep 3

# Initialize the cluster
redis-cli --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  127.0.0.1:7004 127.0.0.1:7005 127.0.0.1:7006 \
  --cluster-replicas 1 --cluster-yes
```

## Verifying Cluster State Before Resharding

```bash
# Check cluster info
redis-cli -p 7001 CLUSTER INFO

# Check slot distribution
redis-cli -p 7001 CLUSTER NODES

# Check how many slots each node owns
redis-cli --cluster info 127.0.0.1:7001
```

Expected output format:

```text
127.0.0.1:7001 (abc123...) -> 0 keys | 5461 slots | 1 slaves.
127.0.0.1:7002 (def456...) -> 0 keys | 5461 slots | 1 slaves.
127.0.0.1:7003 (ghi789...) -> 0 keys | 5462 slots | 1 slaves.
```

## Loading Test Data Before Resharding

```python
import redis.cluster

cluster = redis.cluster.RedisCluster(
    host='127.0.0.1',
    port=7001,
    decode_responses=True
)

# Load 10,000 test keys
for i in range(10000):
    cluster.set(f"key:{i}", f"value:{i}")

print(f"Total keys: {cluster.dbsize()}")
```

## Performing the Resharding

Move slots from node 7001 to node 7003 (100 slots):

```bash
# Get node IDs first
redis-cli -p 7001 CLUSTER NODES | head -3

# Reshard using node IDs
redis-cli --cluster reshard 127.0.0.1:7001 \
  --cluster-from <source-node-id> \
  --cluster-to <target-node-id> \
  --cluster-slots 100 \
  --cluster-yes
```

## Testing Data Integrity During Resharding

Run a background reader during resharding to verify no data loss:

```python
import redis.cluster
import threading
import time

cluster = redis.cluster.RedisCluster(
    host='127.0.0.1',
    port=7001,
    decode_responses=True
)

errors = []
read_count = [0]

def continuous_reader():
    for i in range(10000):
        try:
            val = cluster.get(f"key:{i}")
            if val != f"value:{i}":
                errors.append(f"key:{i} expected value:{i}, got {val}")
            read_count[0] += 1
        except Exception as e:
            errors.append(f"key:{i} read error: {e}")
        if i % 1000 == 0:
            print(f"Read {i}/10000 keys, errors: {len(errors)}")

# Start reading in background
reader = threading.Thread(target=continuous_reader)
reader.start()

print("Start resharding now via redis-cli --cluster reshard ...")
print("Reading data concurrently...")

reader.join()

print(f"\nResults:")
print(f"  Keys read: {read_count[0]}")
print(f"  Errors: {len(errors)}")
if errors:
    print(f"  First 5 errors: {errors[:5]}")
else:
    print("  All data verified successfully!")
```

## Testing MOVED and ASK Redirect Handling

Verify that your client correctly handles cluster redirects:

```python
import redis
import redis.cluster
from redis.exceptions import MovedError, AskError

# Test with a smart cluster client (handles redirects automatically)
cluster = redis.cluster.RedisCluster(
    host='127.0.0.1',
    port=7001,
    decode_responses=True
)

# This should work transparently even during slot migration
for i in range(100):
    cluster.set(f"test:{i}", f"v{i}")
    val = cluster.get(f"test:{i}")
    assert val == f"v{i}", f"Mismatch for test:{i}"

print("MOVED/ASK redirect handling: PASSED")
```

## Automated Resharding Test Script

```bash
#!/bin/bash
# test_resharding.sh

set -e

CLUSTER_HOST="127.0.0.1"
CLUSTER_PORT="7001"

echo "=== Pre-resharding state ==="
redis-cli --cluster info $CLUSTER_HOST:$CLUSTER_PORT

echo "=== Loading test data ==="
python3 -c "
import redis.cluster
c = redis.cluster.RedisCluster(host='$CLUSTER_HOST', port=$CLUSTER_PORT, decode_responses=True)
for i in range(1000):
    c.set(f'test:{i}', f'value:{i}')
print(f'Loaded {c.dbsize()} keys')
"

echo "=== Getting node IDs ==="
SOURCE_ID=$(redis-cli -p $CLUSTER_PORT CLUSTER NODES | grep "7001.*master" | awk '{print $1}')
TARGET_ID=$(redis-cli -p $CLUSTER_PORT CLUSTER NODES | grep "7003.*master" | awk '{print $1}')

echo "Source: $SOURCE_ID"
echo "Target: $TARGET_ID"

echo "=== Performing resharding ==="
redis-cli --cluster reshard $CLUSTER_HOST:$CLUSTER_PORT \
  --cluster-from $SOURCE_ID \
  --cluster-to $TARGET_ID \
  --cluster-slots 50 \
  --cluster-yes

echo "=== Post-resharding state ==="
redis-cli --cluster info $CLUSTER_HOST:$CLUSTER_PORT

echo "=== Verifying data integrity ==="
python3 -c "
import redis.cluster
c = redis.cluster.RedisCluster(host='$CLUSTER_HOST', port=$CLUSTER_PORT, decode_responses=True)
errors = 0
for i in range(1000):
    val = c.get(f'test:{i}')
    if val != f'value:{i}':
        errors += 1
        print(f'Error at test:{i}: expected value:{i}, got {val}')
print(f'Verification complete: {1000 - errors}/1000 keys correct')
"
```

## Testing Cluster Rebalancing

For production clusters, rebalancing distributes slots evenly:

```bash
# Rebalance to equal distribution across all nodes
redis-cli --cluster rebalance 127.0.0.1:7001 --cluster-yes

# Rebalance with weights (node 7001 gets 50% more slots)
redis-cli --cluster rebalance 127.0.0.1:7001 \
  --cluster-weight <node1-id>=1.5 \
  --cluster-yes
```

## Summary

Testing Redis cluster resharding requires loading realistic data volumes, monitoring reads during slot migration, and verifying data integrity after completion. Use a cluster-aware Redis client that handles MOVED and ASK redirects automatically, run concurrent readers during resharding to catch any gaps, and always verify data integrity with a full key scan after migration completes. Automate these steps in a shell script that can be run before any production resharding operation.
