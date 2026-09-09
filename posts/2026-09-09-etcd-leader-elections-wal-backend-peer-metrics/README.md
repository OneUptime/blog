# How to Diagnose Frequent etcd Leader Elections with Latency Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Monitoring, Troubleshooting, Performance, High Availability

Description: Correlate etcd leader changes with per-member WAL fsync, backend commits, peer RTT, and proposal lag to identify the underlying stall.

---

Repeated etcd leader elections interrupt requests and can amplify a modest resource problem into a cluster-wide incident. The election counter tells you that leadership changed, but the useful diagnosis comes from events immediately before that change.

Build a timeline that joins member identity, leader changes, storage latency, peer RTT, and workload activity. This walkthrough uses the metric names documented for etcd 3.6 and 3.7. Check your `/metrics` output and scrape labels before adding the queries to an existing dashboard.

## Identify which member lost leadership

Capture direct member status with the deployment's existing TLS and authentication configuration:

```bash
etcdctl endpoint status --write-out=table
etcdctl member list --write-out=table
```

Set `ETCDCTL_ENDPOINTS` to the explicit client URLs of all voting members. Record the member IDs, names, peer addresses, and which member reports itself as leader. This inventory connects an alert's `instance` label to an actual machine and device.

The counter below records leader changes observed by each member:

```promql
increase(etcd_server_leader_changes_seen_total[15m])
```

Do not sum it and call the result the number of elections. Multiple members can observe the same change, so summing over three members can count one event three times. Compare their timelines, or use a carefully scoped maximum for a coarse cluster-level signal while retaining the individual series for diagnosis. A restart can reset a counter, and scrape gaps can obscure brief transitions.

Plot `etcd_server_is_leader` and `etcd_server_has_leader` alongside the counter. Also annotate planned leadership transfers, member restarts, upgrades, and autoscaling activity. A deliberate transfer is different from an unexplained recurring loss.

## Start with WAL fsync

WAL persistence is on the consensus path. Graph a tail percentile per member, retaining the histogram bucket boundary:

```promql
histogram_quantile(0.99,
  sum by (instance, le) (
    rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
  )
)
```

If the old leader's fsync latency rises before the leader change, inspect the device behind its WAL. Common operational explanations include competing disk workloads, insufficient volume performance, storage errors, exhausted burst capacity, or a busy host. These are hypotheses to test with device metrics and logs.

A member that uses `--wal-dir` may write its WAL to a different filesystem from its backend database. Verify the effective paths before assigning the metric to the wrong disk. High throughput in megabytes per second does not guarantee fast small durable writes. etcd's [hardware guidance](https://etcd.io/docs/v3.7/op-guide/hardware/) places particular emphasis on storage latency.

## Compare backend commit latency separately

A backend commit reflects a different portion of persistence work. Plot it separately rather than combining both histograms:

```promql
histogram_quantile(0.99,
  sum by (instance, le) (
    rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])
  )
)
```

If backend latency rises with an apply backlog, the member may be struggling to materialize committed state. Correlate with large transaction volume, resource contention, and scheduled maintenance. Defragmentation blocks operations on the member being defragmented, so annotate its timing and avoid interpreting a known maintenance pause as an unexplained storage regression.

Look at this per-member difference:

```promql
etcd_server_proposals_committed_total
  - etcd_server_proposals_applied_total
```

Despite their `_total` names, both series are gauges in etcd. The difference estimates the local apply backlog. Compare matching label sets and avoid subtracting one member's applied value from another member's committed value. A short backlog during a burst may clear normally; persistent growth alongside latency needs investigation.

## Inspect peer RTT with direction preserved

Now compare the network-facing signal:

```promql
histogram_quantile(0.99,
  sum by (instance, To, le) (
    rate(etcd_network_peer_round_trip_time_seconds_bucket[5m])
  )
)
```

The `instance` identifies the observing member, and `To` identifies the remote peer. The [prober records smoothed RTT samples](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/rafthttp/probing_status.go), so this is a percentile of that sampled signal rather than individual Raft-message latency. Add your cluster label to each grouping when monitoring more than one cluster. A single aggregate graph hides asymmetric links and isolated bad members.

If peer RTT rises while storage stays at baseline, inspect packet loss, routes, interface errors, firewalls, host CPU pressure, and competing traffic. If RTT and remote fsync rise together, the peer's processing or storage delay may contribute. A measured peer RTT includes the behavior of the communicating systems; it is not a pure wire-latency measurement.

## Read the sequence, not just the correlation

Consider three example patterns:

| Timeline before the election | Working hypothesis | Next evidence |
| --- | --- | --- |
| Old leader fsync rises, then heartbeat warnings | Leader storage stall | Device queues and storage-provider metrics |
| One peer path RTT rises, disks stable | Link or remote host issue | Packet loss, route and CPU measurements |
| Apply backlog and backend latency rise under a write burst | Apply or persistence overload | Transaction sizes, competing work, CPU and disk saturation |

These patterns guide investigation; they do not uniquely prove a cause. Use logs from every voter over the same interval and account for clock skew. Search for heartbeat delays, slow apply requests, peer connection failures, and process restarts. An election can itself cause retries and extra work, so a metric that rises after the election may be a consequence.

## Verify the repair under comparable conditions

Apply the smallest supported repair: remove a confirmed competing job, provision suitable disk performance, resolve a broken peer path, or address a demonstrated workload spike. Preserve quorum for any restart and wait for the member to catch up before touching another.

Compare election frequency and application latency across equivalent load windows. Confirm that the original leading indicator improved. Increasing the election timeout can reduce observed elections while leaving request stalls intact, so approve timing changes only after inspecting the original delay and testing failure-detection behavior.

Use sustained thresholds and a separate availability alert when building alert rules. A single planned leadership transfer should not trigger the same response as repeated unplanned changes with failed client operations.

## Conclusion

Diagnose frequent elections by finding the first abnormal signal on the member or peer path that lost stability. Keep WAL, backend, network, and apply-progress measurements separate, then verify the repair against both leader stability and application latency.

## Official Documentation

- [etcd metric definitions](https://etcd.io/docs/v3.7/metrics/)
- [etcd hardware recommendations](https://etcd.io/docs/v3.7/op-guide/hardware/)
- [etcd maintenance and defragmentation](https://etcd.io/docs/v3.6/op-guide/maintenance/)
- [Server metric types](https://github.com/etcd-io/etcd/blob/v3.6.0/server/etcdserver/metrics.go)
