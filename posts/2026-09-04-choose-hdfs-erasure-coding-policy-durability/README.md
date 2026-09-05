# Choose an HDFS Erasure Coding Policy for Equivalent Durability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, Erasure Coding, Durability, Fault Tolerance

Description: Compare HDFS erasure-coding policies with replicated storage using failure tolerance, topology, recovery exposure, and measured reliability rather than storage ratio alone.

---

There is no universally “replication-equivalent” HDFS erasure-coding policy. A Reed-Solomon policy and three replicas fail in different ways, touch different numbers of hosts, and spend different amounts of time rebuilding after a fault. The right comparison combines code math, physical placement, correlated failures, and operational recovery time.

Start with the deterministic guarantee: a systematic `k+m` Reed-Solomon block group is recoverable from any `k` intact internal blocks, so it tolerates up to `m` known erasures in that group. That is not the same statement as an end-to-end durability probability.

## Compare the Built-In Policies

Apache Hadoop 3.5 documents these built-in policies:

| Policy | Data `k` | Parity `m` | Full-stripe storage ratio | Erasures tolerated | Minimum DataNodes |
| --- | ---: | ---: | ---: | ---: | ---: |
| `XOR-2-1-1024k` | 2 | 1 | 1.50x | 1 | 3 |
| `RS-3-2-1024k` | 3 | 2 | 1.67x | 2 | 5 |
| `RS-6-3-1024k` | 6 | 3 | 1.50x | 3 | 9 |
| `RS-10-4-1024k` | 10 | 4 | 1.40x | 4 | 14 |
| `RS-LEGACY-6-3-1024k` | 6 | 3 | 1.50x | 3 | 9 |
| Three-way replication | 1 | 2 extra copies | 3.00x | Up to 2 replica losses | Placement-dependent |

The ratios apply to full stripes. Small files and tail stripes can have different effective overhead.

`RS-6-3-1024k` is Hadoop's configured system default and normally the only EC policy enabled by default. `RS-LEGACY-6-3-1024k` uses a different codec and has no native implementation in Hadoop's documented coder set; do not choose it merely because the `6+3` numbers match.

## Calculate a First-Order Risk Model

For a full block group, if every shard location independently has probability `p` of being unavailable at the same observation time, the block-group unavailability probability is:

```text
P(EC unavailable) = sum from i=m+1 to n of C(n,i) * p^i * (1-p)^(n-i)
where n = k + m
```

For a block with `r` independently placed replicas:

```text
P(replicated block unavailable) = p^r
```

These equations are useful for checking intuition, not for forecasting production durability. They assume identical, independent unavailability at a common observation time; temporary unavailability is not permanent data loss. Real outages are correlated by rack power, top-of-rack switches, storage-controller batches, software defects, maintenance, and operator actions. A large file can span many block groups, increasing its exposure; their risks cannot simply be multiplied when failures are correlated.

Use measured failure and repair distributions from your fleet. Model at least:

- a single drive or DataNode failure;
- a whole rack or power-domain outage;
- one failure followed by another during reconstruction;
- planned maintenance overlapping an unplanned fault;
- checksum-detected corruption and an unreadable reconstruction source.

## Make Topology Part of the Policy

Hadoop requires at least `k+m` DataNodes for a full stripe. For single-rack tolerance, its guide gives this minimum rack-count formula based on average occupancy; actual placement must also keep every rack at or below the parity count:

```text
minimum racks = ceil((k + m) / m)
```

This produces three racks for `RS-6-3`, three for `RS-3-2`, and four for `RS-10-4`. Hadoop says nine or more racks are ideal for `RS-6-3` when handling planned and unplanned outages. A policy can pass the node-count requirement yet fail the intended rack-level objective.

Verify the live topology rather than a spreadsheet:

```bash
hdfs ec -listPolicies
hdfs ec -verifyClusterSetup -policy RS-6-3-1024k
hdfs dfsadmin -report
hdfs dfsadmin -printTopology
```

If a 14-wide `RS-10-4` stripe cannot be placed across the required failure domains, its extra parity does not rescue a poor topology.

## Compare Recovery Exposure

Replication can normally restore one lost block by reading one surviving full copy. For a full block group, reconstructing one RS internal block requires reading from `k` surviving internal blocks, decoding, and sending the recovered block to a target. Short groups with fewer than `k` nonempty data blocks can require fewer source reads because missing data positions are known zeros. Hadoop performs those reads in parallel and accounts EC recovery against reconstruction scheduling with an `xmits` weight.

This changes the secondary-failure window:

```text
recovery time ~= bytes to reconstruct / effective end-to-end rebuild throughput
```

Benchmark effective throughput under contention. Network bisection bandwidth, source-disk queues, CPU, coder implementation, and throttling can dominate. Run `hadoop checknative` in each client and DataNode environment to check local ISA-L availability; one invocation does not inspect the entire cluster.

## Choose by Workload and Failure Domain

A practical selection process is:

1. Exclude mutable or `hsync()`-dependent data; keep it replicated.
2. Define the largest simultaneous failure domain the service must survive.
3. Reject policies whose `k+m` placement cannot satisfy that domain today.
4. Estimate correlated loss with fleet failure and repair data.
5. Benchmark normal, degraded, and reconstruction performance.
6. Pilot on a recoverable dataset with an independent copy.

`RS-3-2` may suit a smaller cluster that cannot place a 9-wide stripe. `RS-6-3` is a common balance of 50% overhead and three-erasure tolerance. `RS-10-4` is more space-efficient, but its wider placement and larger reconstruction fan-in may be a poor fit for a small or bandwidth-constrained topology. `XOR-2-1` is computationally simple but tolerates only one erasure.

## Verify the Decision on Real Files

With the candidate policy enabled and `/tmp/representative-1GiB.bin` prepared locally, create the pilot directory, assign the policy, write new canaries, and query the files:

```bash
hdfs dfs -mkdir -p /durability-pilot
hdfs ec -setPolicy -path /durability-pilot -policy RS-6-3-1024k
hdfs dfs -put /tmp/representative-1GiB.bin /durability-pilot/
hdfs ec -getPolicy -path /durability-pilot/representative-1GiB.bin
hdfs fsck /durability-pilot -files -blocks -locations
```

Run fault injection only in an isolated qualification cluster or an approved maintenance exercise. Confirm reconstruction completes within the recovery objective and validate the resulting bytes against an external SHA-256 manifest.

Finally, preserve an independent backup. Replication and EC both provide redundancy, not protection from namespace deletion, ransomware, application corruption, or a site-wide disaster.

## Conclusion

Replication-equivalent durability is an engineering target, not a policy-name lookup. Select `k+m` only after validating placement against real failure domains, modeling correlated loss, and measuring rebuild time under load. The policy that saves the most space is useful only if its topology and recovery window still meet the service's durability objective.

## Official Documentation

- [Apache Hadoop 3.5.0: HDFS Erasure Coding](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSErasureCoding.html)
- [Apache Hadoop source: SystemErasureCodingPolicies](https://github.com/apache/hadoop/blob/trunk/hadoop-hdfs-project/hadoop-hdfs-client/src/main/java/org/apache/hadoop/hdfs/protocol/SystemErasureCodingPolicies.java)
- [USENIX FAST: Open-Source Erasure Coding Libraries for Storage](https://www.usenix.org/legacy/event/fast09/tech/full_papers/plank/plank.pdf)
