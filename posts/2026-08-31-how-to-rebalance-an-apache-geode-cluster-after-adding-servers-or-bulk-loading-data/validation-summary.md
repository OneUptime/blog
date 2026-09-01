# Validation Summary: How to Rebalance an Apache Geode Cluster After Adding Servers or Bulk Loading Data

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Apache Geode 2.0.0
- Apache Geode `gfsh`
- Java and the Geode Resource Manager rebalance API
- Partitioned, persistent, fixed-partitioned, colocated, and replicated regions
- Redundancy recovery, transactions, and cluster monitoring

## Sources Consulted

- [Apache Geode releases](https://geode.apache.org/releases/)
- [Apache Geode 2.0 host and Java requirements](https://geode.apache.org/docs/guide/20/getting_started/system_requirements/host_machine.html)
- [Rebalancing Partitioned Region Data](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/rebalancing_pr_data.html)
- [`gfsh rebalance`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/rebalance.html)
- [`gfsh connect`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/connect.html), [`list`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/list.html), and [`describe`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/describe.html) command references
- [Overview of the Cluster Configuration Service](https://geode.apache.org/docs/guide/latest/configuring/cluster_config/gfsh_persist.html)
- [Understanding Custom Partitioning and Data Colocation](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/custom_partitioning_and_data_colocation.html)
- [How Persistence and Overflow Work](https://geode.apache.org/docs/guide/latest/developing/storing_data_on_disk/how_persist_overflow_work.html)
- [Geode 2.0.0 rebalance implementation](https://github.com/apache/geode/blob/rel/v2.0.0/geode-core/src/main/java/org/apache/geode/internal/cache/control/RebalanceOperationImpl.java) and [path filter](https://github.com/apache/geode/blob/rel/v2.0.0/geode-core/src/main/java/org/apache/geode/internal/cache/control/FilterByPath.java)
- [Restoring Redundancy in Partitioned Regions](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/restoring_region_redundancy.html) and [`gfsh restore redundancy`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/restore.html)
- [`gfsh show metrics`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/show.html) and [`gfsh status redundancy`](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/status.html)
- [`ResourceManager`](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/control/ResourceManager.html), [`RebalanceFactory`](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/control/RebalanceFactory.html), [`RebalanceOperation`](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/control/RebalanceOperation.html), and [`RebalanceResults`](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/control/RebalanceResults.html) Javadocs
- [`RegionMXBean`](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/management/RegionMXBean.html) Javadoc
- [`TransactionDataRebalancedException`](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/TransactionDataRebalancedException.html) and [`TransactionDataNotColocatedException`](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/TransactionDataNotColocatedException.html) Javadocs

## Issues Found

- The eligibility explanation treated membership in the "wrong group" as an independent placement restriction. Member groups determine which group-level cluster configuration a server receives, but group membership alone does not exclude a server that otherwise defines the region. The text now ties the group example specifically to not receiving `/Orders` configuration.
- The introduction said rebalance recovers missing redundancy as an unconditional result. Geode attempts recovery but may be unable to satisfy configured redundancy when too few eligible data stores are available, so the claim is now qualified.
- The Java example called `RebalanceOperation.getResults()` without handling its checked `InterruptedException`. The example now catches the exception, restores the thread's interrupt status, and propagates the failure.
- The Java output label `bucketBytes` was ambiguous because the value comes specifically from `getTotalBucketTransferBytes()` and excludes redundant-bucket creation bytes. It is now labeled `bucketTransferBytes`.
- The results discussion referred to "global success," but `RebalanceResults` has aggregate totals rather than a global success flag. The wording now accurately refers to aggregate totals and per-region details.
- The colocation explanation implied that including any region in a colocated group selects the group. Geode schedules a normal rebalance through the group's leader region; naming only a child region does not select that leader. The post now explains the required scope and the resulting group movement.
- The restore-redundancy comparison said every rebalance first restores redundancy without qualifying fixed partitioned regions, which normal rebalance skips. The statement now applies to participating non-fixed partitioned regions.
- The resource-cost statement implied every bucket transfer consumes disk bandwidth. It now limits that claim to persistent or overflow regions and describes the general memory cost without assuming heap-backed region storage.
- The verification sequence used cluster-wide region metrics while asking readers to compare member-level values. A member-scoped `show metrics` example was added, and the text now distinguishes the bucket metrics exposed by `gfsh` from member-local `entrySize` and `localMaxMemory`, which are available through `RegionMXBean` or equivalent monitoring.

## Review Notes

The post was reviewed against Apache Geode 2.0.0, the current release. Geode 2.0.0 requires Java 17, so `Set.of(...)` is appropriate. All external documentation links already present in the post returned HTTP 200, and no reviewed Geode APIs are deprecated.
