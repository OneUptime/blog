# How to Use Redis Cluster with Client-Side Sharding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Cluster, Sharding, Hash Tags, Distributed Systems, Scalability, Performance

Description: A comprehensive guide to using Redis Cluster with client-side sharding techniques, covering hash tags for co-locating related keys, handling cross-slot operations, implementing sharding strategies, and best practices for distributed data access patterns.

---

Redis Cluster provides automatic data partitioning across multiple nodes, but understanding client-side sharding, hash tags, and cross-slot operations is crucial for building efficient applications. This guide covers how to leverage Redis Cluster effectively, handle multi-key operations, and optimize your data access patterns.

## Understanding Redis Cluster Architecture

Redis Cluster uses a hash slot-based sharding mechanism:

```
Total Hash Slots: 16384 (0 to 16383)

Slot Assignment Formula: CRC16(key) mod 16384

Example Distribution (3 masters):
  Master 1: Slots 0-5460
  Master 2: Slots 5461-10922
  Master 3: Slots 10923-16383
```

### How Keys Map to Slots

```python
import binascii

def calculate_slot(key: str) -> int:
    """
    Calculate the hash slot for a given key.
    Implements CRC16 with XMODEM polynomial.
    """
    # Check for hash tag
    if '{' in key and '}' in key:
        start = key.index('{')
        end = key.index('}', start)
        if end > start + 1:
            key = key[start + 1:end]

    # CRC16 implementation
    crc = 0
    for byte in key.encode():
        crc ^= byte << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ 0x1021
            else:
                crc <<= 1
            crc &= 0xFFFF

    return crc % 16384


# Examples
keys = ['user:1001', 'user:1002', 'order:5001', 'product:101']
for key in keys:
    slot = calculate_slot(key)
    print(f"{key} -> Slot {slot}")
```

## Hash Tags for Key Co-location

Hash tags allow you to control which slot a key belongs to, ensuring related keys are stored on the same node.

### Basic Hash Tag Syntax

```
Key without tag: user:1001      -> CRC16("user:1001") mod 16384
Key with tag:    {user:1001}:profile -> CRC16("user:1001") mod 16384
Key with tag:    {user:1001}:orders  -> CRC16("user:1001") mod 16384

Both tagged keys go to the same slot!
```

### Python Implementation

```python
import redis
from redis.cluster import RedisCluster
from typing import List, Dict, Any, Optional
import json

class ClusterShardingManager:
    """
    Manages Redis Cluster operations with hash tag support
    for efficient data co-location.
    """

    def __init__(self, nodes: List[dict]):
        self.cluster = RedisCluster(
            startup_nodes=[
                redis.cluster.ClusterNode(node['host'], node['port'])
                for node in nodes
            ],
            decode_responses=True,
            skip_full_coverage_check=True
        )

    def get_slot(self, key: str) -> int:
        """Get the slot for a key."""
        return self.cluster.cluster_keyslot(key)

    def get_node_for_key(self, key: str) -> dict:
        """Get the node that stores a specific key."""
        slot = self.get_slot(key)
        # Get node for slot
        nodes = self.cluster.cluster_slots()
        for slot_range in nodes:
            if slot_range[0] <= slot <= slot_range[1]:
                return {
                    'host': slot_range[2][0],
                    'port': slot_range[2][1]
                }
        return None

    # ==========================================
    # Hash Tag Patterns for Common Use Cases
    # ==========================================

    def store_user_data(self, user_id: str, data: Dict[str, Any]):
        """
        Store user data with hash tag to keep all user data together.
        Uses {user_id} as the hash tag for all related keys.
        """
        tag = f"{{user:{user_id}}}"

        # All these keys will be on the same slot
        pipe = self.cluster.pipeline()

        # User profile
        pipe.hset(f"{tag}:profile", mapping=data.get('profile', {}))

        # User settings
        pipe.hset(f"{tag}:settings", mapping=data.get('settings', {}))

        # User session
        if 'session' in data:
            pipe.setex(f"{tag}:session", 3600, json.dumps(data['session']))

        # User activity
        pipe.lpush(f"{tag}:activity", json.dumps({
            'action': 'data_update',
            'timestamp': data.get('timestamp')
        }))
        pipe.ltrim(f"{tag}:activity", 0, 99)  # Keep last 100

        pipe.execute()

    def get_user_data(self, user_id: str) -> Dict[str, Any]:
        """
        Get all user data efficiently using pipeline (same slot).
        """
        tag = f"{{user:{user_id}}}"

        pipe = self.cluster.pipeline()
        pipe.hgetall(f"{tag}:profile")
        pipe.hgetall(f"{tag}:settings")
        pipe.get(f"{tag}:session")
        pipe.lrange(f"{tag}:activity", 0, 9)

        results = pipe.execute()

        return {
            'profile': results[0],
            'settings': results[1],
            'session': json.loads(results[2]) if results[2] else None,
            'recent_activity': [json.loads(a) for a in results[3]]
        }

    def store_order_with_items(self, order_id: str, order: Dict[str, Any], items: List[Dict]):
        """
        Store order and items together using hash tag.
        """
        tag = f"{{order:{order_id}}}"

        pipe = self.cluster.pipeline()

        # Order details
        pipe.hset(f"{tag}:details", mapping={
            'user_id': order['user_id'],
            'status': order['status'],
            'total': str(order['total']),
            'created_at': order['created_at']
        })

        # Order items
        for i, item in enumerate(items):
            pipe.hset(f"{tag}:item:{i}", mapping={
                'product_id': item['product_id'],
                'quantity': str(item['quantity']),
                'price': str(item['price'])
            })

        # Item count
        pipe.set(f"{tag}:item_count", len(items))

        # Status history
        pipe.rpush(f"{tag}:status_history", json.dumps({
            'status': order['status'],
            'timestamp': order['created_at']
        }))

        pipe.execute()

    def update_order_status(self, order_id: str, new_status: str, timestamp: str):
        """
        Atomically update order status using Lua script.
        Works because all keys are on the same slot.
        """
        tag = f"{{order:{order_id}}}"

        lua_script = """
        local details_key = KEYS[1]
        local history_key = KEYS[2]
        local new_status = ARGV[1]
        local timestamp = ARGV[2]

        -- Update status in details
        redis.call('HSET', details_key, 'status', new_status)

        -- Add to history
        local entry = cjson.encode({status = new_status, timestamp = timestamp})
        redis.call('RPUSH', history_key, entry)

        return redis.call('HGET', details_key, 'status')
        """

        result = self.cluster.eval(
            lua_script,
            2,
            f"{tag}:details",
            f"{tag}:status_history",
            new_status,
            timestamp
        )
        return result


# Usage example
def main():
    manager = ClusterShardingManager([
        {'host': 'localhost', 'port': 7000},
        {'host': 'localhost', 'port': 7001},
        {'host': 'localhost', 'port': 7002}
    ])

    # Store user data - all keys on same slot
    manager.store_user_data('1001', {
        'profile': {
            'name': 'John Doe',
            'email': 'john@example.com'
        },
        'settings': {
            'theme': 'dark',
            'notifications': 'true'
        },
        'timestamp': '2024-01-15T10:30:00Z'
    })

    # Retrieve efficiently
    user_data = manager.get_user_data('1001')
    print(f"User data: {user_data}")

    # Check slot assignment
    print(f"Profile slot: {manager.get_slot('{user:1001}:profile')}")
    print(f"Settings slot: {manager.get_slot('{user:1001}:settings')}")


if __name__ == '__main__':
    main()
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');

/**
 * Redis Cluster client with hash tag support for data co-location
 */
class ClusterShardingManager {
    constructor(nodes) {
        this.cluster = new Redis.Cluster(nodes, {
            redisOptions: {
                connectTimeout: 5000,
                commandTimeout: 5000
            },
            scaleReads: 'slave',
            maxRedirections: 16,
            retryDelayOnFailover: 100
        });

        this.cluster.on('error', (err) => {
            console.error('Cluster error:', err);
        });
    }

    /**
     * Get the slot for a key
     */
    getSlot(key) {
        // Extract hash tag if present
        const match = key.match(/\{([^}]+)\}/);
        const hashKey = match ? match[1] : key;

        // CRC16 implementation
        let crc = 0;
        for (let i = 0; i < hashKey.length; i++) {
            crc ^= hashKey.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
                crc &= 0xFFFF;
            }
        }
        return crc % 16384;
    }

    /**
     * Store session data with related keys on same slot
     */
    async storeSession(sessionId, data) {
        const tag = `{session:${sessionId}}`;

        const pipeline = this.cluster.pipeline();

        // Session data
        pipeline.hset(`${tag}:data`, data.user);

        // Session tokens
        pipeline.setex(`${tag}:access_token`, 3600, data.accessToken);
        pipeline.setex(`${tag}:refresh_token`, 86400, data.refreshToken);

        // Session metadata
        pipeline.hset(`${tag}:meta`, {
            'created_at': data.createdAt,
            'ip': data.ip,
            'user_agent': data.userAgent
        });

        // Activity tracking
        pipeline.zadd(`${tag}:activity`, Date.now(), JSON.stringify({
            action: 'session_created',
            timestamp: new Date().toISOString()
        }));

        await pipeline.exec();
    }

    /**
     * Get all session data efficiently
     */
    async getSession(sessionId) {
        const tag = `{session:${sessionId}}`;

        const pipeline = this.cluster.pipeline();
        pipeline.hgetall(`${tag}:data`);
        pipeline.get(`${tag}:access_token`);
        pipeline.get(`${tag}:refresh_token`);
        pipeline.hgetall(`${tag}:meta`);
        pipeline.zrevrange(`${tag}:activity`, 0, 9, 'WITHSCORES');

        const results = await pipeline.exec();

        return {
            user: results[0][1],
            accessToken: results[1][1],
            refreshToken: results[2][1],
            meta: results[3][1],
            recentActivity: this._parseActivity(results[4][1])
        };
    }

    _parseActivity(activity) {
        const parsed = [];
        for (let i = 0; i < activity.length; i += 2) {
            parsed.push({
                ...JSON.parse(activity[i]),
                score: parseInt(activity[i + 1])
            });
        }
        return parsed;
    }

    /**
     * Implement a distributed counter with atomic operations
     * All counter-related keys on same slot for atomicity
     */
    async incrementCounter(counterId, amount = 1) {
        const tag = `{counter:${counterId}}`;

        const luaScript = `
            local current = redis.call('HINCRBY', KEYS[1], 'value', ARGV[1])
            local timestamp = ARGV[2]

            -- Update metadata
            redis.call('HSET', KEYS[1], 'last_updated', timestamp)

            -- Track history (keep last 1000)
            redis.call('LPUSH', KEYS[2], cjson.encode({
                delta = tonumber(ARGV[1]),
                value = current,
                timestamp = timestamp
            }))
            redis.call('LTRIM', KEYS[2], 0, 999)

            return current
        `;

        const result = await this.cluster.eval(
            luaScript,
            2,
            `${tag}:data`,
            `${tag}:history`,
            amount,
            new Date().toISOString()
        );

        return result;
    }

    /**
     * Shopping cart with hash tags
     */
    async addToCart(userId, item) {
        const tag = `{cart:${userId}}`;

        const pipeline = this.cluster.pipeline();

        // Add/update item in cart
        pipeline.hset(`${tag}:items`, item.productId, JSON.stringify({
            quantity: item.quantity,
            price: item.price,
            addedAt: new Date().toISOString()
        }));

        // Update cart metadata
        pipeline.hset(`${tag}:meta`, 'last_modified', new Date().toISOString());

        // Recalculate total (using Lua for atomicity)
        const calcTotalScript = `
            local items = redis.call('HGETALL', KEYS[1])
            local total = 0
            for i = 1, #items, 2 do
                local item = cjson.decode(items[i + 1])
                total = total + (item.quantity * item.price)
            end
            redis.call('HSET', KEYS[2], 'total', tostring(total))
            return tostring(total)
        `;

        pipeline.eval(calcTotalScript, 2, `${tag}:items`, `${tag}:meta`);

        await pipeline.exec();
    }

    async getCart(userId) {
        const tag = `{cart:${userId}}`;

        const pipeline = this.cluster.pipeline();
        pipeline.hgetall(`${tag}:items`);
        pipeline.hgetall(`${tag}:meta`);

        const results = await pipeline.exec();

        const items = {};
        const rawItems = results[0][1] || {};
        for (const [productId, data] of Object.entries(rawItems)) {
            items[productId] = JSON.parse(data);
        }

        return {
            items,
            meta: results[1][1]
        };
    }

    async close() {
        await this.cluster.quit();
    }
}

// Usage
async function main() {
    const manager = new ClusterShardingManager([
        { host: 'localhost', port: 7000 },
        { host: 'localhost', port: 7001 },
        { host: 'localhost', port: 7002 }
    ]);

    // Store session
    await manager.storeSession('abc123', {
        user: {
            id: 'user:1001',
            name: 'John Doe',
            role: 'admin'
        },
        accessToken: 'eyJhbGciOiJIUzI1NiIs...',
        refreshToken: 'dGhpcyBpcyBhIHJlZnJlc2...',
        createdAt: new Date().toISOString(),
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...'
    });

    // Get session
    const session = await manager.getSession('abc123');
    console.log('Session:', session);

    // Shopping cart
    await manager.addToCart('user:1001', {
        productId: 'prod:101',
        quantity: 2,
        price: 29.99
    });

    const cart = await manager.getCart('user:1001');
    console.log('Cart:', cart);

    await manager.close();
}

main().catch(console.error);
```

## Cross-Slot Operations

When you need to work with keys on different slots, you must handle operations carefully.

### Handling CROSSSLOT Errors

```python
import redis
from redis.cluster import RedisCluster
from redis.exceptions import ResponseError
from typing import List, Dict, Any
import concurrent.futures

class CrossSlotHandler:
    """
    Handles operations that span multiple slots in Redis Cluster.
    """

    def __init__(self, cluster: RedisCluster):
        self.cluster = cluster

    def multi_get(self, keys: List[str]) -> Dict[str, Any]:
        """
        Get values for keys that may be on different slots.
        Groups keys by slot and executes in parallel.
        """
        # Group keys by slot
        slot_groups = {}
        for key in keys:
            slot = self.cluster.cluster_keyslot(key)
            if slot not in slot_groups:
                slot_groups[slot] = []
            slot_groups[slot].append(key)

        # Execute MGET for each slot group
        results = {}

        for slot, group_keys in slot_groups.items():
            if len(group_keys) == 1:
                # Single key - use GET
                results[group_keys[0]] = self.cluster.get(group_keys[0])
            else:
                # Multiple keys on same slot - use MGET
                values = self.cluster.mget(*group_keys)
                for key, value in zip(group_keys, values):
                    results[key] = value

        return results

    def multi_set(self, mapping: Dict[str, Any]) -> bool:
        """
        Set multiple key-value pairs that may be on different slots.
        """
        # Group by slot
        slot_groups = {}
        for key, value in mapping.items():
            slot = self.cluster.cluster_keyslot(key)
            if slot not in slot_groups:
                slot_groups[slot] = {}
            slot_groups[slot][key] = value

        # Execute MSET for each slot group
        for slot, group_mapping in slot_groups.items():
            if len(group_mapping) == 1:
                key, value = next(iter(group_mapping.items()))
                self.cluster.set(key, value)
            else:
                self.cluster.mset(group_mapping)

        return True

    def multi_delete(self, keys: List[str]) -> int:
        """
        Delete multiple keys that may be on different slots.
        """
        # Group by slot
        slot_groups = {}
        for key in keys:
            slot = self.cluster.cluster_keyslot(key)
            if slot not in slot_groups:
                slot_groups[slot] = []
            slot_groups[slot].append(key)

        # Execute DEL for each slot group
        total_deleted = 0
        for slot, group_keys in slot_groups.items():
            deleted = self.cluster.delete(*group_keys)
            total_deleted += deleted

        return total_deleted

    def parallel_multi_get(self, keys: List[str], max_workers: int = 10) -> Dict[str, Any]:
        """
        Get values for keys using parallel execution.
        Faster for large key sets across many slots.
        """
        # Group keys by slot
        slot_groups = {}
        for key in keys:
            slot = self.cluster.cluster_keyslot(key)
            if slot not in slot_groups:
                slot_groups[slot] = []
            slot_groups[slot].append(key)

        results = {}

        def fetch_group(group_keys):
            group_results = {}
            if len(group_keys) == 1:
                group_results[group_keys[0]] = self.cluster.get(group_keys[0])
            else:
                values = self.cluster.mget(*group_keys)
                for key, value in zip(group_keys, values):
                    group_results[key] = value
            return group_results

        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(fetch_group, group_keys): slot
                for slot, group_keys in slot_groups.items()
            }

            for future in concurrent.futures.as_completed(futures):
                try:
                    group_results = future.result()
                    results.update(group_results)
                except Exception as e:
                    print(f"Error fetching group: {e}")

        return results

    def atomic_transfer(self, source_key: str, dest_key: str, amount: int) -> bool:
        """
        Atomic transfer between keys on different slots.
        Uses optimistic locking with WATCH.
        """
        source_slot = self.cluster.cluster_keyslot(source_key)
        dest_slot = self.cluster.cluster_keyslot(dest_key)

        if source_slot == dest_slot:
            # Same slot - can use Lua script
            lua_script = """
            local source = tonumber(redis.call('GET', KEYS[1]) or 0)
            local amount = tonumber(ARGV[1])

            if source < amount then
                return {err = 'Insufficient balance'}
            end

            redis.call('DECRBY', KEYS[1], amount)
            redis.call('INCRBY', KEYS[2], amount)

            return {ok = 'Transfer complete'}
            """
            return self.cluster.eval(lua_script, 2, source_key, dest_key, amount)
        else:
            # Different slots - use two-phase approach
            return self._two_phase_transfer(source_key, dest_key, amount)

    def _two_phase_transfer(self, source_key: str, dest_key: str, amount: int) -> bool:
        """
        Two-phase transfer for cross-slot operations.
        Not truly atomic but provides eventual consistency.
        """
        import uuid
        transfer_id = str(uuid.uuid4())
        pending_key = f"{{transfer}}:{transfer_id}"

        try:
            # Phase 1: Deduct from source and record pending transfer
            source_val = int(self.cluster.get(source_key) or 0)
            if source_val < amount:
                return False

            # Use pipeline for efficiency (keys might still be different slots)
            self.cluster.decrby(source_key, amount)
            self.cluster.hset(pending_key, mapping={
                'source': source_key,
                'dest': dest_key,
                'amount': str(amount),
                'status': 'pending'
            })
            self.cluster.expire(pending_key, 300)  # 5 min TTL

            # Phase 2: Add to destination and complete transfer
            self.cluster.incrby(dest_key, amount)
            self.cluster.hset(pending_key, 'status', 'complete')

            return True

        except Exception as e:
            # Rollback if possible
            print(f"Transfer failed: {e}")
            # Check pending transfer for rollback
            pending = self.cluster.hgetall(pending_key)
            if pending and pending.get('status') == 'pending':
                self.cluster.incrby(source_key, amount)
                self.cluster.delete(pending_key)
            return False


# Usage
cluster = RedisCluster(
    startup_nodes=[
        redis.cluster.ClusterNode('localhost', 7000)
    ],
    decode_responses=True
)

handler = CrossSlotHandler(cluster)

# Multi-get across slots
keys = ['user:1', 'user:2', 'user:3', 'product:1', 'product:2']
values = handler.multi_get(keys)
print(f"Values: {values}")

# Multi-set across slots
handler.multi_set({
    'user:1': 'value1',
    'user:2': 'value2',
    'product:1': 'value3'
})
```

### Scatter-Gather Pattern

```javascript
const Redis = require('ioredis');

/**
 * Scatter-Gather pattern for cross-slot operations
 */
class ScatterGatherClient {
    constructor(nodes) {
        this.cluster = new Redis.Cluster(nodes);
    }

    /**
     * Execute a command across all nodes and aggregate results
     */
    async scatterGather(command, aggregator) {
        const nodes = this.cluster.nodes('master');
        const results = [];

        const promises = nodes.map(async (node) => {
            try {
                const result = await node[command]();
                return { node: `${node.options.host}:${node.options.port}`, result };
            } catch (err) {
                return { node: `${node.options.host}:${node.options.port}`, error: err.message };
            }
        });

        const nodeResults = await Promise.all(promises);

        return aggregator(nodeResults);
    }

    /**
     * Get all keys matching a pattern across all nodes
     */
    async scanAll(pattern, count = 100) {
        const allKeys = [];

        for (const node of this.cluster.nodes('master')) {
            let cursor = '0';

            do {
                const [nextCursor, keys] = await node.scan(
                    cursor,
                    'MATCH', pattern,
                    'COUNT', count
                );
                cursor = nextCursor;
                allKeys.push(...keys);
            } while (cursor !== '0');
        }

        return allKeys;
    }

    /**
     * Get memory info across all nodes
     */
    async getClusterMemoryInfo() {
        return await this.scatterGather('info', (results) => {
            let totalUsed = 0;
            let totalPeak = 0;
            const nodeInfo = [];

            for (const { node, result, error } of results) {
                if (error) {
                    nodeInfo.push({ node, error });
                    continue;
                }

                const lines = result.split('\n');
                const info = {};

                for (const line of lines) {
                    const [key, value] = line.split(':');
                    if (key && value) {
                        info[key.trim()] = value.trim();
                    }
                }

                const usedMemory = parseInt(info['used_memory'] || 0);
                const peakMemory = parseInt(info['used_memory_peak'] || 0);

                totalUsed += usedMemory;
                totalPeak += peakMemory;

                nodeInfo.push({
                    node,
                    usedMemory: usedMemory,
                    usedMemoryHuman: info['used_memory_human'],
                    peakMemory: peakMemory,
                    peakMemoryHuman: info['used_memory_peak_human']
                });
            }

            return {
                totalUsedMemory: totalUsed,
                totalPeakMemory: totalPeak,
                nodes: nodeInfo
            };
        });
    }

    /**
     * Delete keys matching pattern across all nodes
     */
    async deleteByPattern(pattern, batchSize = 100) {
        let totalDeleted = 0;

        for (const node of this.cluster.nodes('master')) {
            let cursor = '0';

            do {
                const [nextCursor, keys] = await node.scan(
                    cursor,
                    'MATCH', pattern,
                    'COUNT', batchSize
                );
                cursor = nextCursor;

                if (keys.length > 0) {
                    // Group by slot for efficient deletion
                    const slotGroups = new Map();

                    for (const key of keys) {
                        const slot = this.getSlot(key);
                        if (!slotGroups.has(slot)) {
                            slotGroups.set(slot, []);
                        }
                        slotGroups.get(slot).push(key);
                    }

                    // Delete each group
                    for (const [, groupKeys] of slotGroups) {
                        const deleted = await this.cluster.del(...groupKeys);
                        totalDeleted += deleted;
                    }
                }
            } while (cursor !== '0');
        }

        return totalDeleted;
    }

    getSlot(key) {
        const match = key.match(/\{([^}]+)\}/);
        const hashKey = match ? match[1] : key;

        let crc = 0;
        for (let i = 0; i < hashKey.length; i++) {
            crc ^= hashKey.charCodeAt(i) << 8;
            for (let j = 0; j < 8; j++) {
                if (crc & 0x8000) {
                    crc = (crc << 1) ^ 0x1021;
                } else {
                    crc <<= 1;
                }
                crc &= 0xFFFF;
            }
        }
        return crc % 16384;
    }

    async close() {
        await this.cluster.quit();
    }
}

// Usage
async function main() {
    const client = new ScatterGatherClient([
        { host: 'localhost', port: 7000 },
        { host: 'localhost', port: 7001 },
        { host: 'localhost', port: 7002 }
    ]);

    // Get cluster memory info
    const memInfo = await client.getClusterMemoryInfo();
    console.log('Cluster memory:', memInfo);

    // Scan all keys matching pattern
    const keys = await client.scanAll('user:*');
    console.log(`Found ${keys.length} user keys`);

    // Delete by pattern
    const deleted = await client.deleteByPattern('temp:*');
    console.log(`Deleted ${deleted} temp keys`);

    await client.close();
}

main().catch(console.error);
```

## Sharding Strategies

### Consistent Hashing with Virtual Nodes

```python
import hashlib
from bisect import bisect_right
from typing import Dict, List, Any, Optional
import redis

class ConsistentHashRing:
    """
    Consistent hashing implementation for client-side sharding.
    Useful for custom sharding logic or pre-cluster setups.
    """

    def __init__(self, virtual_nodes: int = 150):
        self.virtual_nodes = virtual_nodes
        self.ring: List[int] = []
        self.nodes: Dict[int, str] = {}
        self.node_connections: Dict[str, redis.Redis] = {}

    def _hash(self, key: str) -> int:
        """Generate consistent hash for a key."""
        return int(hashlib.md5(key.encode()).hexdigest(), 16)

    def add_node(self, node_id: str, host: str, port: int):
        """Add a node to the ring."""
        # Create connection
        self.node_connections[node_id] = redis.Redis(
            host=host,
            port=port,
            decode_responses=True
        )

        # Add virtual nodes
        for i in range(self.virtual_nodes):
            virtual_key = f"{node_id}:{i}"
            hash_val = self._hash(virtual_key)
            self.ring.append(hash_val)
            self.nodes[hash_val] = node_id

        # Sort the ring
        self.ring.sort()

    def remove_node(self, node_id: str):
        """Remove a node from the ring."""
        # Close connection
        if node_id in self.node_connections:
            self.node_connections[node_id].close()
            del self.node_connections[node_id]

        # Remove virtual nodes
        for i in range(self.virtual_nodes):
            virtual_key = f"{node_id}:{i}"
            hash_val = self._hash(virtual_key)
            if hash_val in self.nodes:
                del self.nodes[hash_val]
                self.ring.remove(hash_val)

    def get_node(self, key: str) -> str:
        """Get the node responsible for a key."""
        if not self.ring:
            raise Exception("No nodes in ring")

        hash_val = self._hash(key)
        idx = bisect_right(self.ring, hash_val)

        if idx == len(self.ring):
            idx = 0

        return self.nodes[self.ring[idx]]

    def get_connection(self, key: str) -> redis.Redis:
        """Get Redis connection for a key."""
        node_id = self.get_node(key)
        return self.node_connections[node_id]

    def get(self, key: str) -> Optional[str]:
        """Get value from the appropriate node."""
        conn = self.get_connection(key)
        return conn.get(key)

    def set(self, key: str, value: str, ex: int = None):
        """Set value on the appropriate node."""
        conn = self.get_connection(key)
        if ex:
            conn.setex(key, ex, value)
        else:
            conn.set(key, value)

    def delete(self, key: str) -> int:
        """Delete key from the appropriate node."""
        conn = self.get_connection(key)
        return conn.delete(key)

    def get_distribution(self) -> Dict[str, int]:
        """Get key distribution across nodes (for testing)."""
        distribution = {}
        for node_id in self.node_connections:
            distribution[node_id] = 0

        # Sample the ring
        for i in range(10000):
            key = f"test_key_{i}"
            node = self.get_node(key)
            distribution[node] += 1

        return distribution


# Usage
ring = ConsistentHashRing(virtual_nodes=150)

# Add nodes
ring.add_node('node1', 'localhost', 6379)
ring.add_node('node2', 'localhost', 6380)
ring.add_node('node3', 'localhost', 6381)

# Check distribution
distribution = ring.get_distribution()
print(f"Key distribution: {distribution}")

# Use the ring
ring.set('user:1001', 'John Doe')
value = ring.get('user:1001')
print(f"Value: {value}")

# Show which node handles each key
for key in ['user:1001', 'user:1002', 'product:101', 'order:5001']:
    node = ring.get_node(key)
    print(f"{key} -> {node}")
```

### Hybrid Sharding (Cluster + Application)

```python
from redis.cluster import RedisCluster
from typing import Dict, Any, List
import json

class HybridShardingManager:
    """
    Combines Redis Cluster with application-level sharding
    for complex data structures and access patterns.
    """

    def __init__(self, cluster_nodes: List[dict], tenant_count: int = 100):
        self.cluster = RedisCluster(
            startup_nodes=[
                redis.cluster.ClusterNode(n['host'], n['port'])
                for n in cluster_nodes
            ],
            decode_responses=True
        )
        self.tenant_count = tenant_count

    def _get_tenant_shard(self, tenant_id: str) -> int:
        """Get shard number for a tenant (0 to tenant_count-1)."""
        hash_val = hash(tenant_id)
        return abs(hash_val) % self.tenant_count

    def _tenant_key(self, tenant_id: str, key_suffix: str) -> str:
        """
        Generate a key that ensures all tenant data is co-located.
        Uses the tenant shard as the hash tag.
        """
        shard = self._get_tenant_shard(tenant_id)
        return f"{{tenant:{shard}}}:{tenant_id}:{key_suffix}"

    def store_tenant_data(self, tenant_id: str, data_type: str, data: Dict[str, Any]):
        """Store tenant data with guaranteed co-location."""
        key = self._tenant_key(tenant_id, data_type)
        self.cluster.hset(key, mapping={
            k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
            for k, v in data.items()
        })

    def get_tenant_data(self, tenant_id: str, data_type: str) -> Dict[str, Any]:
        """Get tenant data."""
        key = self._tenant_key(tenant_id, data_type)
        data = self.cluster.hgetall(key)

        # Try to parse JSON values
        result = {}
        for k, v in data.items():
            try:
                result[k] = json.loads(v)
            except (json.JSONDecodeError, TypeError):
                result[k] = v

        return result

    def atomic_tenant_operation(self, tenant_id: str, operation_script: str, keys: List[str], args: List[str] = None):
        """
        Execute an atomic operation on tenant data.
        All keys must belong to the same tenant.
        """
        full_keys = [self._tenant_key(tenant_id, k) for k in keys]
        return self.cluster.eval(operation_script, len(full_keys), *full_keys, *(args or []))

    def get_tenant_shard_info(self, tenant_id: str) -> Dict[str, Any]:
        """Get shard information for a tenant."""
        shard = self._get_tenant_shard(tenant_id)
        sample_key = self._tenant_key(tenant_id, 'info')
        slot = self.cluster.cluster_keyslot(sample_key)

        return {
            'tenant_id': tenant_id,
            'shard': shard,
            'slot': slot,
            'hash_tag': f"tenant:{shard}"
        }

    def migrate_tenant(self, tenant_id: str, pattern: str = "*") -> Dict[str, int]:
        """
        Get all keys for a tenant (for migration purposes).
        Returns counts by data type.
        """
        shard = self._get_tenant_shard(tenant_id)
        prefix = f"{{tenant:{shard}}}:{tenant_id}:"

        keys = []
        cursor = '0'

        # SCAN on the specific slot
        while True:
            cursor, batch = self.cluster.scan(
                cursor=cursor,
                match=f"{prefix}*",
                count=100
            )
            keys.extend(batch)
            if cursor == 0:
                break

        # Count by type
        counts = {}
        for key in keys:
            # Extract data type from key
            parts = key.split(':')
            if len(parts) >= 3:
                data_type = parts[2]
                counts[data_type] = counts.get(data_type, 0) + 1

        return counts


# Usage
manager = HybridShardingManager(
    cluster_nodes=[{'host': 'localhost', 'port': 7000}],
    tenant_count=100
)

# Store tenant data
manager.store_tenant_data('tenant_abc', 'profile', {
    'name': 'Acme Corp',
    'plan': 'enterprise',
    'users': ['user1', 'user2']
})

manager.store_tenant_data('tenant_abc', 'settings', {
    'theme': 'dark',
    'notifications': True
})

# Get shard info
shard_info = manager.get_tenant_shard_info('tenant_abc')
print(f"Shard info: {shard_info}")

# All tenant data is on the same slot!
profile = manager.get_tenant_data('tenant_abc', 'profile')
settings = manager.get_tenant_data('tenant_abc', 'settings')
print(f"Profile: {profile}")
print(f"Settings: {settings}")
```

## Best Practices

### Key Naming Conventions

```python
"""
Key naming best practices for Redis Cluster
"""

# GOOD: Use hash tags for related data
good_keys = [
    "{user:1001}:profile",      # User profile
    "{user:1001}:settings",     # User settings
    "{user:1001}:sessions",     # User sessions
    "{user:1001}:notifications" # User notifications
]

# BAD: No hash tags - related data may be on different nodes
bad_keys = [
    "user:1001:profile",
    "user:1001:settings",
    "user:1001:sessions",
    "user:1001:notifications"
]

# GOOD: Consistent hash tag placement
good_order_keys = [
    "{order:5001}:details",
    "{order:5001}:items",
    "{order:5001}:shipping",
    "{order:5001}:payment"
]

# GOOD: Use meaningful prefixes
good_prefixes = [
    "{session}:abc123:data",     # Session data
    "{cart}:user1001:items",     # Shopping cart
    "{cache}:api:users:list",    # API cache
    "{lock}:resource:xyz"        # Distributed lock
]
```

### Cluster-Aware Application Design

```python
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from redis.cluster import RedisCluster
import redis

@dataclass
class ShardingConfig:
    """Configuration for cluster-aware operations."""
    use_hash_tags: bool = True
    max_cross_slot_batch: int = 1000
    parallel_execution: bool = True
    max_workers: int = 10

class ClusterAwareRepository:
    """
    Base repository class with cluster-aware operations.
    """

    def __init__(self, cluster: RedisCluster, entity_type: str, config: ShardingConfig = None):
        self.cluster = cluster
        self.entity_type = entity_type
        self.config = config or ShardingConfig()

    def _make_key(self, entity_id: str, suffix: str = '') -> str:
        """Generate a cluster-friendly key."""
        if self.config.use_hash_tags:
            base = f"{{{self.entity_type}:{entity_id}}}"
        else:
            base = f"{self.entity_type}:{entity_id}"

        if suffix:
            return f"{base}:{suffix}"
        return base

    def _make_keys(self, entity_id: str, suffixes: List[str]) -> List[str]:
        """Generate multiple keys for an entity."""
        return [self._make_key(entity_id, s) for s in suffixes]

    def exists(self, entity_id: str) -> bool:
        """Check if entity exists."""
        key = self._make_key(entity_id)
        return self.cluster.exists(key) > 0

    def delete(self, entity_id: str, suffixes: List[str] = None) -> int:
        """Delete entity and related keys."""
        if suffixes:
            keys = self._make_keys(entity_id, suffixes)
        else:
            keys = [self._make_key(entity_id)]

        return self.cluster.delete(*keys)


class UserRepository(ClusterAwareRepository):
    """
    User repository with cluster-optimized operations.
    """

    def __init__(self, cluster: RedisCluster):
        super().__init__(cluster, 'user')

    def create(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """Create a new user with all related data."""
        # All keys use same hash tag -> same slot
        pipe = self.cluster.pipeline()

        # Main user data
        pipe.hset(
            self._make_key(user_id, 'data'),
            mapping=user_data
        )

        # Initialize related structures
        pipe.hset(self._make_key(user_id, 'settings'), 'theme', 'light')
        pipe.sadd(self._make_key(user_id, 'roles'), 'user')
        pipe.set(self._make_key(user_id, 'created_at'), user_data.get('created_at', ''))

        results = pipe.execute()
        return all(r is not None for r in results)

    def get(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get complete user data."""
        # Single pipeline for all related data
        pipe = self.cluster.pipeline()

        pipe.hgetall(self._make_key(user_id, 'data'))
        pipe.hgetall(self._make_key(user_id, 'settings'))
        pipe.smembers(self._make_key(user_id, 'roles'))
        pipe.get(self._make_key(user_id, 'created_at'))

        results = pipe.execute()

        if not results[0]:
            return None

        return {
            'data': results[0],
            'settings': results[1],
            'roles': list(results[2]),
            'created_at': results[3]
        }

    def update_settings(self, user_id: str, settings: Dict[str, Any]) -> bool:
        """Atomic settings update."""
        key = self._make_key(user_id, 'settings')
        return self.cluster.hset(key, mapping=settings) >= 0

    def add_role(self, user_id: str, role: str) -> int:
        """Add role to user."""
        key = self._make_key(user_id, 'roles')
        return self.cluster.sadd(key, role)

    def get_batch(self, user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Get multiple users - handles cross-slot automatically."""
        results = {}

        # Group by slot for efficiency
        slot_groups = {}
        for user_id in user_ids:
            key = self._make_key(user_id, 'data')
            slot = self.cluster.cluster_keyslot(key)
            if slot not in slot_groups:
                slot_groups[slot] = []
            slot_groups[slot].append(user_id)

        # Fetch each group with pipeline
        for slot, group_ids in slot_groups.items():
            pipe = self.cluster.pipeline()
            for user_id in group_ids:
                pipe.hgetall(self._make_key(user_id, 'data'))

            group_results = pipe.execute()

            for user_id, data in zip(group_ids, group_results):
                if data:
                    results[user_id] = data

        return results


# Usage
cluster = RedisCluster(
    startup_nodes=[redis.cluster.ClusterNode('localhost', 7000)],
    decode_responses=True
)

user_repo = UserRepository(cluster)

# Create user (all keys on same slot)
user_repo.create('user:1001', {
    'name': 'John Doe',
    'email': 'john@example.com',
    'created_at': '2024-01-15'
})

# Get user with all related data (single pipeline)
user = user_repo.get('user:1001')
print(f"User: {user}")

# Batch get (handles cross-slot)
users = user_repo.get_batch(['user:1001', 'user:1002', 'user:1003'])
print(f"Users: {users}")
```

## Summary

Working effectively with Redis Cluster requires understanding:

1. **Hash Tags** - Use `{tag}` syntax to co-locate related keys
2. **Slot Awareness** - Design keys to minimize cross-slot operations
3. **Pipelines** - Batch operations for keys on the same slot
4. **Lua Scripts** - Atomic operations require same-slot keys
5. **Cross-Slot Handling** - Group and parallelize when crossing slots

Key takeaways:
- Always use hash tags for related data
- Design your key schema around access patterns
- Use pipelines for efficiency on same-slot operations
- Handle CROSSSLOT errors gracefully with grouping
- Monitor slot distribution to avoid hotspots
