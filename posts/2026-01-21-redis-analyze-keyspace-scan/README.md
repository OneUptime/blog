# How to Analyze Redis Keyspace with SCAN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, SCAN, Keyspace, Analysis, Performance, Operations

Description: A comprehensive guide to analyzing Redis keyspace using SCAN command, covering techniques for finding large keys, expired keys, key patterns, and performing keyspace analysis without blocking production systems.

---

Understanding what data lives in your Redis instance is crucial for optimization, debugging, and capacity planning. The SCAN command family provides a non-blocking way to iterate through keys without impacting production performance. In this guide, we will explore how to effectively analyze your Redis keyspace using SCAN.

## Why Use SCAN Instead of KEYS?

The KEYS command returns all matching keys at once, but it:
- Blocks Redis during execution
- Can cause timeouts in production
- Uses significant memory for large keyspaces

SCAN provides cursor-based iteration that:
- Returns results incrementally
- Doesn't block for extended periods
- Is safe for production use

```bash
# NEVER do this in production
KEYS *

# Use SCAN instead
SCAN 0 MATCH * COUNT 1000
```

## Basic SCAN Usage

### Command Syntax

```bash
SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]
```

### Basic Examples

```bash
# Scan all keys
SCAN 0

# Scan with pattern matching
SCAN 0 MATCH "user:*"

# Scan with count hint (not a limit)
SCAN 0 MATCH "session:*" COUNT 1000

# Scan by type (Redis 6.0+)
SCAN 0 TYPE hash COUNT 100
```

### Complete Scan Loop

```bash
# Bash script for complete keyspace scan
cursor=0
while true; do
    result=$(redis-cli SCAN $cursor MATCH "*" COUNT 1000)
    cursor=$(echo "$result" | head -1)
    keys=$(echo "$result" | tail -n +2)

    # Process keys
    for key in $keys; do
        echo "Found: $key"
    done

    if [ "$cursor" == "0" ]; then
        break
    fi
done
```

## Python Keyspace Analyzer

Here's a comprehensive Python tool for keyspace analysis:

```python
import redis
import time
from collections import defaultdict
from datetime import datetime, timedelta
import re
from typing import Dict, List, Tuple, Optional

class RedisKeyspaceAnalyzer:
    def __init__(self, host='localhost', port=6379, password=None):
        self.redis = redis.Redis(
            host=host,
            port=port,
            password=password,
            decode_responses=True
        )

    def scan_all_keys(self, pattern='*', count=1000, max_keys=None):
        """Generator that yields all keys matching pattern."""
        cursor = 0
        total = 0

        while True:
            cursor, keys = self.redis.scan(cursor, match=pattern, count=count)
            for key in keys:
                yield key
                total += 1
                if max_keys and total >= max_keys:
                    return
            if cursor == 0:
                break

    def analyze_keyspace(self, pattern='*', sample_size=None):
        """
        Perform comprehensive keyspace analysis.

        Returns statistics about key distribution, types, sizes, and TTLs.
        """
        stats = {
            'total_keys': 0,
            'types': defaultdict(int),
            'patterns': defaultdict(int),
            'size_distribution': defaultdict(int),
            'ttl_distribution': {
                'no_ttl': 0,
                'expired_soon': 0,  # < 1 hour
                'short_ttl': 0,     # 1-24 hours
                'medium_ttl': 0,    # 1-7 days
                'long_ttl': 0,      # > 7 days
            },
            'total_memory': 0,
            'large_keys': [],
            'memory_by_type': defaultdict(int),
            'memory_by_pattern': defaultdict(int),
        }

        start_time = time.time()

        for key in self.scan_all_keys(pattern, max_keys=sample_size):
            stats['total_keys'] += 1

            # Get type
            key_type = self.redis.type(key)
            stats['types'][key_type] += 1

            # Extract pattern (normalize numbers and UUIDs)
            normalized = self._normalize_key(key)
            stats['patterns'][normalized] += 1

            # Get memory usage
            try:
                memory = self.redis.memory_usage(key, samples=0) or 0
                stats['total_memory'] += memory
                stats['memory_by_type'][key_type] += memory
                stats['memory_by_pattern'][normalized] += memory

                # Size distribution
                size_bucket = self._get_size_bucket(memory)
                stats['size_distribution'][size_bucket] += 1

                # Track large keys
                if memory > 100 * 1024:  # > 100KB
                    stats['large_keys'].append({
                        'key': key,
                        'type': key_type,
                        'size': memory
                    })
            except:
                pass

            # Get TTL
            ttl = self.redis.ttl(key)
            if ttl == -1:
                stats['ttl_distribution']['no_ttl'] += 1
            elif ttl == -2:
                pass  # Key expired
            elif ttl < 3600:
                stats['ttl_distribution']['expired_soon'] += 1
            elif ttl < 86400:
                stats['ttl_distribution']['short_ttl'] += 1
            elif ttl < 604800:
                stats['ttl_distribution']['medium_ttl'] += 1
            else:
                stats['ttl_distribution']['long_ttl'] += 1

            # Progress indicator
            if stats['total_keys'] % 10000 == 0:
                elapsed = time.time() - start_time
                rate = stats['total_keys'] / elapsed
                print(f"Processed {stats['total_keys']} keys ({rate:.0f} keys/sec)...")

        # Sort large keys by size
        stats['large_keys'].sort(key=lambda x: x['size'], reverse=True)
        stats['large_keys'] = stats['large_keys'][:100]  # Keep top 100

        stats['scan_duration'] = time.time() - start_time
        return stats

    def _normalize_key(self, key: str) -> str:
        """Normalize key to extract pattern."""
        # Replace UUIDs
        pattern = re.sub(
            r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
            '{uuid}',
            key,
            flags=re.IGNORECASE
        )
        # Replace numbers
        pattern = re.sub(r'\d+', '{id}', pattern)
        return pattern

    def _get_size_bucket(self, size: int) -> str:
        """Categorize size into buckets."""
        if size < 100:
            return '< 100B'
        elif size < 1024:
            return '100B - 1KB'
        elif size < 10 * 1024:
            return '1KB - 10KB'
        elif size < 100 * 1024:
            return '10KB - 100KB'
        elif size < 1024 * 1024:
            return '100KB - 1MB'
        elif size < 10 * 1024 * 1024:
            return '1MB - 10MB'
        else:
            return '> 10MB'

    def find_keys_without_ttl(self, pattern='*', limit=1000):
        """Find keys without TTL set."""
        keys_without_ttl = []

        for key in self.scan_all_keys(pattern):
            if self.redis.ttl(key) == -1:
                key_type = self.redis.type(key)
                size = self.redis.memory_usage(key, samples=0) or 0
                keys_without_ttl.append({
                    'key': key,
                    'type': key_type,
                    'size': size
                })

                if len(keys_without_ttl) >= limit:
                    break

        return keys_without_ttl

    def find_expired_keys(self, pattern='*', threshold_seconds=3600):
        """Find keys expiring within threshold."""
        expiring_soon = []

        for key in self.scan_all_keys(pattern):
            ttl = self.redis.ttl(key)
            if 0 < ttl <= threshold_seconds:
                expiring_soon.append({
                    'key': key,
                    'ttl': ttl,
                    'expires_at': datetime.now() + timedelta(seconds=ttl)
                })

        return sorted(expiring_soon, key=lambda x: x['ttl'])

    def find_idle_keys(self, pattern='*', idle_threshold=86400, limit=1000):
        """Find keys that haven't been accessed recently."""
        idle_keys = []

        for key in self.scan_all_keys(pattern):
            try:
                idle_time = self.redis.object('idletime', key)
                if idle_time and idle_time > idle_threshold:
                    idle_keys.append({
                        'key': key,
                        'idle_seconds': idle_time,
                        'idle_days': idle_time / 86400
                    })

                    if len(idle_keys) >= limit:
                        break
            except:
                pass

        return sorted(idle_keys, key=lambda x: x['idle_seconds'], reverse=True)

    def analyze_key_pattern(self, pattern: str) -> Dict:
        """Analyze keys matching a specific pattern."""
        stats = {
            'pattern': pattern,
            'count': 0,
            'types': defaultdict(int),
            'total_size': 0,
            'sizes': [],
            'ttl_set': 0,
            'ttl_not_set': 0,
        }

        for key in self.scan_all_keys(pattern):
            stats['count'] += 1

            key_type = self.redis.type(key)
            stats['types'][key_type] += 1

            size = self.redis.memory_usage(key, samples=0) or 0
            stats['total_size'] += size
            stats['sizes'].append(size)

            ttl = self.redis.ttl(key)
            if ttl == -1:
                stats['ttl_not_set'] += 1
            else:
                stats['ttl_set'] += 1

        if stats['sizes']:
            stats['avg_size'] = sum(stats['sizes']) / len(stats['sizes'])
            stats['max_size'] = max(stats['sizes'])
            stats['min_size'] = min(stats['sizes'])
        del stats['sizes']

        return stats

    def compare_patterns(self, patterns: List[str]) -> List[Dict]:
        """Compare multiple key patterns."""
        results = []
        for pattern in patterns:
            stats = self.analyze_key_pattern(pattern)
            results.append(stats)
        return results

    def print_analysis_report(self, stats: Dict):
        """Print a formatted analysis report."""
        print("\n" + "=" * 70)
        print("REDIS KEYSPACE ANALYSIS REPORT")
        print(f"Generated: {datetime.now().isoformat()}")
        print("=" * 70)

        print(f"\nTotal Keys Analyzed: {stats['total_keys']:,}")
        print(f"Total Memory: {stats['total_memory'] / 1024 / 1024:.2f} MB")
        print(f"Scan Duration: {stats['scan_duration']:.2f} seconds")

        # Type distribution
        print("\n--- Key Type Distribution ---")
        for key_type, count in sorted(stats['types'].items(), key=lambda x: x[1], reverse=True):
            pct = count / stats['total_keys'] * 100
            mem = stats['memory_by_type'].get(key_type, 0) / 1024 / 1024
            print(f"  {key_type:10}: {count:10,} keys ({pct:5.1f}%) - {mem:8.2f} MB")

        # Pattern distribution (top 20)
        print("\n--- Top Key Patterns (by count) ---")
        sorted_patterns = sorted(stats['patterns'].items(), key=lambda x: x[1], reverse=True)[:20]
        for pattern, count in sorted_patterns:
            pct = count / stats['total_keys'] * 100
            mem = stats['memory_by_pattern'].get(pattern, 0) / 1024 / 1024
            print(f"  {pattern[:50]:50}: {count:8,} ({pct:5.1f}%) - {mem:6.2f} MB")

        # Size distribution
        print("\n--- Size Distribution ---")
        size_order = ['< 100B', '100B - 1KB', '1KB - 10KB', '10KB - 100KB',
                      '100KB - 1MB', '1MB - 10MB', '> 10MB']
        for bucket in size_order:
            count = stats['size_distribution'].get(bucket, 0)
            if count > 0:
                pct = count / stats['total_keys'] * 100
                print(f"  {bucket:15}: {count:10,} keys ({pct:5.1f}%)")

        # TTL distribution
        print("\n--- TTL Distribution ---")
        for category, count in stats['ttl_distribution'].items():
            pct = count / stats['total_keys'] * 100 if stats['total_keys'] > 0 else 0
            print(f"  {category:15}: {count:10,} keys ({pct:5.1f}%)")

        # Large keys
        if stats['large_keys']:
            print("\n--- Largest Keys ---")
            for key_info in stats['large_keys'][:10]:
                size_mb = key_info['size'] / 1024 / 1024
                print(f"  {key_info['key'][:50]:50} [{key_info['type']:6}] {size_mb:8.2f} MB")


# Usage Example
if __name__ == '__main__':
    analyzer = RedisKeyspaceAnalyzer()

    # Full analysis
    print("Starting keyspace analysis...")
    stats = analyzer.analyze_keyspace(sample_size=100000)  # Sample 100k keys
    analyzer.print_analysis_report(stats)

    # Find keys without TTL
    print("\n--- Keys Without TTL ---")
    no_ttl = analyzer.find_keys_without_ttl(limit=10)
    for key_info in no_ttl:
        print(f"  {key_info['key']}: {key_info['type']}, {key_info['size']} bytes")

    # Find idle keys
    print("\n--- Idle Keys (> 7 days) ---")
    idle = analyzer.find_idle_keys(idle_threshold=7*86400, limit=10)
    for key_info in idle:
        print(f"  {key_info['key']}: idle for {key_info['idle_days']:.1f} days")
```

## Node.js Keyspace Analyzer

```javascript
const redis = require('redis');

class RedisKeyspaceAnalyzer {
    constructor(options = {}) {
        this.client = redis.createClient(options);
    }

    async connect() {
        await this.client.connect();
    }

    async *scanKeys(pattern = '*', count = 1000) {
        let cursor = 0;
        do {
            const result = await this.client.scan(cursor, {
                MATCH: pattern,
                COUNT: count
            });
            cursor = result.cursor;
            for (const key of result.keys) {
                yield key;
            }
        } while (cursor !== 0);
    }

    async analyzeKeyspace(pattern = '*', sampleSize = 10000) {
        const stats = {
            totalKeys: 0,
            types: {},
            patterns: {},
            totalMemory: 0,
            largeKeys: [],
            ttlDistribution: {
                noTtl: 0,
                expiringSoon: 0,
                shortTtl: 0,
                mediumTtl: 0,
                longTtl: 0
            }
        };

        const startTime = Date.now();

        for await (const key of this.scanKeys(pattern)) {
            if (sampleSize && stats.totalKeys >= sampleSize) break;

            stats.totalKeys++;

            // Get type
            const keyType = await this.client.type(key);
            stats.types[keyType] = (stats.types[keyType] || 0) + 1;

            // Extract pattern
            const normalized = this.normalizeKey(key);
            stats.patterns[normalized] = (stats.patterns[normalized] || 0) + 1;

            // Get memory
            try {
                const memory = await this.client.memoryUsage(key);
                if (memory) {
                    stats.totalMemory += memory;
                    if (memory > 100 * 1024) {
                        stats.largeKeys.push({ key, type: keyType, size: memory });
                    }
                }
            } catch (e) {}

            // Get TTL
            const ttl = await this.client.ttl(key);
            if (ttl === -1) {
                stats.ttlDistribution.noTtl++;
            } else if (ttl > 0 && ttl < 3600) {
                stats.ttlDistribution.expiringSoon++;
            } else if (ttl < 86400) {
                stats.ttlDistribution.shortTtl++;
            } else if (ttl < 604800) {
                stats.ttlDistribution.mediumTtl++;
            } else {
                stats.ttlDistribution.longTtl++;
            }

            if (stats.totalKeys % 1000 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                console.log(`Processed ${stats.totalKeys} keys (${(stats.totalKeys / elapsed).toFixed(0)} keys/sec)...`);
            }
        }

        stats.largeKeys.sort((a, b) => b.size - a.size);
        stats.largeKeys = stats.largeKeys.slice(0, 100);
        stats.scanDuration = (Date.now() - startTime) / 1000;

        return stats;
    }

    normalizeKey(key) {
        return key
            .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{uuid}')
            .replace(/\d+/g, '{id}');
    }

    async findKeysWithoutTtl(pattern = '*', limit = 100) {
        const keysWithoutTtl = [];

        for await (const key of this.scanKeys(pattern)) {
            const ttl = await this.client.ttl(key);
            if (ttl === -1) {
                const type = await this.client.type(key);
                const size = await this.client.memoryUsage(key) || 0;
                keysWithoutTtl.push({ key, type, size });

                if (keysWithoutTtl.length >= limit) break;
            }
        }

        return keysWithoutTtl;
    }

    async disconnect() {
        await this.client.quit();
    }
}

// Usage
async function main() {
    const analyzer = new RedisKeyspaceAnalyzer();
    await analyzer.connect();

    console.log('Starting keyspace analysis...');
    const stats = await analyzer.analyzeKeyspace('*', 50000);

    console.log('\n=== Keyspace Analysis Report ===');
    console.log(`Total Keys: ${stats.totalKeys}`);
    console.log(`Total Memory: ${(stats.totalMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Scan Duration: ${stats.scanDuration.toFixed(2)}s`);

    console.log('\nType Distribution:');
    for (const [type, count] of Object.entries(stats.types)) {
        console.log(`  ${type}: ${count}`);
    }

    console.log('\nTop Patterns:');
    const sortedPatterns = Object.entries(stats.patterns)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    for (const [pattern, count] of sortedPatterns) {
        console.log(`  ${pattern}: ${count}`);
    }

    await analyzer.disconnect();
}

main().catch(console.error);
```

## Common Analysis Tasks

### Finding Orphaned Keys

```python
def find_orphaned_keys(analyzer, valid_patterns):
    """Find keys that don't match any expected pattern."""
    orphaned = []

    for key in analyzer.scan_all_keys():
        is_valid = any(re.match(pattern, key) for pattern in valid_patterns)
        if not is_valid:
            orphaned.append({
                'key': key,
                'type': analyzer.redis.type(key),
                'size': analyzer.redis.memory_usage(key) or 0
            })

    return orphaned

# Usage
valid_patterns = [
    r'^user:\d+$',
    r'^session:[a-f0-9-]+$',
    r'^cache:.*$',
    r'^queue:.*$',
]
orphaned = find_orphaned_keys(analyzer, valid_patterns)
print(f"Found {len(orphaned)} orphaned keys")
```

### Analyzing Key Growth Over Time

```python
def track_key_growth(host='localhost', port=6379, interval=60, duration=3600):
    """Track key count changes over time."""
    r = redis.Redis(host=host, port=port, decode_responses=True)
    history = []
    start_time = time.time()

    while time.time() - start_time < duration:
        info = r.info('keyspace')
        total = sum(
            int(v.split(',')[0].split('=')[1])
            for v in info.values()
            if isinstance(v, str)
        )

        history.append({
            'timestamp': datetime.now().isoformat(),
            'total_keys': total
        })

        if len(history) > 1:
            change = history[-1]['total_keys'] - history[-2]['total_keys']
            rate = change / interval
            print(f"Keys: {total:,} (change: {change:+,}, rate: {rate:+.1f}/sec)")

        time.sleep(interval)

    return history
```

### Detecting Hot Prefixes

```python
def find_hot_prefixes(analyzer, delimiter=':', sample_size=10000):
    """Find key prefixes with highest counts."""
    prefix_counts = defaultdict(int)
    prefix_sizes = defaultdict(int)

    for key in analyzer.scan_all_keys(max_keys=sample_size):
        parts = key.split(delimiter)
        if len(parts) > 1:
            prefix = parts[0]
            prefix_counts[prefix] += 1

            size = analyzer.redis.memory_usage(key, samples=0) or 0
            prefix_sizes[prefix] += size

    results = []
    for prefix, count in prefix_counts.items():
        results.append({
            'prefix': prefix,
            'count': count,
            'total_size': prefix_sizes[prefix],
            'avg_size': prefix_sizes[prefix] / count if count > 0 else 0
        })

    return sorted(results, key=lambda x: x['count'], reverse=True)
```

## Performance Considerations

### 1. Use COUNT Appropriately

```python
# For small databases (< 100k keys)
cursor, keys = r.scan(0, count=1000)

# For large databases (millions of keys)
cursor, keys = r.scan(0, count=10000)  # Higher count = fewer round trips

# For very large databases with slow processing
cursor, keys = r.scan(0, count=100)  # Lower count = less blocking per iteration
```

### 2. Add Delays for Production

```python
def safe_scan(redis_client, pattern='*', delay=0.01):
    """Scan with delay to reduce impact on production."""
    cursor = 0
    while True:
        cursor, keys = redis_client.scan(cursor, match=pattern, count=500)
        yield from keys
        time.sleep(delay)  # Be nice to production
        if cursor == 0:
            break
```

### 3. Use TYPE Filter (Redis 6.0+)

```python
# Only scan hashes - much more efficient than filtering after
for key in r.scan_iter(match='*', _type='hash'):
    process(key)
```

## Best Practices

1. **Never use KEYS in production** - Always use SCAN
2. **Sample large keyspaces** - You don't always need 100% coverage
3. **Add rate limiting** - Prevent overwhelming Redis
4. **Schedule during low traffic** - Run comprehensive scans off-peak
5. **Use TYPE filter** - Filter at the Redis level when possible
6. **Cache results** - Don't repeatedly analyze the same data
7. **Monitor while scanning** - Watch for latency spikes

## Conclusion

Effective keyspace analysis with SCAN enables:

1. **Understanding data distribution** - Know what data you have
2. **Identifying memory hogs** - Find and fix large keys
3. **TTL management** - Ensure proper expiration policies
4. **Pattern discovery** - Detect unexpected key patterns
5. **Capacity planning** - Plan for future growth

With these techniques, you can maintain full visibility into your Redis keyspace without impacting production performance.
