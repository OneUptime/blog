# Validation Summary: How to Speed Up Slow Apache Geode OQL Joins with Colocation, Keys, Indexes, and Functions

## Status
validated

## Post Type
Technical performance optimization guide

## Technologies Covered
- Apache Geode 2.0
- Object Query Language (OQL)
- Partitioned regions, custom partitioning, and colocation
- Java 17 and the Apache Geode Query and Function APIs
- Query indexes and query tracing
- Apache Geode `gfsh` and the cluster configuration service

## Sources Consulted
- Apache Geode: Performing an Equi-Join Query on Partitioned Regions - https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/join_query_partitioned_regions.html
- Apache Geode: Partitioned Region Query Restrictions - https://geode.apache.org/docs/guide/latest/developing/query_additional/partitioned_region_query_restrictions.html
- Apache Geode: Colocate Data from Different Partitioned Regions - https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/colocating_partitioned_region_data.html
- Apache Geode: Standard Custom Partitioning - https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/standard_custom_partitioning.html
- Apache Geode: Configure Client Single-Hop Access to Server-Partitioned Regions - https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/configure_pr_single_hop.html
- Apache Geode: Querying a Partitioned Region on a Single Node - https://geode.apache.org/docs/guide/latest/developing/query_additional/query_on_a_single_node.html
- Apache Geode: Optimizing Queries on Data Partitioned by a Key or Field Value - https://geode.apache.org/docs/guide/latest/developing/query_additional/partitioned_region_key_or_field_value.html
- Apache Geode: Using Query Bind Parameters - https://geode.apache.org/docs/guide/latest/developing/query_additional/using_query_bind_parameters.html
- Apache Geode Java API: `Query`, `QueryService`, and `SelectResults` - https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/Query.html, https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/QueryService.html, https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/SelectResults.html
- Apache Geode Java API: `Function`, `FunctionContext`, and `RegionFunctionContext` - https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/execute/Function.html, https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/execute/FunctionContext.html, https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/execute/RegionFunctionContext.html
- Apache Geode Java API: `FunctionService`, `Execution`, `ResultCollector`, and `ResultSender` - https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/execute/FunctionService.html, https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/execute/Execution.html, https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/execute/ResultCollector.html, https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/execute/ResultSender.html
- Apache Geode: Working with Indexes and Indexing Guidelines - https://geode.apache.org/docs/guide/latest/developing/query_index/query_index.html, https://geode.apache.org/docs/guide/latest/developing/query_index/indexing_guidelines.html
- Apache Geode: Using Indexes with Equi-Join Queries - https://geode.apache.org/docs/guide/latest/developing/query_index/using_indexes_with_equijoin_queries.html
- Apache Geode: Creating Key Indexes - https://geode.apache.org/docs/guide/latest/developing/query_index/creating_key_indexes.html
- Apache Geode: Creating Multiple Indexes at Once - https://geode.apache.org/docs/guide/latest/developing/query_index/create_multiple_indexes.html
- Apache Geode: Maintaining Indexes and Index Storage - https://geode.apache.org/docs/guide/latest/developing/query_index/maintaining_indexes.html
- Apache Geode: Query Debugging - https://geode.apache.org/docs/guide/latest/developing/query_additional/query_debugging.html
- Apache Geode: `gfsh create index` command and cluster configuration persistence - https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/create.html, https://geode.apache.org/docs/guide/latest/configuring/cluster_config/gfsh_persist.html
- Apache Geode 2.0.0 source: partitioned-region index distribution - https://github.com/apache/geode/blob/rel/v2.0.0/geode-core/src/main/java/org/apache/geode/internal/cache/PartitionedRegion.java, https://github.com/apache/geode/blob/rel/v2.0.0/geode-core/src/main/java/org/apache/geode/internal/cache/partitioned/IndexCreationMsg.java
- Apache Geode: Host Machine Requirements - https://geode.apache.org/docs/guide/latest/getting_started/system_requirements/host_machine.html

## Issues Found
- The post incorrectly said that `QueryService.createIndex` creates an index only on the member where the call runs and should therefore run independently on every host. For a partitioned region, Geode distributes programmatic index creation to the region's data stores; duplicate per-host initializers can race or report index conflicts. Updated the guidance to invoke the definitions once after region creation.
- The post said `gfsh create index` persists an index definition cluster-wide without qualification. Persistence depends on the cluster configuration service and does not apply to a member-only `--members` target. Updated the wording to state those conditions and to distinguish persisted `gfsh` configuration from API-only creation.
- The post generally preferred creating indexes before bulk loading. There is no universal best order: pre-created indexes add maintenance work to load writes, while post-load creation must populate indexes from existing entries. Replaced the preference with guidance to measure the trade-off.
- The key-index advice was too broad for the featured query. Geode does not apply key indexes to equi-join queries; regular indexes are required on both sides. Clarified that key indexes are candidates only for separate single-region equality queries when the indexed value expression evaluates to the actual region key, not merely to a custom resolver's routing field.
- The bind-parameter explanation implied that constructing a new `Query` for every function invocation reuses a compiled query. Bind parameters permit build-once, repeated execution only when the thread-safe `Query` object is retained. Updated the explanation while preserving the bind-parameter example.
- The index-matching wording could imply that literal alias names are the important matching criterion. Updated it to focus on the documented iterator structure, nested collections, and expression shape, and clarified the single-region-index pattern required for each side of an equi-join.

## Review Notes
The OQL equi-join, colocated partitioning requirements, resolver and Java single-hop guidance, region-function routing, `Query.execute(RegionFunctionContext, Object[])` call, result-fragment handling, and permission guidance match current Apache Geode 2.0.0 documentation and APIs. The Java syntax is compatible with Geode 2.0's Java 17 requirement, and the shown APIs are current and non-deprecated.

`Function.isHA()` defaults to `true`, so the shown function is eligible for re-execution even though it does not override that method. The function is read-only, and the existing duplicate-execution warning is technically safe; a future version could explicitly override `isHA()` if retry is not wanted.

The three range-index definitions correctly cover both sides of the equi-join and the additional status predicate. The `defineIndex`/`createDefinedIndexes`, `<TRACE>`, index-cost, result-size, hot-bucket, and rebalance guidance is accurate. All eight external documentation links in the post returned HTTP 200 and pointed to the stated Apache Geode resources during validation.
