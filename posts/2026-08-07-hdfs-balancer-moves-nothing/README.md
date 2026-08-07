# Why the HDFS Balancer Moves Nothing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Hadoop, HDFS, Balancer, Storage Policies, Troubleshooting

Description: Diagnose an HDFS Balancer that moves no blocks by checking thresholds, policies, eligible source-target pairs, storage types, pinned replicas, and local disk skew.

---

An HDFS Balancer run that moves zero bytes is not necessarily broken. It may have proved that every DataNode is within the requested utilization threshold, found no legal source-target pair, encountered blocks that cannot move without violating placement, or been asked to solve a different problem such as imbalance among disks inside one DataNode.

Start with the Balancer's final status and its selection criteria. Do not respond by immediately lowering the threshold or increasing bandwidth. Those settings cannot make an illegal move legal.

## Define What “Balanced” Means

The Balancer compares used capacity with average utilization. With the default `datanode` policy, a DataNode is considered balanced when its utilization is close enough to the cluster average for the relevant storage type. The `-threshold` argument supplies that allowed percentage-point difference:

```bash
hdfs balancer -threshold 10
```

A threshold of `10` does not mean “leave every disk below 90%.” If the cluster average is 62%, DataNodes near that average may already satisfy the run even when one operator expected an equal number of bytes everywhere. Heterogeneous node sizes also mean balanced nodes need not contain equal byte counts.

The command supports two policies:

```bash
hdfs balancer -policy datanode
hdfs balancer -policy blockpool
```

`datanode` is the default. In a federated cluster, `blockpool` is stricter because it balances each block pool on each DataNode, rather than only the DataNode's aggregate utilization for each storage type. Record the chosen policy when comparing two runs; they can legitimately reach different conclusions.

Before starting, capture the actual distribution:

```bash
hdfs dfsadmin -report
hdfs dfsadmin -printTopology
```

With the `datanode` policy, calculate utilization from configured capacity and remaining space for each DataNode, not only from the displayed `DFS Used%`. The standard report is DataNode-wide; in a mixed-storage cluster, obtain equivalent capacity and remaining metrics per storage type from DataNode or NameNode monitoring or APIs. If all eligible nodes are already within the threshold for each storage type, “no move” is the correct result.

## Read the Exit Reason, Not Just the Byte Counter

Keep the complete command output and shell exit status:

```bash
hdfs balancer -threshold 10 2>&1 | tee /tmp/hdfs-balancer.log
test "${PIPESTATUS[0]}" -eq 0
```

The example uses Bash's `PIPESTATUS`; use the equivalent for your shell. Search the log for whether the cluster was already balanced, no movable blocks were found, no progress was made for several iterations, another Balancer was active, or an upgrade prevented the run.

These outcomes have different remedies. “Already balanced” calls for checking the expectation. “No move progress” calls for investigating eligibility and placement. An I/O or connection failure calls for fixing the control path. Do not treat every quiet run as a throughput problem.

Only one Balancer should coordinate a nameservice at a time. Also verify that the client loaded the intended `fs.defaultFS`, nameservice configuration, and NameNode addresses:

```bash
hdfs getconf -confKey fs.defaultFS
hdfs getconf -nnRpcAddresses
```

It is surprisingly easy to inspect one cluster and invoke the Balancer against another configuration directory.

## Remove Accidental Scope Restrictions

Balancer scope flags can eliminate all useful candidates:

```bash
hdfs balancer \
  -include dn01.example.com,dn02.example.com \
  -source dn01.example.com \
  -blockpools BP-123-10.0.0.10-1700000000000
```

The command also accepts `-exclude`, and the host lists can come from files. Check wrapper scripts, service units, automation variables, and copied command history for stale restrictions. Confirm that:

- an over-utilized node is permitted as a source;
- at least one under-utilized node is permitted as a target;
- the requested block-pool ID belongs to the current namespace;
- source and target nodes are live, in service, and reachable; and
- decommission, maintenance, or host admission state has not removed a candidate.

Test with the smallest safe scope change that answers the question. Do not turn a carefully bounded maintenance run into a cluster-wide movement job without reviewing its traffic impact.

## A Movable Block Needs a Legal Destination

Utilization is only the first filter. For any candidate block, HDFS must find a target that preserves block-placement rules and does not already hold that replica. Depending on the cluster, constraints can include:

- replication factor and existing replica locations;
- rack awareness and upgrade domains;
- target storage type, which the Balancer preserves when moving a replica;
- available and reserved capacity on the target volume;
- DataNode health, staleness, and service state;
- blocks currently being written or otherwise unsuitable for movement; and
- the Balancer's configured source, target, and concurrency limits.

For example, adding empty nodes on the same rack does not necessarily make every move legal when doing so would reduce rack diversity. A nearly full cluster can also contain plenty of aggregate bytes free while no eligible target has enough usable space of the required storage type.

Inspect suspicious files and their placement:

```bash
hdfs fsck /data/example -files -blocks -locations -racks -storagepolicies
hdfs storagepolicies -getStoragePolicy -path /data/example
hdfs dfsadmin -report
```

Do not use `hdfs fsck -move` here. That option moves corrupt files into `/lost+found`; it is unrelated to capacity balancing.

## Distinguish Balancer, Mover, and Disk Balancer

Three similarly named tools solve different problems:

1. **Balancer** redistributes HDFS block replicas between DataNodes to reduce cluster-level utilization skew.
2. **Mover** relocates replicas among storage types so blocks comply with storage policies such as `HOT`, `WARM`, or `COLD`.
3. **Disk Balancer** addresses uneven use among volumes inside a single DataNode.

If SSD volumes are full while archive disks are empty, first decide whether the data's storage policy permits those archive targets. Changing DataNode utilization with Balancer cannot override a policy. After assigning the intended policy, choose either Storage Policy Satisfier (SPS) or Mover as supported by your version:

```bash
hdfs storagepolicies -setStoragePolicy -path /data/logs -policy COLD
```

With external SPS enabled and running, request satisfaction:

```bash
hdfs storagepolicies -satisfyStoragePolicy -path /data/logs
```

Alternatively, ensure SPS is disabled and run Mover:

```bash
hdfs mover -p /data/logs
```

If one DataNode is 60% used overall but one of its local volumes is 95% used, inspect Disk Balancer instead:

```bash
hdfs diskbalancer -query dn17.example.com
hdfs diskbalancer -plan dn17.example.com
```

Review any generated plan before execution. The cluster Balancer can move blocks away from or onto a DataNode, but it is not the tool for directly evening that node's internal volumes.

## Check Whether Replicas Are Pinned

HDFS has a block-pinning feature that prevents selected replicas from being moved by Balancer or Mover. It is disabled by default and controlled by:

```xml
<property>
  <name>dfs.datanode.block-pinning.enabled</name>
  <value>true</value>
</property>
```

Pinning does not freeze every replica on the DataNode. The official command guide says it affects blocks written to favored nodes through the create call when the feature is enabled. HBase is a typical locality-sensitive user.

Therefore, confirm both the effective setting and whether the immovable data was actually created with favored-node placement. Do not attribute a stalled cluster to pinning merely because the property exists in a template.

## Understand Upgrade and Snapshot Effects

The normal guidance is not to run Balancer during an HDFS upgrade. `-runDuringUpgrade` overrides that guard:

```bash
hdfs balancer -runDuringUpgrade
```

The command reference warns that movement during an upgrade may not reduce used space on over-utilized machines. Upgrade snapshots can retain the old block state needed for rollback, so copying and deleting current replicas does not necessarily release the expected local space. Prefer completing or finalizing the upgrade under the documented procedure before balancing unless there is a reviewed reason to override it.

HDFS snapshots can similarly make filesystem space persist after namespace changes. They do not inherently prohibit Balancer moves, but they can invalidate an operator's prediction that deleting or rewriting files should already have created target headroom.

## Tune Throughput Only After Eligibility

When moves are legal but slow, inspect the Balancer and DataNode logs, network saturation, volume latency, and movement limits. The administrator can change the per-DataNode balancing bandwidth without restarting DataNodes:

```bash
hdfs dfsadmin -setBalancerBandwidth 52428800
```

The value is bytes per second; this example is 50 MiB/s. Choose it from measured disk and network headroom. A value that is safe overnight may be disruptive during a shuffle-heavy workload.

The `-idleiterations` option controls how many idle iterations occur before the process exits. Raising it can help when temporary contention interrupts progress, but it cannot create a valid target:

```bash
hdfs balancer -threshold 10 -idleiterations 10
```

Likewise, lowering the threshold can request a more even result but may sharply increase data movement and may expose placement constraints. Make one change at a time, keep the full log, and compare bytes moved plus DataNode utilization after each run.

## A Practical Triage Sequence

Use this order to avoid tuning the wrong layer:

1. Confirm the target nameservice and retain the Balancer's final message and exit status.
2. Use `dfsadmin -report` to determine whether eligible DataNodes are already within the selected threshold.
3. Check `datanode` versus `blockpool` policy and remove unintended include, exclude, source, or block-pool filters.
4. Verify live, in-service source and target nodes with compatible storage types and usable capacity.
5. Inspect representative block locations, racks, replication, and storage policy.
6. Determine whether favored-node replicas are actually pinned.
7. Rule out an active upgrade and understand snapshot-retained space.
8. Use Mover for storage-policy compliance or Disk Balancer for within-node volume skew.
9. Tune bandwidth and idle iterations only when logs show legal work is progressing too slowly.

Re-run `hdfs dfsadmin -report` after the operation and compare against the recorded baseline. Successful balancing is a distribution outcome, not merely a long-running process or a large “bytes moved” number.

## Official Documentation

- [HDFS Commands Guide: Balancer, Mover, and Storage Policies](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSCommands.html)
- [HDFS Users Guide: Balancer](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HdfsUserGuide.html#Balancer)
- [HDFS Disk Balancer](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/HDFSDiskbalancer.html)
- [Archival Storage and Storage Policies](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/ArchivalStorage.html)
- [HDFS Default Configuration](https://hadoop.apache.org/docs/current/hadoop-project-dist/hadoop-hdfs/hdfs-default.xml)

## Conclusion

When HDFS Balancer moves nothing, first decide whether there is any legal work to do. Threshold and policy define the goal; scope filters, topology, storage type, capacity, service state, and pinning determine which moves are possible. Upgrades can hide released space, and local-volume or storage-policy skew belongs to different tools. Once eligibility is proven, bandwidth and iteration tuning can improve progress without masking the real cause.
