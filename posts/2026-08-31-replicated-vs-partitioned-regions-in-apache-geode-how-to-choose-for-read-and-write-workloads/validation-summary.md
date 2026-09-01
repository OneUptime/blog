# Validation Summary: Replicated vs Partitioned Regions in Apache Geode: How to Choose for Read and Write Workloads

## Status

validated

## Post Type

Technical comparison and decision guide

## Technologies Covered

- Apache Geode replicated and partitioned regions
- Apache Geode server, peer, and client region shortcuts
- Apache Geode `gfsh`
- Java client cache APIs
- Partitioned-region buckets, redundancy, persistence, recovery, and rebalancing
- Apache Geode OQL queries, indexes, and FunctionService
- `PartitionResolver`, data colocation, and Geode transactions
- Geode heap resource management and client single-hop routing

## Sources Consulted

- Apache Geode 2.0.2 release: https://github.com/apache/geode/releases/tag/rel/v2.0.2
- Apache Geode Region Types: https://geode.apache.org/docs/guide/latest/developing/region_options/region_types.html
- Apache Geode Region Data Stores and Data Accessors: https://geode.apache.org/docs/guide/latest/developing/region_options/data_hosts_and_accessors.html
- Apache Geode Storage and Distribution Options: https://geode.apache.org/docs/guide/latest/developing/region_options/storage_distribution_options.html
- Apache Geode Region Shortcuts: https://geode.apache.org/docs/guide/latest/basic_config/data_regions/region_shortcuts.html
- Apache Geode `RegionShortcut` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/RegionShortcut.html
- Apache Geode `ClientRegionShortcut` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientRegionShortcut.html
- Apache Geode `ClientCache` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientCache.html
- Apache Geode `gfsh create` command reference: https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/create.html
- Apache Geode `gfsh describe` command reference: https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/describe.html
- Apache Geode Understanding Partitioning: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/how_partitioning_works.html
- Apache Geode Configuring the Number of Buckets: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/configuring_bucket_for_pr.html
- Apache Geode Partitioned-Region Redundancy: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/set_pr_redundancy.html
- Apache Geode Member-Join Redundancy Recovery: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/set_join_redundancy_recovery.html
- Apache Geode Rebalancing Partitioned Region Data: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/rebalancing_pr_data.html
- Apache Geode `PartitionRegionHelper` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/partition/PartitionRegionHelper.html
- Apache Geode Standard Custom Partitioning: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/standard_custom_partitioning.html
- Apache Geode Client Single-Hop Configuration: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/configure_pr_single_hop.html
- Apache Geode Persistent-Region Startup and Recovery: https://geode.apache.org/docs/guide/latest/managing/disk_storage/starting_system_with_disk_stores.html
- Apache Geode Transaction Design Considerations: https://geode.apache.org/docs/guide/latest/developing/transactions/design_considerations.html
- Apache Geode Querying Partitioned Regions: https://geode.apache.org/docs/guide/latest/developing/querying_basics/querying_partitioned_regions.html
- Apache Geode Query Performance Considerations: https://geode.apache.org/docs/guide/latest/developing/querying_basics/performance_considerations.html
- Apache Geode Indexing Guidelines: https://geode.apache.org/docs/guide/latest/developing/query_index/indexing_guidelines.html
- Apache Geode Function Execution: https://geode.apache.org/docs/guide/latest/developing/function_exec/function_execution.html
- Apache Geode Partitioned-Region Equi-Joins: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/join_query_partitioned_regions.html
- Apache Geode Heap Management: https://geode.apache.org/docs/guide/latest/managing/heap_use/heap_management.html
- Apache Geode `AttributesMutator` Javadoc: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/AttributesMutator.html

## Issues Found

- The comparison table said that an ordinary partitioned-region query fans across “relevant buckets,” which could imply that Geode prunes buckets from a normal full-region OQL query. A typical full-region query is distributed to all buckets and its results are merged; targeting selected buckets requires function-context execution with a filter. The table now states that the typical full-region query fans across all buckets.
- The `D × N` and `D × 2` storage estimates did not explicitly limit `N` to data-hosting replicas or state that configured partition redundancy must actually be satisfied. The estimate now makes both conditions explicit because desired redundancy can be temporarily or permanently under-satisfied when too few eligible data stores are available.
- The bucket-assignment guidance omitted the ordering requirement for preassigning an empty region's buckets. It now says to preassign only after all intended data stores are running; preassignment creates unassigned buckets but does not redistribute buckets that have already been assigned.
- “Size heap below critical thresholds” treated a utilization threshold as if it were an absolute heap-size boundary. The sentence now says to size the workload and heap so that heap use remains below any configured critical threshold.

## Review Notes

- The two `create region` examples and the `describe region` command use current `gfsh` syntax and valid options. Explicitly setting `--total-num-buckets=113` is valid, although 113 is also the default.
- The Java client example uses current, non-deprecated `ClientCache.createClientRegionFactory(ClientRegionShortcut)` and `ClientRegionShortcut.PROXY` APIs. `clientCache` and `Order` are intentionally application-provided context.
- The replicated/partitioned placement, write fan-out, hot-key, rebalance, redundant-copy, persistence, recovery, and data-colocation explanations agree with the official documentation after the corrections above.
- The single-hop statement is correctly qualified with “when possible”: partitioned-region single-hop is enabled by default for client pools, learns bucket metadata lazily, and can fall back to a server-side hop.
- The persistent-transaction warning accurately reflects Geode's default prohibition and the non-crash-atomic behavior of disk writes when `gemfire.ALLOW_PERSISTENT_TRANSACTIONS` is enabled.
- Apache Geode 2.0.2 is the current release checked for this review. The official `releases/latest/javadoc` pages currently identify themselves as geode-core 2.0.0; the relevant shortcut APIs and `gfsh` command implementations are unchanged in the 2.0.2 source tag.
- All seven links in the post's Official Documentation section returned HTTP 200 and pointed to the intended Apache Geode content.
