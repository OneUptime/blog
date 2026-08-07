# Decommission an HDFS DataNode Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, DataNode, Decommissioning, Operations

Description: Remove an HDFS DataNode without losing redundancy by checking capacity, updating host state, waiting for replication, and verifying decommission completion.

---

Stopping a DataNode is not decommissioning it. An abrupt stop makes its replicas unavailable and asks the NameNode to recover after a failure. Decommissioning first marks the node unavailable for new placement, copies its needed replicas elsewhere, and transitions it to `DECOMMISSIONED` only after HDFS's safety conditions are met.

The process can move a large amount of data and metadata work. Plan capacity, topology, and recovery load before changing host state.

## Choose Decommission or Maintenance

Use **decommission** for permanent removal or long work lasting days or weeks. The official DataNode Admin Guide describes the transition:

```text
NORMAL -> DECOMMISSION_INPROGRESS -> DECOMMISSIONED
```

Use **maintenance state** for short, planned work where fully reproducing every replica would be wasteful. A node enters maintenance after its blocks meet a configured minimum replication threshold, and maintenance can have an expiry time.

Maintenance requires the JSON-based host provider. The default hostname-only `dfs.hosts` and `dfs.hosts.exclude` format supports decommission and recommission, not maintenance state.

Do not select maintenance merely because decommission is slow. The expected outage length and tolerated redundancy determine the safe state.

## Preflight the Cluster

Capture the baseline:

```bash
hdfs dfsadmin -report
hdfs dfsadmin -report -live
hdfs fsck / -list-corruptfileblocks
```

Check:

- no missing or corrupt blocks are being ignored;
- current under-replication and pending replication are understood;
- enough eligible capacity remains after removing the node;
- each storage policy still has eligible target volumes;
- rack and upgrade-domain diversity can still satisfy placement;
- no overlapping node, rack, or disk maintenance removes the other replicas;
- NameNode is operational rather than in safe mode; and
- replication traffic fits network and disk headroom.

Calculate raw data on the target node and expected replica movement from `dfsadmin -report`, but do not assume every byte must move. Some blocks already have sufficient replicas elsewhere; others may need one or more new copies.

In a federated cluster, the DataNode serves multiple block pools. Decommission it through every NameNode/nameservice that uses it. Completion in one namespace does not prove all block pools are safe.

## Verify the Exact Host Identity

Discover the effective host files:

```bash
hdfs getconf -includeFile
hdfs getconf -excludeFile
hdfs dfsadmin -printTopology
```

Match the hostname or IP exactly as the NameNode knows the DataNode. Short names, fully qualified names, multiple interfaces, and reused addresses are common sources of decommissioning the wrong identity or no identity at all.

Record the DataNode UUID, transfer address, rack, storage types, and change ticket. Resolve every proposed target before editing the shared configuration.

## Start Decommissioning with Hostname Files

In the default host-provider mode, keep the node in `dfs.hosts` if an include list is used, and add it to the file configured by `dfs.hosts.exclude`:

```text
dn17.example.com
```

Deploy the updated file to the active NameNode's effective configuration path and reload host state:

```bash
hdfs dfsadmin -refreshNodes
```

In HA, keep host configuration consistent across NameNodes so failover does not restore stale policy. Use your configuration-management rollout, then confirm the active loaded the intended state.

The DataNode should transition to `DECOMMISSION_INPROGRESS`. HDFS stops choosing it for new replicas while the NameNode arranges required copies elsewhere.

## Use JSON Host State When Configured

With `CombinedHostFileManager`, the `dfs.hosts` JSON file carries the admin state:

```json
[
  {
    "hostName": "dn17.example.com",
    "adminState": "DECOMMISSIONED"
  }
]
```

The value expresses desired admin state; after `-refreshNodes`, the live node still passes through `DECOMMISSION_INPROGRESS` while HDFS satisfies replication. Preserve every other host entry and property in the file. Replacing the file with a one-node example would alter membership for the whole cluster.

## Monitor Progress Without Restarting the Node

Keep the DataNode alive throughout decommission. It can serve source replicas while HDFS copies them. Stopping it early removes a valuable source and can strand blocks whose only live copy was on that node.

Monitor the state:

```bash
hdfs dfsadmin -report -decommissioning
hdfs dfsadmin -report
```

Use a scoped `fsck` when a known tree is blocking progress:

```bash
hdfs fsck /critical/path -files -blocks -locations
```

Relevant NameNode metrics include `NumDecommissioningDataNodes`, under-replicated blocks, pending replication blocks, missing blocks, and badly distributed blocks. Also watch:

- DataNode and rack network throughput;
- disk read/write latency;
- NameNode RPC and lock pressure;
- replication queue growth;
- application latency; and
- new failed volumes or dead nodes.

Decommission large nodes in controlled batches. Removing several nodes from the same rack simultaneously can erase the destinations needed to preserve rack diversity.

## Diagnose a Stuck Decommission

A node remains `DECOMMISSION_INPROGRESS` when HDFS cannot satisfy all relevant safety conditions. Common causes include:

- insufficient remaining capacity;
- requested replication greater than eligible node count;
- an unavailable storage type required by policy;
- rack, node-group, or upgrade-domain placement constraints;
- another replica on a dead or decommissioning node;
- blocks open for write;
- corrupt or missing source replicas;
- throttled or backlogged replication work; and
- NameNode safe mode.

Capture NameNode log messages and block details. Do not simply remove the host entry, stop the daemon, or lower replication globally to force a state change.

For very large nodes, current Hadoop documents an experimental backing-off decommission monitor intended to reduce NameNode lock impact. It is disabled by default. Treat it as a separately tested feature, not an incident-time toggle.

## Verify Completion Before Shutdown

The gate is the NameNode admin state, not elapsed time:

```bash
hdfs dfsadmin -report
```

Confirm the target is `Decommissioned`, not `Decommission In Progress`. Then verify:

- no new missing or corrupt blocks;
- under-replication returned to the accepted baseline;
- critical paths have healthy placement;
- all federated nameservices show completion;
- applications no longer read from or write to the node; and
- monitoring and inventory identify it as intentionally retired.

Only then stop the DataNode using the service manager deployed in your environment. Preserve disks until the rollback and data-retention policy permits sanitization. A decommissioned DataNode is not automatically shut down, and HDFS completion does not authorize immediate destruction of hardware evidence.

## Recommissioning

If removal is canceled, restore the desired host state and reload:

```bash
hdfs dfsadmin -refreshNodes
```

For hostname mode, remove the host from `dfs.hosts.exclude` while keeping it allowed by `dfs.hosts`. For JSON mode, set its desired `adminState` to `NORMAL`. Verify it returns to in-service state and that its storage identity and data directories have not been reformatted.

Recommissioning can leave data distribution uneven. The cluster Balancer may be appropriate afterward, but run it as a separate, observed operation. It is not part of proving replica safety during decommission.

## Capacity Example

Suppose a 12-node cluster has 100 TiB usable per node and is 75% full. Removing one node leaves 1,100 TiB raw capacity for roughly 900 TiB of used data, or about 82% average utilization before considering reserved space and storage types.

That arithmetic does not prove feasibility. If the removed node contains 40 TiB of `SSD` blocks and the remaining SSD tier has only 20 TiB free, aggregate `DISK` space cannot satisfy that policy. Perform the calculation per storage type and failure domain.

## Operational Checklist

1. Select decommission or maintenance from the expected outage.
2. Confirm HDFS health and per-policy capacity.
3. Freeze overlapping maintenance in the affected failure domains.
4. Resolve and record the exact DataNode identity.
5. Update the correct host provider and reload nodes.
6. Keep the DataNode running while replicas move.
7. Monitor admin state, replication queues, and application impact.
8. Investigate every blocker rather than forcing completion.
9. Verify `DECOMMISSIONED` across all nameservices.
10. Stop, retain, and eventually sanitize the host according to policy.

## Official Documentation

- [HDFS DataNode Admin Guide](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsDataNodeAdminGuide.html)
- [HDFS Commands Guide: `dfsadmin`](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html#dfsadmin)
- [HDFS Users Guide: host refresh and decommission](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsUserGuide.html#DFSAdmin_Command)
- [HDFS Federation: decommissioning](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/Federation.html#Decommissioning)
- [HDFS default configuration](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/hdfs-default.xml)

## Conclusion

Safe DataNode removal is a replication workflow governed by NameNode state. Prove remaining capacity and placement first, mark the node for decommission, keep it alive as a source, and wait for `DECOMMISSIONED` in every relevant nameservice. Only that evidence—not a quiet process or an elapsed maintenance window—makes shutdown safe.
