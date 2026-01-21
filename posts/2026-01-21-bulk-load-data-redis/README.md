# How to Bulk Load Data into Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bulk Loading, Data Import, Performance, PIPE Mode, Mass Insert, ETL

Description: A comprehensive guide to efficiently bulk loading large amounts of data into Redis using PIPE mode, mass insert strategies, and optimized batch operations.

---

Loading large datasets into Redis efficiently requires understanding Redis's architecture and using the right tools. This guide covers practical approaches for mass data import, from simple scripts to Redis's native PIPE mode.

## Why Bulk Loading Matters

Standard Redis operations have overhead per command. When loading millions of keys, this overhead becomes significant:

- **Network round-trips**: Each command waits for a response
- **Protocol parsing**: Redis processes each command individually
- **Connection overhead**: Multiple connections add latency

Bulk loading techniques minimize these costs.

## Method 1: Redis PIPE Mode

Redis PIPE mode is the fastest way to bulk load data. It uses the Redis protocol directly:

```bash
# Generate Redis protocol format
cat data.txt | redis-cli --pipe

# With authentication
cat data.txt | redis-cli -a your_password --pipe

# To specific host
cat data.txt | redis-cli -h redis.example.com -p 6379 --pipe
```

### Creating Redis Protocol Files

The Redis protocol format is straightforward:

```
*<number of arguments>
$<length of argument 1>
<argument 1>
$<length of argument 2>
<argument 2>
...
```

Here's a Python script to generate protocol files:

```python
import sys
from typing import List, Any, TextIO

def encode_command(args: List[Any]) -> bytes:
    """Encode a Redis command to protocol format."""
    cmd = f"*{len(args)}\r\n"
    for arg in args:
        arg_str = str(arg)
        cmd += f"${len(arg_str)}\r\n{arg_str}\r\n"
    return cmd.encode('utf-8')

def generate_protocol_file(output_file: str, data: List[dict]):
    """Generate a Redis protocol file from data."""
    with open(output_file, 'wb') as f:
        for item in data:
            # Example: SET user:123 '{"name": "John"}'
            key = f"user:{item['id']}"
            value = str(item)
            cmd = encode_command(['SET', key, value])
            f.write(cmd)

# Example usage
import json

def bulk_load_users(input_json: str, output_protocol: str):
    """Convert JSON user data to Redis protocol format."""
    with open(input_json, 'r') as f:
        users = json.load(f)

    with open(output_protocol, 'wb') as out:
        for user in users:
            # SET command for user data
            key = f"user:{user['id']}"
            value = json.dumps(user)
            cmd = encode_command(['SET', key, value])
            out.write(cmd)

            # Add to user index set
            cmd = encode_command(['SADD', 'users:all', str(user['id'])])
            out.write(cmd)

            # Add to sorted set by timestamp
            if 'created_at' in user:
                cmd = encode_command([
                    'ZADD', 'users:by_created',
                    str(user['created_at']), str(user['id'])
                ])
                out.write(cmd)

    print(f"Generated protocol file: {output_protocol}")

# Run it
bulk_load_users('users.json', 'users.protocol')
```

Then load with:

```bash
cat users.protocol | redis-cli --pipe
```

## Method 2: Pipelined Commands in Python

Use Redis pipelining for programmatic bulk loading:

```python
import redis
import json
import time
from typing import List, Dict, Any, Iterator
from contextlib import contextmanager

class RedisBulkLoader:
    def __init__(self, host: str = 'localhost', port: int = 6379,
                 password: str = None, db: int = 0):
        self.redis = redis.Redis(
            host=host,
            port=port,
            password=password,
            db=db,
            decode_responses=True
        )
        self.batch_size = 10000

    def load_with_pipeline(self, data: Iterator[Dict[str, Any]],
                           key_prefix: str = 'item') -> int:
        """Load data using Redis pipeline for batched execution."""
        pipe = self.redis.pipeline(transaction=False)
        count = 0
        total = 0

        for item in data:
            key = f"{key_prefix}:{item['id']}"
            pipe.set(key, json.dumps(item))
            count += 1

            if count >= self.batch_size:
                pipe.execute()
                total += count
                count = 0
                pipe = self.redis.pipeline(transaction=False)
                print(f"Loaded {total} items...")

        # Execute remaining
        if count > 0:
            pipe.execute()
            total += count

        return total

    def load_hashes_bulk(self, data: Iterator[Dict[str, Any]],
                         key_prefix: str = 'hash') -> int:
        """Load data as Redis hashes for memory efficiency."""
        pipe = self.redis.pipeline(transaction=False)
        count = 0
        total = 0

        for item in data:
            key = f"{key_prefix}:{item['id']}"
            # Flatten nested objects for hash storage
            flat_item = self._flatten_dict(item)
            pipe.hset(key, mapping=flat_item)
            count += 1

            if count >= self.batch_size:
                pipe.execute()
                total += count
                count = 0
                pipe = self.redis.pipeline(transaction=False)

        if count > 0:
            pipe.execute()
            total += count

        return total

    def _flatten_dict(self, d: Dict, parent_key: str = '',
                      sep: str = ':') -> Dict[str, str]:
        """Flatten nested dictionary for hash storage."""
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep).items())
            else:
                items.append((new_key, str(v)))
        return dict(items)

# Example usage
def load_from_csv(loader: RedisBulkLoader, csv_file: str) -> int:
    """Load data from CSV file into Redis."""
    import csv

    def csv_reader():
        with open(csv_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield row

    return loader.load_with_pipeline(csv_reader(), 'record')

# Usage
loader = RedisBulkLoader(host='localhost', port=6379)
count = load_from_csv(loader, 'data.csv')
print(f"Loaded {count} records")
```

## Method 3: Lua Script for Complex Loading

Use Lua scripts for atomic bulk operations with complex logic:

```python
import redis
import json
from typing import List, Dict, Any

class LuaBulkLoader:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self._register_scripts()

    def _register_scripts(self):
        """Register Lua scripts for bulk operations."""
        # Script to atomically load user with indexes
        self.load_user_script = self.redis.register_script("""
            local user_data = cjson.decode(ARGV[1])
            local key = KEYS[1]

            -- Store user data
            redis.call('SET', key, ARGV[1])

            -- Add to indexes
            redis.call('SADD', 'users:all', user_data.id)

            if user_data.email then
                redis.call('HSET', 'users:by_email', user_data.email, user_data.id)
            end

            if user_data.created_at then
                redis.call('ZADD', 'users:by_created', user_data.created_at, user_data.id)
            end

            return 1
        """)

        # Bulk load script with transaction semantics
        self.bulk_load_script = self.redis.register_script("""
            local count = 0
            local num_items = #ARGV / 2

            for i = 1, num_items do
                local key = ARGV[(i-1)*2 + 1]
                local value = ARGV[(i-1)*2 + 2]
                redis.call('SET', key, value)
                count = count + 1
            end

            return count
        """)

    def load_user(self, user: Dict[str, Any]) -> bool:
        """Load a single user with indexes atomically."""
        key = f"user:{user['id']}"
        result = self.load_user_script(
            keys=[key],
            args=[json.dumps(user)]
        )
        return result == 1

    def load_users_batch(self, users: List[Dict[str, Any]]) -> int:
        """Load multiple users in batches."""
        loaded = 0
        batch_size = 100  # Lua script argument limit

        for i in range(0, len(users), batch_size):
            batch = users[i:i + batch_size]
            for user in batch:
                self.load_user(user)
                loaded += 1

        return loaded

# Example with progress tracking
def load_with_progress(loader: LuaBulkLoader, users: List[Dict],
                       progress_callback=None):
    """Load users with progress tracking."""
    total = len(users)
    loaded = 0

    for user in users:
        loader.load_user(user)
        loaded += 1

        if progress_callback and loaded % 1000 == 0:
            progress_callback(loaded, total)

    return loaded
```

## Method 4: Streaming from Database

Load data directly from a database:

```python
import redis
import psycopg2
import json
from typing import Generator, Dict, Any

class DatabaseToRedisLoader:
    def __init__(self, redis_client: redis.Redis, pg_connection):
        self.redis = redis_client
        self.pg = pg_connection
        self.batch_size = 5000

    def stream_from_postgres(self, query: str,
                            batch_size: int = 1000) -> Generator[Dict, None, None]:
        """Stream rows from PostgreSQL using server-side cursor."""
        cursor = self.pg.cursor(name='bulk_load_cursor')
        cursor.itersize = batch_size

        cursor.execute(query)

        columns = [desc[0] for desc in cursor.description]
        for row in cursor:
            yield dict(zip(columns, row))

        cursor.close()

    def load_table(self, table_name: str, key_column: str,
                   key_prefix: str) -> int:
        """Load an entire table from PostgreSQL to Redis."""
        query = f"SELECT * FROM {table_name}"
        pipe = self.redis.pipeline(transaction=False)
        count = 0
        total = 0

        for row in self.stream_from_postgres(query):
            key = f"{key_prefix}:{row[key_column]}"

            # Convert datetime objects to strings
            for k, v in row.items():
                if hasattr(v, 'isoformat'):
                    row[k] = v.isoformat()

            pipe.set(key, json.dumps(row))
            count += 1

            if count >= self.batch_size:
                pipe.execute()
                total += count
                count = 0
                pipe = self.redis.pipeline(transaction=False)
                print(f"Loaded {total} records from {table_name}")

        if count > 0:
            pipe.execute()
            total += count

        print(f"Completed loading {total} records from {table_name}")
        return total

    def load_with_transformation(self, query: str, key_func,
                                 transform_func) -> int:
        """Load with custom key generation and data transformation."""
        pipe = self.redis.pipeline(transaction=False)
        count = 0
        total = 0

        for row in self.stream_from_postgres(query):
            key = key_func(row)
            value = transform_func(row)

            if isinstance(value, dict):
                pipe.hset(key, mapping=value)
            else:
                pipe.set(key, value)

            count += 1

            if count >= self.batch_size:
                pipe.execute()
                total += count
                count = 0
                pipe = self.redis.pipeline(transaction=False)

        if count > 0:
            pipe.execute()
            total += count

        return total

# Example usage
def migrate_users_table():
    """Migrate users table from PostgreSQL to Redis."""
    pg_conn = psycopg2.connect(
        host='localhost',
        database='myapp',
        user='postgres',
        password='password'
    )

    redis_client = redis.Redis(host='localhost', port=6379)
    loader = DatabaseToRedisLoader(redis_client, pg_conn)

    # Load users
    count = loader.load_table('users', 'id', 'user')
    print(f"Migrated {count} users")

    # Load with custom transformation
    count = loader.load_with_transformation(
        query="SELECT id, name, email, role FROM users WHERE active = true",
        key_func=lambda row: f"active_user:{row['id']}",
        transform_func=lambda row: {
            'name': row['name'],
            'email': row['email'],
            'role': row['role']
        }
    )
    print(f"Loaded {count} active users as hashes")

    pg_conn.close()
```

## Method 5: Parallel Loading

Speed up loading with parallel workers:

```python
import redis
import json
import multiprocessing
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import time

class ParallelBulkLoader:
    def __init__(self, redis_config: Dict[str, Any], num_workers: int = 4):
        self.redis_config = redis_config
        self.num_workers = num_workers
        self.batch_size = 5000

    def _get_redis(self) -> redis.Redis:
        """Create a new Redis connection."""
        return redis.Redis(**self.redis_config)

    def _load_batch(self, batch: List[Dict[str, Any]],
                   key_prefix: str) -> int:
        """Load a single batch of data."""
        r = self._get_redis()
        pipe = r.pipeline(transaction=False)

        for item in batch:
            key = f"{key_prefix}:{item['id']}"
            pipe.set(key, json.dumps(item))

        pipe.execute()
        r.close()

        return len(batch)

    def load_parallel(self, data: List[Dict[str, Any]],
                      key_prefix: str = 'item') -> int:
        """Load data using multiple processes."""
        # Split data into batches
        batches = [
            data[i:i + self.batch_size]
            for i in range(0, len(data), self.batch_size)
        ]

        total = 0
        with ProcessPoolExecutor(max_workers=self.num_workers) as executor:
            futures = [
                executor.submit(self._load_batch, batch, key_prefix)
                for batch in batches
            ]

            for future in futures:
                total += future.result()

        return total

    def load_from_files_parallel(self, file_paths: List[str],
                                  key_prefix: str) -> int:
        """Load from multiple files in parallel."""
        def process_file(file_path: str) -> int:
            r = self._get_redis()
            pipe = r.pipeline(transaction=False)
            count = 0

            with open(file_path, 'r') as f:
                for line in f:
                    item = json.loads(line)
                    key = f"{key_prefix}:{item['id']}"
                    pipe.set(key, line.strip())
                    count += 1

                    if count % self.batch_size == 0:
                        pipe.execute()
                        pipe = r.pipeline(transaction=False)

            pipe.execute()
            r.close()
            return count

        total = 0
        with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
            futures = [
                executor.submit(process_file, path)
                for path in file_paths
            ]

            for future in futures:
                total += future.result()

        return total

# Usage example
def load_large_dataset():
    """Load a large dataset in parallel."""
    config = {
        'host': 'localhost',
        'port': 6379,
        'decode_responses': True
    }

    loader = ParallelBulkLoader(config, num_workers=4)

    # Generate sample data
    data = [{'id': i, 'value': f'data_{i}'} for i in range(1000000)]

    start = time.time()
    count = loader.load_parallel(data, 'item')
    elapsed = time.time() - start

    print(f"Loaded {count} items in {elapsed:.2f} seconds")
    print(f"Rate: {count/elapsed:.0f} items/second")
```

## Monitoring Bulk Load Progress

Track loading progress and performance:

```python
import redis
import time
import threading
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class LoadProgress:
    total_items: int = 0
    loaded_items: int = 0
    errors: int = 0
    start_time: float = field(default_factory=time.time)
    bytes_loaded: int = 0

    @property
    def elapsed_seconds(self) -> float:
        return time.time() - self.start_time

    @property
    def items_per_second(self) -> float:
        if self.elapsed_seconds > 0:
            return self.loaded_items / self.elapsed_seconds
        return 0

    @property
    def progress_percent(self) -> float:
        if self.total_items > 0:
            return (self.loaded_items / self.total_items) * 100
        return 0

    @property
    def eta_seconds(self) -> Optional[float]:
        if self.items_per_second > 0:
            remaining = self.total_items - self.loaded_items
            return remaining / self.items_per_second
        return None

class MonitoredBulkLoader:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.progress = LoadProgress()
        self._lock = threading.Lock()

    def _update_progress(self, items: int, bytes_count: int = 0):
        """Thread-safe progress update."""
        with self._lock:
            self.progress.loaded_items += items
            self.progress.bytes_loaded += bytes_count

    def _report_progress(self):
        """Print current progress."""
        p = self.progress
        eta = p.eta_seconds

        print(
            f"Progress: {p.progress_percent:.1f}% | "
            f"Loaded: {p.loaded_items:,} / {p.total_items:,} | "
            f"Rate: {p.items_per_second:,.0f}/s | "
            f"ETA: {eta:.0f}s" if eta else "ETA: calculating..."
        )

    def load_with_monitoring(self, data_iterator, key_prefix: str,
                             total_items: int, report_interval: int = 5000) -> int:
        """Load data with progress monitoring."""
        self.progress = LoadProgress(total_items=total_items)
        pipe = self.redis.pipeline(transaction=False)
        batch_count = 0
        batch_size = 5000

        for item in data_iterator:
            key = f"{key_prefix}:{item['id']}"
            value = str(item)

            pipe.set(key, value)
            batch_count += 1

            if batch_count >= batch_size:
                pipe.execute()
                self._update_progress(batch_count)
                batch_count = 0
                pipe = self.redis.pipeline(transaction=False)

                if self.progress.loaded_items % report_interval == 0:
                    self._report_progress()

        # Execute remaining
        if batch_count > 0:
            pipe.execute()
            self._update_progress(batch_count)

        self._report_progress()
        return self.progress.loaded_items
```

## Memory Considerations

When bulk loading, monitor Redis memory:

```python
import redis

def check_memory_before_load(redis_client: redis.Redis,
                             estimated_bytes: int) -> bool:
    """Check if Redis has enough memory for the load."""
    info = redis_client.info('memory')
    used_memory = info['used_memory']
    max_memory = info.get('maxmemory', 0)

    if max_memory > 0:
        available = max_memory - used_memory
        if estimated_bytes > available * 0.9:  # 90% threshold
            print(f"Warning: Estimated load ({estimated_bytes:,} bytes) "
                  f"may exceed available memory ({available:,} bytes)")
            return False

    return True

def estimate_memory_usage(sample_item: dict, total_items: int) -> int:
    """Estimate memory usage for bulk load."""
    import json
    import sys

    # Serialize sample
    serialized = json.dumps(sample_item)

    # Estimate per-item overhead (key + value + Redis overhead)
    key_size = len(f"item:{sample_item.get('id', 0)}")
    value_size = len(serialized)
    redis_overhead = 100  # Approximate Redis internal overhead per key

    per_item = key_size + value_size + redis_overhead

    return per_item * total_items
```

## Best Practices

1. **Use PIPE mode for largest loads** - It is the fastest method for millions of keys
2. **Disable persistence during load** - Turn off RDB/AOF temporarily for faster loading
3. **Monitor memory usage** - Track Redis memory to avoid OOM issues
4. **Use appropriate data structures** - Hashes are more memory-efficient than strings for objects
5. **Batch appropriately** - 5,000-10,000 items per pipeline batch is typically optimal
6. **Consider key expiration** - Set TTLs during load if data should expire
7. **Verify after load** - Sample check that data loaded correctly

## Conclusion

Bulk loading data into Redis efficiently requires choosing the right method for your use case. For the largest datasets, use Redis PIPE mode with protocol files. For programmatic loading, use pipelining with appropriate batch sizes. Always monitor memory usage and consider using parallel loading for maximum throughput.
