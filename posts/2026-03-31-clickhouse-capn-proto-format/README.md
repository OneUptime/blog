# How to Use Cap'n Proto Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cap'n Proto Format, Binary Serialization, Schema, Performance

Description: Learn how to use the Cap'n Proto binary format in ClickHouse for efficient schema-based data exchange with applications using Cap'n Proto serialization.

---

Cap'n Proto is a high-performance binary serialization format known for its "zero-copy" reads - data can be read directly from memory without deserialization. ClickHouse supports the CapnProto format for both import and export, enabling integration with applications that already use Cap'n Proto for inter-service communication.

## What is Cap'n Proto

Cap'n Proto was designed by one of the original Protocol Buffers authors. Its key characteristic is that the serialized format is identical to the in-memory representation, so reading a Cap'n Proto message requires zero additional parsing - you just interpret the bytes directly.

## Schema Requirement

Unlike CSV or JSON, Cap'n Proto requires a schema file. You must define the schema and provide it to ClickHouse. Field names must match the ClickHouse column names exactly:

```text
# events.capnp
@0xb5d4f3b2a1e8c7d6;

struct Event {
  event_id @0 :UInt64;
  event_type @1 :Text;
  ts @2 :UInt32;
  user_id @3 :UInt32;
  value @4 :Float64;
}
```

## Configuring ClickHouse to Use the Schema

Place your schema file in `format_schema_path` (default: `/var/lib/clickhouse/format_schemas/`):

```bash
cp events.capnp /var/lib/clickhouse/format_schemas/
```

## Exporting Data as Cap'n Proto

Reference the schema with the message type:

```bash
clickhouse-client \
    --query "SELECT event_id, event_type, toUnixTimestamp(ts) AS ts, user_id, value FROM events FORMAT CapnProto SETTINGS format_schema='events:Event'" \
    > events.capnp.bin
```

## Importing Cap'n Proto Data

```bash
clickhouse-client \
    --query "INSERT INTO events FORMAT CapnProto SETTINGS format_schema='events:Event'" \
    < events_upstream.capnp.bin
```

## Type Mapping

Cap'n Proto types map to ClickHouse types:

```text
CapnProto UInt8/16/32/64  -> ClickHouse UInt8/16/32/64
CapnProto Int8/16/32/64   -> ClickHouse Int8/16/32/64
CapnProto Float32/64      -> ClickHouse Float32/Float64
CapnProto Text            -> ClickHouse String
CapnProto Data            -> ClickHouse String
CapnProto Bool            -> ClickHouse UInt8
CapnProto List            -> ClickHouse Array
```

## Using with HTTP Interface

```bash
curl "http://localhost:8123/?query=SELECT+*+FROM+events+FORMAT+CapnProto&format_schema=events:Event" \
    > events.capnp.bin
```

## When to Use Cap'n Proto

Use Cap'n Proto format when:
- Your application already uses Cap'n Proto for serialization
- You need maximum read performance at the consumer (zero-copy reads)
- You have a defined, stable schema

Avoid Cap'n Proto when:
- You need human-readable output
- The consumer does not support Cap'n Proto
- Schema management overhead is a concern

## Comparing Binary Formats

```text
Format        Schema Required   Zero-Copy   Cross-Language
CapnProto     Yes               Yes         Yes
Protobuf      Yes               No          Yes
Avro          Embedded          No          Yes
Arrow         Embedded          Yes         Yes
RowBinary     No                No          Limited
```

## Summary

Cap'n Proto format in ClickHouse enables efficient, schema-based binary data exchange for applications already using this serialization library. Its zero-copy read characteristic makes it exceptionally fast for downstream consumers. The main overhead is schema management - you must maintain a `.capnp` schema file accessible to the ClickHouse server. For new integrations without existing Cap'n Proto usage, Arrow or Avro are generally more ecosystem-friendly choices.
