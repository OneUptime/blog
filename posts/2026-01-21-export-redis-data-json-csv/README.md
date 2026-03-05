# How to Export Redis Data to JSON/CSV

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Data Export, JSON, CSV, Backup, ETL, Data Migration

Description: A comprehensive guide to exporting Redis data to JSON and CSV formats for backup, analysis, and migration purposes.

---

Exporting Redis data to common formats like JSON and CSV is essential for backups, data analysis, and migration to other systems. This guide covers practical approaches for extracting data from Redis efficiently.

## Why Export Redis Data?

Common reasons for exporting Redis data include:

- **Backups**: Create portable backups in human-readable formats
- **Analytics**: Export to tools like Excel, Pandas, or BI platforms
- **Migration**: Move data to other databases or services
- **Auditing**: Create snapshots for compliance and review
- **Testing**: Generate test fixtures from production data

## Basic Export with redis-cli

The simplest approach uses redis-cli commands:

```bash
# Export all keys to a file
redis-cli KEYS '*' > keys.txt

# Export key-value pairs
redis-cli --scan --pattern 'user:*' | while read key; do
    echo "$key: $(redis-cli GET "$key")"
done > export.txt

# Export to JSON-like format
redis-cli --scan --pattern 'user:*' | while read key; do
    value=$(redis-cli GET "$key")
    echo "{\"key\": \"$key\", \"value\": $value}"
done > export.jsonl
```

## Python Export Library

Here's a comprehensive Python library for exporting Redis data:

```python
import redis
import json
import csv
from typing import List, Dict, Any, Iterator, Optional, Callable
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class RedisDataType(Enum):
    STRING = "string"
    HASH = "hash"
    LIST = "list"
    SET = "set"
    ZSET = "zset"
    STREAM = "stream"

@dataclass
class ExportConfig:
    pattern: str = "*"
    batch_size: int = 1000
    include_ttl: bool = False
    include_type: bool = True
    decode_json: bool = True

class RedisExporter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def _scan_keys(self, pattern: str, batch_size: int) -> Iterator[str]:
        """Scan Redis keys matching pattern."""
        cursor = 0
        while True:
            cursor, keys = self.redis.scan(
                cursor=cursor,
                match=pattern,
                count=batch_size
            )
            for key in keys:
                yield key.decode() if isinstance(key, bytes) else key

            if cursor == 0:
                break

    def _get_key_type(self, key: str) -> RedisDataType:
        """Get the type of a Redis key."""
        key_type = self.redis.type(key)
        if isinstance(key_type, bytes):
            key_type = key_type.decode()
        return RedisDataType(key_type)

    def _get_key_value(self, key: str, key_type: RedisDataType) -> Any:
        """Get value based on key type."""
        if key_type == RedisDataType.STRING:
            value = self.redis.get(key)
            if isinstance(value, bytes):
                value = value.decode()
            return value

        elif key_type == RedisDataType.HASH:
            return {
                k.decode() if isinstance(k, bytes) else k:
                v.decode() if isinstance(v, bytes) else v
                for k, v in self.redis.hgetall(key).items()
            }

        elif key_type == RedisDataType.LIST:
            return [
                v.decode() if isinstance(v, bytes) else v
                for v in self.redis.lrange(key, 0, -1)
            ]

        elif key_type == RedisDataType.SET:
            return [
                v.decode() if isinstance(v, bytes) else v
                for v in self.redis.smembers(key)
            ]

        elif key_type == RedisDataType.ZSET:
            return [
                {
                    "member": m.decode() if isinstance(m, bytes) else m,
                    "score": s
                }
                for m, s in self.redis.zrange(key, 0, -1, withscores=True)
            ]

        elif key_type == RedisDataType.STREAM:
            entries = self.redis.xrange(key)
            return [
                {
                    "id": entry_id.decode() if isinstance(entry_id, bytes) else entry_id,
                    "data": {
                        k.decode() if isinstance(k, bytes) else k:
                        v.decode() if isinstance(v, bytes) else v
                        for k, v in data.items()
                    }
                }
                for entry_id, data in entries
            ]

        return None

    def _export_key(self, key: str, config: ExportConfig) -> Dict[str, Any]:
        """Export a single key with its metadata and value."""
        key_type = self._get_key_type(key)
        value = self._get_key_value(key, key_type)

        # Try to decode JSON strings
        if config.decode_json and key_type == RedisDataType.STRING:
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                pass

        result = {"key": key, "value": value}

        if config.include_type:
            result["type"] = key_type.value

        if config.include_ttl:
            ttl = self.redis.ttl(key)
            result["ttl"] = ttl if ttl > 0 else None

        return result

    def export_to_json(self, output_file: str,
                       config: ExportConfig = None) -> int:
        """Export Redis data to JSON file."""
        config = config or ExportConfig()
        exported = []
        count = 0

        for key in self._scan_keys(config.pattern, config.batch_size):
            try:
                data = self._export_key(key, config)
                exported.append(data)
                count += 1

                if count % 10000 == 0:
                    logger.info(f"Exported {count} keys...")

            except Exception as e:
                logger.error(f"Error exporting key {key}: {e}")

        with open(output_file, 'w') as f:
            json.dump(exported, f, indent=2, default=str)

        logger.info(f"Exported {count} keys to {output_file}")
        return count

    def export_to_jsonl(self, output_file: str,
                        config: ExportConfig = None) -> int:
        """Export Redis data to JSON Lines format (one JSON per line)."""
        config = config or ExportConfig()
        count = 0

        with open(output_file, 'w') as f:
            for key in self._scan_keys(config.pattern, config.batch_size):
                try:
                    data = self._export_key(key, config)
                    f.write(json.dumps(data, default=str) + '\n')
                    count += 1

                except Exception as e:
                    logger.error(f"Error exporting key {key}: {e}")

        logger.info(f"Exported {count} keys to {output_file}")
        return count

    def export_strings_to_csv(self, output_file: str, pattern: str = "*",
                              value_columns: List[str] = None) -> int:
        """Export string keys with JSON values to CSV."""
        config = ExportConfig(pattern=pattern, decode_json=True)
        count = 0
        rows = []

        for key in self._scan_keys(pattern, config.batch_size):
            try:
                key_type = self._get_key_type(key)
                if key_type != RedisDataType.STRING:
                    continue

                value = self._get_key_value(key, key_type)

                # Parse JSON value
                if isinstance(value, str):
                    try:
                        value = json.loads(value)
                    except json.JSONDecodeError:
                        value = {"raw_value": value}

                if isinstance(value, dict):
                    row = {"_key": key, **value}
                    rows.append(row)
                    count += 1

            except Exception as e:
                logger.error(f"Error exporting key {key}: {e}")

        if not rows:
            logger.warning("No data to export")
            return 0

        # Determine columns
        if value_columns:
            columns = ["_key"] + value_columns
        else:
            # Get all unique columns
            all_columns = set()
            for row in rows:
                all_columns.update(row.keys())
            columns = ["_key"] + sorted(all_columns - {"_key"})

        # Write CSV
        with open(output_file, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(rows)

        logger.info(f"Exported {count} keys to {output_file}")
        return count

    def export_hashes_to_csv(self, output_file: str, pattern: str = "*",
                             fields: List[str] = None) -> int:
        """Export hash keys to CSV."""
        count = 0
        rows = []

        for key in self._scan_keys(pattern, 1000):
            try:
                key_type = self._get_key_type(key)
                if key_type != RedisDataType.HASH:
                    continue

                value = self._get_key_value(key, key_type)
                row = {"_key": key, **value}
                rows.append(row)
                count += 1

            except Exception as e:
                logger.error(f"Error exporting key {key}: {e}")

        if not rows:
            return 0

        # Determine columns
        if fields:
            columns = ["_key"] + fields
        else:
            all_columns = set()
            for row in rows:
                all_columns.update(row.keys())
            columns = ["_key"] + sorted(all_columns - {"_key"})

        with open(output_file, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=columns, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(rows)

        return count
```

## Streaming Export for Large Datasets

For large datasets, use streaming to avoid memory issues:

```python
import redis
import json
from typing import Iterator, Dict, Any, Optional
import gzip

class StreamingExporter:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def stream_export(self, pattern: str = "*") -> Iterator[Dict[str, Any]]:
        """Stream Redis data as an iterator."""
        cursor = 0

        while True:
            cursor, keys = self.redis.scan(cursor=cursor, match=pattern, count=1000)

            for key in keys:
                key_str = key.decode() if isinstance(key, bytes) else key
                key_type = self.redis.type(key_str)

                if isinstance(key_type, bytes):
                    key_type = key_type.decode()

                if key_type == "string":
                    value = self.redis.get(key_str)
                    if isinstance(value, bytes):
                        value = value.decode()

                    yield {
                        "key": key_str,
                        "type": key_type,
                        "value": value
                    }

                elif key_type == "hash":
                    value = self.redis.hgetall(key_str)
                    decoded = {
                        k.decode() if isinstance(k, bytes) else k:
                        v.decode() if isinstance(v, bytes) else v
                        for k, v in value.items()
                    }

                    yield {
                        "key": key_str,
                        "type": key_type,
                        "value": decoded
                    }

            if cursor == 0:
                break

    def export_to_jsonl_streaming(self, output_file: str,
                                  pattern: str = "*",
                                  compress: bool = False) -> int:
        """Export to JSON Lines with streaming (memory efficient)."""
        count = 0
        open_func = gzip.open if compress else open
        mode = 'wt' if compress else 'w'

        with open_func(output_file, mode) as f:
            for record in self.stream_export(pattern):
                f.write(json.dumps(record, default=str) + '\n')
                count += 1

                if count % 50000 == 0:
                    print(f"Exported {count} records...")

        return count

    def export_to_csv_streaming(self, output_file: str, pattern: str = "*",
                                columns: Optional[list] = None) -> int:
        """Export to CSV with streaming."""
        import csv

        count = 0
        writer = None

        with open(output_file, 'w', newline='') as f:
            for record in self.stream_export(pattern):
                if record["type"] != "string":
                    continue

                # Parse JSON value
                value = record["value"]
                try:
                    data = json.loads(value)
                    if not isinstance(data, dict):
                        data = {"value": value}
                except (json.JSONDecodeError, TypeError):
                    data = {"value": value}

                row = {"_key": record["key"], **data}

                if writer is None:
                    if columns:
                        fieldnames = ["_key"] + columns
                    else:
                        fieldnames = list(row.keys())
                    writer = csv.DictWriter(f, fieldnames=fieldnames,
                                           extrasaction='ignore')
                    writer.writeheader()

                writer.writerow(row)
                count += 1

        return count
```

## Export Specific Data Structures

### Export Sorted Sets with Scores

```python
import redis
import json
import csv
from typing import List, Dict

def export_sorted_set_to_csv(redis_client: redis.Redis, key: str,
                             output_file: str) -> int:
    """Export a sorted set to CSV with member and score columns."""
    members = redis_client.zrange(key, 0, -1, withscores=True)

    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['member', 'score'])

        for member, score in members:
            if isinstance(member, bytes):
                member = member.decode()
            writer.writerow([member, score])

    return len(members)

def export_leaderboard(redis_client: redis.Redis, key: str,
                       output_file: str, top_n: int = 100) -> int:
    """Export top N entries from a leaderboard sorted set."""
    # Get top N with scores (highest first)
    members = redis_client.zrevrange(key, 0, top_n - 1, withscores=True)

    data = []
    for rank, (member, score) in enumerate(members, 1):
        if isinstance(member, bytes):
            member = member.decode()
        data.append({
            "rank": rank,
            "member": member,
            "score": score
        })

    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)

    return len(data)
```

### Export Redis Streams

```python
import redis
import json
from typing import Optional

def export_stream_to_jsonl(redis_client: redis.Redis, stream_key: str,
                           output_file: str, start_id: str = "-",
                           end_id: str = "+", count: Optional[int] = None) -> int:
    """Export Redis Stream to JSON Lines format."""
    exported = 0

    with open(output_file, 'w') as f:
        # Use XRANGE for bounded reads
        cursor = start_id

        while True:
            if count:
                entries = redis_client.xrange(
                    stream_key, min=cursor, max=end_id, count=min(count - exported, 1000)
                )
            else:
                entries = redis_client.xrange(
                    stream_key, min=cursor, max=end_id, count=1000
                )

            if not entries:
                break

            for entry_id, data in entries:
                if isinstance(entry_id, bytes):
                    entry_id = entry_id.decode()

                decoded_data = {
                    k.decode() if isinstance(k, bytes) else k:
                    v.decode() if isinstance(v, bytes) else v
                    for k, v in data.items()
                }

                record = {
                    "id": entry_id,
                    "data": decoded_data
                }

                f.write(json.dumps(record) + '\n')
                exported += 1

                if count and exported >= count:
                    return exported

            # Move cursor past last entry
            cursor = f"({entry_id}"

    return exported

def export_stream_to_csv(redis_client: redis.Redis, stream_key: str,
                         output_file: str, fields: list = None) -> int:
    """Export Redis Stream to CSV with flattened fields."""
    import csv

    entries = redis_client.xrange(stream_key, "-", "+")

    if not entries:
        return 0

    # Determine fields from first entry if not specified
    if not fields:
        first_data = entries[0][1]
        fields = [
            k.decode() if isinstance(k, bytes) else k
            for k in first_data.keys()
        ]

    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['_id'] + fields)
        writer.writeheader()

        for entry_id, data in entries:
            if isinstance(entry_id, bytes):
                entry_id = entry_id.decode()

            row = {'_id': entry_id}
            for field in fields:
                value = data.get(field.encode() if isinstance(field, str) else field)
                if isinstance(value, bytes):
                    value = value.decode()
                row[field] = value

            writer.writerow(row)

    return len(entries)
```

### Export Lists and Sets

```python
import redis
import json
import csv

def export_list_to_json(redis_client: redis.Redis, key: str,
                        output_file: str) -> int:
    """Export a Redis list to JSON array."""
    items = redis_client.lrange(key, 0, -1)
    decoded = [
        item.decode() if isinstance(item, bytes) else item
        for item in items
    ]

    with open(output_file, 'w') as f:
        json.dump(decoded, f, indent=2)

    return len(decoded)

def export_set_to_json(redis_client: redis.Redis, key: str,
                       output_file: str) -> int:
    """Export a Redis set to JSON array."""
    members = redis_client.smembers(key)
    decoded = sorted([
        member.decode() if isinstance(member, bytes) else member
        for member in members
    ])

    with open(output_file, 'w') as f:
        json.dump(decoded, f, indent=2)

    return len(decoded)

def export_multiple_sets_to_csv(redis_client: redis.Redis, pattern: str,
                                output_file: str) -> int:
    """Export multiple sets to CSV with set name and members."""
    cursor = 0
    rows = []

    while True:
        cursor, keys = redis_client.scan(cursor=cursor, match=pattern, count=100)

        for key in keys:
            key_str = key.decode() if isinstance(key, bytes) else key
            key_type = redis_client.type(key_str)

            if isinstance(key_type, bytes):
                key_type = key_type.decode()

            if key_type != "set":
                continue

            members = redis_client.smembers(key_str)
            for member in members:
                if isinstance(member, bytes):
                    member = member.decode()
                rows.append({"set_name": key_str, "member": member})

        if cursor == 0:
            break

    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=["set_name", "member"])
        writer.writeheader()
        writer.writerows(rows)

    return len(rows)
```

## Command-Line Export Tool

Create a reusable CLI tool:

```python
#!/usr/bin/env python3
"""Redis data export CLI tool."""

import argparse
import redis
import json
import csv
import sys
from typing import Optional

def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description='Export Redis data to JSON/CSV')

    parser.add_argument('--host', default='localhost', help='Redis host')
    parser.add_argument('--port', type=int, default=6379, help='Redis port')
    parser.add_argument('--password', help='Redis password')
    parser.add_argument('--db', type=int, default=0, help='Redis database')

    parser.add_argument('--pattern', default='*', help='Key pattern to export')
    parser.add_argument('--output', '-o', required=True, help='Output file path')
    parser.add_argument('--format', choices=['json', 'jsonl', 'csv'],
                       default='json', help='Output format')
    parser.add_argument('--include-ttl', action='store_true',
                       help='Include TTL in export')
    parser.add_argument('--compress', action='store_true',
                       help='Compress output with gzip')

    return parser

def main():
    parser = create_parser()
    args = parser.parse_args()

    # Connect to Redis
    r = redis.Redis(
        host=args.host,
        port=args.port,
        password=args.password,
        db=args.db
    )

    try:
        r.ping()
    except redis.ConnectionError as e:
        print(f"Failed to connect to Redis: {e}", file=sys.stderr)
        sys.exit(1)

    # Export based on format
    output_file = args.output
    if args.compress and not output_file.endswith('.gz'):
        output_file += '.gz'

    from export_library import RedisExporter, ExportConfig, StreamingExporter

    config = ExportConfig(
        pattern=args.pattern,
        include_ttl=args.include_ttl
    )

    if args.format == 'json':
        exporter = RedisExporter(r)
        count = exporter.export_to_json(output_file, config)
    elif args.format == 'jsonl':
        exporter = StreamingExporter(r)
        count = exporter.export_to_jsonl_streaming(
            output_file, args.pattern, compress=args.compress
        )
    elif args.format == 'csv':
        exporter = RedisExporter(r)
        count = exporter.export_strings_to_csv(output_file, args.pattern)

    print(f"Exported {count} keys to {output_file}")

if __name__ == '__main__':
    main()
```

Usage:

```bash
# Export all keys to JSON
python redis_export.py --output data.json

# Export user keys to CSV
python redis_export.py --pattern 'user:*' --format csv --output users.csv

# Export with compression
python redis_export.py --pattern '*' --format jsonl --compress --output data.jsonl.gz

# Export from remote Redis
python redis_export.py --host redis.example.com --password secret --output backup.json
```

## Best Practices

1. **Use SCAN instead of KEYS** - SCAN is non-blocking and safe for production
2. **Stream large exports** - Avoid loading all data into memory
3. **Compress large files** - Use gzip for exports over 100MB
4. **Include metadata** - Export TTLs and types for complete restoration
5. **Validate exports** - Spot-check exported data for correctness
6. **Schedule during low traffic** - Export during off-peak hours
7. **Use appropriate formats** - JSON for complex data, CSV for tabular data

## Conclusion

Exporting Redis data to JSON and CSV formats enables backups, analytics, and migrations. Use streaming approaches for large datasets, and choose the appropriate format based on your downstream use case. Always test your export process with production-like data volumes before relying on it for critical operations.
