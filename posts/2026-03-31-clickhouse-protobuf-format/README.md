# How to Use Protobuf Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Protobuf, Kafka, Data Engineering

Description: Learn how to use Protocol Buffers (Protobuf) format in ClickHouse, including schema registration, field mapping, Kafka integration, and nested message handling.

## What Is Protobuf?

Protocol Buffers (Protobuf) is Google's binary serialization format. It is faster and smaller than JSON and Avro for most workloads, and it has strong support for schema evolution through field numbering. Protobuf is commonly used in gRPC services, high-throughput Kafka topics, and microservice communication.

ClickHouse supports:
- `Protobuf` - standard length-prefixed Protobuf messages (multiple messages per stream)
- `ProtobufSingle` - a single Protobuf message without length prefix
- `ProtobufList` - a Protobuf message containing a repeated field of messages

## Defining a Schema

You must provide a `.proto` schema file. ClickHouse reads it to understand field names and types.

Create `order.proto`:

```text
syntax = "proto3";

message Order {
    uint64 order_id = 1;
    uint32 customer_id = 2;
    string status = 3;
    double total = 4;
    int64 created_at = 5;
}
```

Place it in the ClickHouse format schema directory (default: `/var/lib/clickhouse/format_schemas/`):

```bash
sudo cp order.proto /var/lib/clickhouse/format_schemas/
```

## Reading Protobuf Data

With the schema in place, read a binary Protobuf file:

```sql
SELECT *
FROM file('orders.bin', Protobuf)
SETTINGS format_schema = 'order:Order'
LIMIT 10;
```

The `format_schema` value is `<filename_without_extension>:<message_name>`.

## Creating a Table and Loading Protobuf Data

```sql
CREATE TABLE orders
(
    order_id    UInt64,
    customer_id UInt32,
    status      LowCardinality(String),
    total       Float64,
    created_at  DateTime
)
ENGINE = MergeTree()
ORDER BY (created_at, customer_id);

INSERT INTO orders
SELECT *
FROM file('orders.bin', Protobuf)
SETTINGS format_schema = 'order:Order';
```

## Writing Data to Protobuf

```sql
SELECT order_id, customer_id, status, total, created_at
FROM orders
INTO OUTFILE 'orders_export.bin'
FORMAT Protobuf
SETTINGS format_schema = 'order:Order';
```

## ProtobufSingle for Single-Message Files

When your file contains exactly one Protobuf message (no length prefix):

```sql
SELECT *
FROM file('single_order.bin', ProtobufSingle)
SETTINGS format_schema = 'order:Order';
```

## Kafka Integration with Protobuf

Configure a Kafka table engine to consume Protobuf messages:

```sql
CREATE TABLE kafka_orders
(
    order_id    UInt64,
    customer_id UInt32,
    status      String,
    total       Float64,
    created_at  DateTime
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list        = 'kafka:9092',
    kafka_topic_list         = 'orders',
    kafka_group_name         = 'clickhouse_consumer',
    kafka_format             = 'Protobuf',
    kafka_schema             = 'order:Order';
```

A materialized view moves data to a storage table automatically:

```sql
CREATE MATERIALIZED VIEW kafka_orders_mv TO orders AS
SELECT * FROM kafka_orders;
```

## Field Mapping

ClickHouse maps Protobuf fields to table columns by name (case-insensitive, and `_` and `.` are treated as equal). If names differ, rename the fields in the schema to match.

Column-to-field type mapping:

| ClickHouse Type | Protobuf Type |
|-----------------|---------------|
| Int32 / UInt32  | int32 / uint32 |
| Int64 / UInt64  | int64 / uint64 |
| Float32         | float |
| Float64         | double |
| String          | string or bytes |
| Bool            | bool |
| Enum8           | enum |
| DateTime        | int64 (Unix timestamp) |
| Array(T)        | repeated T |
| Nullable(T)     | optional T |

## Nested Messages

Protobuf supports nested messages. Define them in the schema:

```text
syntax = "proto3";

message Address {
    string street = 1;
    string city = 2;
    string country = 3;
}

message Customer {
    uint64 customer_id = 1;
    string name = 2;
    Address address = 3;
}
```

Map the nested message to a ClickHouse `Tuple` or `String`:

```sql
CREATE TABLE customers
(
    customer_id UInt64,
    name        String,
    address     Tuple(street String, city String, country String)
)
ENGINE = MergeTree()
ORDER BY customer_id;
```

## Skipping Fields with Unsupported Types

When using schema inference and the Protobuf schema contains fields with types that ClickHouse cannot map, enable this setting to skip them instead of throwing an error:

```sql
SET input_format_protobuf_skip_fields_with_unsupported_types_in_schema_inference = 1;
```

Note: Protobuf fields that exist in the message but have no matching column in the table are automatically skipped during reads without any special setting.

## Schema Evolution

Protobuf's field numbering allows backward-compatible evolution:
- Adding new fields (with new numbers) is backward compatible.
- Removing fields leaves gaps in numbering - old data with those fields still parses.
- Changing field types is not backward compatible.

ClickHouse respects these rules when reading older Protobuf files with a newer schema.

## Performance Tips

1. Protobuf is significantly more compact than JSON - expect 3-5x smaller messages for typical event data.
2. For Kafka, Protobuf outperforms Avro slightly in encode/decode speed due to simpler encoding.
3. Keep schemas in the ClickHouse format schema directory and use versioned filenames for schema evolution.
4. Use `ProtobufSingle` for one-shot API calls where you send a single message per request.

## Conclusion

Protobuf is an excellent choice for high-throughput data pipelines where message size and parsing speed matter. Its schema evolution guarantees make it safe for long-running systems. When combined with ClickHouse's Kafka engine, you get a reliable, typed streaming ingestion pipeline.

**Related Reading:**

- [How to Use Avro Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-avro-format/view)
- [How to Use MsgPack Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-msgpack-format/view)
- [How to Use RowBinary Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-rowbinary-format/view)
