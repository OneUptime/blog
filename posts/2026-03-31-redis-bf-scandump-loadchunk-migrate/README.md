# How to Use BF.SCANDUMP and BF.LOADCHUNK for Bloom Filter Migration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bloom Filter, Migration, Backup

Description: Learn how to use BF.SCANDUMP and BF.LOADCHUNK in Redis to serialize and restore Bloom filters for backup, migration, or replication across instances.

---

Redis Bloom filters support serialization through `BF.SCANDUMP` and `BF.LOADCHUNK`. These commands let you dump a Bloom filter in chunks and reload it into a new Redis instance - useful for backup, cross-instance replication, or migrating data between environments.

## How BF.SCANDUMP Works

`BF.SCANDUMP` iterates over a Bloom filter in chunks. You pass a cursor starting at `0`, and it returns the next cursor plus the raw data chunk. When the returned cursor is `0`, the dump is complete.

```bash
# Start the dump (cursor = 0 to begin)
127.0.0.1:6379> BF.SCANDUMP myfilter 0
1) (integer) 1
2) "\x01\x00\x00..."  # binary chunk data

# Continue with returned cursor
127.0.0.1:6379> BF.SCANDUMP myfilter 1
1) (integer) 0
2) "\x02\x00\x00..."  # final chunk

# Cursor 0 returned = done
```

## How BF.LOADCHUNK Works

`BF.LOADCHUNK` restores chunks into a target key. Feed it the cursor and binary data returned by `BF.SCANDUMP` in order.

```bash
127.0.0.1:6379> BF.LOADCHUNK myfilter_copy 1 "\x01\x00\x00..."
OK
127.0.0.1:6379> BF.LOADCHUNK myfilter_copy 0 "\x02\x00\x00..."
OK
```

## Python Example: Full Dump and Restore

```python
import redis

source = redis.Redis(host="source-host", port=6379, decode_responses=False)
dest = redis.Redis(host="dest-host", port=6379, decode_responses=False)

def dump_bloom_filter(client, key: str) -> list:
    """Serialize a Bloom filter to a list of (cursor, data) tuples."""
    chunks = []
    cursor = 0
    while True:
        cursor, data = client.execute_command("BF.SCANDUMP", key, cursor)
        if cursor == 0 and data is None:
            break
        chunks.append((cursor, data))
        if cursor == 0:
            break
    return chunks

def restore_bloom_filter(client, key: str, chunks: list) -> None:
    """Restore a Bloom filter from serialized chunks."""
    for cursor, data in chunks:
        client.execute_command("BF.LOADCHUNK", key, cursor, data)

# Dump from source
chunks = dump_bloom_filter(source, "user:seen")
print(f"Dumped {len(chunks)} chunks")

# Restore to destination
restore_bloom_filter(dest, "user:seen", chunks)
print("Restore complete")

# Verify
result = dest.execute_command("BF.INFO", "user:seen")
print("Filter info:", result)
```

## Backup to File

You can also persist the dump to disk for cold backups:

```python
import pickle
import redis

r = redis.Redis(host="localhost", port=6379, decode_responses=False)

def backup_to_file(key: str, filename: str) -> None:
    chunks = []
    cursor = 0
    while True:
        cursor, data = r.execute_command("BF.SCANDUMP", key, cursor)
        if data is not None:
            chunks.append((cursor, data))
        if cursor == 0:
            break
    with open(filename, "wb") as f:
        pickle.dump(chunks, f)
    print(f"Backed up {len(chunks)} chunks to {filename}")

def restore_from_file(key: str, filename: str) -> None:
    with open(filename, "rb") as f:
        chunks = pickle.load(f)
    for cursor, data in chunks:
        r.execute_command("BF.LOADCHUNK", key, cursor, data)
    print(f"Restored {key} from {filename}")

backup_to_file("email:seen", "email_seen_bloom.pkl")
restore_from_file("email:seen_restored", "email_seen_bloom.pkl")
```

## Important Notes

- `BF.SCANDUMP` and `BF.LOADCHUNK` work with the raw internal representation, so the restored filter behaves exactly like the original.
- If the destination key already exists, `BF.LOADCHUNK` will overwrite the existing Bloom filter stored under that key.
- This approach is best for periodic snapshots, not real-time replication. For live sync, use Redis replication instead.
- Large filters may produce many chunks; handle this with pagination logic as shown above.

## Summary

`BF.SCANDUMP` and `BF.LOADCHUNK` provide a reliable mechanism for serializing and restoring Redis Bloom filters. This is valuable for cross-environment migration, disaster recovery backups, and duplicating probabilistic data structures between Redis clusters without rebuilding them from scratch.
