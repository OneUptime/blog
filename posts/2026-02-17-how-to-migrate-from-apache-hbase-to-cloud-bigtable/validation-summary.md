# Validation Summary: How to Migrate from Apache HBase to Cloud Bigtable

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Bigtable
- Apache HBase
- Bigtable HBase client for Java
- Bigtable Python client library
- Google Cloud CLI and `cbt` CLI
- Dataflow / Apache Beam import tooling
- Maven
- Cloud Storage

## Sources Consulted
- Google Cloud Bigtable and the HBase API: https://docs.cloud.google.com/bigtable/docs/hbase-bigtable
- Google Cloud Bigtable / HBase differences: https://cloud.google.com/bigtable/docs/hbase-differences
- Google Cloud Bigtable offline HBase migration guide: https://docs.cloud.google.com/bigtable/docs/migrate-hbase-data-to-bigtable
- Google Cloud Bigtable performance guide: https://docs.cloud.google.com/bigtable/docs/performance
- Google Cloud Bigtable create instance guide: https://docs.cloud.google.com/bigtable/docs/creating-instance
- `gcloud bigtable instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/bigtable/instances/create
- Google Cloud Bigtable `cbt` reference: https://docs.cloud.google.com/bigtable/docs/cbt-reference
- Google Cloud Bigtable garbage collection guide: https://docs.cloud.google.com/bigtable/docs/configuring-garbage-collection
- Google Cloud Bigtable Python client reference: https://docs.cloud.google.com/python/docs/reference/bigtable/latest/table
- Google Cloud Bigtable client libraries reference: https://cloud.google.com/bigtable/docs/reference/libraries
- Maven Central artifact metadata for `com.google.cloud.bigtable:bigtable-hbase-2.x`: https://search.maven.org/artifact/com.google.cloud.bigtable/bigtable-hbase-2.x
- Apache HBase `ExportSnapshot` API reference: https://hbase.apache.org/2.5/apidocs/org/apache/hadoop/hbase/snapshot/ExportSnapshot.html

## Issues Found
- The post described automatic scaling and zero operational overhead too broadly. Changed this to managed scaling options and much lower operational overhead.
- The compatibility section said there was no HBase shell and recommended separate instances for namespaces. Updated it to reflect that `cbt`/`gcloud` are preferred for most Bigtable admin workflows, and that namespaces can be simulated with row key prefixes or separated by instance when operational isolation is needed.
- The Bigtable instance command used deprecated `--instance-type=PRODUCTION`. Removed the flag because production is now the only instance type.
- The sizing guidance claimed one Bigtable node is roughly equivalent to one HBase RegionServer. Replaced this with guidance to use Bigtable's published per-node estimates and benchmark the workload.
- The Python schema creation example passed `ColumnFamily` objects to `table.create()`. The Python client expects a dictionary of column family IDs to garbage collection rules, so the snippet now passes GC rules directly.
- The Python GC-rule example used a union for max versions plus TTL. Changed this to an intersection to match the common "remove cells that are both older than the TTL and older than the retained version count" policy.
- The HBase snapshot migration command used a non-current `HBase_To_Bigtable` Dataflow template. Replaced it with the documented snapshot, `ExportSnapshot`, and Bigtable Beam import JAR workflow.
- The Java migration example omitted imports required for `Configuration`, `HBaseConfiguration`, `List`, and `ArrayList`. Added the missing imports and closed both connection objects.
- The Maven dependency used an older version and the Hadoop artifact for a standalone application example. Updated it to `bigtable-hbase-2.x` version `2.18.3`, the current Maven Central version checked during review.

## Review Notes
- The post is technically relevant and validated after correction.
- For production migrations, Google's official offline guide also recommends HashTable / sync-table validation and the schema translation tool. The post's lighter validation script is acceptable as a simplified example, but a future revision could add the official validation workflow.
