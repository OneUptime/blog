# How to Configure Redis AOF (Append-Only File)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, AOF, Persistence, Durability, Database, DevOps

Description: A comprehensive guide to configuring Redis AOF (Append-Only File) persistence for write durability, including fsync policies, rewriting strategies, and performance optimization.

---

Redis AOF (Append-Only File) persistence logs every write operation received by the server. This approach provides stronger durability guarantees compared to RDB snapshots, as you can recover data up to the last fsync operation rather than the last snapshot.

## Understanding AOF Persistence

AOF works by appending each write command to a log file. When Redis restarts, it replays the commands in the AOF file to reconstruct the dataset. This provides several benefits:

- **Stronger Durability**: Configurable fsync policies let you choose between performance and durability
- **Human-Readable Format**: AOF files contain Redis commands that can be inspected and edited
- **Automatic Rewriting**: AOF files are periodically compacted to prevent unbounded growth
- **Corruption Resistance**: Built-in tools can repair partially corrupted AOF files

## Basic AOF Configuration

Enable and configure AOF in your `redis.conf` file:

```bash
# Enable AOF persistence
appendonly yes

# The name of the append-only file
appendfilename "appendonly.aof"

# The directory where the AOF file will be saved
dir /var/lib/redis

# fsync policy: always, everysec, or no
appendfsync everysec

# Disable fsync during rewrite for better performance
no-appendfsync-on-rewrite no

# Auto-rewrite triggers
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

## Fsync Policies Explained

The `appendfsync` option controls how often Redis calls fsync to flush data to disk:

### always

```bash
appendfsync always
```

- Fsync after every write command
- Maximum durability - lose at most one command
- Slowest performance
- Use for critical financial or transactional data

### everysec (Recommended)

```bash
appendfsync everysec
```

- Fsync every second in a background thread
- Good balance between durability and performance
- Lose at most one second of data
- Default and recommended for most use cases

### no

```bash
appendfsync no
```

- Let the operating system handle flushing
- Fastest performance
- May lose several seconds of data
- Use only when durability is not critical

## Python Example - AOF Management

Here is a Python script to manage AOF persistence:

```python
import redis
import time
from datetime import datetime

class RedisAOFManager:
    def __init__(self, host='localhost', port=6379, password=None):
        self.client = redis.Redis(
            host=host,
            port=port,
            password=password,
            decode_responses=True
        )

    def get_aof_info(self):
        """Get AOF-related information from Redis INFO."""
        info = self.client.info('persistence')
        return {
            'aof_enabled': info.get('aof_enabled'),
            'aof_rewrite_in_progress': info.get('aof_rewrite_in_progress'),
            'aof_last_rewrite_time_sec': info.get('aof_last_rewrite_time_sec'),
            'aof_current_rewrite_time_sec': info.get('aof_current_rewrite_time_sec'),
            'aof_last_bgrewrite_status': info.get('aof_last_bgrewrite_status'),
            'aof_current_size': info.get('aof_current_size'),
            'aof_base_size': info.get('aof_base_size'),
            'aof_pending_rewrite': info.get('aof_pending_rewrite'),
            'aof_buffer_length': info.get('aof_buffer_length'),
        }

    def trigger_rewrite(self):
        """Trigger an AOF rewrite operation."""
        self.client.bgrewriteaof()
        print("Background AOF rewrite initiated")

    def wait_for_rewrite_completion(self, timeout=600):
        """Wait for AOF rewrite to complete."""
        start_time = time.time()

        while time.time() - start_time < timeout:
            info = self.get_aof_info()
            if not info['aof_rewrite_in_progress']:
                print("AOF rewrite completed")
                return True
            time.sleep(1)

        raise TimeoutError("AOF rewrite did not complete within timeout")

    def get_aof_size_ratio(self):
        """Calculate the ratio of current AOF size to base size."""
        info = self.get_aof_info()
        current = info.get('aof_current_size', 0)
        base = info.get('aof_base_size', 1)  # Avoid division by zero
        return current / base if base > 0 else 0

    def check_rewrite_needed(self, threshold=2.0):
        """Check if AOF rewrite is needed based on size ratio."""
        ratio = self.get_aof_size_ratio()
        return ratio >= threshold

    def configure_aof(self, appendfsync='everysec',
                      auto_rewrite_percentage=100,
                      auto_rewrite_min_size='64mb'):
        """Configure AOF settings at runtime."""
        self.client.config_set('appendfsync', appendfsync)
        self.client.config_set('auto-aof-rewrite-percentage',
                               auto_rewrite_percentage)
        self.client.config_set('auto-aof-rewrite-min-size',
                               auto_rewrite_min_size)
        print(f"AOF configured: fsync={appendfsync}, "
              f"rewrite_percentage={auto_rewrite_percentage}, "
              f"min_size={auto_rewrite_min_size}")


class AOFDurabilityDemo:
    """Demonstrate AOF durability with different fsync policies."""

    def __init__(self, host='localhost', port=6379):
        self.client = redis.Redis(
            host=host,
            port=port,
            decode_responses=True
        )

    def benchmark_fsync_policy(self, policy, num_operations=1000):
        """Benchmark write performance with a specific fsync policy."""
        # Set fsync policy
        self.client.config_set('appendfsync', policy)

        start_time = time.time()

        for i in range(num_operations):
            self.client.set(f'bench_key_{i}', f'value_{i}')

        elapsed = time.time() - start_time
        ops_per_sec = num_operations / elapsed

        # Clean up
        for i in range(num_operations):
            self.client.delete(f'bench_key_{i}')

        return {
            'policy': policy,
            'operations': num_operations,
            'elapsed_seconds': round(elapsed, 3),
            'ops_per_second': round(ops_per_sec, 2)
        }

    def compare_policies(self, num_operations=1000):
        """Compare performance of different fsync policies."""
        policies = ['no', 'everysec', 'always']
        results = []

        for policy in policies:
            result = self.benchmark_fsync_policy(policy, num_operations)
            results.append(result)
            print(f"Policy '{policy}': {result['ops_per_second']} ops/sec")

        # Reset to recommended default
        self.client.config_set('appendfsync', 'everysec')

        return results


# Usage example
if __name__ == "__main__":
    manager = RedisAOFManager()

    # Check current AOF status
    print("Current AOF Info:")
    for key, value in manager.get_aof_info().items():
        print(f"  {key}: {value}")

    # Check if rewrite is needed
    if manager.check_rewrite_needed():
        print("\nAOF rewrite recommended - triggering...")
        manager.trigger_rewrite()
        manager.wait_for_rewrite_completion()

    # Benchmark fsync policies
    print("\nBenchmarking fsync policies...")
    demo = AOFDurabilityDemo()
    demo.compare_policies(num_operations=500)
```

## Node.js Example - AOF Management

```javascript
const Redis = require('ioredis');

class RedisAOFManager {
    constructor(options = {}) {
        this.client = new Redis({
            host: options.host || 'localhost',
            port: options.port || 6379,
            password: options.password || undefined,
        });
    }

    async getAOFInfo() {
        const info = await this.client.info('persistence');
        const result = {};

        const lines = info.split('\n');
        for (const line of lines) {
            if (line.startsWith('aof_')) {
                const [key, value] = line.split(':');
                result[key] = value.trim();
            }
        }

        return result;
    }

    async triggerRewrite() {
        await this.client.bgrewriteaof();
        console.log('Background AOF rewrite initiated');
    }

    async waitForRewriteCompletion(timeoutMs = 600000) {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const info = await this.getAOFInfo();
            if (info.aof_rewrite_in_progress === '0') {
                console.log('AOF rewrite completed');
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        throw new Error('AOF rewrite did not complete within timeout');
    }

    async configureAOF(options = {}) {
        const {
            appendfsync = 'everysec',
            autoRewritePercentage = 100,
            autoRewriteMinSize = '64mb'
        } = options;

        await this.client.config('SET', 'appendfsync', appendfsync);
        await this.client.config('SET', 'auto-aof-rewrite-percentage',
                                  autoRewritePercentage);
        await this.client.config('SET', 'auto-aof-rewrite-min-size',
                                  autoRewriteMinSize);

        console.log(`AOF configured: fsync=${appendfsync}, ` +
                   `rewrite_percentage=${autoRewritePercentage}, ` +
                   `min_size=${autoRewriteMinSize}`);
    }

    async benchmarkFsyncPolicy(policy, numOperations = 1000) {
        await this.client.config('SET', 'appendfsync', policy);

        const startTime = Date.now();

        const pipeline = this.client.pipeline();
        for (let i = 0; i < numOperations; i++) {
            pipeline.set(`bench_key_${i}`, `value_${i}`);
        }
        await pipeline.exec();

        const elapsed = (Date.now() - startTime) / 1000;
        const opsPerSec = numOperations / elapsed;

        // Clean up
        const deletePipeline = this.client.pipeline();
        for (let i = 0; i < numOperations; i++) {
            deletePipeline.del(`bench_key_${i}`);
        }
        await deletePipeline.exec();

        return {
            policy,
            operations: numOperations,
            elapsedSeconds: elapsed.toFixed(3),
            opsPerSecond: opsPerSec.toFixed(2)
        };
    }

    async close() {
        await this.client.quit();
    }
}

// Usage example
async function main() {
    const manager = new RedisAOFManager();

    try {
        // Check current AOF status
        console.log('Current AOF Info:');
        const info = await manager.getAOFInfo();
        for (const [key, value] of Object.entries(info)) {
            console.log(`  ${key}: ${value}`);
        }

        // Benchmark different policies
        console.log('\nBenchmarking fsync policies...');
        for (const policy of ['no', 'everysec', 'always']) {
            const result = await manager.benchmarkFsyncPolicy(policy, 500);
            console.log(`Policy '${policy}': ${result.opsPerSecond} ops/sec`);
        }

        // Reset to recommended default
        await manager.configureAOF({ appendfsync: 'everysec' });

    } finally {
        await manager.close();
    }
}

main().catch(console.error);
```

## AOF Rewriting

As Redis receives more write commands, the AOF file grows. AOF rewriting creates a new, compact AOF file that contains only the commands needed to recreate the current dataset.

### Manual Rewrite

Trigger a background AOF rewrite:

```bash
redis-cli BGREWRITEAOF
```

### Automatic Rewrite Configuration

```bash
# Trigger rewrite when AOF is 100% larger than after last rewrite
auto-aof-rewrite-percentage 100

# Minimum size before considering a rewrite
auto-aof-rewrite-min-size 64mb
```

### Monitoring Rewrite Progress

```bash
redis-cli INFO persistence | grep aof_rewrite
```

Output:

```
aof_rewrite_in_progress:0
aof_rewrite_scheduled:0
aof_last_rewrite_time_sec:5
aof_current_rewrite_time_sec:-1
```

## AOF File Structure (Redis 7.0+)

Redis 7.0 introduced a new multi-part AOF structure:

```bash
# AOF directory structure
/var/lib/redis/appendonlydir/
  appendonly.aof.1.base.rdb    # Base RDB snapshot
  appendonly.aof.1.incr.aof    # Incremental AOF commands
  appendonly.aof.manifest      # Manifest file
```

Configure the new format:

```bash
# Use multi-part AOF (default in Redis 7.0+)
aof-use-rdb-preamble yes
```

## Repairing Corrupted AOF Files

If your AOF file becomes corrupted, use the redis-check-aof utility:

### Check for Corruption

```bash
redis-check-aof --fix /var/lib/redis/appendonly.aof
```

### Fix Truncated AOF

```bash
redis-check-aof --fix /var/lib/redis/appendonly.aof
```

This truncates the file at the first invalid command.

### Validate AOF Without Fixing

```bash
redis-check-aof /var/lib/redis/appendonly.aof
```

## Performance Tuning

### Disable Fsync During Rewrite

```bash
# Don't fsync during AOF rewrite (faster but slightly less safe)
no-appendfsync-on-rewrite yes
```

This improves rewrite performance but may lose more data if Redis crashes during rewrite.

### AOF Buffer Configuration

```bash
# Maximum size of the AOF rewrite buffer
aof-rewrite-incremental-fsync yes
```

### Lazy Fsync

For high-write workloads, consider combining AOF with lazy fsync:

```bash
appendfsync everysec
no-appendfsync-on-rewrite yes
```

## Monitoring AOF Health

### Prometheus Alerting Rules

```yaml
groups:
  - name: redis_aof_alerts
    rules:
      - alert: RedisAOFRewriteFailed
        expr: redis_aof_last_bgrewrite_status != 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: Redis AOF rewrite failed
          description: "AOF rewrite failed on {{ $labels.instance }}"

      - alert: RedisAOFTooLarge
        expr: redis_aof_current_size > 10737418240  # 10GB
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: Redis AOF file too large
          description: "AOF file is {{ $value | humanize }} on {{ $labels.instance }}"

      - alert: RedisAOFRewriteStuck
        expr: redis_aof_rewrite_in_progress == 1
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: Redis AOF rewrite taking too long
          description: "AOF rewrite running for 30+ minutes on {{ $labels.instance }}"
```

### Grafana Dashboard Queries

```promql
# AOF file size over time
redis_aof_current_size

# AOF rewrite duration
rate(redis_aof_last_rewrite_time_sec[5m])

# Commands since last fsync
redis_aof_pending_bio_fsync
```

## Switching from RDB to AOF

If you are currently using RDB and want to switch to AOF:

1. Enable AOF at runtime:

```bash
redis-cli CONFIG SET appendonly yes
```

2. Wait for the initial AOF to be created:

```bash
redis-cli INFO persistence | grep aof_rewrite_in_progress
```

3. Make the change permanent in redis.conf:

```bash
appendonly yes
```

4. Optionally disable RDB saves:

```bash
save ""
```

## Best Practices

1. **Use everysec for most workloads**: It provides a good balance between durability and performance

2. **Monitor AOF size**: Set alerts when AOF files grow too large

3. **Test AOF repair procedures**: Regularly verify that your AOF files can be loaded

4. **Consider hybrid persistence**: Use both RDB and AOF for comprehensive protection

5. **Schedule rewrites during low traffic**: Configure rewrite thresholds to trigger during off-peak hours

6. **Monitor fsync latency**: High fsync latency indicates disk I/O issues

7. **Use fast storage**: SSDs significantly improve AOF write performance

## Conclusion

Redis AOF persistence provides strong durability guarantees through write-ahead logging. By understanding the fsync policies, configuring automatic rewrites, and monitoring AOF health, you can ensure your data survives server restarts and failures. For critical applications, combine AOF with RDB snapshots to get the best of both persistence mechanisms.
