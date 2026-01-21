# How to Optimize Redis for Write-Heavy Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Performance, Write Optimization, Pipelining, Batching, Persistence, High Throughput

Description: A comprehensive guide to optimizing Redis for write-heavy workloads, covering pipelining for batch operations, async writes, persistence tuning, memory optimization, and configuration strategies for maximum write throughput.

---

Write-heavy workloads present unique challenges for Redis, requiring careful attention to pipelining, batching, persistence configuration, and memory management. This guide covers strategies to maximize write throughput while maintaining data durability and system stability.

## Understanding Write-Heavy Workloads

Write-heavy workloads typically have these characteristics:

| Metric | Typical Value |
|--------|---------------|
| Write:Read Ratio | 2:1 to 100:1 |
| Write Throughput | 10K+ to 500K+ ops/sec |
| Batch Sizes | 100-10000 per operation |
| Durability Requirement | Varies (async to synchronous) |

Common use cases:
- Event logging and analytics
- Time-series data ingestion
- Real-time metrics collection
- Message queues
- Session tracking
- Cache warming/population

## Pipelining for Batch Writes

Pipelining is the most effective technique for high-throughput writes.

### Python: High-Performance Pipelining

```python
import redis
import time
from typing import List, Dict, Any, Generator
import threading
from queue import Queue
import json

class PipelinedWriter:
    """
    High-performance writer using Redis pipelining.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        batch_size: int = 1000,
        max_pipeline_time_ms: int = 100
    ):
        self.redis = redis_client
        self.batch_size = batch_size
        self.max_pipeline_time_ms = max_pipeline_time_ms

        # Stats
        self.total_writes = 0
        self.total_batches = 0
        self.total_time_ms = 0

    def write_batch(self, operations: List[tuple]) -> List[Any]:
        """
        Write a batch of operations using pipeline.

        Args:
            operations: List of (command, *args) tuples
                       e.g., [('set', 'key1', 'value1'), ('hset', 'hash1', 'field1', 'value1')]

        Returns:
            List of results
        """
        if not operations:
            return []

        start = time.time()
        pipe = self.redis.pipeline(transaction=False)  # Non-transactional for speed

        for op in operations:
            command = op[0]
            args = op[1:]
            getattr(pipe, command)(*args)

        results = pipe.execute()

        elapsed_ms = (time.time() - start) * 1000
        self.total_writes += len(operations)
        self.total_batches += 1
        self.total_time_ms += elapsed_ms

        return results

    def write_key_values(self, data: Dict[str, str], ex: int = None) -> int:
        """
        Write multiple key-value pairs efficiently.
        """
        if not data:
            return 0

        start = time.time()

        # Use MSET for simple key-values without expiration
        if ex is None:
            self.redis.mset(data)
            self.total_writes += len(data)
            return len(data)

        # Use pipeline for key-values with expiration
        pipe = self.redis.pipeline(transaction=False)
        for key, value in data.items():
            pipe.setex(key, ex, value)

        pipe.execute()

        self.total_writes += len(data)
        self.total_batches += 1
        self.total_time_ms += (time.time() - start) * 1000

        return len(data)

    def write_hashes(self, hashes: Dict[str, Dict[str, Any]]) -> int:
        """
        Write multiple hashes efficiently.

        Args:
            hashes: Dict of {hash_name: {field: value, ...}}
        """
        if not hashes:
            return 0

        start = time.time()
        pipe = self.redis.pipeline(transaction=False)

        for hash_name, fields in hashes.items():
            pipe.hset(hash_name, mapping=fields)

        pipe.execute()

        self.total_writes += len(hashes)
        self.total_batches += 1
        self.total_time_ms += (time.time() - start) * 1000

        return len(hashes)

    def write_sorted_set_batch(
        self,
        key: str,
        members: Dict[str, float],
        chunk_size: int = 10000
    ) -> int:
        """
        Write large sorted set in chunks.
        """
        if not members:
            return 0

        items = list(members.items())
        total_written = 0
        start = time.time()

        for i in range(0, len(items), chunk_size):
            chunk = dict(items[i:i + chunk_size])
            self.redis.zadd(key, chunk)
            total_written += len(chunk)

        self.total_writes += total_written
        self.total_batches += (len(items) + chunk_size - 1) // chunk_size
        self.total_time_ms += (time.time() - start) * 1000

        return total_written

    def stream_write(
        self,
        data_generator: Generator,
        transform_fn=None
    ) -> int:
        """
        Stream data from a generator with automatic batching.
        """
        batch = []
        total_written = 0

        for item in data_generator:
            if transform_fn:
                item = transform_fn(item)
            batch.append(item)

            if len(batch) >= self.batch_size:
                self.write_batch(batch)
                total_written += len(batch)
                batch = []

        # Write remaining items
        if batch:
            self.write_batch(batch)
            total_written += len(batch)

        return total_written

    def get_stats(self) -> dict:
        """Get write statistics."""
        avg_batch_size = self.total_writes / max(self.total_batches, 1)
        avg_time_per_batch = self.total_time_ms / max(self.total_batches, 1)
        ops_per_second = self.total_writes / max(self.total_time_ms / 1000, 0.001)

        return {
            'total_writes': self.total_writes,
            'total_batches': self.total_batches,
            'avg_batch_size': avg_batch_size,
            'avg_batch_time_ms': avg_time_per_batch,
            'ops_per_second': ops_per_second
        }


class AsyncBatchWriter:
    """
    Async batch writer with background flushing.
    Useful for fire-and-forget writes.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        batch_size: int = 1000,
        flush_interval_ms: int = 100,
        max_queue_size: int = 100000
    ):
        self.redis = redis_client
        self.batch_size = batch_size
        self.flush_interval_ms = flush_interval_ms

        self._queue = Queue(maxsize=max_queue_size)
        self._running = False
        self._flush_thread = None

        # Stats
        self.queued = 0
        self.flushed = 0
        self.dropped = 0

    def start(self):
        """Start the background flush thread."""
        self._running = True
        self._flush_thread = threading.Thread(
            target=self._flush_loop,
            daemon=True
        )
        self._flush_thread.start()

    def stop(self, timeout: float = 5.0):
        """Stop the writer and flush remaining items."""
        self._running = False
        if self._flush_thread:
            self._flush_thread.join(timeout=timeout)

        # Final flush
        self._flush_batch()

    def write(self, command: str, *args) -> bool:
        """
        Queue a write operation.
        Returns True if queued, False if dropped.
        """
        try:
            self._queue.put_nowait((command, args))
            self.queued += 1
            return True
        except:
            self.dropped += 1
            return False

    def set(self, key: str, value: str, ex: int = None):
        """Queue a SET operation."""
        if ex:
            self.write('setex', key, ex, value)
        else:
            self.write('set', key, value)

    def hset(self, name: str, key: str, value: str):
        """Queue an HSET operation."""
        self.write('hset', name, key, value)

    def zadd(self, name: str, score: float, member: str):
        """Queue a ZADD operation."""
        self.write('zadd', name, {member: score})

    def lpush(self, name: str, *values):
        """Queue an LPUSH operation."""
        self.write('lpush', name, *values)

    def _flush_loop(self):
        """Background flush loop."""
        last_flush = time.time()

        while self._running:
            # Wait for batch size or timeout
            elapsed_ms = (time.time() - last_flush) * 1000

            if self._queue.qsize() >= self.batch_size or elapsed_ms >= self.flush_interval_ms:
                self._flush_batch()
                last_flush = time.time()
            else:
                time.sleep(0.01)  # 10ms sleep

    def _flush_batch(self):
        """Flush current batch to Redis."""
        batch = []
        while not self._queue.empty() and len(batch) < self.batch_size:
            try:
                batch.append(self._queue.get_nowait())
            except:
                break

        if not batch:
            return

        try:
            pipe = self.redis.pipeline(transaction=False)
            for command, args in batch:
                getattr(pipe, command)(*args)
            pipe.execute()
            self.flushed += len(batch)
        except redis.RedisError as e:
            print(f"Flush error: {e}")
            # Could implement retry logic here

    def get_stats(self) -> dict:
        """Get writer statistics."""
        return {
            'queued': self.queued,
            'flushed': self.flushed,
            'dropped': self.dropped,
            'pending': self._queue.qsize()
        }


# Usage example
def main():
    client = redis.Redis(decode_responses=True)

    # Synchronous batch writer
    writer = PipelinedWriter(client, batch_size=1000)

    # Write key-value pairs
    data = {f"key:{i}": f"value:{i}" for i in range(10000)}
    writer.write_key_values(data)

    print(f"Sync stats: {writer.get_stats()}")

    # Async batch writer
    async_writer = AsyncBatchWriter(client, batch_size=500, flush_interval_ms=50)
    async_writer.start()

    # Queue writes (non-blocking)
    for i in range(10000):
        async_writer.set(f"async:key:{i}", f"value:{i}")

    time.sleep(1)  # Let it flush
    async_writer.stop()

    print(f"Async stats: {async_writer.get_stats()}")


if __name__ == '__main__':
    main()
```

### Node.js: High-Performance Pipelining

```javascript
const Redis = require('ioredis');

/**
 * High-performance pipelined writer for Node.js
 */
class PipelinedWriter {
    constructor(redis, options = {}) {
        this.redis = redis;
        this.batchSize = options.batchSize || 1000;
        this.maxPipelineTimeMs = options.maxPipelineTimeMs || 100;

        // Stats
        this.totalWrites = 0;
        this.totalBatches = 0;
        this.totalTimeMs = 0;
    }

    /**
     * Write a batch of operations using pipeline
     */
    async writeBatch(operations) {
        if (operations.length === 0) return [];

        const start = Date.now();
        const pipeline = this.redis.pipeline();

        for (const [command, ...args] of operations) {
            pipeline[command](...args);
        }

        const results = await pipeline.exec();

        const elapsedMs = Date.now() - start;
        this.totalWrites += operations.length;
        this.totalBatches++;
        this.totalTimeMs += elapsedMs;

        return results.map(([err, result]) => (err ? null : result));
    }

    /**
     * Write multiple key-value pairs
     */
    async writeKeyValues(data, ex = null) {
        const entries = Object.entries(data);
        if (entries.length === 0) return 0;

        const start = Date.now();

        if (ex === null) {
            // Use MSET for simple key-values
            await this.redis.mset(data);
        } else {
            // Use pipeline for key-values with expiration
            const pipeline = this.redis.pipeline();
            for (const [key, value] of entries) {
                pipeline.setex(key, ex, value);
            }
            await pipeline.exec();
        }

        this.totalWrites += entries.length;
        this.totalBatches++;
        this.totalTimeMs += Date.now() - start;

        return entries.length;
    }

    /**
     * Write multiple hashes
     */
    async writeHashes(hashes) {
        const entries = Object.entries(hashes);
        if (entries.length === 0) return 0;

        const start = Date.now();
        const pipeline = this.redis.pipeline();

        for (const [hashName, fields] of entries) {
            pipeline.hset(hashName, fields);
        }

        await pipeline.exec();

        this.totalWrites += entries.length;
        this.totalBatches++;
        this.totalTimeMs += Date.now() - start;

        return entries.length;
    }

    /**
     * Write to sorted set in chunks
     */
    async writeSortedSetBatch(key, members, chunkSize = 10000) {
        const entries = Object.entries(members);
        if (entries.length === 0) return 0;

        const start = Date.now();
        let totalWritten = 0;

        for (let i = 0; i < entries.length; i += chunkSize) {
            const chunk = entries.slice(i, i + chunkSize);
            const args = chunk.flatMap(([member, score]) => [score, member]);
            await this.redis.zadd(key, ...args);
            totalWritten += chunk.length;
        }

        this.totalWrites += totalWritten;
        this.totalBatches += Math.ceil(entries.length / chunkSize);
        this.totalTimeMs += Date.now() - start;

        return totalWritten;
    }

    /**
     * Stream write from async iterator
     */
    async streamWrite(asyncIterator, transformFn = null) {
        let batch = [];
        let totalWritten = 0;

        for await (const item of asyncIterator) {
            const transformed = transformFn ? transformFn(item) : item;
            batch.push(transformed);

            if (batch.length >= this.batchSize) {
                await this.writeBatch(batch);
                totalWritten += batch.length;
                batch = [];
            }
        }

        if (batch.length > 0) {
            await this.writeBatch(batch);
            totalWritten += batch.length;
        }

        return totalWritten;
    }

    getStats() {
        const avgBatchSize = this.totalWrites / Math.max(this.totalBatches, 1);
        const avgTimePerBatch = this.totalTimeMs / Math.max(this.totalBatches, 1);
        const opsPerSecond = this.totalWrites / Math.max(this.totalTimeMs / 1000, 0.001);

        return {
            totalWrites: this.totalWrites,
            totalBatches: this.totalBatches,
            avgBatchSize,
            avgBatchTimeMs: avgTimePerBatch,
            opsPerSecond
        };
    }
}

/**
 * Async batch writer with automatic flushing
 */
class AsyncBatchWriter {
    constructor(redis, options = {}) {
        this.redis = redis;
        this.batchSize = options.batchSize || 1000;
        this.flushIntervalMs = options.flushIntervalMs || 100;

        this.queue = [];
        this.running = false;
        this.flushTimer = null;

        // Stats
        this.stats = {
            queued: 0,
            flushed: 0,
            dropped: 0
        };
    }

    start() {
        this.running = true;
        this.scheduleFlush();
    }

    async stop() {
        this.running = false;
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
        }
        await this.flush();
    }

    scheduleFlush() {
        if (!this.running) return;

        this.flushTimer = setTimeout(async () => {
            await this.flush();
            this.scheduleFlush();
        }, this.flushIntervalMs);
    }

    write(command, ...args) {
        this.queue.push([command, ...args]);
        this.stats.queued++;

        if (this.queue.length >= this.batchSize) {
            this.flush();
        }
    }

    set(key, value, ex = null) {
        if (ex) {
            this.write('setex', key, ex, value);
        } else {
            this.write('set', key, value);
        }
    }

    hset(name, field, value) {
        this.write('hset', name, field, value);
    }

    zadd(name, score, member) {
        this.write('zadd', name, score, member);
    }

    lpush(name, ...values) {
        this.write('lpush', name, ...values);
    }

    async flush() {
        if (this.queue.length === 0) return;

        const batch = this.queue.splice(0, this.batchSize);

        try {
            const pipeline = this.redis.pipeline();
            for (const [command, ...args] of batch) {
                pipeline[command](...args);
            }
            await pipeline.exec();
            this.stats.flushed += batch.length;
        } catch (err) {
            console.error('Flush error:', err);
            this.stats.dropped += batch.length;
        }
    }

    getStats() {
        return {
            ...this.stats,
            pending: this.queue.length
        };
    }
}

// Usage
async function main() {
    const redis = new Redis();

    // Synchronous batch writer
    const writer = new PipelinedWriter(redis, { batchSize: 1000 });

    // Write key-value pairs
    const data = {};
    for (let i = 0; i < 10000; i++) {
        data[`key:${i}`] = `value:${i}`;
    }
    await writer.writeKeyValues(data);
    console.log('Sync stats:', writer.getStats());

    // Async batch writer
    const asyncWriter = new AsyncBatchWriter(redis, {
        batchSize: 500,
        flushIntervalMs: 50
    });
    asyncWriter.start();

    // Queue writes (non-blocking)
    for (let i = 0; i < 10000; i++) {
        asyncWriter.set(`async:key:${i}`, `value:${i}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    await asyncWriter.stop();

    console.log('Async stats:', asyncWriter.getStats());

    await redis.quit();
}

main().catch(console.error);
```

## Persistence Tuning for Writes

### RDB vs AOF Trade-offs

```bash
# ==========================================
# High Write Throughput - Minimal Durability
# ==========================================

# Disable AOF
appendonly no

# Infrequent RDB snapshots
save 900 1
save 300 10
# Remove: save 60 10000

# Background save settings
stop-writes-on-bgsave-error no
rdbcompression yes
rdbchecksum no  # Faster without checksum

# ==========================================
# Balanced - Some Durability
# ==========================================

# AOF with every-second fsync
appendonly yes
appendfsync everysec

# Auto-rewrite settings
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# RDB for backups
save 900 1
save 300 10

# ==========================================
# Maximum Durability - Lower Throughput
# ==========================================

# AOF with always fsync (slowest)
appendonly yes
appendfsync always

# Keep RDB for fast restarts
save 900 1
save 300 10
save 60 10000
```

### Python: Write-Aware Client

```python
import redis
import time
from typing import Optional, Dict, Any
import threading

class WriteOptimizedClient:
    """
    Redis client optimized for write-heavy workloads
    with persistence awareness.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        check_persistence: bool = True,
        max_aof_rewrite_time: int = 60
    ):
        self.redis = redis_client
        self.check_persistence = check_persistence
        self.max_aof_rewrite_time = max_aof_rewrite_time

        self._aof_rewriting = False
        self._bgsave_running = False

    def check_persistence_status(self) -> Dict[str, Any]:
        """Check if persistence operations are running."""
        info = self.redis.info('persistence')

        return {
            'rdb_bgsave_in_progress': info.get('rdb_bgsave_in_progress', 0) == 1,
            'rdb_last_bgsave_status': info.get('rdb_last_bgsave_status', 'unknown'),
            'aof_rewrite_in_progress': info.get('aof_rewrite_in_progress', 0) == 1,
            'aof_last_rewrite_time_sec': info.get('aof_last_rewrite_time_sec', 0),
            'aof_current_size': info.get('aof_current_size', 0),
            'aof_base_size': info.get('aof_base_size', 0)
        }

    def is_persistence_busy(self) -> bool:
        """Check if persistence operations might slow down writes."""
        status = self.check_persistence_status()
        return status['rdb_bgsave_in_progress'] or status['aof_rewrite_in_progress']

    def adaptive_batch_size(self, base_size: int = 1000) -> int:
        """
        Adjust batch size based on persistence status.
        Smaller batches during BGSAVE/AOF rewrite.
        """
        if not self.check_persistence:
            return base_size

        if self.is_persistence_busy():
            return base_size // 2  # Reduce batch size during persistence
        return base_size

    def write_with_retry(
        self,
        command: str,
        *args,
        max_retries: int = 3,
        retry_delay: float = 0.1,
        **kwargs
    ) -> Any:
        """
        Write with automatic retry on persistence-related failures.
        """
        for attempt in range(max_retries):
            try:
                return getattr(self.redis, command)(*args, **kwargs)
            except redis.exceptions.ResponseError as e:
                if 'MISCONF' in str(e):
                    # Persistence failure - wait and retry
                    time.sleep(retry_delay * (2 ** attempt))
                    continue
                raise
            except redis.exceptions.ConnectionError:
                time.sleep(retry_delay * (2 ** attempt))
                continue
        raise Exception(f"Failed after {max_retries} retries")

    def bulk_write_safe(
        self,
        operations: list,
        batch_size: int = None
    ) -> int:
        """
        Bulk write with automatic batch size adjustment.
        """
        if batch_size is None:
            batch_size = self.adaptive_batch_size()

        total_written = 0

        for i in range(0, len(operations), batch_size):
            batch = operations[i:i + batch_size]

            # Check persistence status periodically
            if self.check_persistence and i % (batch_size * 10) == 0:
                batch_size = self.adaptive_batch_size(batch_size)

            pipe = self.redis.pipeline(transaction=False)
            for op in batch:
                command = op[0]
                args = op[1:]
                getattr(pipe, command)(*args)

            try:
                pipe.execute()
                total_written += len(batch)
            except redis.exceptions.ResponseError as e:
                if 'MISCONF' in str(e):
                    # Wait for persistence to recover
                    time.sleep(1)
                    # Retry this batch
                    pipe = self.redis.pipeline(transaction=False)
                    for op in batch:
                        command = op[0]
                        args = op[1:]
                        getattr(pipe, command)(*args)
                    pipe.execute()
                    total_written += len(batch)
                else:
                    raise

        return total_written


# Usage
client = redis.Redis()
writer = WriteOptimizedClient(client, check_persistence=True)

# Check persistence status
status = writer.check_persistence_status()
print(f"Persistence status: {status}")

# Adaptive batch writing
operations = [('set', f'key:{i}', f'value:{i}') for i in range(10000)]
written = writer.bulk_write_safe(operations)
print(f"Written: {written} items")
```

## Memory Optimization for Writes

### Efficient Data Structures

```python
import redis
import json
import struct
from typing import Dict, Any, List
import msgpack  # pip install msgpack

class MemoryEfficientWriter:
    """
    Write data in memory-efficient formats.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    # ==========================================
    # Strategy 1: Use Hashes Instead of Strings
    # ==========================================

    def store_objects_as_strings(self, objects: Dict[str, Dict]):
        """
        Naive approach: Store each object as JSON string.
        Memory overhead: ~90 bytes per key.
        """
        pipe = self.redis.pipeline()
        for obj_id, obj in objects.items():
            pipe.set(f"object:{obj_id}", json.dumps(obj))
        pipe.execute()

    def store_objects_as_hash(self, hash_name: str, objects: Dict[str, Dict]):
        """
        Better approach: Store all objects in one hash.
        Memory overhead: Shared hash overhead, ~50 bytes per field.

        Best for: < 512 fields with values < 64 bytes (uses ziplist)
        """
        mapping = {
            obj_id: json.dumps(obj)
            for obj_id, obj in objects.items()
        }
        self.redis.hset(hash_name, mapping=mapping)

    # ==========================================
    # Strategy 2: Use MessagePack Instead of JSON
    # ==========================================

    def store_with_msgpack(self, key: str, data: Any):
        """
        MessagePack is typically 20-30% smaller than JSON.
        """
        packed = msgpack.packb(data, use_bin_type=True)
        self.redis.set(key, packed)

    def store_batch_msgpack(self, data: Dict[str, Any]):
        """
        Batch store with MessagePack.
        """
        pipe = self.redis.pipeline()
        for key, value in data.items():
            packed = msgpack.packb(value, use_bin_type=True)
            pipe.set(key, packed)
        pipe.execute()

    # ==========================================
    # Strategy 3: Bit-Packed Integers
    # ==========================================

    def store_counters_efficient(self, prefix: str, counters: Dict[str, int]):
        """
        Store small integers efficiently using BITFIELD.
        Each counter uses only the bits needed.
        """
        # For counters 0-255, use 8 bits each
        # For counters 0-65535, use 16 bits each

        key = f"{prefix}:counters"

        # Using BITFIELD for efficient storage
        # This stores multiple counters in a single key
        pipe = self.redis.pipeline()

        for i, (name, value) in enumerate(counters.items()):
            # Store counter at offset i * 16 bits
            pipe.bitfield(key, 'SET', 'u16', f'#{i * 16}', value)
            # Store name-to-index mapping
            pipe.hset(f"{prefix}:index", name, i)

        pipe.execute()

    # ==========================================
    # Strategy 4: Compressed Strings
    # ==========================================

    def store_compressed(self, key: str, data: str):
        """
        Store large strings with compression.
        Useful for data > 1KB.
        """
        import zlib
        compressed = zlib.compress(data.encode(), level=6)
        self.redis.set(key, compressed)

    def store_batch_compressed(self, data: Dict[str, str], min_size: int = 1024):
        """
        Batch store with selective compression.
        Only compress values above min_size.
        """
        import zlib

        pipe = self.redis.pipeline()
        for key, value in data.items():
            if len(value) > min_size:
                compressed = zlib.compress(value.encode(), level=6)
                pipe.set(f"{key}:compressed", compressed)
            else:
                pipe.set(key, value)
        pipe.execute()

    # ==========================================
    # Strategy 5: Time-Series Optimization
    # ==========================================

    def store_timeseries_naive(self, key: str, timestamp: int, value: float):
        """
        Naive: One key per data point.
        Memory: ~90 bytes per point.
        """
        self.redis.set(f"{key}:{timestamp}", value)

    def store_timeseries_efficient(self, key: str, data_points: List[tuple]):
        """
        Efficient: Pack multiple points into sorted set.
        Memory: ~16 bytes per point in sorted set.

        data_points: [(timestamp, value), ...]
        """
        # Pack timestamp and value together
        mapping = {}
        for timestamp, value in data_points:
            # Use timestamp as score, pack value in member
            member = struct.pack('!d', value)  # 8 bytes for double
            mapping[member] = timestamp

        self.redis.zadd(key, mapping)

    def store_timeseries_bucket(
        self,
        key: str,
        data_points: List[tuple],
        bucket_size: int = 3600  # 1 hour buckets
    ):
        """
        Most efficient: Bucket data points by time.
        Each bucket is a hash with relative timestamps.
        """
        # Group by bucket
        buckets = {}
        for timestamp, value in data_points:
            bucket_ts = (timestamp // bucket_size) * bucket_size
            if bucket_ts not in buckets:
                buckets[bucket_ts] = {}
            relative_ts = timestamp - bucket_ts
            buckets[bucket_ts][str(relative_ts)] = str(value)

        # Store buckets
        pipe = self.redis.pipeline()
        for bucket_ts, points in buckets.items():
            bucket_key = f"{key}:bucket:{bucket_ts}"
            pipe.hset(bucket_key, mapping=points)
            pipe.expire(bucket_key, 86400 * 7)  # 7 day retention
        pipe.execute()


# Memory comparison
def compare_memory_usage():
    client = redis.Redis()
    writer = MemoryEfficientWriter(client)

    # Test data
    objects = {
        str(i): {'name': f'item_{i}', 'value': i, 'active': True}
        for i in range(100)
    }

    # Clear test keys
    client.flushdb()

    # Method 1: Individual strings
    writer.store_objects_as_strings(objects)
    mem1 = client.memory_usage('object:0')

    client.flushdb()

    # Method 2: Single hash
    writer.store_objects_as_hash('objects_hash', objects)
    mem2 = client.memory_usage('objects_hash')

    print(f"Individual strings: ~{mem1} bytes per key")
    print(f"Single hash: {mem2} bytes total for 100 items")


compare_memory_usage()
```

## Write Buffering and Queuing

### Producer-Consumer Pattern

```python
import redis
import threading
import time
from queue import Queue
from typing import List, Callable, Any
import json

class WriteBufferManager:
    """
    Write buffer with multiple worker threads.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        num_workers: int = 4,
        buffer_size: int = 10000,
        batch_size: int = 500
    ):
        self.redis = redis_client
        self.num_workers = num_workers
        self.batch_size = batch_size

        self._buffer = Queue(maxsize=buffer_size)
        self._workers: List[threading.Thread] = []
        self._running = False

        # Stats
        self.stats = {
            'buffered': 0,
            'written': 0,
            'errors': 0
        }
        self._stats_lock = threading.Lock()

    def start(self):
        """Start worker threads."""
        self._running = True

        for i in range(self.num_workers):
            worker = threading.Thread(
                target=self._worker_loop,
                name=f"WriteWorker-{i}",
                daemon=True
            )
            worker.start()
            self._workers.append(worker)

    def stop(self, timeout: float = 10.0):
        """Stop workers and flush remaining buffer."""
        self._running = False

        for worker in self._workers:
            worker.join(timeout=timeout)

    def buffer_write(self, command: str, *args) -> bool:
        """
        Buffer a write operation.
        Returns True if buffered, False if buffer is full.
        """
        try:
            self._buffer.put_nowait((command, args))
            with self._stats_lock:
                self.stats['buffered'] += 1
            return True
        except:
            return False

    def _worker_loop(self):
        """Worker thread main loop."""
        batch = []

        while self._running or not self._buffer.empty():
            # Collect batch
            try:
                while len(batch) < self.batch_size:
                    item = self._buffer.get(timeout=0.1)
                    batch.append(item)
            except:
                pass  # Timeout, process what we have

            if batch:
                self._write_batch(batch)
                batch = []

    def _write_batch(self, batch: List[tuple]):
        """Write a batch of operations."""
        try:
            pipe = self.redis.pipeline(transaction=False)

            for command, args in batch:
                getattr(pipe, command)(*args)

            pipe.execute()

            with self._stats_lock:
                self.stats['written'] += len(batch)

        except redis.RedisError as e:
            print(f"Batch write error: {e}")
            with self._stats_lock:
                self.stats['errors'] += len(batch)

    def get_stats(self) -> dict:
        """Get buffer statistics."""
        with self._stats_lock:
            return {
                **self.stats,
                'pending': self._buffer.qsize()
            }


class RedisStreamWriter:
    """
    Use Redis Streams as a write buffer.
    Provides durability for buffered writes.
    """

    def __init__(
        self,
        redis_client: redis.Redis,
        stream_name: str = 'write_buffer',
        max_stream_len: int = 100000
    ):
        self.redis = redis_client
        self.stream_name = stream_name
        self.max_stream_len = max_stream_len

    def buffer_write(self, target_key: str, command: str, data: dict) -> str:
        """
        Buffer a write operation in Redis Stream.
        Returns the message ID.
        """
        message = {
            'target_key': target_key,
            'command': command,
            'data': json.dumps(data),
            'timestamp': str(time.time())
        }

        return self.redis.xadd(
            self.stream_name,
            message,
            maxlen=self.max_stream_len
        )

    def process_buffer(self, batch_size: int = 100) -> int:
        """
        Process buffered writes.
        Returns number of processed items.
        """
        messages = self.redis.xrange(
            self.stream_name,
            count=batch_size
        )

        if not messages:
            return 0

        pipe = self.redis.pipeline()

        for msg_id, fields in messages:
            target_key = fields['target_key']
            command = fields['command']
            data = json.loads(fields['data'])

            if command == 'set':
                pipe.set(target_key, data.get('value'))
            elif command == 'hset':
                pipe.hset(target_key, mapping=data)
            elif command == 'zadd':
                pipe.zadd(target_key, data)
            # Add more commands as needed

        # Execute writes
        pipe.execute()

        # Remove processed messages
        msg_ids = [msg_id for msg_id, _ in messages]
        self.redis.xdel(self.stream_name, *msg_ids)

        return len(messages)

    def start_processor(self, interval: float = 0.1):
        """Start background processor."""
        def processor_loop():
            while True:
                processed = self.process_buffer()
                if processed == 0:
                    time.sleep(interval)

        thread = threading.Thread(target=processor_loop, daemon=True)
        thread.start()
        return thread


# Usage
def main():
    client = redis.Redis()

    # Memory-based buffer
    buffer = WriteBufferManager(
        client,
        num_workers=4,
        batch_size=500
    )
    buffer.start()

    # Buffer writes
    for i in range(10000):
        buffer.buffer_write('set', f'key:{i}', f'value:{i}')

    time.sleep(2)
    buffer.stop()
    print(f"Buffer stats: {buffer.get_stats()}")

    # Stream-based buffer (durable)
    stream_writer = RedisStreamWriter(client)

    for i in range(1000):
        stream_writer.buffer_write(
            f'stream_key:{i}',
            'set',
            {'value': f'value:{i}'}
        )

    # Process buffered writes
    processed = stream_writer.process_buffer(batch_size=100)
    print(f"Processed {processed} items from stream buffer")


if __name__ == '__main__':
    main()
```

## Configuration Tuning for Write Performance

### Redis Configuration

```bash
# redis.conf for write-heavy workloads

# Network - handle many connections
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Memory
maxmemory 8gb
maxmemory-policy allkeys-lru

# Disable or reduce persistence for pure caching
# Option 1: No persistence (fastest)
save ""
appendonly no

# Option 2: Minimal persistence
# save 900 1
# appendonly yes
# appendfsync everysec

# Lazy free for faster DEL operations
lazyfree-lazy-eviction yes
lazyfree-lazy-expire yes
lazyfree-lazy-server-del yes
replica-lazy-flush yes

# Disable slow operations
slowlog-log-slower-than 10000

# Client output buffer
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 512mb 256mb 60

# Active defragmentation (for long-running instances)
activedefrag yes
active-defrag-ignore-bytes 100mb
active-defrag-threshold-lower 10
active-defrag-threshold-upper 25

# Hash optimization (for many small hashes)
hash-max-ziplist-entries 512
hash-max-ziplist-value 64

# List optimization
list-max-ziplist-size -2
list-compress-depth 0

# Set optimization
set-max-intset-entries 512

# Sorted set optimization
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
```

### Kernel Tuning

```bash
# /etc/sysctl.conf for write-heavy Redis

# Increase network buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Increase connection backlog
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Reduce TIME_WAIT sockets
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_tw_reuse = 1

# VM settings for Redis
vm.overcommit_memory = 1
vm.swappiness = 1

# Apply: sysctl -p
```

## Monitoring Write Performance

```python
import redis
import time
from typing import Dict

def monitor_write_performance(client: redis.Redis, duration: int = 60) -> Dict:
    """Monitor Redis write performance metrics."""
    initial_info = client.info()
    initial_cmdstats = client.info('commandstats')

    time.sleep(duration)

    final_info = client.info()
    final_cmdstats = client.info('commandstats')

    # Calculate write command stats
    write_commands = ['set', 'setex', 'mset', 'hset', 'hmset', 'lpush', 'rpush',
                      'sadd', 'zadd', 'xadd', 'incr', 'incrby', 'del']

    write_ops = 0
    write_time_us = 0

    for cmd in write_commands:
        key = f'cmdstat_{cmd}'
        if key in final_cmdstats and key in initial_cmdstats:
            write_ops += (final_cmdstats[key]['calls'] -
                         initial_cmdstats[key]['calls'])
            write_time_us += (final_cmdstats[key]['usec'] -
                             initial_cmdstats[key]['usec'])

    total_commands = (final_info['total_commands_processed'] -
                     initial_info['total_commands_processed'])

    return {
        'duration_seconds': duration,
        'total_commands': total_commands,
        'write_commands': write_ops,
        'write_ops_per_second': write_ops / duration,
        'avg_write_latency_us': write_time_us / max(write_ops, 1),
        'write_percentage': write_ops / max(total_commands, 1) * 100,
        'used_memory_delta': (final_info['used_memory'] -
                             initial_info['used_memory']),
        'connected_clients': final_info['connected_clients'],
        'instantaneous_ops_per_sec': final_info['instantaneous_ops_per_sec']
    }


# Usage
client = redis.Redis()
metrics = monitor_write_performance(client, duration=30)
print(f"Write performance: {metrics}")
```

## Summary

Optimizing Redis for write-heavy workloads involves:

1. **Pipelining** - Batch multiple commands to reduce round-trips
2. **Async Writing** - Use queues and background workers for non-blocking writes
3. **Persistence Tuning** - Balance durability vs. performance based on requirements
4. **Memory Optimization** - Use efficient data structures and compression
5. **Write Buffering** - Smooth out write bursts with buffering
6. **Configuration Tuning** - Optimize Redis and OS settings

Key metrics to monitor:
- Write throughput (ops/second)
- Write latency (p50, p99)
- Memory growth rate
- Persistence lag
- Client queue length
