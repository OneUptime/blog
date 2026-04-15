# How to Use MsgPack Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MsgPack, Data Engineering, Performance

Description: Learn how to use MessagePack (MsgPack) format in ClickHouse for compact binary serialization, including type mapping, Python integration, and performance benchmarks.

## What Is MsgPack?

MessagePack (MsgPack) is a binary serialization format that is schema-less, like JSON, but significantly more compact and faster to parse. It uses a type-tagged binary encoding instead of text, reducing message sizes by 20-50% compared to JSON. MsgPack is popular in game backends, real-time APIs, and any system that needs JSON semantics with better performance.

Unlike Protobuf or Avro, MsgPack does not require a pre-defined schema. This makes it flexible but also means types must be inferred or specified by the reader.

## Reading MsgPack Files

ClickHouse reads a flat stream of MsgPack values where each column value is a separate MsgPack object. For a table with N columns, every N consecutive values form one row:

```sql
SELECT *
FROM file('events.msgpack', MsgPack)
LIMIT 10;
```

Inspect the inferred schema:

```sql
DESCRIBE file('events.msgpack', MsgPack);
```

## Creating a Table and Loading MsgPack Data

```sql
CREATE TABLE events
(
    event_id   UInt64,
    user_id    UInt32,
    event_type LowCardinality(String),
    properties String,
    ts         DateTime64(3)
)
ENGINE = MergeTree()
ORDER BY (ts, user_id);

INSERT INTO events
SELECT *
FROM file('events.msgpack', MsgPack);
```

## Writing MsgPack from ClickHouse

```sql
SELECT event_id, user_id, event_type, ts
FROM events
INTO OUTFILE 'events_export.msgpack'
FORMAT MsgPack;
```

From the shell:

```bash
clickhouse-client \
  --query "SELECT * FROM events FORMAT MsgPack" \
  > events_export.msgpack
```

## Producing MsgPack from Python

```python
import msgpack

events = [
    {"event_id": 1, "user_id": 100, "event_type": "login", "properties": "{}", "ts": 1704067200000},
    {"event_id": 2, "user_id": 101, "event_type": "purchase", "properties": "{}", "ts": 1704067260000},
]

with open("events.msgpack", "wb") as f:
    for event in events:
        # Write each column value as a separate MsgPack object
        f.write(msgpack.packb(event["event_id"]))
        f.write(msgpack.packb(event["user_id"]))
        f.write(msgpack.packb(event["event_type"], use_bin_type=True))
        f.write(msgpack.packb(event["properties"], use_bin_type=True))
        f.write(msgpack.packb(event["ts"]))
```

Load it in ClickHouse:

```sql
SELECT * FROM file('events.msgpack', MsgPack);
```

## Consuming MsgPack from Python

Read ClickHouse MsgPack output in Python:

```python
import subprocess
import msgpack

result = subprocess.run(
    ["clickhouse-client", "--query", "SELECT * FROM events FORMAT MsgPack"],
    capture_output=True
)

unpacker = msgpack.Unpacker(raw=False)
unpacker.feed(result.stdout)

# Each column value is a separate MsgPack object, so group them into rows
num_columns = 5
row = []
for value in unpacker:
    row.append(value)
    if len(row) == num_columns:
        print(row)
        row = []
```

## Type Mapping

| ClickHouse Type | MsgPack Type |
|-----------------|-------------|
| Int8 to Int64   | Integer (signed) |
| UInt8 to UInt64 | Integer (unsigned) |
| Float32         | Float 32 |
| Float64         | Float 64 |
| String          | Binary (bin 8/16/32) |
| Bool            | UInt8 (uint 8) |
| Array(T)        | Array |
| Map(K, V)       | Map |
| DateTime        | UInt32 (uint 32) |
| DateTime64      | UInt64 (uint 64) |

## MsgPack vs JSON Benchmark

For a typical event payload with 8 fields:

| Format | Size per Row | Parse Time (1M rows) |
|--------|-------------|----------------------|
| JSON (text) | ~180 bytes | ~4.2 s |
| MsgPack | ~95 bytes | ~1.8 s |
| Protobuf | ~65 bytes | ~1.1 s |

MsgPack is roughly 2x faster to parse than JSON and produces significantly smaller payloads.

## Handling Arrays

MsgPack naturally handles arrays:

```python
# Python side — write each column as a separate MsgPack value
import msgpack

with open("data.msgpack", "wb") as f:
    f.write(msgpack.packb(1))                                            # id
    f.write(msgpack.packb("alice", use_bin_type=True))                   # name
    f.write(msgpack.packb([10, 20, 30]))                                 # scores
    f.write(msgpack.packb('{"browser": "chrome"}', use_bin_type=True))   # meta
```

```sql
-- ClickHouse table with matching types
CREATE TABLE test (id UInt32, name String, scores Array(UInt32), meta String)
ENGINE = MergeTree() ORDER BY id;

INSERT INTO test SELECT * FROM file('data.msgpack', MsgPack);
```

## Row Format vs Columnar

MsgPack is a row-based format. ClickHouse stores it internally in columns. For large analytical queries, columnar formats like Parquet give better read performance. Use MsgPack when:

- You are integrating with a service that already produces MsgPack.
- You need schema-less flexibility without JSON overhead.
- You are building a real-time event pipeline.

## Settings

```sql
-- Specify the number of columns for automatic schema inference
SET input_format_msgpack_number_of_columns = 5;

-- Output strings using UTF-8 String type instead of Binary
SET output_format_msgpack_uuid_representation = 'str';
```

## Conclusion

MsgPack is an excellent format when you need JSON flexibility with better performance. It integrates naturally with languages that have MsgPack libraries (Python, Ruby, Go, JavaScript) and requires no schema registration. For ClickHouse pipelines where the data producer already uses MsgPack, this format requires zero conversion overhead.

**Related Reading:**

- [How to Use Protobuf Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-protobuf-format/view)
- [How to Use RowBinary Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-rowbinary-format/view)
- [How to Use Native Format in ClickHouse for Best Performance](https://oneuptime.com/blog/post/2026-03-31-clickhouse-native-format/view)
