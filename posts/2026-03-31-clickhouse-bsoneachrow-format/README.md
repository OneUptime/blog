# How to Use BSONEachRow Format in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, BSON, MongoDB, Data Engineering

Description: Learn how to use ClickHouse's BSONEachRow format to migrate data from MongoDB, read BSON exports, and map BSON types to ClickHouse column types.

## What Is BSONEachRow?

BSON (Binary JSON) is the binary serialization format used by MongoDB. It extends JSON with additional data types like ObjectId, Date, Binary, Decimal128, and more. ClickHouse's `BSONEachRow` format reads and writes a stream of BSON documents - one document per row - making it the natural format for MongoDB data migration.

`BSONEachRow` is analogous to `JSONEachRow` but uses the BSON wire format instead of text JSON.

## When to Use BSONEachRow

- **MongoDB migration**: `mongoexport` can dump collections as BSON, which ClickHouse reads directly.
- **Application integration**: Any application using a MongoDB driver can produce BSON for ClickHouse.
- **Preserving types**: BSON preserves type information (dates, binary, integers) that JSON loses.

## Exporting from MongoDB

Use `mongodump` to create a BSON dump:

```bash
mongodump \
  --uri="mongodb://localhost:27017" \
  --db=myapp \
  --collection=orders \
  --out=/tmp/mongo_dump
```

This creates `/tmp/mongo_dump/myapp/orders.bson`. The file is already a stream of concatenated BSON documents — exactly the format `BSONEachRow` expects — so it can be fed to ClickHouse directly without conversion.

## Reading BSON in ClickHouse

```sql
SELECT *
FROM file('/tmp/mongo_dump/myapp/orders.bson', BSONEachRow)
LIMIT 10;
```

Inspect the inferred schema:

```sql
DESCRIBE file('/tmp/mongo_dump/myapp/orders.bson', BSONEachRow);
```

## Creating a Table and Loading BSON Data

```sql
CREATE TABLE orders
(
    order_id    String,     -- MongoDB ObjectId stored as string
    customer_id String,
    status      LowCardinality(String),
    total       Float64,
    items       String,     -- Nested array stored as JSON string
    created_at  DateTime64(3)
)
ENGINE = MergeTree()
ORDER BY (created_at, customer_id);

INSERT INTO orders
SELECT *
FROM file('/tmp/mongo_dump/myapp/orders.bson', BSONEachRow);
```

## BSON to ClickHouse Type Mapping

| BSON Type | ClickHouse Type |
|-----------|-----------------|
| Double | Float64 |
| String | String |
| Document (embedded) | String (JSON) or Map |
| Array | Array(T) or String |
| Binary | String / FixedString / IPv6 |
| ObjectId | FixedString(12) or String |
| Boolean | Bool |
| Date (UTC datetime) | DateTime64 |
| Null | Nullable(T) |
| Int32 | Int32 / UInt32 / Decimal32 / IPv4 / Enum8 / Enum16 |
| Int64 | Int64 / UInt64 / Decimal64 / DateTime64 |

Big integers and decimals such as `Int128`/`UInt128`/`Int256`/`UInt256`/`Decimal128`/`Decimal256` can be parsed from BSON Binary values rather than from a dedicated BSON Decimal128 (`\x13`) type.

## Handling ObjectId

MongoDB ObjectIds are 12-byte binary values. ClickHouse reads them as the raw 12 bytes, so map them to `FixedString(12)` (or `String`). Use `hex()` at query time when you need the familiar 24-character hex representation:

```sql
CREATE TABLE mongo_users
(
    _id    FixedString(12), -- 12 raw bytes
    name   String,
    email  String,
    age    UInt8
)
ENGINE = MergeTree()
ORDER BY _id;

SELECT hex(_id) AS object_id_hex, name FROM mongo_users LIMIT 5;
```

## Writing BSON from ClickHouse

Export ClickHouse data as BSON for consumption by MongoDB or a BSON-capable application:

```sql
SELECT order_id, customer_id, total, created_at
FROM orders
INTO OUTFILE 'orders_export.bson'
FORMAT BSONEachRow;
```

From the shell:

```bash
clickhouse-client \
  --query "SELECT * FROM orders FORMAT BSONEachRow" \
  > orders_export.bson
```

## Handling Nested Documents

BSON documents can contain nested documents (subdocuments). ClickHouse can map them as:

1. **String** - stores the nested document as a JSON string
2. **Map(String, String)** - flattens one level of nesting
3. **Tuple** - maps to a fixed-schema nested structure

If schema inference encounters BSON types ClickHouse cannot map, allow it to skip those columns instead of failing:

```sql
SET input_format_bson_skip_fields_with_unsupported_types_in_schema_inference = 1;
```

When you have already declared a nested column as `String` in your `CREATE TABLE`, you can extract fields from it at query time using JSON functions (assuming the document was inserted as JSON):

```sql
SELECT
    order_id,
    JSONExtractString(shipping_address, 'city') AS city,
    JSONExtractString(shipping_address, 'country') AS country
FROM orders;
```

## Practical Migration Workflow

A complete MongoDB to ClickHouse migration:

```bash
# Step 1: Dump the MongoDB collection
mongodump --uri="mongodb://localhost:27017" \
  --db=ecommerce --collection=orders \
  --out=/tmp/dump

# Step 2: Load the resulting .bson stream into ClickHouse
clickhouse-client \
  --query "INSERT INTO orders FORMAT BSONEachRow" \
  < /tmp/dump/ecommerce/orders.bson
```

## Performance Tips

1. BSON is a binary format, so it parses faster than JSON for the same data.
2. For large MongoDB collections, split the BSON dump into chunks and load in parallel.
3. Use `mongodump` with `--numParallelCollections` to speed up the initial export.
4. After migration, convert your ClickHouse table to use proper types (not `String` for everything) for better query performance.

## Conclusion

`BSONEachRow` makes migrating from MongoDB to ClickHouse straightforward. You can take a standard MongoDB dump and load it directly without a conversion step. Once the data is in ClickHouse, you gain full SQL analytical capabilities with columnar storage performance.

**Related Reading:**

- [How to Use JSONEachRow Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-jsoneachrow-format/view)
- [How to Use Protobuf Format in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-protobuf-format/view)
- [How to Import Data from S3 in Various Formats in ClickHouse](https://oneuptime.com/blog/post/2026-03-31-clickhouse-import-from-s3/view)
