# How to Export a Consistent StarRocks Snapshot to CSV or JSON While Data Is Changing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Data Export, CSV, JSON, Snapshot, Object Storage

Description: Export a consistent StarRocks table snapshot to CSV and derive JSON safely without mixing rows from different source states.

---

An export that reads partitions or pages at different times can combine old and new states. That can produce duplicate primary keys, missing updates, or totals that never existed in StarRocks.

For a base table, the `EXPORT` statement is the clearest documented consistency boundary. The leader FE sends snapshot instructions for all involved tablets before asynchronous export tasks read them. Writes can continue, while the job reads the captured tablet snapshots.

There is one important format constraint: `EXPORT` writes CSV. StarRocks' current unloading matrix does not support JSON output from either `EXPORT` or `INSERT INTO FILES`. To obtain JSON, export one consistent CSV or Parquet dataset and convert that completed dataset offline.

## Define the Snapshot Contract

Before submitting the job, record:

- source database, table, selected partitions, and columns;
- required visibility point;
- StarRocks version and session time zone;
- unique destination prefix;
- expected row count or business totals;
- output delimiter, null representation, and downstream schema;
- retention and credential policy.

"Everything committed before the export began" is different from "everything the producing application intended to write." If another session has just completed a write and the export session must immediately observe it, use the documented synchronization command first:

```sql
SYNC;
```

`SYNC` synchronizes data consistency among sessions for subsequent reads. It does not pause future writers and is not a substitute for checking that upstream transactions actually committed.

## Submit a Native CSV Export

Export only the base-table columns and partitions required by the consumer:

```sql
EXPORT TABLE analytics.orders
PARTITION (p202607)
(order_id, customer_id, order_time, status, net_amount)
TO "s3a://company-exports/orders/run-20260726T020000Z/orders_"
PROPERTIES (
  "column_separator" = ",",
  "line_delimiter" = "\n",
  "timeout" = "3600"
)
WITH BROKER (
  "aws.s3.access_key" = "REDACTED_ACCESS_KEY",
  "aws.s3.secret_key" = "REDACTED_SECRET_KEY",
  "aws.s3.region" = "eu-west-2"
);

SELECT LAST_QUERY_ID();
```

Use the exact storage authentication properties supported by the deployed StarRocks version. Where supported, prefer an instance profile or other short-lived identity to access keys embedded in SQL, because statements and errors can be logged.

From StarRocks 2.5, object-storage unloading is broker-free, but the SQL still retains the `WITH BROKER` keyword. Earlier releases and some HDFS or Kerberos arrangements require a deployed broker.

The destination must be unique per attempt. Do not point retries at a prefix already consumed as a successful dataset.

## Wait for the Publication Boundary

`EXPORT` is asynchronous. Capture the query ID immediately and poll that exact job:

```sql
SHOW EXPORT
WHERE queryid = "edee47f0-abe1-11ec-b9d1-00163e1e238f";
```

Treat only `FINISHED` as publishable. While the job runs, StarRocks writes files below a temporary `__starrocks_export_tmp_<job-id>` directory. After all export tasks succeed, StarRocks renames the completed files into the requested path.

Do not let consumers list and process the prefix before the job is `FINISHED`. A robust workflow writes a separate manifest only after:

1. `SHOW EXPORT` reports `FINISHED`;
2. every final object is visible;
3. validation checks pass;
4. the object list, sizes, and checksums have been recorded.

If the job is `CANCELLED` or fails, preserve `ErrorMsg`, the query ID, and FE logs, then retry with a new prefix. A leader FE restart or leader election during an export causes the job to fail, so retry logic is expected.

## Validate the CSV as a Dataset

An export normally produces multiple files and does not promise row ordering. Consumers must read the whole manifest, not "the newest file."

Validate at least:

- number of final objects and total bytes;
- parsed row count across all files;
- distinct primary-key count where applicable;
- minimum and maximum business timestamp;
- sum or count grouped by a stable business dimension;
- column count and data types;
- correct decoding of delimiter, line endings, nulls, and embedded text.

`EXPORT` does not add CSV headers and does not expose the `enclose` and `escape` controls available in `INSERT INTO FILES`. If string values can contain separators or line breaks, test the exact resulting encoding with the downstream parser. A safer interchange format for complex text may be Parquet via `INSERT INTO FILES`, followed by conversion.

The official guidance recommends keeping each `EXPORT` job to no more than a few dozen GB. For a large table, export a few partitions per job. Each job has its own consistent snapshot; separate partition jobs are not automatically one shared cross-job point in time. If the consumer requires a single table-wide point, use one job or first materialize an immutable staging table under an application-controlled cutoff.

## Export a Filtered or Transformed Result

`EXPORT` selects base-table partitions and columns; it is not an arbitrary `SELECT`. `INSERT INTO FILES` can unload a query result:

```sql
INSERT INTO FILES (
  "path" = "s3://company-exports/orders/run-20260726T020000Z/data_",
  "format" = "parquet",
  "compression" = "zstd",
  "target_max_file_size" = "536870912",
  "aws.s3.access_key" = "REDACTED_ACCESS_KEY",
  "aws.s3.secret_key" = "REDACTED_SECRET_KEY",
  "aws.s3.region" = "eu-west-2"
)
SELECT order_id, customer_id, order_time, status, net_amount
FROM analytics.orders
WHERE order_time >= TIMESTAMP '2026-07-01 00:00:00'
  AND order_time <  TIMESTAMP '2026-08-01 00:00:00';
```

`INSERT INTO FILES` is available from 3.2. CSV output is available from 3.3, as are ORC output and CSV controls such as `include_header`; Parquet output begins in 3.2. Keep the unload in one statement. Do not implement it as repeated `LIMIT` and `OFFSET` queries while the source is changing.

If an audit requires the same snapshot to feed several output jobs or formats, first copy the desired result into a dedicated base table, stop modifying that table, validate it, and export from it. Record the staging-table version or cutoff in the manifest. This makes the cross-job consistency boundary operationally explicit.

## Produce JSON Without Losing Consistency

Native StarRocks unloading currently lists JSON as unsupported. There are three safe patterns.

### Convert the Completed Snapshot

Export CSV or Parquet, validate and freeze the object manifest, then convert only those objects with a schema-aware tool. For example, a Spark, Flink, or Arrow job can read every Parquet file in the manifest and write newline-delimited JSON.

The converter must preserve:

- decimal precision instead of coercing values to binary floating point;
- timestamp and time-zone meaning;
- null versus empty string;
- 64-bit integers;
- deterministic field names;
- one output JSON object per source row if NDJSON is required.

Validate the converted row count and business totals against the source manifest before publishing the JSON manifest.

### Stream One Query Through a Client

For a bounded result, a client can execute one `SELECT` and encode each returned row as JSON while keeping the cursor open. Use a real JSON encoder, server-side or streaming fetch, and one query ID. Do not page with separate queries, because later pages can observe later table states.

This method is unsuitable for very large exports when the client, network connection, or result buffering is the bottleneck.

### Serialize a JSON Value as a Column

StarRocks has `to_json` for converting supported complex values to JSON text. That can be useful inside a query or staging table, but unloading a `VARCHAR` column through CSV is still CSV transport. CSV delimiters, quoting, and line handling can prevent the result from being valid NDJSON. Test it explicitly rather than labeling the file `.json`.

## Failure and Load Considerations

- An export scans data and consumes I/O, so schedule it through an appropriate resource group or low-traffic window.
- Base-table materialized views are not exported by `EXPORT`; select the base table or use a query unload where supported.
- The source snapshot is consistent, but destination object-store listing and downstream publication are separate concerns. Use a manifest or success marker.
- A retry must be idempotent at the workflow level. Use a new run ID, then atomically switch a catalog pointer or manifest reference.
- Never print secrets in automation logs. Limit destination write and read permissions to the required prefix.
- If row order matters, establish it during downstream processing. Multiple parallel export files have no global order.

## Operational Checklist

1. Confirm source commits and run `SYNC` only when immediate cross-session visibility is required.
2. Choose one table-wide `EXPORT` job for the documented tablet snapshot guarantee.
3. Use a new destination prefix and capture `LAST_QUERY_ID()`.
4. Poll `SHOW EXPORT` to `FINISHED`.
5. Validate all files and publish a manifest.
6. Convert that immutable CSV or Parquet manifest to JSON when needed.
7. Compare row counts, key counts, totals, and timestamp bounds after conversion.
8. Publish the dataset only after all checks succeed.

## Official Documentation

- [StarRocks export data using EXPORT](https://docs.starrocks.io/docs/unloading/Export/)
- [StarRocks EXPORT statement](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/unloading/EXPORT/)
- [StarRocks unload using INSERT INTO FILES](https://docs.starrocks.io/docs/unloading/unload_using_insert_into_files/)
- [StarRocks unloading feature support](https://docs.starrocks.io/docs/loading/loading_introduction/feature-support-loading-and-unloading/)
- [StarRocks SYNC statement](https://docs.starrocks.io/docs/sql-reference/sql-statements/cluster-management/nodes_processes/SYNC/)
- [StarRocks to_json function](https://docs.starrocks.io/docs/sql-reference/sql-functions/json-functions/json-query-and-processing-functions/to_json/)
