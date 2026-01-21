# How to Debug Redis Memory Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Memory, Debugging, Performance, Troubleshooting, Operations

Description: A comprehensive guide to debugging Redis memory issues, covering MEMORY DOCTOR, memory analysis techniques, leak detection, fragmentation diagnosis, and optimization strategies for production environments.

---

Memory is Redis's most critical resource. When Redis runs out of memory, it can start evicting keys, rejecting writes, or even crash. Understanding how Redis uses memory and how to debug memory issues is essential for maintaining a healthy Redis deployment. In this guide, we will explore comprehensive techniques for debugging Redis memory issues.

## Understanding Redis Memory Usage

### Memory Components

Redis memory usage consists of several components:

1. **Data Memory**: Keys, values, and data structure overhead
2. **Replication Buffers**: Output buffers for replicas
3. **Client Buffers**: Input/output buffers for client connections
4. **AOF Buffers**: Write-ahead log buffers
5. **Lua Scripts**: Cached Lua scripts
6. **Internal Data Structures**: Dictionaries, skip lists, etc.

### Checking Memory Usage

```bash
# Basic memory info
redis-cli INFO memory

# Key memory metrics
used_memory: 1234567890
used_memory_human: 1.15G
used_memory_rss: 1345678901
used_memory_rss_human: 1.25G
used_memory_peak: 1400000000
used_memory_peak_human: 1.30G
used_memory_overhead: 123456789
used_memory_dataset: 1111111101
maxmemory: 2147483648
maxmemory_human: 2.00G
maxmemory_policy: volatile-lru
mem_fragmentation_ratio: 1.09
```

## Using MEMORY Commands

### MEMORY STATS

Get detailed memory statistics:

```bash
redis-cli MEMORY STATS

# Returns detailed breakdown:
1) "peak.allocated"
2) (integer) 1400000000
3) "total.allocated"
4) (integer) 1234567890
5) "startup.allocated"
6) (integer) 5000000
7) "replication.backlog"
8) (integer) 1048576
9) "clients.slaves"
10) (integer) 0
11) "clients.normal"
12) (integer) 500000
13) "aof.buffer"
14) (integer) 0
15) "db.0"
16) 1) "overhead.hashtable.main"
    2) (integer) 12345678
    3) "overhead.hashtable.expires"
    4) (integer) 1234567
    5) "overhead.hashtable.slot-to-keys"
    6) (integer) 0
```

### MEMORY DOCTOR

Let Redis diagnose memory issues:

```bash
redis-cli MEMORY DOCTOR

# Example output:
Sam, I have a few reports for you.

1. High memory fragmentation: The memory fragmentation ratio is 1.8.
   This happens when the allocator can't efficiently reuse memory.
   Consider restarting Redis to reclaim memory.

2. Big client output buffers: One or more clients have very large
   output buffers. This might indicate slow clients or
   issues with network.

3. Peak memory: Your peak memory usage was 2.1GB which is 105%
   of your current maxmemory setting.
```

### MEMORY USAGE

Check memory usage of specific keys:

```bash
# Check single key memory usage
redis-cli MEMORY USAGE mykey

# With samples for aggregate types
redis-cli MEMORY USAGE myhash SAMPLES 10

# Check all keys in a pattern
redis-cli --scan --pattern "user:*" | while read key; do
    echo "$key: $(redis-cli MEMORY USAGE $key) bytes"
done
```

## Finding Memory Leaks

### Pattern 1: Growing Key Count

```python
import redis
import time

def monitor_key_growth(host='localhost', port=6379, interval=60):
    """Monitor key count growth over time."""
    r = redis.Redis(host=host, port=port, decode_responses=True)
    history = []

    while True:
        info = r.info('keyspace')
        total_keys = sum(
            int(db_info.split(',')[0].split('=')[1])
            for db_info in info.values()
            if isinstance(db_info, str)
        )

        timestamp = time.time()
        history.append((timestamp, total_keys))

        # Keep last hour of data
        history = [(t, k) for t, k in history if timestamp - t < 3600]

        if len(history) > 1:
            growth_rate = (history[-1][1] - history[0][1]) / (history[-1][0] - history[0][0])
            print(f"Keys: {total_keys}, Growth rate: {growth_rate:.2f} keys/sec")

            if growth_rate > 100:  # Threshold
                print("WARNING: Rapid key growth detected!")

        time.sleep(interval)
```

### Pattern 2: Memory Without Key Growth

```python
def detect_memory_leak(host='localhost', port=6379):
    """Detect memory leaks - memory grows but keys don't."""
    r = redis.Redis(host=host, port=port, decode_responses=True)

    # Get initial state
    info = r.info('memory')
    keyspace = r.info('keyspace')

    initial_memory = info['used_memory']
    initial_keys = sum(
        int(db.split(',')[0].split('=')[1])
        for db in keyspace.values()
        if isinstance(db, str)
    )

    print(f"Initial: {initial_memory / 1024 / 1024:.2f} MB, {initial_keys} keys")

    time.sleep(300)  # Wait 5 minutes

    # Get final state
    info = r.info('memory')
    keyspace = r.info('keyspace')

    final_memory = info['used_memory']
    final_keys = sum(
        int(db.split(',')[0].split('=')[1])
        for db in keyspace.values()
        if isinstance(db, str)
    )

    memory_growth = final_memory - initial_memory
    key_growth = final_keys - initial_keys

    print(f"Final: {final_memory / 1024 / 1024:.2f} MB, {final_keys} keys")
    print(f"Memory growth: {memory_growth / 1024 / 1024:.2f} MB")
    print(f"Key growth: {key_growth}")

    if memory_growth > 10 * 1024 * 1024 and key_growth < 100:
        print("WARNING: Memory growing without key growth - possible leak!")
        print("Check: client buffers, replication backlog, Lua scripts")
```

### Pattern 3: Client Buffer Leak

```python
def check_client_buffers(host='localhost', port=6379):
    """Check for large client buffers."""
    r = redis.Redis(host=host, port=port, decode_responses=True)

    clients = r.client_list()
    large_buffers = []

    for client in clients:
        # Parse output buffer info
        omem = int(client.get('omem', 0))
        qbuf = int(client.get('qbuf', 0))
        qbuf_free = int(client.get('qbuf-free', 0))

        total_buffer = omem + qbuf

        if total_buffer > 1024 * 1024:  # 1MB threshold
            large_buffers.append({
                'addr': client.get('addr'),
                'name': client.get('name', 'unknown'),
                'age': client.get('age'),
                'idle': client.get('idle'),
                'output_buffer': omem,
                'query_buffer': qbuf,
                'cmd': client.get('cmd'),
            })

    if large_buffers:
        print("Clients with large buffers:")
        for client in sorted(large_buffers, key=lambda x: x['output_buffer'], reverse=True):
            print(f"  {client['addr']} ({client['name']}): "
                  f"output={client['output_buffer']/1024/1024:.2f}MB, "
                  f"idle={client['idle']}s, cmd={client['cmd']}")

    return large_buffers
```

## Diagnosing Memory Fragmentation

### Understanding Fragmentation

Memory fragmentation occurs when:
- `mem_fragmentation_ratio > 1.5`: Redis has allocated more memory than it's using
- `mem_fragmentation_ratio < 1`: Redis is using swap (critical!)

```bash
# Check fragmentation
redis-cli INFO memory | grep fragmentation

# mem_fragmentation_ratio:1.85
# mem_fragmentation_bytes:850000000
```

### Fragmentation Analysis Script

```python
def analyze_fragmentation(host='localhost', port=6379):
    """Analyze memory fragmentation."""
    r = redis.Redis(host=host, port=port, decode_responses=True)
    info = r.info('memory')

    used = info['used_memory']
    rss = info['used_memory_rss']
    ratio = info['mem_fragmentation_ratio']
    frag_bytes = info.get('mem_fragmentation_bytes', rss - used)

    print("Memory Fragmentation Analysis")
    print("=" * 50)
    print(f"Used Memory: {used / 1024 / 1024:.2f} MB")
    print(f"RSS Memory: {rss / 1024 / 1024:.2f} MB")
    print(f"Fragmentation Ratio: {ratio:.2f}")
    print(f"Fragmentation Bytes: {frag_bytes / 1024 / 1024:.2f} MB")

    if ratio < 1:
        print("\nCRITICAL: Using swap memory! Performance severely impacted.")
        print("Action: Add more RAM or reduce data size immediately.")
    elif ratio > 1.5:
        print("\nWARNING: High fragmentation detected.")
        print("Possible causes:")
        print("  1. Many small keys with varying sizes")
        print("  2. Frequent key deletions")
        print("  3. Keys with frequently changing sizes")
        print("\nRecommended actions:")
        print("  1. Consider MEMORY PURGE (Redis 4.0+)")
        print("  2. Schedule a restart during low-traffic period")
        print("  3. Enable active defragmentation")
    else:
        print("\nFragmentation is within acceptable range.")

    return {
        'used': used,
        'rss': rss,
        'ratio': ratio,
        'fragmentation_bytes': frag_bytes
    }
```

### Fixing Fragmentation

```bash
# Enable active defragmentation (Redis 4.0+)
CONFIG SET activedefrag yes
CONFIG SET active-defrag-ignore-bytes 100mb
CONFIG SET active-defrag-threshold-lower 10
CONFIG SET active-defrag-threshold-upper 100
CONFIG SET active-defrag-cycle-min 5
CONFIG SET active-defrag-cycle-max 75

# Manual memory purge (immediately release pages)
MEMORY PURGE

# Check defrag stats
INFO stats | grep defrag
```

## Finding Big Keys

### Using redis-cli

```bash
# Find big keys (samples random keys)
redis-cli --bigkeys

# More thorough scan
redis-cli --bigkeys -i 0.1
```

### Comprehensive Big Key Scanner

```python
import redis
from collections import defaultdict

def scan_big_keys(host='localhost', port=6379, threshold_bytes=1024*1024):
    """Scan for keys larger than threshold."""
    r = redis.Redis(host=host, port=port, decode_responses=True)

    big_keys = []
    type_stats = defaultdict(lambda: {'count': 0, 'total_size': 0, 'max_size': 0})
    cursor = 0
    scanned = 0

    print(f"Scanning for keys > {threshold_bytes / 1024 / 1024:.2f} MB...")

    while True:
        cursor, keys = r.scan(cursor, count=1000)
        scanned += len(keys)

        for key in keys:
            try:
                memory = r.memory_usage(key, samples=0)
                if memory is None:
                    continue

                key_type = r.type(key)
                type_stats[key_type]['count'] += 1
                type_stats[key_type]['total_size'] += memory
                type_stats[key_type]['max_size'] = max(type_stats[key_type]['max_size'], memory)

                if memory > threshold_bytes:
                    big_keys.append({
                        'key': key,
                        'type': key_type,
                        'size': memory,
                        'size_mb': memory / 1024 / 1024
                    })

            except Exception as e:
                pass

        if cursor == 0:
            break

        if scanned % 10000 == 0:
            print(f"Scanned {scanned} keys, found {len(big_keys)} big keys...")

    # Sort by size
    big_keys.sort(key=lambda x: x['size'], reverse=True)

    print(f"\n{'=' * 60}")
    print(f"Scan complete. Scanned {scanned} keys.")
    print(f"\nType Distribution:")
    print("-" * 60)
    for key_type, stats in sorted(type_stats.items(), key=lambda x: x[1]['total_size'], reverse=True):
        print(f"  {key_type:10}: {stats['count']:8} keys, "
              f"total: {stats['total_size']/1024/1024:10.2f} MB, "
              f"max: {stats['max_size']/1024/1024:8.2f} MB")

    print(f"\nBig Keys (> {threshold_bytes / 1024 / 1024:.2f} MB):")
    print("-" * 60)
    for key in big_keys[:20]:  # Top 20
        print(f"  {key['key'][:50]:50} [{key['type']:6}] {key['size_mb']:8.2f} MB")

    return big_keys, type_stats
```

## Memory Optimization Strategies

### 1. Data Structure Optimization

```python
def suggest_optimizations(host='localhost', port=6379):
    """Suggest memory optimizations based on data analysis."""
    r = redis.Redis(host=host, port=port, decode_responses=True)

    suggestions = []

    # Check hash-max-ziplist settings
    hash_max_entries = int(r.config_get('hash-max-ziplist-entries')['hash-max-ziplist-entries'])
    hash_max_value = int(r.config_get('hash-max-ziplist-value')['hash-max-ziplist-value'])

    # Sample hashes
    cursor = 0
    large_hashes = []
    while True:
        cursor, keys = r.scan(cursor, match='*', count=100, _type='hash')
        for key in keys[:100]:
            length = r.hlen(key)
            if length > hash_max_entries:
                large_hashes.append({'key': key, 'length': length})
        if cursor == 0 or len(large_hashes) > 10:
            break

    if large_hashes:
        suggestions.append({
            'issue': 'Large hashes exceeding ziplist threshold',
            'detail': f"Found {len(large_hashes)} hashes with > {hash_max_entries} fields",
            'action': 'Consider increasing hash-max-ziplist-entries or splitting hashes'
        })

    # Check for key patterns
    key_patterns = defaultdict(int)
    cursor = 0
    sample_size = 0
    while sample_size < 10000:
        cursor, keys = r.scan(cursor, count=1000)
        for key in keys:
            # Extract pattern (replace numbers with #)
            import re
            pattern = re.sub(r'\d+', '#', key)
            key_patterns[pattern] += 1
        sample_size += len(keys)
        if cursor == 0:
            break

    # Find patterns with many keys
    hot_patterns = [(p, c) for p, c in key_patterns.items() if c > 100]
    if hot_patterns:
        for pattern, count in sorted(hot_patterns, key=lambda x: x[1], reverse=True)[:5]:
            suggestions.append({
                'issue': f'High-volume key pattern: {pattern}',
                'detail': f"~{count} keys match this pattern in sample",
                'action': 'Consider TTL, compression, or data structure change'
            })

    return suggestions
```

### 2. Configure Memory Limits

```bash
# Set maximum memory
CONFIG SET maxmemory 2gb

# Set eviction policy
CONFIG SET maxmemory-policy volatile-lru  # Evict keys with TTL
# Other options: allkeys-lru, volatile-ttl, allkeys-random, noeviction

# Set warning threshold
CONFIG SET maxmemory-samples 10  # More samples = better eviction accuracy
```

### 3. Use Compression

```python
import redis
import zlib
import json

class CompressedRedis:
    def __init__(self, host='localhost', port=6379):
        self.redis = redis.Redis(host=host, port=port)
        self.compression_threshold = 1024  # Compress values > 1KB

    def set(self, key, value, ex=None):
        """Set value with optional compression."""
        data = json.dumps(value).encode()

        if len(data) > self.compression_threshold:
            compressed = zlib.compress(data)
            # Only use compression if it actually reduces size
            if len(compressed) < len(data) * 0.9:
                self.redis.set(f"z:{key}", compressed, ex=ex)
                return

        self.redis.set(key, data, ex=ex)

    def get(self, key):
        """Get value with automatic decompression."""
        # Try compressed first
        data = self.redis.get(f"z:{key}")
        if data:
            return json.loads(zlib.decompress(data))

        # Try uncompressed
        data = self.redis.get(key)
        if data:
            return json.loads(data)

        return None
```

### 4. Implement Key Expiration

```python
def add_ttl_to_keys(host='localhost', port=6379, pattern='*', ttl_seconds=86400):
    """Add TTL to keys without expiration."""
    r = redis.Redis(host=host, port=port, decode_responses=True)

    cursor = 0
    updated = 0
    skipped = 0

    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=1000)

        pipe = r.pipeline()
        for key in keys:
            # Check if key already has TTL
            current_ttl = r.ttl(key)
            if current_ttl == -1:  # No expiration
                pipe.expire(key, ttl_seconds)
                updated += 1
            else:
                skipped += 1

        pipe.execute()

        if cursor == 0:
            break

    print(f"Added TTL to {updated} keys, skipped {skipped} keys with existing TTL")
    return updated, skipped
```

## Comprehensive Memory Audit Tool

```python
#!/usr/bin/env python3
"""Redis Memory Audit Tool"""

import redis
import argparse
from datetime import datetime

class RedisMemoryAudit:
    def __init__(self, host, port, password=None):
        self.r = redis.Redis(host=host, port=port, password=password, decode_responses=True)

    def run_audit(self):
        """Run comprehensive memory audit."""
        print("=" * 70)
        print(f"Redis Memory Audit - {datetime.now().isoformat()}")
        print("=" * 70)

        self._check_memory_usage()
        self._check_fragmentation()
        self._check_client_memory()
        self._run_memory_doctor()
        self._check_eviction()
        self._sample_big_keys()
        self._check_replication_memory()
        self._generate_recommendations()

    def _check_memory_usage(self):
        """Check overall memory usage."""
        print("\n[Memory Usage]")
        print("-" * 50)

        info = self.r.info('memory')
        maxmem = info.get('maxmemory', 0)
        used = info['used_memory']

        print(f"Used Memory: {used / 1024 / 1024:.2f} MB")
        print(f"Used Memory RSS: {info['used_memory_rss'] / 1024 / 1024:.2f} MB")
        print(f"Peak Memory: {info['used_memory_peak'] / 1024 / 1024:.2f} MB")

        if maxmem > 0:
            usage_pct = (used / maxmem) * 100
            print(f"Max Memory: {maxmem / 1024 / 1024:.2f} MB")
            print(f"Usage: {usage_pct:.1f}%")

            if usage_pct > 90:
                print("  CRITICAL: Memory usage > 90%!")
            elif usage_pct > 80:
                print("  WARNING: Memory usage > 80%")
        else:
            print("Max Memory: Not set (unlimited)")
            print("  WARNING: Consider setting maxmemory")

    def _check_fragmentation(self):
        """Check memory fragmentation."""
        print("\n[Memory Fragmentation]")
        print("-" * 50)

        info = self.r.info('memory')
        ratio = info['mem_fragmentation_ratio']
        frag_bytes = info.get('mem_fragmentation_bytes', 0)

        print(f"Fragmentation Ratio: {ratio:.2f}")
        print(f"Fragmentation Bytes: {frag_bytes / 1024 / 1024:.2f} MB")

        if ratio < 1:
            print("  CRITICAL: Ratio < 1 indicates swap usage!")
        elif ratio > 1.5:
            print("  WARNING: High fragmentation - consider defragmentation")
        else:
            print("  OK: Fragmentation within normal range")

    def _check_client_memory(self):
        """Check client buffer memory."""
        print("\n[Client Memory]")
        print("-" * 50)

        clients = self.r.client_list()
        total_output = 0
        total_query = 0
        large_clients = []

        for client in clients:
            omem = int(client.get('omem', 0))
            qbuf = int(client.get('qbuf', 0))
            total_output += omem
            total_query += qbuf

            if omem > 1024 * 1024:
                large_clients.append(client)

        print(f"Connected Clients: {len(clients)}")
        print(f"Total Output Buffer: {total_output / 1024 / 1024:.2f} MB")
        print(f"Total Query Buffer: {total_query / 1024 / 1024:.2f} MB")

        if large_clients:
            print(f"  WARNING: {len(large_clients)} clients with > 1MB output buffer")
            for c in large_clients[:3]:
                print(f"    {c['addr']}: {int(c['omem'])/1024/1024:.2f} MB")

    def _run_memory_doctor(self):
        """Run MEMORY DOCTOR."""
        print("\n[Memory Doctor]")
        print("-" * 50)

        try:
            diagnosis = self.r.execute_command('MEMORY', 'DOCTOR')
            print(diagnosis)
        except Exception as e:
            print(f"MEMORY DOCTOR not available: {e}")

    def _check_eviction(self):
        """Check eviction status."""
        print("\n[Eviction Status]")
        print("-" * 50)

        info = self.r.info('stats')
        evicted = info.get('evicted_keys', 0)
        expired = info.get('expired_keys', 0)

        print(f"Evicted Keys: {evicted}")
        print(f"Expired Keys: {expired}")

        mem_info = self.r.info('memory')
        policy = mem_info.get('maxmemory_policy', 'unknown')
        print(f"Eviction Policy: {policy}")

        if evicted > 0:
            print("  WARNING: Keys are being evicted - may indicate memory pressure")

    def _sample_big_keys(self):
        """Sample and find big keys."""
        print("\n[Big Keys Sample]")
        print("-" * 50)

        cursor = 0
        big_keys = []
        sampled = 0
        max_samples = 10000

        while sampled < max_samples:
            cursor, keys = self.r.scan(cursor, count=500)
            for key in keys:
                try:
                    size = self.r.memory_usage(key, samples=0)
                    if size and size > 100 * 1024:  # > 100KB
                        big_keys.append((key, size))
                except:
                    pass
            sampled += len(keys)
            if cursor == 0:
                break

        big_keys.sort(key=lambda x: x[1], reverse=True)

        print(f"Sampled {sampled} keys")
        if big_keys:
            print(f"Found {len(big_keys)} keys > 100KB:")
            for key, size in big_keys[:10]:
                print(f"  {key[:40]}: {size / 1024 / 1024:.2f} MB")
        else:
            print("No keys > 100KB found in sample")

    def _check_replication_memory(self):
        """Check replication-related memory."""
        print("\n[Replication Memory]")
        print("-" * 50)

        info = self.r.info('replication')
        role = info.get('role', 'unknown')
        print(f"Role: {role}")

        if role == 'master':
            backlog = info.get('repl_backlog_size', 0)
            backlog_active = info.get('repl_backlog_active', 0)
            slaves = info.get('connected_slaves', 0)
            print(f"Connected Replicas: {slaves}")
            print(f"Replication Backlog: {backlog / 1024 / 1024:.2f} MB")
            print(f"Backlog Active: {backlog_active}")

    def _generate_recommendations(self):
        """Generate optimization recommendations."""
        print("\n[Recommendations]")
        print("-" * 50)

        info = self.r.info('memory')

        recommendations = []

        # Check maxmemory
        if info.get('maxmemory', 0) == 0:
            recommendations.append("Set maxmemory to prevent OOM")

        # Check fragmentation
        if info['mem_fragmentation_ratio'] > 1.5:
            recommendations.append("Enable active defragmentation or schedule restart")

        # Check policy
        policy = info.get('maxmemory_policy', '')
        if policy == 'noeviction':
            recommendations.append("Consider using an eviction policy like 'volatile-lru'")

        # Check overhead
        overhead_ratio = info.get('used_memory_overhead', 0) / max(info['used_memory'], 1)
        if overhead_ratio > 0.3:
            recommendations.append("High memory overhead - review data structures")

        if recommendations:
            for i, rec in enumerate(recommendations, 1):
                print(f"  {i}. {rec}")
        else:
            print("  No critical issues found")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Redis Memory Audit Tool')
    parser.add_argument('--host', default='localhost', help='Redis host')
    parser.add_argument('--port', type=int, default=6379, help='Redis port')
    parser.add_argument('--password', default=None, help='Redis password')
    args = parser.parse_args()

    audit = RedisMemoryAudit(args.host, args.port, args.password)
    audit.run_audit()
```

## Conclusion

Debugging Redis memory issues requires a systematic approach:

1. **Understand the components**: Know where memory is being used
2. **Use built-in tools**: MEMORY STATS, MEMORY DOCTOR, MEMORY USAGE
3. **Monitor continuously**: Track memory trends over time
4. **Find big keys**: Identify and optimize large keys
5. **Check fragmentation**: Address fragmentation before it becomes critical
6. **Monitor client buffers**: Watch for slow consumers causing buffer growth
7. **Implement best practices**: TTLs, compression, appropriate data structures

With these techniques, you can effectively diagnose and resolve Redis memory issues before they impact your applications.
