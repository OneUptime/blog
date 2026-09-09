# Validation Summary: How to Diagnose Frequent etcd Leader Elections with Latency Metrics

## Status

validated

## Post Type

Technical troubleshooting guide with etcdctl commands and PromQL examples.

## Technologies Covered

- etcd 3.6 and 3.7
- etcdctl and member status inspection
- Raft consensus, leader elections, and quorum
- Prometheus and PromQL counters, gauges, and classic histograms
- WAL fsync, backend commits, and database defragmentation
- Peer round-trip time and performance monitoring

## Sources Consulted

- [etcd 3.6 metric definitions](https://etcd.io/docs/v3.6/metrics/)
- [etcd 3.7 metric definitions](https://etcd.io/docs/v3.7/metrics/)
- [etcd 3.6.0 server metric implementation](https://github.com/etcd-io/etcd/blob/v3.6.0/server/etcdserver/metrics.go)
- [etcd 3.7.1 server metric implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/metrics.go)
- [etcd 3.7.1 peer metric implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/rafthttp/metrics.go)
- [etcd 3.7.1 peer probing implementation](https://github.com/etcd-io/etcd/blob/v3.7.1/server/etcdserver/api/rafthttp/probing_status.go)
- [etcdctl 3.7.1 command reference](https://github.com/etcd-io/etcd/blob/v3.7.1/etcdctl/README.md)
- [etcd cluster status guide](https://etcd.io/docs/v3.7/tasks/operator/how-to-check-cluster-status/)
- [etcd hardware recommendations](https://etcd.io/docs/v3.7/op-guide/hardware/)
- [etcd maintenance and defragmentation](https://etcd.io/docs/v3.6/op-guide/maintenance/)
- [etcd configuration options](https://etcd.io/docs/v3.7/op-guide/configuration/)
- [etcd timing and performance tuning](https://etcd.io/docs/v3.7/tuning/)
- [etcd runtime reconfiguration and quorum](https://etcd.io/docs/v3.7/op-guide/runtime-configuration/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus operators and vector matching](https://prometheus.io/docs/prometheus/latest/querying/operators/)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed both terminal commands and all five PromQL examples against official documentation and upstream source. No README.md changes were necessary.
- Confirmed that endpoint status and member list support table output. ETCDCTL_ENDPOINTS is the environment-variable form of the global endpoints flag; readers must configure and export it before executing the commands, along with their existing TLS and authentication settings.
- Confirmed the leader-change counter and leadership gauges. Per-member observations must not be summed as a count of distinct cluster elections. A maximum remains a coarse signal, as the post explains.
- Confirmed the WAL fsync and backend commit histogram names and their separate persistence roles. The dedicated WAL directory flag is supported. Storage latency, host contention, and maintenance are appropriate investigative leads rather than proof of causation.
- Confirmed in both v3.6.0 and v3.7.1 source that proposals_committed_total and proposals_applied_total are gauges. Their matching per-member difference is an appropriate estimate of unapplied committed work.
- Confirmed the case-sensitive To label on the peer RTT histogram. The probing implementation observes SRTT().Seconds(), supporting the distinction between sampled smoothed RTT and individual Raft-message latency. Simultaneous fsync and RTT increases warrant investigation but do not establish that the probe waits on WAL persistence.
- The histogram queries correctly apply rate before aggregation and retain le. The backlog subtraction uses default matching of non-name labels. Dashboard users must preserve cluster identity and any other labels needed to distinguish scrape targets, as the post advises.
- Confirmed that live defragmentation blocks reads and writes on the affected member and that longer election timeouts delay failure detection. Quorum preservation and sequential member recovery are appropriate operational guidance.
- Referenced technical documentation resolves to the intended resources. GitHub source was also checked through raw.githubusercontent.com where the rendered GitHub page could not be retrieved.
- Validation was a documentation and source review, not execution against a live etcd cluster or Prometheus server. Actual metric availability, scrape labels, credentials, and environmental causes require deployment-specific verification. Five-minute histogram windows and scrape intervals can smooth or obscure brief stalls; the post appropriately calls for logs and a shared timeline.
