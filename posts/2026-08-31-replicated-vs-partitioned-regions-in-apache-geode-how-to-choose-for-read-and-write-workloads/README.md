# Replicated vs Partitioned Regions in Apache Geode: How to Choose for Read and Write Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Caching, Partitioning, Performance, High Availability

Description: Choose between Geode replicated and partitioned server regions by comparing memory growth, read locality, write fan-out, query behavior, and failure tolerance.

---

Two common Apache Geode server data-region choices are replication and partitioning. A replicated region stores the complete data set on every data-hosting member. A partitioned region divides entries into buckets and spreads those buckets across data stores, optionally keeping redundant bucket copies. Geode also supports local, distributed non-replicated, proxy, and other policies; this comparison focuses on the two usual choices for shared server data.

The practical default for a large or growing data set is partitioning. Replication is compelling when the data set is bounded, fits comfortably in every participating member, and peer-side local reads matter enough to pay the memory and write-distribution cost.

## Compare the Two Models

| Concern | Replicated region | Partitioned region |
| --- | --- | --- |
| Data placement | Every replica holds all entries | Buckets are distributed across data stores |
| Memory growth | Full data size on each replica | Data plus redundant copies spread across cluster |
| Peer read | Local on a replica | Routed to the member holding the bucket |
| Client read | A `PROXY` read or client-cache miss goes to a cache server | Same, but single-hop metadata can route directly to the bucket host |
| Write cost | Update distributed to every replica | Update sent to primary and configured redundant copies |
| Scale-out capacity | New replica adds another full copy | New data store adds usable capacity after bucket assignment/rebalance |
| Failure tolerance | Other replicas retain the full region | Controlled by `redundant-copies`, recovery, and persistence |
| Large distributed query | Local full copy may simplify peer query | Query fans across relevant buckets and merges results |
| Data-aware compute | Every replica has all data | Functions can run where selected buckets reside |

For a logical data size of `D` on `N` equal members, replication consumes roughly `D × N` before object, index, and product overhead. A partitioned region with one redundant copy stores roughly `D × 2` across the cluster, again before overhead. These are capacity-planning approximations, not heap-sizing formulas; serialization form, indexes, eviction, and bucket metadata all matter.

## Choose Replication for Bounded Reference Data

Replication works well for small-to-medium data that many peer processes read repeatedly, such as exchange rates, product rules, or feature configuration. Each replica can serve a peer read from its own heap without a bucket-routing hop.

Create a replicated region with `gfsh`:

```text
gfsh> create region --name=ReferenceRates --type=REPLICATE
gfsh> describe region --name=/ReferenceRates
```

Replication is not free read performance. Every write must be distributed to the members hosting replicas, and each index is also maintained on those members. As the number of replicas grows, write traffic and total memory grow with it. A frequently updated, unbounded event or session data set is therefore a poor replication candidate even if its current test fixture is small.

Do not describe replication as a universal consistency upgrade. Geode's concurrency checks and region scope govern how concurrent updates are reconciled, while transactions add their own semantics. Choose replication for placement and access behavior, then configure consistency and durability deliberately.

## Choose Partitioning for Scale and Write Throughput

Partitioning is designed for data sets too large for one member and for throughput that should scale with added servers. Geode hashes each entry's routing object into one of `total-num-buckets` buckets. One member owns the primary bucket; other members may own redundant copies.

```text
gfsh> create region \
  --name=Orders \
  --type=PARTITION \
  --redundant-copies=1 \
  --total-num-buckets=113
```

With one redundant copy, a write normally affects the primary and one secondary rather than every server in the cluster. Adding servers creates capacity, but existing buckets do not automatically become evenly placed merely because a new process started. Assign buckets for a new empty region or run a controlled rebalance for an existing region.

Partitioning does not cure a bad key distribution. A hot routing object maps to one bucket and therefore one primary member. Use keys with stable, well-distributed `hashCode` behavior, or a `PartitionResolver` that intentionally groups related data without concentrating most traffic in a few routing values.

## Treat Client Regions as a Separate Choice

`RegionShortcut.REPLICATE` and `RegionShortcut.PARTITION` describe peer/server storage. A Java client uses `ClientRegionShortcut` instead:

```java
Region<String, Order> orders = clientCache
    .<String, Order>createClientRegionFactory(ClientRegionShortcut.PROXY)
    .create("Orders");
```

`PROXY` keeps no local client data; `CACHING_PROXY` keeps a client cache. Neither changes the server's `/Orders` region from partitioned to replicated. Enabling client caching should be decided from staleness, interest registration, memory, and read patterns, not confused with server-tier replication.

Geode's partitioned-region single-hop optimization is enabled by default for client pools. It lets a client learn bucket locations and route operations directly to the appropriate server when possible. This reduces the routing penalty, but it does not make all data local to the client.

## Plan High Availability Independently

A nonpersistent partitioned region with zero redundant copies can lose entries when a data host leaves. Configure one or more redundant copies when availability requires them; Geode supports up to three extra copies. More copies consume more memory and make writes do more work.

Persistence is another axis. `REPLICATE_PERSISTENT` and persistent partitioned shortcuts preserve region data in disk stores, subject to Geode's startup and recovery rules. Persistence does not eliminate the need for live redundancy when the application must continue serving through a member failure, and redundancy does not replace backups. Geode also rejects persistent-region operations inside atomic transactions by default; its opt-in override does not make the transaction's disk writes crash-atomic.

For either model, size heap below critical thresholds, include indexes and copies in the budget, and test member loss under realistic load. “There are two servers” is not evidence that a partitioned region has a redundant copy or that a persistent replica is currently online.

## Account for Queries and Functions

A replicated region can make peer-side queries cheap because each replica has the complete data set. On partitioned regions, Geode sends a full-region query to bucket hosts and combines results. Large result sets can still exhaust the member or client collecting them, so use selective predicates, indexes, projections, and limits where semantics allow.

Partitioning is stronger for data-aware parallel compute. Execute a function on a region, optionally with a key filter, so work runs on members that host the relevant buckets. Colocate related partitioned regions when a transaction or supported equi-join must access them on the same data host.

Do not choose replication solely to make an accidental full scan look faster. First determine whether a point `get`, `getAll`, index, better key, or filtered function better matches the workload.

## Make the Decision with Measurements

Use a representative data volume and measure:

- serialized entry and index memory per member;
- peer and client read latency, including cache hit rate;
- write latency and network bytes as member count changes;
- query selectivity, result size, and index maintenance cost;
- recovery time after a member leaves; and
- rebalance time after adding capacity.

If the complete projected data set, indexes, and safety margin do not fit comfortably in every replica, partition. If the set is deliberately small, mostly read, and needed locally by every peer, replication is simpler. Mixed applications commonly use both: replicated reference regions alongside partitioned operational regions.

Changing a region's fundamental data policy is not a casual live attribute edit. Plan a new region, migrate or reload data, switch clients, and retire the old region with a rollback strategy.

## Official Documentation

- [Region types](https://geode.apache.org/docs/guide/latest/developing/region_options/region_types.html)
- [Storage and distribution options](https://geode.apache.org/docs/guide/latest/developing/region_options/storage_distribution_options.html)
- [Region shortcuts](https://geode.apache.org/docs/guide/latest/basic_config/data_regions/region_shortcuts.html)
- [Partitioned-region high availability](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/configuring_ha_for_pr.html)
- [Transaction design considerations](https://geode.apache.org/docs/guide/latest/developing/transactions/design_considerations.html)
- [Querying partitioned regions](https://geode.apache.org/docs/guide/latest/developing/querying_basics/querying_partitioned_regions.html)
- [`ClientRegionShortcut` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientRegionShortcut.html)

## Conclusion

Use replication for bounded, read-heavy data that benefits from a full local copy on each peer. Use partitioning for large or growing data, scalable writes, and data-aware compute, adding enough redundant copies for the required availability. Make persistence, client caching, indexing, and key distribution explicit decisions around that core placement choice.
