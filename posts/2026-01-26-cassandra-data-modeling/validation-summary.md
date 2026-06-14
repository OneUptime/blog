# Validation Summary: How to Design Cassandra Data Models

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Cassandra
- Cassandra Query Language (CQL)
- Cassandra data modeling
- Cassandra secondary indexes and Storage-Attached Indexing (SAI)
- DataStax/Apache Cassandra Java driver 4.x
- Java asynchronous programming with `CompletionStage` and `CompletableFuture`
- Python partition-size estimation example
- Mermaid diagrams

## Sources Consulted
- Apache Cassandra data modeling introduction: https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/intro.html
- Apache Cassandra CQL data definition and primary key documentation: https://cassandra.apache.org/doc/4.0/cassandra/cql/ddl.html
- Apache Cassandra CQL data manipulation, `ALLOW FILTERING`, `LIMIT`, ordering, and batch documentation: https://cassandra.apache.org/doc/4.0/cassandra/cql/dml.html
- Apache Cassandra secondary index guidance: https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/2i/2i-when-to-use.html
- Apache Cassandra collections documentation: https://cassandra.apache.org/doc/stable/cassandra/developing/cql/collections/collection-create.html
- Apache Cassandra partition-size refinement guidance: https://cassandra.apache.org/doc/latest/cassandra/developing/data-modeling/data-modeling_refining.html
- DataStax Cassandra planning guidance for large partitions: https://docs.datastax.com/en/planning/oss/data-model.html
- DataStax Java driver 4 asynchronous API documentation: https://docs.datastax.com/en/developer/java-driver/4.0/manual/core/async/
- DataStax Java driver 4 paging documentation: https://docs.datastax.com/en/developer/java-driver/4.6/manual/core/paging/
- DataStax CQL timestamp type documentation: https://docs.datastax.com/en/cql-oss/3.x/cql/cql_reference/timestamp_type_r.html

## Issues Found
- The partition-key explanation said rows with the same partition key are stored on the same node. Updated it to say the same set of replica nodes, which matches Cassandra replication behavior.
- The activity table primary keys used only `activity_timestamp` as a clustering column. That can overwrite same-user events that share the same timestamp because Cassandra upserts rows with identical primary keys. Added `activity_id uuid` as a clustering tie-breaker to all activity tables and inserts.
- The composite partition key comment for `user_activities_by_type` said it prevents unbounded partitions. Updated it to the narrower claim that it keeps each user/type partition smaller.
- The batch example implied a single-partition batch, but the three denormalized tables use different partition keys. Updated the prose and CQL comments to describe it as a logged multi-partition batch and clarified that logged batches are not SQL-style isolated transactions.
- The `ALLOW FILTERING` explanation said it scans all partitions in general. Updated it to say it can require scanning many partitions, with the shown query being the all-partitions case because it has no partition-key restriction.
- The secondary-index guidance was too broad about cardinality. Updated it to low-to-moderate cardinality with bounded result sets and added a note that SAI is preferred for newer Cassandra secondary-index-style use cases.
- The Java async metrics query consumed only `AsyncResultSet.currentPage()`, which would drop later pages. Added a `collectRows` helper using `hasMorePages()` and `fetchNextPage()` so the example handles paged async results.

## Review Notes
The remaining partition-size calculator is an intentionally approximate planning aid, not an exact SSTable sizing model. Production schemas should still be tested with realistic row sizes, compaction settings, read patterns, and replica counts.
