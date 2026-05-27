# Validation Summary: How to Set Up Tenant-Specific Data Isolation in Cloud Spanner for Multi-Tenant

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Spanner
- Cloud Spanner GoogleSQL DDL and query syntax
- Cloud Spanner interleaved tables and primary keys
- Cloud Spanner Python client library
- Cloud Spanner commit timestamps and stale reads
- Cloud Spanner fine-grained access control
- Cloud Spanner system query statistics

## Sources Consulted
- Google Cloud Spanner documentation: Schemas overview, https://docs.cloud.google.com/spanner/docs/schema-and-data-model
- Google Cloud Spanner documentation: Schema design best practices, https://cloud.google.com/spanner/docs/schema-design
- Google Cloud Spanner documentation: Primary key migration overview, https://docs.cloud.google.com/spanner/docs/primary-keys-overview
- Google Cloud Spanner documentation: Commit timestamps in GoogleSQL-dialect databases, https://docs.cloud.google.com/spanner/docs/commit-timestamp
- Google Cloud Spanner documentation: Reads outside of transactions, https://docs.cloud.google.com/spanner/docs/reads
- Google Cloud Spanner documentation: Timestamp bounds, https://docs.cloud.google.com/spanner/docs/timestamp-bounds
- Google Cloud Spanner documentation: Replication, https://cloud.google.com/spanner/docs/replication
- Google Cloud Spanner documentation: Fine-grained access control overview, https://docs.cloud.google.com/spanner/docs/fgac-about
- Google Cloud Spanner documentation: Fine-grained access control privileges, https://cloud.google.com/spanner/docs/fgac-privileges
- Google Cloud Spanner documentation: Create and manage views, https://docs.cloud.google.com/spanner/docs/create-manage-views
- Google Cloud Spanner documentation: GoogleSQL data definition language, https://docs.cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Google Cloud Spanner documentation: Query statistics, https://cloud.google.com/spanner/docs/introspection/query-statistics
- Google Cloud Python reference: Spanner Snapshot class, https://cloud.google.com/python/docs/reference/spanner/latest/google.cloud.spanner_v1.snapshot.Snapshot
- Google Cloud Spanner sample: Mutations write data with TIMESTAMP column, https://docs.cloud.google.com/spanner/docs/samples/spanner-insert-data-with-timestamp-column

## Issues Found
- The interleaved table discussion claimed all tenant data can be stored together on the same splits and that `TenantId` first in the key ensures all tenant data is stored in the same Spanner splits. Spanner stores interleaved child rows with parent rows and stores rows in primary-key order, but splits can be added and moved as data grows. The wording was corrected to describe contiguous key ranges and Spanner-managed splitting.
- The high-volume event sharding example said the shard ID was based on tenant ID and a timestamp, and the code used the current second. That can send all writes for a tenant in the same second to one shard. The example now hashes tenant ID with event ID.
- The read-heavy section was titled "Per-Tenant Read Replicas" and said stale reads can be served from any replica and are cheaper. Spanner replicas are configured at the instance level, not per tenant, and stale reads primarily reduce latency or leader-region load in multi-region deployments when data can be stale. The heading and explanation were corrected.
- The FGAC section said database roles can restrict access to rows. Spanner FGAC grants privileges on objects such as tables, columns, views, and change streams; row-filtered access should be implemented with filtered views. The text was corrected.
- The query statistics example described "the last hour" but did not filter to the most recent `QUERY_STATS_TOP_HOUR` interval. The query now filters to `MAX(interval_end)`.

## Review Notes
The Python snippets use current Cloud Spanner Python client patterns for snapshots, parameterized SQL, mutations, and `spanner.COMMIT_TIMESTAMP`. The examples still assume GoogleSQL dialect, valid Application Default Credentials, existing Spanner instance/database IDs, and application-layer tenant authorization before calling the data access methods.
