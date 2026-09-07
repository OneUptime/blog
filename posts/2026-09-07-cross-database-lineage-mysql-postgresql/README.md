# How to Build MySQL-to-PostgreSQL Column Lineage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Lineage, MySQL, PostgreSQL, ETL, Change Data Capture

Description: Preserve field mappings, database identities, schema evidence, and run checkpoints for pipelines that copy MySQL data into PostgreSQL.

---

Cross-database lineage fails most often at the handoff. A MySQL extractor knows `sales.orders.total`, a loader knows `staging.orders.total_amount`, and the lineage catalog sees two unrelated table names. The bridge must be emitted by the pipeline component that understands both sides of the copy.

Use a canonical identity for every physical dataset and a versioned mapping contract for every field. Do not rely on matching names across engines.

## Keep namespaces engine-specific

OpenLineage's naming convention distinguishes MySQL and PostgreSQL datasets:

```text
MySQL namespace:     mysql://mysql-prod.example:3306
MySQL name:          sales.orders

PostgreSQL namespace: postgres://pg-warehouse.example:5432
PostgreSQL name:      analytics.public.orders
```

The PostgreSQL name includes database, schema, and table. The MySQL name includes database and table. Keep the actual port, even when it is the default, and use one host-normalization policy across all producers. Never merge development and production because they share a database name.

Credentials, connection options, and personally identifiable values are not part of the dataset identity and should not enter lineage events.

## Write the field mapping as a contract

Make renames and conversions reviewable:

```yaml
pipeline: copy_sales_orders
version: 7
source:
  namespace: mysql://mysql-prod.example:3306
  dataset: sales.orders
target:
  namespace: postgres://pg-warehouse.example:5432
  dataset: analytics.public.orders
fields:
  order_id:
    target: order_id
    transform: identity
  total:
    target: total_amount
    transform: decimal_10_2_to_numeric_12_2
  ordered_at:
    target: ordered_at_utc
    transform: mysql_timestamp_to_timestamptz_utc
```

The contract should be the loader's input, not documentation maintained beside unrelated code. Generate select aliases, casts, and lineage field edges from the same structure when practical.

For computed fields, record every direct input. For filters, joins, and deduplication keys, record indirect influences rather than pretending their values are copied into each output.

## Snapshot both schemas with catalog semantics

MySQL and PostgreSQL both expose standard column metadata through `information_schema.columns`, but types and identifier behavior differ. Query each endpoint with a least-privileged metadata account:

```sql
SELECT
  table_catalog,
  table_schema,
  table_name,
  column_name,
  ordinal_position,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'sales'
  AND table_name = 'orders'
ORDER BY ordinal_position;
```

That predicate is the MySQL form, where `sales` is the database and `TABLE_CATALOG` is documented as `def`. For the PostgreSQL target in this example, connect to the `analytics` database and filter by both its database and schema; `information_schema.columns` only describes the current database:

```sql
WHERE table_catalog = 'analytics'
  AND table_schema = 'public'
  AND table_name = 'orders'
```

Run the full projection and `ORDER BY ordinal_position` against each endpoint with the appropriate predicate. Do not carry the MySQL database name into PostgreSQL's schema predicate.

Canonicalize case with the server's rules, not one global lowercase function. PostgreSQL folds unquoted identifiers to lowercase and preserves quoted case. MySQL database and table case behavior depends on `lower_case_table_names` and the underlying platform, while column names are case-insensitive. Capture the MySQL setting and the catalog spelling with the schema snapshot so a migration between hosts does not merge or split identities unexpectedly.

Persist the schema snapshot, capture time, server version, and a deterministic hash with the pipeline run. A current schema queried days later cannot prove which columns a historical run saw.

Compare the contract against both snapshots before copying:

```python
def validate_mapping(mapping, source_columns, target_columns):
    errors = []
    for source_name, rule in mapping.items():
        if source_name not in source_columns:
            errors.append(f"missing source field: {source_name}")
        if rule["target"] not in target_columns:
            errors.append(f"missing target field: {rule['target']}")
    if errors:
        raise ValueError("; ".join(errors))
```

Also validate type compatibility and nullability. A MySQL `BIGINT UNSIGNED`, zero date, enum, collation, or timezone-naive `DATETIME` can require a semantic conversion even when a generic `data_type` string looks familiar. Supplement the common projection with MySQL `column_type`, numeric precision and scale, character set, and collation fields. For PostgreSQL, capture `udt_schema`, `udt_name`, precision, and scale when the declared type alone is not enough to validate a conversion.

## Emit the bridge at successful commit

The copy job is the natural owner of the edge:

```text
Job: etl-prod/mysql_to_postgres.copy_sales_orders
Input: mysql://mysql-prod.example:3306 + sales.orders
Output: postgres://pg-warehouse.example:5432 + analytics.public.orders
```

Publish the exact mapping on a `DatasetEvent` for the output using the current OpenLineage Lineage Dataset Facet. It supports exact dataset and field sources. Keep the copy job's inputs and outputs on its `RunEvent`. If your producer or backend still emits the older Column Lineage Dataset Facet, retain transformation classifications for compatibility, but do not send conflicting mappings in both facets because the current lineage facet takes precedence for overlapping relationships.

Emit `START` before extraction and a terminal event after transaction outcome. If the PostgreSQL transaction rolls back, emit `FAIL` and do not publish a successful output version. For chunked loads, define whether one run represents the full load or one committed chunk, then keep that choice stable.

## Carry resumable checkpoints without turning them into names

For change data capture, store source positions as run or output evidence. This JSON is application-defined checkpoint metadata, not a complete OpenLineage event; embed it in a custom facet with the required producer and schema metadata when emitting it through OpenLineage:

```json
{
  "sourcePosition": {
    "engine": "mysql",
    "binlogFile": "mysql-bin.004281",
    "binlogPosition": 9174201
  },
  "targetTransaction": "8d5f1f0c-6f31-4ab8-a737-f608093901f6"
}
```

The position identifies one checkpoint, not a consumed range by itself. Record both start and end positions tied to the source server and advance the durable checkpoint with the target commit; replay also requires the relevant binlog files to remain available. The `targetTransaction` UUID here is an application-assigned commit correlation ID, not a native PostgreSQL transaction ID. It should not become part of the logical dataset name. A run UUID distinguishes executions, and a dataset version facet can carry a store-defined version when one exists.

MySQL's binary log records changes to structure or content; ordinary `SELECT` statements are not normally recorded because they make no changes. Row-based logging records how rows are affected, while DDL remains statement-based. A copy pipeline that only reads MySQL therefore still needs extractor-side knowledge to declare the source read.

## Model staging boundaries honestly

If the transfer writes Parquet to object storage before loading PostgreSQL, decide whether that object is operationally meaningful:

```text
MySQL table -> extraction job -> immutable Parquet batch
Parquet batch -> load job -> PostgreSQL table
```

Keep both jobs when the file is retained, replayed, validated independently, or owned by another team. Collapse it only when it is a disposable implementation detail and the collapsed edge retains run and mapping evidence. Do not model one job as reading MySQL and writing PostgreSQL if two independently retried processes actually own the boundary.

## Prevent common identity errors

Test these cases before production:

- MySQL names that differ only by case across hosts
- PostgreSQL quoted identifiers with mixed case
- source and target tables with the same short name
- a table renamed on only one side
- a mapping reordered while a positional bulk loader is unchanged
- daylight-saving transitions in timestamp conversion
- a deleted source field still present in the target
- two CDC workers replaying an overlapping binlog range

Store stable mapping IDs and versions so a field rename does not erase previous history. Treat heuristic rename detection as a review suggestion, not an automatic identity merge.

## Verify the lineage end to end

For a canary row set, assert the extracted schema hash, committed target row count, source checkpoint, and lineage event acceptance. Query the backend by the exact namespace and dataset names and confirm that `sales.orders.total` reaches `analytics.public.orders.total_amount` with a transformation edge.

Track unresolved fields and unmapped target columns. A successful copy with partial lineage must be visible as partial coverage, not silently promoted to complete lineage.

## Conclusion

Reliable MySQL-to-PostgreSQL lineage depends on an explicit bridge owned by the transfer job. Use engine-specific canonical identities, a versioned field contract, schemas captured at run time, and commit-aware events. Preserve CDC positions as evidence and represent staging boundaries according to their real retry and ownership semantics.

## Official Documentation

- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
- [OpenLineage Lineage Dataset Facet](https://openlineage.io/docs/spec/facets/dataset-facets/lineage/)
- [OpenLineage column-level lineage facet](https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/)
- [OpenLineage version facet](https://openlineage.io/docs/spec/facets/dataset-facets/version_facet/)
- [MySQL INFORMATION_SCHEMA COLUMNS](https://dev.mysql.com/doc/refman/8.4/en/information-schema-columns-table.html)
- [PostgreSQL information_schema.columns](https://www.postgresql.org/docs/current/infoschema-columns.html)
- [MySQL identifier case sensitivity](https://dev.mysql.com/doc/refman/8.4/en/identifier-case-sensitivity.html)
- [PostgreSQL identifier syntax and case folding](https://www.postgresql.org/docs/current/sql-syntax-lexical.html)
- [MySQL binary logging formats](https://dev.mysql.com/doc/refman/8.4/en/binary-log-formats.html)
- [MySQL replication implementation](https://dev.mysql.com/doc/refman/8.4/en/replication-implementation.html)
