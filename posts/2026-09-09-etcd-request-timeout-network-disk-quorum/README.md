# How to Diagnose etcd Request Timeouts Across Network, Disk, and Quorum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Troubleshooting, Monitoring, Performance, Networking

Description: Separate client connectivity, storage stalls, and consensus delays when investigating etcdserver request timed out errors.

---

`etcdserver: request timed out` describes a server-side operation that exceeded its time budget. It does not identify the component that consumed that budget. The slow path might be a leader waiting for peer acknowledgements, a saturated disk, or a member applying committed work. Client connection delays can instead cause a client-side deadline or connection error.

Start by locating the delay before changing timeouts. This workflow uses etcd 3.6 and 3.7 v3 commands and Prometheus metrics. It assumes three voting members with mutual TLS. Replace the example hostnames and certificate paths with your deployment's values, and collect evidence during a representative incident window.

## Establish which requests fail

Record the operation, endpoint, timestamp, duration, and client deadline. Separate a server-side timeout from `context deadline exceeded` in the application, since the application may cancel a request before the server's own deadline. Note whether the request is a put, a linearizable read, a serializable read, or a long-lived watch.

Configure an administrative shell without putting a password into the command line:

```bash
export ETCDCTL_ENDPOINTS='https://etcd1.example.com:2379,https://etcd2.example.com:2379,https://etcd3.example.com:2379'
export ETCDCTL_CACERT=/etc/etcd/pki/ca.crt
export ETCDCTL_CERT=/etc/etcd/pki/operator.crt
export ETCDCTL_KEY=/etc/etcd/pki/operator.key
etcdctl --dial-timeout=3s --command-timeout=5s endpoint status --write-out=table
etcdctl --dial-timeout=3s --command-timeout=5s endpoint health
etcdctl --command-timeout=5s alarm list
```

Use an authorized identity if RBAC is enabled. Query known members directly so a load balancer cannot hide which server responded. A status response establishes useful identity and Raft information; it does not by itself prove that a quorum-dependent application request will succeed.

## Compare local and consensus-dependent reads

Run the same bounded key read against each voting endpoint. The key may be absent; a successful empty read still measures the read path.

```bash
etcdctl --endpoints=https://etcd2.example.com:2379 \
  --command-timeout=5s get /diagnostics/read-probe --consistency=s
etcdctl --endpoints=https://etcd2.example.com:2379 \
  --command-timeout=5s get /diagnostics/read-probe --consistency=l
```

A serializable read uses the member's local applied state and can be stale. A linearizable read must establish a current view through the consensus machinery. If the first is fast and the second times out, inspect leader availability, peer communication, and replication before blaming DNS. If both are slow on one member, check that member's CPU, storage, and request queue. These are diagnostic clues, not proofs: network problems can coexist with disk stalls. The [API guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/) explain the consistency difference.

Do not silently switch production reads to serializable just to remove errors. That changes what the application may observe.

## Separate client and peer networking

Test from both the application's network and an etcd member's network. A client reaches port 2379, while members usually exchange peer traffic on 2380. A healthy client port says little about whether members can maintain a quorum.

Check resolution, packet loss, route changes, TLS failures, and load-balancer idle limits. Compare peer round-trip latency by source and destination rather than averaging the entire cluster:

```promql
histogram_quantile(0.99,
  sum by (instance, To, le) (
    rate(etcd_network_peer_round_trip_time_seconds_bucket[5m])
  )
)
```

`To` is the peer label in the documented metric; inspect your scraped labels and preserve your cluster label if multiple clusters share a Prometheus server. The [peer prober samples smoothed RTT](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/rafthttp/probing_status.go), so this percentile describes those samples rather than individual Raft-message latency. A high peer RTT may include remote processing delay, so correlate it with the destination's resources. ICMP ping is useful for a network baseline but is not an etcd request benchmark.

## Look at storage latency on every member

etcd must persist consensus data. Slow storage can delay normal work and also disrupt leadership. Plot these histograms separately per member:

```promql
histogram_quantile(0.99,
  sum by (instance, le) (
    rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
  )
)
```

```promql
histogram_quantile(0.99,
  sum by (instance, le) (
    rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])
  )
)
```

Check device latency, available space, filesystem errors, cloud volume limits, and concurrent backup or batch jobs. On Linux, `iostat -xz 1 10` provides device-level samples when sysstat is installed. Collect from the actual device backing the WAL and backend; they may be on different mounts.

Compare each time series with its own healthy baseline and your request budget. A five-minute p99 can hide a short stall when traffic volume is high, while a low-traffic histogram can be noisy. Inspect sample counts and shorter windows before declaring a fixed threshold universally safe. See the [documented metrics](https://etcd.io/docs/v3.7/metrics/) for their meanings.

## Inspect quorum and apply progress

Map the member list to current voting members and count the majority required. Learners do not add votes. A three-voter cluster requires two available voters; adding an unreachable fourth voter raises the majority to three.

Correlate pending proposals, failed proposals, leader changes, and the local difference between committed and applied proposals. The committed and applied `_total` series are gauges in etcd despite their suffix, so their difference is more appropriate than treating them as request counters. Persistent apply lag on one member suggests local work is falling behind; cluster-wide pending growth can indicate an inability to commit or excess demand.

Check logs for slow apply messages and heartbeat delays near the first application failure. An election after a disk stall is often a consequence of the original problem, not a separate root cause.

## Apply one repair and verify the same path

Remove confirmed competing I/O, fix a bad route, restore a failed voter, or reduce an identified overload source. Preserve quorum during member restarts. Repeat the same direct-endpoint reads and compare application latency over a similar load period.

Increase client deadlines only when normal measured latency and the application's service objective justify it. A timed-out mutation can still have committed, so retries require reconciliation or idempotency. Save the incident timeline and the specific evidence that improved after the change; a temporarily quiet cluster alone does not validate the repair.

## Conclusion

Use request type and endpoint-specific measurements to locate timeout latency. Compare local and linearizable reads, inspect both network paths, and correlate storage stalls with quorum progress before changing timing settings.

## Official Documentation

- [etcd metrics](https://etcd.io/docs/v3.7/metrics/)
- [etcd performance and consensus latency](https://etcd.io/docs/v3.7/op-guide/performance/)
- [etcd monitoring](https://etcd.io/docs/v3.6/op-guide/monitoring/)
- [etcd API guarantees](https://etcd.io/docs/v3.6/learning/api_guarantees/)
