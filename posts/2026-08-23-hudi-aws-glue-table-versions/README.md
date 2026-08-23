# Sync Hudi to AWS Glue Without Excess Table Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hudi, AWS Glue, Data Catalog, Metadata Sync, Amazon S3

Description: Configure conditional Hudi metadata sync so AWS Glue updates only for schema or partition changes instead of every commit.

---

AWS Glue Data Catalog versions a table every time its definition is updated. A Hudi writer can commit frequently even when neither schema nor partitions change. If metadata sync runs unconditionally after each Hudi commit, Glue accumulates redundant table versions and can eventually reject more updates.

Apache Hudi 1.2.x directly addresses this with conditional meta sync. When enabled, Hudi syncs only when relevant schema or partition metadata changed.

## Understand what is being synchronized

The Hudi table on S3 is authoritative for data files, table properties, and timeline state. Glue holds a catalog representation used by Athena, Spark, and other engines:

- Database and table name.
- Base location.
- Columns and partition columns.
- Registered partitions.
- Input formats and table properties needed by readers.

A normal upsert that updates rows inside already registered partitions does not require a new Glue schema version. A new column or a new partition does.

Hudi's `AwsGlueCatalogSyncTool` builds on the Hive sync configuration and calls Glue through the AWS SDK. It can run from the Spark DataSource writer or Hudi Streamer.

## Configure conditional Glue sync

For a Spark DataSource writer:

```python
sync_options = {
    "hoodie.datasource.meta.sync.enable": "true",
    "hoodie.meta.sync.client.tool.class":
        "org.apache.hudi.aws.sync.AwsGlueCatalogSyncTool",
    "hoodie.datasource.hive_sync.database": "lake",
    "hoodie.datasource.hive_sync.table": "orders",
    "hoodie.datasource.hive_sync.partition_fields": "event_date,region",
    "hoodie.datasource.meta_sync.condition.sync": "true",
}

write_options = {**hudi_options, **sync_options}
incoming.write.format("hudi").options(**write_options).mode("append").save(table_path)
```

The critical property is:

```text
hoodie.datasource.meta_sync.condition.sync=true
```

The Hudi Glue documentation states that this changes meta sync from every commit to schema-change or partition-change conditions, avoiding excessive Glue versions.

For Hudi Streamer, select:

```text
--sync-tool-classes org.apache.hudi.aws.sync.AwsGlueCatalogSyncTool
```

and pass the same conditional and partition settings through the properties file or `--hoodie-conf`.

## Keep every writer on one contract

Conditional sync cannot protect a table if writers disagree about metadata. Centralize:

- Hudi, Spark, and AWS bundle versions.
- Glue database and table names.
- Partition fields and order.
- Partition extractor and hive-style layout.
- Timestamp handling.
- Whether Hudi metadata fields are registered.
- Conditional-sync enablement.

If one writer uses conditional sync and another performs unconditional sync, the second still creates redundant versions. If writers alternate schemas, every commit is correctly recognized as a change and Glue churn continues.

For a multi-writer table, consider assigning catalog sync to one controlled process. Hudi write commits remain independent from whether every writer owns Glue permissions.

## Verify IAM and classpath

The sync client needs permission to read and update the target Glue database, table, and partitions. Grant only the required catalog resources and CloudWatch logging needed by the job.

Use the Hudi AWS bundle that matches the writer release. A missing `AwsGlueCatalogSyncTool` class or mismatched AWS SDK commonly appears as `ClassNotFoundException` or `NoSuchMethodError` before any catalog call occurs.

Do not combine the platform-provided Hudi libraries with a second arbitrary Hudi bundle. On AWS Glue jobs, either use the runtime's native Hudi integration or follow AWS's documented custom-JAR procedure, which requires omitting `hudi` from `--datalake-formats` and setting `--user-jars-first true` on Glue 5.0 or later.

## Tune partition operations separately

Large partitioned tables can make a legitimate catalog update expensive. Hudi exposes Glue-specific parallelism controls:

```text
hoodie.datasource.meta.sync.glue.all_partitions_read_parallelism
hoodie.datasource.meta.sync.glue.changed_partitions_read_parallelism
hoodie.datasource.meta.sync.glue.partition_change_parallelism
```

Tune them only after observing API latency and throttling. More parallelism can shorten a large sync but increase Glue request bursts.

Glue partition indexes are another feature, configured with:

```text
hoodie.datasource.meta.sync.glue.partition_index_fields.enable
hoodie.datasource.meta.sync.glue.partition_index_fields
```

They optimize catalog partition lookup; they do not solve redundant table version creation. Select up to the Glue-supported number of index definitions based on actual query predicates.

## Detect version churn

Track:

- Hudi commits per hour.
- Glue table versions added per hour.
- Schema changes and partitions added per hour.
- Meta-sync duration, throttles, and failures.
- The last Hudi commit represented in catalog properties.

After enabling conditional sync, a series of upserts to existing partitions with an unchanged schema should create Hudi commits without creating a Glue version on each one. Then write a new partition and verify that the catalog updates.

Hudi 1.2 writes a `hudi_writer_version` table property during Glue sync. Use it as a compatibility clue, not as the only freshness signal. Inspect partitions and schema as well.

## Recover from excessive versions

First stop unconditional writers. Then:

1. Export the current Glue table definition and permissions.
2. Confirm the Hudi table is healthy and its latest schema is readable.
3. Run one sync with the corrected configuration.
4. Validate Athena or Spark queries and partition pruning.
5. Re-enable writers with conditional sync everywhere.

Cleaning old Glue table versions is an AWS catalog administration task and should follow current AWS limits and retention APIs. It does not change Hudi's S3 timeline or data files. Never delete Hudi data to reduce Glue version count.

If versions continue growing, compare consecutive catalog definitions. A real difference may come from schema field order, table properties, or partition configuration changing between jobs.

## Handle sync failures honestly

Do not set an ignore-exceptions option merely to keep ingestion green without an alert. Hudi data commits can succeed while the catalog remains stale, so readers may miss new partitions or columns.

A resilient design records meta-sync failure separately, pages on it, and provides a one-shot catch-up sync. Conditional sync reduces calls but does not remove the need to monitor catalog freshness.

## Official Documentation

- [Apache Hudi AWS Glue Data Catalog sync](https://hudi.apache.org/docs/syncing_aws_glue_data_catalog/)
- [Apache Hudi Hive Metastore sync](https://hudi.apache.org/docs/syncing_metastore/)
- [Apache Hudi configurations](https://hudi.apache.org/docs/configurations/)
- [AWS Glue Hudi framework](https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-format-hudi.html)
- [AWS Glue partition indexes](https://docs.aws.amazon.com/glue/latest/dg/partition-indexes.html)

## Conclusion

Enable Hudi conditional meta sync so unchanged data commits do not create redundant Glue versions. Keep one catalog contract across all writers, tune partition calls only from evidence, monitor catalog freshness independently from Hudi commit success, and use matching AWS and Hudi bundles.
