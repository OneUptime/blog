# How to Use Avro Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Avro, Kafka, Data Engineering

Description: Learn how to read and write Avro files in ClickHouse, including schema registry integration, Kafka ingestion, and type mapping for robust data pipelines.

## What Is Avro?

Apache Avro is a row-based binary serialization format defined by a JSON schema. Unlike Parquet or ORC, Avro embeds its schema in every file, making it self-describing. Avro is the most common format for Kafka messages and is deeply integrated with the Confluent Schema Registry.

ClickHouse supports two Avro variants:
- `Avro` - standard Avro file format (object container file)
- `AvroConfluent` - Avro with a Confluent-compatible schema ID prefix (used for Kafka topics)

## Reading an Avro File

```sql
SELECT *
FROM file('orders.avro', Avro)
LIMIT 10;
```

Inspect the schema embedded in the file:

```sql
DESCRIBE file('orders.avro', Avro);
```

## Loading Avro Data into a Table

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
FROM file('orders.avro', Avro);
```

## Writing Data to Avro

Export a query result to an Avro file:

```sql
SELECT order_id, customer_id, total, created_at
FROM orders
WHERE status = 'completed'
INTO OUTFILE 'completed_orders.avro'
FORMAT Avro;
```

From the shell:

```bash
clickhouse-client \
  --query "SELECT * FROM orders FORMAT Avro" \
  > orders_export.avro
```

## AvroConfluent for Kafka Integration

When consuming Avro messages from a Kafka topic that uses Confluent Schema Registry, use `AvroConfluent` and specify the registry URL:

```sql
CREATE TABLE kafka_orders
(
    order_id    UInt64,
    customer_id UInt32,
    total       Float64
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list  = 'orders',
    kafka_group_name  = 'clickhouse_consumer',
    kafka_format      = 'AvroConfluent';
```

Set the schema registry URL in your ClickHouse configuration or as a session setting:

```sql
SET format_avro_schema_registry_url = 'http://schema-registry:8081';
```

## Writing Avro for Kafka Producers

ClickHouse can also produce Avro messages for Kafka. Create a Kafka engine table for the producer topic and `INSERT` into it:

```sql
CREATE TABLE kafka_order_events
(
    order_id    UInt64,
    customer_id UInt32,
    total       Float64
)
ENGINE = Kafka
SETTINGS
    kafka_broker_list = 'kafka:9092',
    kafka_topic_list  = 'order_events',
    kafka_group_name  = 'clickhouse_producer',
    kafka_format      = 'AvroConfluent';

INSERT INTO kafka_order_events
SELECT order_id, customer_id, total
FROM orders
WHERE created_at >= now() - INTERVAL 1 HOUR;
```

## Type Mapping

| ClickHouse Type | Avro Type |
|-----------------|-----------|
| Int8 / UInt8    | int |
| Int32 / UInt32  | int |
| Int64 / UInt64  | long |
| Float32         | float |
| Float64         | double |
| Boolean         | boolean |
| String          | string or bytes |
| UUID            | string (logicalType: uuid) |
| Date / Date32   | int (logicalType: date) |
| DateTime64(3)   | long (logicalType: timestamp-millis) |
| DateTime64(6)   | long (logicalType: timestamp-micros) |
| Array(T)        | array |
| Map(String, V)  | map |
| Nullable(T)     | union [null, T] |

## Schema Evolution

Avro supports schema evolution - readers with a newer schema can read files written with an older schema, provided backward-compatible changes are made (adding fields with defaults, removing fields).

When your ClickHouse table has columns that are not present in the Avro file, enable `input_format_avro_allow_missing_fields` so the missing fields are filled with their default values instead of raising an error:

```sql
SET input_format_avro_allow_missing_fields = 1;

INSERT INTO orders
SELECT order_id, customer_id, total, created_at
FROM file('orders_v2.avro', Avro);
```

## Generating an Avro Schema from ClickHouse

ClickHouse derives the Avro writer schema automatically from the column names and types of the source query when you write Avro data. To inspect the schema that will be produced, write a small sample to a file and read it back with a tool like `avro-tools` (or Python's `fastavro`):

```bash
clickhouse-client \
  --query "SELECT order_id, customer_id, total FROM orders LIMIT 0 FORMAT Avro" \
  > schema_sample.avro

avro-tools getschema schema_sample.avro
```

Producers on the Kafka side can then register a matching schema with the Confluent Schema Registry.

## Performance Tips

1. Avro is row-based, so it is better suited for streaming (Kafka) than for bulk analytics.
2. For OLAP queries, prefer Parquet or ORC.
3. When reading large Avro files for bulk import, use `SELECT ... FROM file(...) FORMAT Avro` to let ClickHouse batch the inserts.
4. Compress Avro files with Snappy or Deflate for Kafka; the codec is stored in the file header and ClickHouse handles decompression transparently.

## Conclusion

Avro is the best choice for event-driven architectures where Kafka is the data backbone. Its self-describing schema and first-class Schema Registry support make it reliable for long-running pipelines where the message schema evolves over time. For bulk analytics, combine Avro ingestion with a ClickHouse MergeTree table to get both streaming reliability and analytical speed.

**Related Reading:**

- [How to Use JSONEachRow Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-jsoneachrow-format/view)
- [How to Handle Schema Evolution When Loading Parquet in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-parquet-schema-evolution/view)
- [How to Import Data from S3 in Various Formats in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-import-from-s3/view)
