# Find the Exact Cause of Aerospike Stop-Writes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Database, Monitoring, Troubleshooting

Description: Diagnose Aerospike stop-writes using live thresholds for memory, indexes, storage, set quotas, and clock skew before choosing a recovery action.

An application reports failed writes, but reads still work and the machines appear healthy. Aerospike may have activated stop-writes: a protective condition that rejects client writes before resource exhaustion or a consistency problem makes the situation worse.

The name describes the effect, not the cause. A namespace can stop accepting writes because of storage pressure while another is constrained by index memory. A particular set may have reached its quota. Clock skew can trigger write protection even when there is plenty of free space.

This guide uses **Database Enterprise Edition 8.2** and checks the administrative command against **asadm 5.2.0**. Older posts referring to `stop-writes-pct` or `min-avail-pct` need version translation; Database 7 changed these settings. Use the running configuration and the matching reference, not remembered defaults. [Configuration reference](https://aerospike.com/docs/database/reference/config/)

## Establish scope before changing anything

Record the client error, affected namespace and set, first failure time, and whether failures affect all keys or only part of the workload. Check each node: a cluster-wide average can hide the node that owns the failing partition.

Pause avoidable bulk imports or aggressive retry loops while collecting evidence. This limits additional pressure and preserves capacity for recovery work. Keep the application response deliberate: an unbounded retry queue may simply move the outage into another system.

Start with `show stop-writes`. It brings relevant configuration, usage, and thresholds together. With asadm installed, replace the seed address and namespace below. Include your deployment's normal authentication and TLS options.

```bash
asadm -h 10.20.0.11 -p 3000 \
  -e 'show stop-writes for test'
```

The command is read-only. Review every row's node, namespace, set, metric, and threshold. A `--` threshold means one is not configured, not that the value is zero. The namespace filter is a matching filter, so inspect returned names rather than assuming it selects exactly one namespace. [Live-mode command documentation](https://aerospike.com/docs/database/tools/asadm/live-mode/#stop-writes), [asadm 5.2.0 command implementation](https://github.com/aerospike/aerospike-admin/blob/5.2.0/lib/live_cluster/show_controller.py)

The summary is a diagnostic view, not an all-clear certificate. Correlate it with server flags and logs, particularly for container memory accounting, persisted indexes, or conditions an older tool does not fully expose.

## Keep raw evidence alongside the summary

Use `asinfo` to capture a node's service statistics, namespace statistics, and active configuration. Replace `test` and the example address; repeat on every relevant node with the same authentication and TLS configuration.

```bash
asinfo -h 10.20.0.11 -p 3000 -v build
asinfo -h 10.20.0.11 -p 3000 -v statistics -l
asinfo -h 10.20.0.11 -p 3000 -v 'namespace/test' -l
asinfo -h 10.20.0.11 -p 3000 \
  -v 'get-config:context=namespace;namespace=test' -l
```

Save complete output with collection times. Preserve the logs surrounding the transition into stop-writes. The requests are documented in the [info command reference](https://aerospike.com/docs/database/reference/info/). This evidence lets you revisit a diagnosis after a transient threshold clears.

## Match the resource to the correct threshold

These are distinct checks, even when a dashboard groups them under “memory” or “disk.” The current [key-metrics guide](https://aerospike.com/docs/database/observe/key-metrics/) explains which utilization metrics apply to each storage and index type.

| Resource | Evidence to compare | Interpretation |
|---|---|---|
| Overall system memory | Memory usage and `stop-writes-sys-memory-pct` | Includes pressure outside the namespace |
| RAM/shared-memory indexes | `indexes_memory_used_pct` and nonzero `indexes-memory-budget` | Combined applicable index usage has reached its budget |
| Namespace data occupancy | `data_used_pct` and `stop-writes-used-pct` | Stored data consumes too much configured capacity |
| Available write blocks | `data_avail_pct` and `stop-writes-avail-pct` | Too few blocks remain available for writes |
| Persisted indexes | `index_mounts_used_pct` or `sindex_mounts_used_pct` with mount configuration | Inspect primary and secondary index storage separately |
| One set's quota | Set count/size and configured limits | Other sets may remain writable |

For example, a hypothetical node with `data_used_pct=61` can still be blocked if `data_avail_pct=3` and its available-block threshold is 5. The two percentages are not complements. Occupied records and immediately reusable blocks describe different aspects of storage.

Likewise, an index budget is not a reservation of physical RAM. With a zero budget the index-specific cap is disabled; overall memory pressure still matters. Do not interpret a missing budget-utilization metric as evidence that indexes consume no memory.

## Separate used index memory from allocated memory

Deleting records can reduce used index space while allocated shared-memory stages remain for reuse. Consequently, an index-budget condition can clear without a corresponding drop in operating-system memory usage. A system-memory condition may persist after the same deletion workload. Aerospike documents this difference in its [memory-after-deletion guidance](https://support.aerospike.com/hc/en-us/articles/56255268033051-Why-doesn-t-system-memory-usage-go-down-after-records-expire-or-are-deleted).

Database 8.2 exposes additional allocation metrics, including `index_shmem_alloc_bytes`. Use them with used-byte metrics to explain the footprint. Account for other namespaces, application processes, and caches before concluding that the configured index budget is too small.

For containers, verify `cgroup-mem-tracking` and the actual container memory limit. From Database 8.1.2, this setting affects system-memory stop-writes evaluation when a control-group limit is detected. Host free memory can be misleading when the container has a smaller limit. [System-memory threshold documentation](https://aerospike.com/docs/database/reference/config/#stop-writes-sys-memory-pct)

## Investigate clock skew independently

Inspect `clock_skew_stop_writes`, `cluster_clock_skew_ms`, and `cluster_clock_skew_stop_writes_sec`. The observed skew is in milliseconds; the reported threshold is in seconds. Convert units before comparing them.

For strong-consistency namespaces, use the running server's reported threshold and logs instead of hard-coding a remembered number. For available-mode namespaces with NSUP enabled, the documented clock-skew protection is 40 seconds; a zero reported strong-consistency threshold does not disable that available-mode safeguard. [Clock-skew metrics](https://aerospike.com/docs/database/reference/metrics/)

Check the time-synchronization service on every node and its access to approved time sources. An unreachable time source, suspended virtual machine, or host clock issue warrants investigation. Restoring synchronization addresses the cause; raising storage thresholds does not. Follow the platform's clock-correction procedure rather than manually stepping a production database clock during an incident. [Clock synchronization guidance](https://aerospike.com/docs/database/manage/namespace/consistency/)

## Choose a recovery action that adds real headroom

For storage pressure, examine ingestion, retention, and defragmentation progress. For an index budget, inspect the growth of primary, set, and secondary indexes before changing capacity. For system memory, identify the actual allocations and competing processes. For a set quota, establish whether the workload exceeded an intentional business limit.

Increasing a threshold does not create capacity. Aerospike specifically cautions against lowering the available-block threshold below 5%, because replication, migration, and defragmentation need working room. [Available-block safeguard](https://aerospike.com/docs/database/reference/config/#stop-writes-avail-pct)

Avoid treating “delete records” as a universal immediate fix. Durable deletion creates tombstones, and storage reclamation takes separate work. Set-size restrictions also distinguish regular deletes from other deletion mechanisms. Review the relevant condition before executing a large cleanup operation.

An urgent capacity change should have a measured rationale, a scoped change plan, and a rollback point. If maintenance is required, preserve backups and cluster redundancy; a restart is not a substitute for understanding the threshold.

## Verify recovery under controlled traffic

Check that the relevant server flags clear on all affected nodes and that usage has meaningful distance from the limit. Then issue a small, authorized test write to a disposable key and verify its readback. Resume ordinary writers gradually while watching latency, errors, and resource trends.

Record the cause as a specific statement: “Node A's available-block percentage crossed its configured floor,” rather than “the cluster ran out of memory.” Preserve the measured value, configured threshold, affected scope, and corrective action in the incident record.

The commands were syntax-checked and compared with official documentation and tagged administrative source. No live server or stop-writes recovery was exercised; the numerical example is illustrative, not a measured incident.
