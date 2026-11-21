# Use YDB Serial and BigSerial Without a Hot Primary-Key Prefix

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, SQL, Performance

Description: Keep YDB auto-increment identifiers from concentrating writes by separating value generation from primary-key routing and reviewing retry semantics.

An auto-increment identifier answers “what number should this row receive?” It does not answer “which part of a distributed table should receive the next write?” In a range-partitioned table, making that increasing number the first primary-key component sends new writes toward the same end of the key space.

Changing `Serial` to `BigSerial` increases the available number range. It does not change that routing pattern. To keep an auto-generated number without making it the leading routing decision, review the entire primary key and the application's lookup contract.

## Know what YDB generates

This article reviews the YDB **26.2.1.16** documentation source. `Serial` generates `Int32` values; `BigSerial` generates `Int64` values. A generated value comes from a sequence associated with the column. The column must participate in the primary key.

A sequence allocation is consumed even if the row is not ultimately written. Gaps are therefore normal. Explicitly supplying a serial value does not advance its sequence, so mixing arbitrary supplied values with generated values requires careful coordination. These rules come from the release's [serial type reference](https://github.com/ydb-platform/ydb/blob/26.2.1.16/ydb/docs/en/core/yql/reference/types/serial.md).

Do not treat the identifier as a gap-free invoice number, a count of committed rows, or proof of business-event ordering. Its useful role here is generating an identifier, with the exact business semantics defined elsewhere.

## Recognize the problematic layout

This small teaching schema is legal, but its key is unsuitable for a high-rate sequential insert stream:

```sql
CREATE TABLE serial_orders_demo (
    order_id BigSerial,
    request_key Utf8,
    description Utf8,
    PRIMARY KEY (order_id)
);
```

Do not run the DDL against an existing production table. It creates a fresh demonstration table and is shown to explain the layout, not as the recommended deployment.

As identifiers increase, the newest writes cluster at the high end. A composite key such as `(order_id, customer_id)` retains the same leading component and the same concern. Splitting historical ranges does not automatically spread the next sequential write stream across those historical ranges.

YDB's [row-table primary-key guide](https://github.com/ydb-platform/ydb/blob/26.2.1.16/ydb/docs/en/core/dev/primary-key/row-oriented.md) explains why key order and varied prefixes matter. This discussion concerns row-oriented tables; column-table hash partitioning has a different configuration model.

## Choose information available before insertion

A common suggestion is “hash the identifier and put the hash first.” That works when the application already knows the identifier. It is not directly usable when the database will generate the serial value only during insertion.

Instead, choose a stable input that exists before the write. For example, a request can carry an immutable request key created by the caller. Hash that key into a routing prefix, and keep the generated serial column later in the primary key.

```mermaid
flowchart LR
    Request[Immutable request key] --> Hash[Stable hash function]
    Hash --> Prefix[Routing prefix]
    Sequence[Database sequence] --> Serial[Generated order identifier]
    Prefix --> Key[Composite primary key]
    Serial --> Key
    Key --> Ranges[Different key ranges can receive writes]
```

This design spreads key prefixes when the input population varies. It does not guarantee a particular number of physical partitions or eliminate every bottleneck.

## Define the candidate schema and routing function

For an isolated test database supporting the documented serial behavior, create a separate candidate table:

```sql
CREATE TABLE routed_orders_demo (
    route Uint64 NOT NULL,
    order_id BigSerial,
    request_key Utf8,
    description Utf8,
    PRIMARY KEY (route, order_id)
);
```

The generated column remains part of the primary key, satisfying YDB's serial restriction. `route` leads the key and must be supplied by the application. The declaration follows YDB's [CREATE TABLE syntax](https://ydb.tech/docs/en/yql/reference/syntax/create_table/?version=v26.2).

The accompanying [routing_prefix.py](./routing_prefix.py) uses a deterministic SHA-256 digest:

```python
import hashlib


def routing_prefix(request_key: str) -> int:
    if not request_key:
        raise ValueError('An immutable request key is required')
    digest = hashlib.sha256(request_key.encode('utf-8')).digest()
    return int.from_bytes(digest[:8], byteorder='big', signed=False)
```

This returns an unsigned 64-bit prefix suitable for `Uint64`. Specify UTF-8, the first eight digest bytes, and big-endian conversion as part of the data contract. Other language implementations must reproduce those choices. Python documents the hash API in [hashlib](https://docs.python.org/3/library/hashlib.html).

Do not substitute Python's built-in `hash()`: this recipe needs a stable cross-process and cross-language representation. A truncated digest can collide, so it is a routing value, not a unique identifier. The complete primary key still includes `order_id`.

Bind the resulting prefix and request fields as parameters in your SDK write. Omit `order_id` to request generation. For illustration, the SQL shape is:

```sql
DECLARE $route AS Uint64;
DECLARE $request_key AS Utf8;
DECLARE $description AS Utf8;

INSERT INTO routed_orders_demo (route, request_key, description)
VALUES ($route, $request_key, $description);
```

The application supplies all three declared parameters. This is not a standalone query with values already bound. YDB describes declared parameter types in its [DECLARE reference](https://ydb.tech/docs/en/yql/reference/syntax/declare).

## Account for the lookup and retry tradeoffs

A point lookup now needs both the route and generated identifier. Retain the request key or route alongside the identifier in the application's reference. If a caller knows only `order_id`, the new schema does not magically support the old single-column lookup efficiently. An additional index may restore that access path, but it introduces its own write and storage costs.

The request key in this schema is not unique. Retrying an insertion while again omitting `order_id` can create a second row with another generated identifier, even though the routing prefix stays the same. Choosing `UPSERT` does not solve that when each attempt obtains a different primary key.

For retry-safe business creation, design deduplication explicitly. An application-generated stable primary key may be simpler than a serial column. If the serial requirement remains, define a transactionally sound request-record strategy and test uncertain commit outcomes. Do not infer exactly-once behavior from the routing function.

## Measure the workload, not just the hash

The local function test hashed 10,000 distinct synthetic request keys and grouped the results by their top four bits. All sixteen illustrative regions received values. These regions are a teaching model, not observed YDB shards, and the test does not demonstrate a throughput improvement.

Test realistic request frequencies too. A million writes sharing one routing input still share one prefix. Hashing a tenant identifier will not spread a single dominant tenant's stream; choose the input according to the access and traffic pattern you need.

In staging, compare write latency, per-partition load, and application lookup cost before and after the schema change. Review partitioning settings alongside the key. YDB's [overloaded-shard guide](https://ydb.tech/docs/en/troubleshooting/performance/schemas/overloaded-shards) describes investigating partition limits and monotonic keys.

Changing the primary-key design requires a migration plan with a new table, validated reads, coordinated writers, and a rollback strategy. The Python routing function was tested locally; the DDL, generated values, parameterized insert, and migration were source-reviewed but not executed against YDB.
