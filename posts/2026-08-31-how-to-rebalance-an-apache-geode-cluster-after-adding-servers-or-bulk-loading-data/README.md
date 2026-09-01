# How to Rebalance an Apache Geode Cluster After Adding Servers or Bulk Loading Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Rebalancing, Performance, High Availability, Partitioning

Description: Simulate, execute, and verify a Geode partitioned-region rebalance while protecting transactions and recognizing skew that bucket movement cannot solve.

---

Adding an Apache Geode server creates storage capacity, but existing partitioned-region buckets may remain on the old members. A bulk load can also leave members uneven when bucket sizes differ. Rebalancing recovers missing redundancy and moves buckets and primary ownership to make partitioned-region utilization fairer across eligible data stores.

Rebalance affects partitioned regions, not replicated regions. It is an online data-movement operation, so simulate it, control its scope, and keep it away from sensitive transaction windows.

## Confirm the New Server Hosts the Region

Connect `gfsh` to the intended cluster and inspect membership and region configuration:

```text
gfsh> connect --locator=locator.example.net[10334]
gfsh> list members
gfsh> describe region --name=/Orders
```

The new server must define `/Orders` as a partitioned data store. A server that never received the region configuration, belongs to the wrong group, or defines the region as an accessor with `local-max-memory=0` cannot receive buckets.

Add all planned servers before moving data. Geode's documentation recommends one rebalance after starting multiple members; rebalancing after every server repeats transfers that the next run may undo.

Check these constraints before continuing:

- every data store has enough heap or off-heap capacity and compatible region attributes;
- persistent regions have healthy disk stores and no required member is still missing;
- colocated regions are all online with compatible bucket settings;
- WAN senders, async queues, and application load have enough headroom for movement; and
- no other rebalance is already running.

## Simulate Before Moving Data

Simulate all partitioned regions:

```text
gfsh> rebalance --simulate=true
```

Or scope the calculation to one region:

```text
gfsh> rebalance --include-region=/Orders --simulate=true
```

Simulation reports the bucket creates, bucket transfers, primary transfers, bytes, and estimated work without moving data. Save this output as a baseline. A zero-transfer result can be correct if the new server is not an eligible data store, if placement is already fair relative to configured capacity, or if fixed partitioning controls bucket locations.

Simulation is a snapshot, not a reservation. Continued writes, eviction, member changes, or recovery can make the actual result differ. Geode specifically notes that heap-LRU eviction between simulation and execution may change the placement calculation.

## Run a Scoped Rebalance

When the estimate and cluster headroom are acceptable, run:

```text
gfsh> rebalance --include-region=/Orders
```

Without an include or exclude list, Geode rebalances all partitioned regions. Includes take precedence over excludes. Prefer a small explicit scope during the first production run, especially when regions have very different sizes or service-level objectives.

By default `gfsh` waits for completion. The optional `--time-out` value is the number of seconds `gfsh` waits before returning while the rebalance continues in the background; it is not a cancellation deadline. Do not start a second rebalance merely because the prompt returned after a timeout.

For automation inside a Geode member, use the resource-manager API and wait for results:

```java
ResourceManager manager = cache.getResourceManager();
RebalanceOperation operation = manager.createRebalanceFactory()
    .includeRegions(Set.of("/Orders"))
    .start();

RebalanceResults results = operation.getResults();
System.out.printf(
    "timeMs=%d bucketBytes=%d bucketCreates=%d bucketTransfers=%d%n",
    results.getTotalTime(),
    results.getTotalBucketTransferBytes(),
    results.getTotalBucketCreatesCompleted(),
    results.getTotalBucketTransfersCompleted());
```

The API operation is asynchronous until `getResults()` waits for completion. Record the detailed per-region results as well as the totals; a global success can hide that one region had no eligible destination.

## Know What Rebalancing Can and Cannot Fix

Rebalancing places whole buckets. It does not split one hot key, change `total-num-buckets`, or replace a poor `PartitionResolver`.

If one routing object owns most entries or traffic, its bucket stays a single unit. Geode can put fewer large buckets on that member to improve memory balance, but the hot bucket's primary still handles that routing object's writes. Correct the key or resolver design through a migration if the business partition itself is skewed.

Fixed partitioned regions do not participate in normal rebalancing because the application has fixed their placement. Colocated regions move as a group so buckets with equal IDs remain together; including one member of a colocated group can therefore move more data than the named region alone suggests.

Replicated regions already hold a full copy on each replica and are not rebalanced. If a new server should host a replica, make sure it receives the replicated-region configuration and allow initial image transfer instead.

## Separate Rebalance from Restore Redundancy

Every rebalance first attempts to recover configured redundancy, then balances buckets. If the only goal is to recreate missing redundant copies without moving existing buckets between members, use the narrower operation:

```text
gfsh> restore redundancy --include-region=/Orders
```

`restore redundancy` creates missing copies and, by default, can reassign primary ownership for better balance, but it does not transfer existing buckets from one member to another. Set `--reassign-primaries=false` when even primary reassignment is not desired.

Use restore redundancy after a failure when capacity placement is acceptable. Use rebalance after adding capacity, removing capacity in a controlled way, or discovering materially uneven bucket placement.

## Protect Transactions and Latency

Geode warns that moving data during a transaction can cause transaction failure, including `TransactionDataRebalancedException`; the `TransactionDataNotColocatedException` API also notes movement as a possible cause. Keep important transactions short, schedule major rebalances during lower traffic, and make any retry policy idempotent.

Bucket transfer consumes network, CPU, serialization, heap, and disk bandwidth. Watch client latency, garbage collection, critical heap thresholds, disk queueing, WAN backlog, and server departures. If the cluster approaches a critical threshold, diagnose and reduce workload or cancel an API-started operation deliberately rather than launching overlapping corrective runs.

Bulk loading is often faster when data is loaded first and rebalanced once afterward. However, do not run old members so close to critical memory that they cannot survive the load before movement begins. Adding and validating capacity before the bulk load may be safer even if the final bucket move still happens afterward.

## Verify the Result

After completion:

```text
gfsh> list members
gfsh> describe region --name=/Orders
gfsh> show metrics --region=/Orders
gfsh> status redundancy --include-region=/Orders
gfsh> rebalance --include-region=/Orders --simulate=true
```

Compare member-level entry memory, bucket counts, primary counts, and configured capacity rather than expecting identical raw numbers. Geode balances the percentage of available region storage used, so members with different `local-max-memory` values should not necessarily hold equal bytes.

Verify application reads and writes, configured redundancy, query latency, and colocated-region functions. A second simulation should show little useful movement unless ongoing writes or topology changes materially altered placement. Preserve before/after output and duration so the next capacity change has an evidence-based estimate.

## Official Documentation

- [Rebalancing partitioned-region data](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/rebalancing_pr_data.html)
- [`gfsh rebalance` command](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/rebalance.html)
- [Restoring redundancy in partitioned regions](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/restoring_region_redundancy.html)
- [`gfsh restore redundancy` command](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/restore.html)
- [Partitioned-region high availability](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/configuring_ha_for_pr.html)
- [`RebalanceResults` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/control/RebalanceResults.html)

## Conclusion

Validate that new servers are eligible data stores, simulate the intended region scope, and rebalance once after capacity is ready. Interpret the results in terms of whole buckets and configured member capacity, use `restore redundancy` for the narrower recovery job, and protect transaction and latency budgets while data moves.
