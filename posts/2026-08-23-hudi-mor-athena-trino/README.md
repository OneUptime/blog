# Query Hudi Merge-on-Read Tables from Athena and Trino

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, Merge-on-Read, Amazon Athena, Trino, Query Engines

Description: Query Hudi Merge-on-Read tables correctly by matching Athena snapshot support and Trino read-optimized support to compaction freshness.

---

Merge-on-Read stores updates in log files until compaction merges them into Parquet base files. A snapshot query merges base and log data to return the freshest committed state. A read-optimized query scans only compacted base files and can lag behind recent delta commits.

Athena and Trino do not expose the same capabilities. Current Athena supports MOR snapshot and read-optimized reads for specific Hudi connector versions. Current Trino's native Hudi connector supports MOR read-optimized queries, not MOR snapshot merging.

Correctness therefore begins with selecting the catalog table and engine whose query contract matches the required freshness.

## Register both MOR views for Athena

Hudi meta sync normally creates two metastore entries for MOR:

- `<table>_rt` uses Hudi's real-time input format for snapshot queries.
- `<table>_ro` uses the base-file input format for read-optimized queries.

AWS documents `_rt` as the default snapshot suffix and `_ro` as the read-optimized suffix for modern Hudi versions.

For Athena:

```sql
SELECT count(*) FROM lake.orders_rt;  -- freshest committed snapshot
SELECT count(*) FROM lake.orders_ro;  -- latest compacted base files
```

The snapshot table uses:

```text
org.apache.hudi.hadoop.realtime.HoodieParquetRealtimeInputFormat
```

The read-optimized table uses:

```text
org.apache.hudi.hadoop.HoodieParquetInputFormat
```

Do not point both names at the same input format. If a dashboard queries `_ro` and misses a just-written update, that is expected until compaction, not an Athena cache bug.

## Respect Athena's version boundary

As of the current AWS documentation, Athena supports Hudi 0.14.0 by default and an opt-in native 0.15.0 connector. AWS explicitly does not guarantee compatibility for tables created by later Hudi versions.

To opt into 0.15.0:

```sql
ALTER TABLE lake.orders_rt
SET TBLPROPERTIES (
  'athena_enable_native_hudi_connector_implementation' = 'true'
);
```

The opt-in connector has documented limitations, including no bootstrapped tables and no cross-account queries. Lake Formation-protected tables also need access to both the table location and its `.hoodie` metadata directory.

A table written by Hudi 1.1 or 1.2 uses table version 9 and should not be assumed Athena-compatible. Use a writer version supported by Athena, maintain a compatible serving table, or complete an explicit regression suite before production. A query returning rows once is not a compatibility guarantee for schema evolution, cleaning, and table services.

Athena does not support Hudi incremental queries, CTAS, or `INSERT INTO` for Hudi. It is a reader.

## Configure Trino's native Hudi connector

Current Trino documentation requires Hudi 0.12.3 or higher, Parquet data files, access to table storage, and a Hive-compatible metastore:

```properties
connector.name=hudi
hive.metastore.uri=thrift://metastore.example.net:9083
fs.native-s3.enabled=true
```

Use the current Trino filesystem property appropriate for S3, HDFS, GCS, or Azure. The connector recognizes Hudi tables registered by Hudi's sync tool.

Query the read-optimized MOR entry:

```sql
SELECT event_date, status, count(*)
FROM hudi.lake.orders_ro
WHERE event_date >= DATE '2026-08-20'
GROUP BY event_date, status;
```

The current connector support matrix lists:

| Hudi table type | Trino query type |
| --- | --- |
| Copy-on-Write | Snapshot |
| Merge-on-Read | Read optimized |

Do not query `orders_rt` through Trino and assume the delta logs were merged. If the catalog redirects or resolves the table, verify the connector and query type in the Trino plan and compare against Spark.

For Trino 411 and later, Hudi's integration guide states that Hive connector reads redirect to a Hudi catalog. Configure `hive.hudi-catalog-name=hudi` where using that path.

## Make compaction a freshness SLA

For Trino and any Athena `_ro` consumer, freshness equals the latest completed compaction. Monitor:

- Latest data delta commit completion time.
- Latest completed compaction instant.
- Age and number of pending compactions.
- Count and bytes of log files.
- Difference between snapshot and read-optimized key counts.

If the dashboard SLA is ten minutes, configure compaction to complete within that window under peak update volume. A trigger every ten minutes is insufficient if compaction itself takes fifteen.

Expose data freshness to users. A table property, metrics view, or dashboard banner showing the latest compacted instant prevents consumers from interpreting expected lag as missing data.

## Sync schema and partitions through Hudi

Use Hudi meta sync or `AwsGlueCatalogSyncTool` rather than relying on a generic crawler. Sync the same partition fields, extractor, and schema for `_rt` and `_ro` entries.

Athena documentation does not support `MSCK REPAIR TABLE` for Hudi. If a table was not synced, use Hudi meta sync or explicit `ALTER TABLE ADD PARTITION` as AWS documents.

For large Athena tables, file listing from Hudi metadata can be enabled:

```sql
ALTER TABLE lake.orders_ro
SET TBLPROPERTIES ('hudi.metadata-listing-enabled' = 'TRUE');
```

Athena currently supports only Hudi's file-listing metadata index, not column-statistics data skipping or Bloom metadata indexes. Trino documentation notes metadata-table reading was removed in Trino 419.

## Validate result correctness

After an upsert but before compaction:

1. Read the MOR snapshot in Spark.
2. Query Athena `_rt` and compare key count and selected checksums.
3. Query Athena `_ro` and Trino `_ro`; document the expected lag.
4. Run compaction.
5. Repeat all reads. Read-optimized results should converge to the compacted boundary.

Include deletes, timestamp columns, schema evolution, and Lake Formation permissions. Athena documents a timestamp limitation for real-time tables, so test actual timestamp projections rather than only `count(*)`.

If Trino is stale after compaction, confirm the completed compaction, catalog location, partition sync, and connector path. If Athena snapshot fails, check its supported Hudi connector version and permissions to `.hoodie` before changing the Hudi table.

## Official Documentation

- [Amazon Athena Hudi query guide](https://docs.aws.amazon.com/athena/latest/ug/querying-hudi.html)
- [Amazon Athena MOR table examples](https://docs.aws.amazon.com/athena/latest/ug/querying-hudi-merge-on-read-create-table-examples.html)
- [Amazon Athena Hudi limitations](https://docs.aws.amazon.com/athena/latest/ug/querying-hudi-in-athena-considerations-and-limitations.html)
- [Trino Hudi connector](https://trino.io/docs/current/connector/hudi.html)
- [Apache Hudi SQL query integrations](https://hudi.apache.org/docs/sql_queries/)
- [Apache Hudi compaction](https://hudi.apache.org/docs/compaction/)

## Conclusion

Use Athena `_rt` for supported MOR snapshot reads and `_ro` for compacted reads. Treat Trino MOR access as read optimized in the current connector. Enforce engine-version compatibility, sync through Hudi, and make compaction completion the explicit freshness boundary for every base-file-only consumer.
