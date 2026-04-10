# How Redis RDB File Format Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, RDB, Internal, Backup

Description: Explore the binary structure of Redis RDB snapshot files, how data types are encoded, and how to inspect or validate RDB files manually.

---

RDB (Redis Database) files are binary snapshots of the entire Redis dataset at a point in time. They are compact, fast to load, and the default persistence mechanism for Redis. Understanding the file format helps with debugging, backup validation, and custom tooling.

## High-Level RDB Structure

```text
+--------+----------+---------+---------+-----+-----+
| REDIS  | VERSION  | DB DATA | DB DATA | ... | EOF |
| (magic)| (4 bytes)|         |         |     |     |
+--------+----------+---------+---------+-----+-----+
```

Followed by an 8-byte CRC64 checksum.

## Magic and Version

The file always starts with:

```text
Bytes 0-4:  "REDIS"  (5 ASCII bytes, no null)
Bytes 5-8:  version number as ASCII, e.g. "0011" for RDB v11
```

```bash
hexdump -C /var/lib/redis/dump.rdb | head -2
# 00000000  52 45 44 49 53 30 30 31  31 fa 09 72 65 64 69 73  |REDIS0011..redis|
```

## Database Selector

Each database section opens with:

```text
0xFE  <db-number>   -- select database opcode
0xFB  <key-count> <expire-count>  -- resize DB hint (RDB v7+)
```

## Key-Value Encoding

Each key-value pair in the file:

```text
[optional expire] [type byte] [key] [value]
```

Expire time (if set):
```text
0xFC  <8-byte millisecond timestamp>   -- expire in ms
0xFD  <4-byte second timestamp>        -- expire in seconds
```

Type byte values:
```text
0  = String
1  = List (linked list)
14 = List (quicklist)
2  = Set
11 = Set (intset)
3  = Sorted Set
4  = Hash
```

## Length Encoding

Integers and lengths use a compact variable-length encoding:

```text
00xxxxxx  - 6-bit length (0-63)
01xxxxxx  - 14-bit length (0-16383)
10000000  - 32-bit length follows
10000001  - 64-bit length follows
11xxxxxx  - special: encodes an integer directly
```

This encoding keeps small integers as a single byte.

## Inspecting an RDB File

Use the `redis-check-rdb` tool bundled with Redis:

```bash
redis-check-rdb /var/lib/redis/dump.rdb
# [offset 0] Checking RDB file dump.rdb
# [offset 26] AUX FIELD redis-ver = '7.2.0'
# [offset 40] AUX FIELD redis-bits = '64'
# [offset 52] Selecting DB ID 0
# [offset 91] 5000 keys read
# [offset 103] EOF marker is right
# [offset 111] CRC64 checksum is valid
```

## Parsing with Python

```python
with open("dump.rdb", "rb") as f:
    magic = f.read(5)
    version = f.read(4)
    print(f"Magic: {magic}, Version: {version}")
    # Magic: b'REDIS', Version: b'0011'
```

For full parsing, use the `rdbtools` library:

```bash
pip install rdbtools
rdb --command json dump.rdb | python3 -m json.tool | head -20
```

## Loading Performance

RDB loads are purely sequential reads with no random IO, making them faster to restore than replaying an AOF. A 10GB RDB file typically loads in 30-60 seconds on modern SSDs.

## Summary

Redis RDB files are binary snapshots with a fixed header, per-database sections, and variable-length encoded key-value pairs. Each value type has its own binary layout. The `redis-check-rdb` tool validates integrity, and tools like `rdbtools` can extract data without starting a Redis instance. Understanding the format is useful for backup validation and debugging persistence issues.
