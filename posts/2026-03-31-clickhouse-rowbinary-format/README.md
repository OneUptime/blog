# How to Use RowBinary Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Binary, Data Engineering, Performance

Description: Learn how to use ClickHouse's RowBinary format for fast binary data exchange, including type encoding, reading from applications, and comparison with Native format.

## What Is RowBinary?

`RowBinary` is a compact binary format where rows are stored sequentially, each value encoded in its native binary representation without delimiters. There is no schema metadata embedded in the stream - both reader and writer must agree on the column types in advance.

RowBinary is faster to produce and consume than JSON or CSV because there is no text parsing, escaping, or schema embedding. It is the right choice for:
- Direct binary communication between a custom application and ClickHouse
- Bulk loading from systems that can emit raw binary data
- High-speed data export when the downstream consumer handles binary data

## RowBinary Variants

| Format | Description |
|--------|-------------|
| `RowBinary` | Raw binary rows, no schema |
| `RowBinaryWithNames` | Column names prepended as a header |
| `RowBinaryWithNamesAndTypes` | Column names and types as a header |
| `RowBinaryWithDefaults` | Includes default value flags per field |

## Reading RowBinary Data

Since RowBinary has no embedded schema, you must specify the table or use a format with names:

```sql
-- Reading with RowBinaryWithNamesAndTypes (self-describing)
SELECT *
FROM file('metrics.bin', RowBinaryWithNamesAndTypes)
LIMIT 10;

-- Reading raw RowBinary against a known table
INSERT INTO metrics
SELECT *
FROM file('metrics_raw.bin', RowBinary);
```

## Writing RowBinary Data

```sql
SELECT metric_id, host, value, collected_at
FROM metrics
INTO OUTFILE 'metrics_export.bin'
FORMAT RowBinary;
```

With schema header:

```sql
SELECT metric_id, host, value, collected_at
FROM metrics
INTO OUTFILE 'metrics_with_schema.bin'
FORMAT RowBinaryWithNamesAndTypes;
```

## Type Encoding

Each ClickHouse type is encoded as follows in RowBinary:

| ClickHouse Type | Encoding |
|-----------------|---------|
| UInt8 | 1 byte |
| UInt16 | 2 bytes, little-endian |
| UInt32 | 4 bytes, little-endian |
| UInt64 | 8 bytes, little-endian |
| Int8 to Int64 | Same as UInt, signed |
| Float32 | 4 bytes IEEE 754 |
| Float64 | 8 bytes IEEE 754 |
| String | varint length + UTF-8 bytes |
| FixedString(N) | N bytes, zero-padded |
| Date | 2 bytes (days since 1970-01-01) |
| DateTime | 4 bytes (Unix timestamp) |
| DateTime64(p) | 8 bytes (scaled Unix time) |
| Nullable(T) | 1 byte flag (0=not null, 1=null) + T encoding |
| Array(T) | varint count + T elements |

## Writing RowBinary from Python

```python
import struct

def write_string(buf, s):
    encoded = s.encode('utf-8')
    # varint encoding for length
    n = len(encoded)
    while True:
        byte = n & 0x7F
        n >>= 7
        if n:
            buf.append(byte | 0x80)
        else:
            buf.append(byte)
            break
    buf.extend(encoded)

rows = [
    (1, "server-01", 0.95, 1704067200),
    (2, "server-02", 0.73, 1704067260),
]

with open("metrics_raw.bin", "wb") as f:
    for metric_id, host, value, ts in rows:
        buf = bytearray()
        buf.extend(struct.pack('<Q', metric_id))   # UInt64
        write_string(buf, host)                    # String
        buf.extend(struct.pack('<d', value))        # Float64
        buf.extend(struct.pack('<I', ts))           # UInt32 (DateTime)
        f.write(bytes(buf))
```

Load it:

```bash
clickhouse-client \
  --query "INSERT INTO metrics FORMAT RowBinary" \
  < metrics_raw.bin
```

## Reading RowBinary in Python

```python
import struct
import subprocess

def read_varint(data, offset):
    result = 0
    shift = 0
    while True:
        byte = data[offset]
        offset += 1
        result |= (byte & 0x7F) << shift
        if not (byte & 0x80):
            break
        shift += 7
    return result, offset

def read_string(data, offset):
    length, offset = read_varint(data, offset)
    s = data[offset:offset+length].decode('utf-8')
    return s, offset + length

result = subprocess.run(
    ["clickhouse-client", "--query", "SELECT metric_id, host, value FROM metrics FORMAT RowBinary"],
    capture_output=True
)

data = result.stdout
offset = 0
rows = []
while offset < len(data):
    metric_id = struct.unpack_from('<Q', data, offset)[0]; offset += 8
    host, offset = read_string(data, offset)
    value = struct.unpack_from('<d', data, offset)[0]; offset += 8
    rows.append((metric_id, host, value))

print(rows[:5])
```

## RowBinary vs Native Format

| Feature | RowBinary | Native |
|---------|-----------|--------|
| Layout | Row-oriented | Column-oriented |
| Schema embedded | No (RowBinaryWithNames: yes) | Yes |
| Best for | Custom app integration | ClickHouse-to-ClickHouse |
| Compression | None (add externally) | Block-level |
| Seek support | No | No |
| Parse overhead | Very low | Lowest |

For transfers between two ClickHouse servers, `Native` is faster because it matches the internal storage layout. For custom application integration, `RowBinary` is simpler to implement.

## RowBinaryWithDefaults

This variant allows sending rows with missing fields, using column default values for omitted ones:

```sql
-- Insert only required columns, let others use defaults
INSERT INTO events (event_id, ts) FORMAT RowBinaryWithDefaults
```

Each field is prefixed with a 1-byte flag: `0` means "value follows", `1` means "use default".

## Performance Tips

1. Use `RowBinaryWithNamesAndTypes` for any automated pipeline to catch schema mismatches early.
2. Compress the stream externally with LZ4 or Zstd for network transfers.
3. For maximum throughput, send large batches (100K+ rows per request) rather than many small requests.
4. If your application is in Go, Python, or Java, use the official ClickHouse client library which handles RowBinary encoding automatically.

## Conclusion

RowBinary is the right format when you need to build a custom high-speed data producer or consumer for ClickHouse. Its simplicity and predictable encoding make it easy to implement in any language, and its lack of parsing overhead makes it faster than any text format.

**Related Reading:**

- [How to Use Native Format in ClickHouse for Best Performance](https://oneuptime.com/blog/post/2026-03-31-clickhouse-native-format/view)
- [How to Use MsgPack Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-msgpack-format/view)
- [How to Export ClickHouse Data to Different File Formats](https://oneuptime.com/blog/post/2026-03-31-clickhouse-export-file-formats/view)
