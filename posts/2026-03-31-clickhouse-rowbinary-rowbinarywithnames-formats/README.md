# How to Use RowBinary and RowBinaryWithNames Formats in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, RowBinary Format, RowBinaryWithNames Format, Binary Format, Performance

Description: Learn how to use RowBinary and RowBinaryWithNames formats in ClickHouse for compact, high-throughput binary data transfers between ClickHouse and custom clients.

---

RowBinary is a compact binary row-oriented format in ClickHouse. Unlike the Native format (which is columnar), RowBinary serializes data row by row. It is simple to implement in custom clients and offers much better performance than text formats like CSV or JSON.

## RowBinary vs Native

- **RowBinary**: Row-oriented binary, simpler to parse, good for custom clients.
- **Native**: Columnar binary, ClickHouse's internal format, maximum speed between ClickHouse instances.
- **RowBinary** is easier to implement from scratch in custom applications.

## Data Serialization

RowBinary serializes each column value in its binary representation:
- `UInt8/16/32/64`: little-endian unsigned integers
- `Int8/16/32/64`: little-endian signed integers
- `Float32/64`: IEEE 754 little-endian
- `String`: varint length followed by raw bytes
- `DateTime`: UInt32 Unix timestamp

## Exporting with RowBinary

```bash
clickhouse-client \
    --query "SELECT id, ts, event_type, value FROM events FORMAT RowBinary" \
    > events.rowbin
```

## Exporting with RowBinaryWithNames

Adds a header with column names before the data:

```bash
clickhouse-client \
    --query "SELECT id, ts, event_type, value FROM events FORMAT RowBinaryWithNames" \
    > events_named.rowbin
```

## RowBinaryWithNamesAndTypes

Adds both column names and type names as header rows:

```bash
clickhouse-client \
    --query "SELECT * FROM events FORMAT RowBinaryWithNamesAndTypes" \
    > events_typed.rowbin
```

This is useful when writing parsers that need type metadata without a separate schema.

## Importing RowBinary Data

```bash
clickhouse-client \
    --query "INSERT INTO events FORMAT RowBinary" \
    < events.rowbin
```

## Custom Client Implementation

Parsing RowBinary in Python:

```python
import struct
import io

def read_varint(buf):
    result = 0
    shift = 0
    while True:
        byte = buf.read(1)[0]
        result |= (byte & 0x7F) << shift
        if not (byte & 0x80):
            break
        shift += 7
    return result

def read_row(buf):
    # UInt64
    row_id = struct.unpack('<Q', buf.read(8))[0]
    # DateTime (UInt32)
    ts = struct.unpack('<I', buf.read(4))[0]
    # String
    length = read_varint(buf)
    event_type = buf.read(length).decode('utf-8')
    # Float64
    value = struct.unpack('<d', buf.read(8))[0]
    return row_id, ts, event_type, value

with open('events.rowbin', 'rb') as f:
    buf = io.BufferedReader(f)
    while True:
        try:
            print(read_row(buf))
        except:
            break
```

## Performance

RowBinary is faster than CSV and JSON for the same data:

```text
Format            Size (100M rows, 4 cols)   Parse Speed
RowBinary         ~3.2 GB                    Very fast
CSV               ~6.8 GB                    Medium
JSONEachRow       ~11 GB                     Slow
```

## Use Cases

RowBinary is ideal for:
- Custom high-performance ClickHouse clients in C, Rust, or Go
- Internal microservice data pipelines
- Compact binary archives with known schema
- Situations where Native format is not available (e.g., non-ClickHouse consumers)

## Summary

RowBinary and its variants provide a compact, fast binary format that is easier to implement in custom clients than ClickHouse's Native columnar format. Use RowBinaryWithNamesAndTypes when the consumer needs embedded schema information. For maximum throughput between ClickHouse instances, prefer Native format; for custom clients needing a simple row-based binary protocol, RowBinary is the right choice.
