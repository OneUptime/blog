# How to Create Prometheus Alerts for Kubernetes etcd Leader Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Prometheus, etcd

Description: Learn how to build Prometheus alerts that monitor etcd leader elections, detect excessive leader changes, and track database compaction lag to maintain stable Kubernetes cluster operations.

---

etcd serves as the brain of your Kubernetes cluster, storing all cluster state. When etcd experiences leader changes or falls behind on compaction, cluster stability suffers. This guide teaches you how to create sophisticated Prometheus alerts that catch etcd issues before they cascade into cluster-wide problems.

## Understanding etcd Metrics

etcd exposes several critical metrics through Prometheus:

- `etcd_server_is_leader` - Binary metric indicating leader status
- `etcd_server_leader_changes_seen_total` - Counter of leader elections
- `etcd_mvcc_db_total_size_in_bytes` - Total database size
- `etcd_mvcc_db_total_size_in_use_in_bytes` - Size actually in use
- `etcd_debugging_mvcc_db_compaction_keys_total` - Compacted keys counter
- `etcd_disk_backend_commit_duration_seconds` - Disk commit latency

These metrics reveal etcd health and performance characteristics.

## Setting Up etcd Metrics Collection

Ensure Prometheus scrapes etcd metrics. For clusters created with kubeadm, first make sure the etcd metrics listener is reachable by Prometheus, for example by configuring `--listen-metrics-urls` to use a routable address. Then create a selectorless Service and EndpointSlice for the etcd metrics endpoints:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: etcd-metrics
  namespace: kube-system
  labels:
    component: etcd
    tier: control-plane
spec:
  type: ClusterIP
  clusterIP: None
  ports:
  - name: metrics
    port: 2381
    targetPort: 2381
    protocol: TCP
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: etcd-metrics-1
  namespace: kube-system
  labels:
    kubernetes.io/service-name: etcd-metrics
    endpointslice.kubernetes.io/managed-by: cluster-admin
    component: etcd
    tier: control-plane
addressType: IPv4
ports:
- name: metrics
  port: 2381
  protocol: TCP
endpoints:
- addresses:
  - "10.0.0.1"  # Your etcd node IP
  nodeName: master-1
- addresses:
  - "10.0.0.2"
  nodeName: master-2
- addresses:
  - "10.0.0.3"
  nodeName: master-3
```

Configure Prometheus to scrape etcd:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
      prometheus.yml: |
    scrape_configs:
    - job_name: 'etcd'
      kubernetes_sd_configs:
      - role: endpointslice
        namespaces:
          names:
          - kube-system
      scheme: http
      relabel_configs:
      - source_labels: [__meta_kubernetes_endpointslice_label_component]
        regex: etcd
        action: keep
```

## Detecting Excessive Leader Changes

Frequent leader elections indicate cluster instability. Create alerts for abnormal election rates:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-leader-alerts
  namespace: monitoring
spec:
  groups:
  - name: etcd_leader
    interval: 30s
    rules:
    # Alert on any leader change
    - alert: etcdLeaderChanged
      expr: |
        changes(etcd_server_is_leader[5m]) > 0
      for: 1m
      labels:
        severity: warning
        component: etcd
      annotations:
        summary: "etcd leader changed on {{ $labels.instance }}"
        description: "etcd cluster experienced a leader election. Instance {{ $labels.instance }} leader status changed."

    # Alert on frequent leader changes
    - alert: etcdFrequentLeaderElections
      expr: |
        increase(etcd_server_leader_changes_seen_total[15m]) > 3
      for: 5m
      labels:
        severity: critical
        component: etcd
      annotations:
        summary: "Frequent etcd leader elections detected"
        description: "etcd cluster on {{ $labels.instance }} has seen {{ $value }} leader elections in 15 minutes. This indicates cluster instability."

    # Alert when no leader exists
    - alert: etcdNoLeader
      expr: |
        sum(etcd_server_is_leader) < 1
      for: 1m
      labels:
        severity: critical
        component: etcd
      annotations:
        summary: "etcd cluster has no leader"
        description: "No etcd member is currently the leader. Cluster cannot process writes."

    # Alert on multiple leaders (split brain)
    - alert: etcdMultipleLeaders
      expr: |
        sum(etcd_server_is_leader) > 1
      for: 1m
      labels:
        severity: critical
        component: etcd
      annotations:
        summary: "Multiple etcd leaders detected (split brain)"
        description: "{{ $value }} etcd members believe they are leader. This indicates network partition or split brain scenario."
```

## Monitoring Database Compaction

etcd requires regular history compaction to avoid keyspace bloat, and defragmentation to return internally free database space to the filesystem. Create alerts for compaction and defragmentation lag:

```yaml
- name: etcd_compaction
  interval: 1m
  rules:
  # Alert when database size grows much larger than used size
  - alert: etcdDatabaseDefragmentationRequired
    expr: |
      (
        etcd_mvcc_db_total_size_in_bytes
        -
        etcd_mvcc_db_total_size_in_use_in_bytes
      )
      /
      etcd_mvcc_db_total_size_in_bytes
      > 0.5
    for: 10m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "etcd database needs defragmentation on {{ $labels.instance }}"
      description: "etcd database on {{ $labels.instance }} has {{ $value | humanizePercentage }} internally free space. Run defragmentation after compaction to reclaim disk space."

  # Alert when database grows too large
  - alert: etcdDatabaseTooLarge
    expr: |
      etcd_mvcc_db_total_size_in_bytes > 8 * 1024 * 1024 * 1024  # 8GB
    for: 5m
    labels:
      severity: critical
      component: etcd
    annotations:
      summary: "etcd database size exceeds recommended limit"
      description: "etcd database on {{ $labels.instance }} is {{ $value | humanize1024 }}B. Databases over 8GB can cause performance issues."

  # Alert when defragmentation is falling behind
  - alert: etcdDefragmentationFallingBehind
    expr: |
      (
        etcd_mvcc_db_total_size_in_bytes
        -
        etcd_mvcc_db_total_size_in_use_in_bytes
      ) > 1 * 1024 * 1024 * 1024  # 1GB unused
    for: 30m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "etcd defragmentation is falling behind"
      description: "etcd on {{ $labels.instance }} has 1GB+ of internally free database space. Run defragmentation after compaction to reclaim disk space."

  # Alert on high database growth rate
  - alert: etcdHighDatabaseGrowthRate
    expr: |
      deriv(etcd_mvcc_db_total_size_in_bytes[30m]) > (100 * 1024 * 1024) / 1800  # 100MB per 30min
    for: 15m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "etcd database growing rapidly"
      description: "etcd database on {{ $labels.instance }} is growing at {{ $value | humanize1024 }}B per second. Investigate what is driving growth."
```

## Monitoring Compaction Performance

Track compaction operation and backend commit performance:

```yaml
- name: etcd_compaction_performance
  interval: 1m
  rules:
  # Alert on slow backend commits
  - alert: etcdSlowBackendCommit
    expr: |
      histogram_quantile(
        0.95,
        rate(etcd_disk_backend_commit_duration_seconds_bucket[5m])
      ) > 0.5
    for: 10m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "etcd disk commits are slow"
      description: "etcd on {{ $labels.instance }} has p95 disk commit latency of {{ $value }}s. This may indicate disk I/O issues."

  # Alert on slow compaction
  - alert: etcdSlowMvccCompaction
    expr: |
      histogram_quantile(
        0.95,
        rate(etcd_debugging_mvcc_db_compaction_total_duration_milliseconds_bucket[5m])
      ) > 500
    for: 10m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "etcd MVCC compaction is slow"
      description: "etcd on {{ $labels.instance }} has p95 MVCC compaction duration of {{ $value }}ms."
```

## Detecting Member Failures

Alert when etcd cluster members become unavailable:

```yaml
- name: etcd_cluster_health
  interval: 30s
  rules:
  # Alert on available member count changes
  - alert: etcdAvailableMemberCountChanged
    expr: |
      changes(count(up{job="etcd"} == 1)[5m:]) > 0
    for: 5m
    labels:
      severity: critical
      component: etcd
    annotations:
      summary: "etcd available member count changed"
      description: "The number of scrapeable etcd members has changed. Verify all members are healthy."

  # Alert when cluster loses quorum
  - alert: etcdInsufficientMembers
    expr: |
      count(up{job="etcd"} == 1) < floor(count(up{job="etcd"}) / 2) + 1
    for: 3m
    labels:
      severity: critical
      component: etcd
    annotations:
      summary: "etcd cluster does not have quorum"
      description: "Only {{ $value }} etcd members are up. Quorum is lost. Cluster cannot process writes."

  # Alert on member communication issues
  - alert: etcdHighNumberOfFailedProposals
    expr: |
      increase(etcd_server_proposals_failed_total[15m]) > 5
    for: 15m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "High rate of failed etcd proposals"
      description: "etcd on {{ $labels.instance }} has {{ $value }} failed proposals in 15 minutes. This may indicate network issues or slow members."
```

## Monitoring Network Latency

Track network latency between etcd members:

```yaml
- name: etcd_network
  interval: 1m
  rules:
  # Alert on high peer latency
  - alert: etcdHighPeerRoundTripTime
    expr: |
      histogram_quantile(
        0.99,
        rate(etcd_network_peer_round_trip_time_seconds_bucket[5m])
      ) > 0.1
    for: 10m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "High etcd peer network latency"
      description: "etcd member {{ $labels.instance }} to {{ $labels.To }} has p99 RTT of {{ $value }}s. Network latency is high."

  # Alert on network failures
  - alert: etcdPeerNetworkFailures
    expr: |
      rate(etcd_network_peer_sent_failures_total[5m]) > 0.01
    for: 5m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "etcd peer network failures"
      description: "etcd on {{ $labels.instance }} is experiencing network send failures to peer {{ $labels.To }}."
```

## Comprehensive Leader Stability Dashboard

Create queries for Grafana dashboard showing leader stability:

```promql
# Current leader

max(etcd_server_is_leader) by (instance)

# Leader changes over time
increase(etcd_server_leader_changes_seen_total[1h])

# Time since last leader change
time() - max(
  max_over_time(
    ((changes(etcd_server_leader_changes_seen_total[5m]) > 0)
    * timestamp(etcd_server_leader_changes_seen_total))[24h:]
  )
) by (instance)

# Leader election rate
rate(etcd_server_leader_changes_seen_total[5m])
```

## Compaction Status Queries

Track compaction health in dashboards:

```promql
# Database size vs used size
etcd_mvcc_db_total_size_in_bytes
and
etcd_mvcc_db_total_size_in_use_in_bytes

# Percentage of reclaimable space
(
  etcd_mvcc_db_total_size_in_bytes
  -
  etcd_mvcc_db_total_size_in_use_in_bytes
)
/
etcd_mvcc_db_total_size_in_bytes * 100

# Compaction rate (keys per second)
rate(etcd_debugging_mvcc_db_compaction_keys_total[5m])

# Time since last compaction
time() - max by (instance) (
  max_over_time(
    ((changes(etcd_debugging_mvcc_db_compaction_keys_total[5m]) > 0)
    * timestamp(etcd_debugging_mvcc_db_compaction_keys_total))[24h:]
  )
)
```

## Automated Compaction Verification

Create recording rules to simplify compaction monitoring:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-recording-rules
  namespace: monitoring
spec:
  groups:
  - name: etcd_compaction_metrics
    interval: 1m
    rules:
    # Calculate reclaimable space percentage
    - record: etcd:db_reclaimable_space_percentage
      expr: |
        (
          etcd_mvcc_db_total_size_in_bytes
          -
          etcd_mvcc_db_total_size_in_use_in_bytes
        )
        /
        etcd_mvcc_db_total_size_in_bytes * 100

    # Track compaction lag
    - record: etcd:compaction_lag_seconds
      expr: |
        time() - max by (instance) (
          max_over_time(
            ((changes(etcd_debugging_mvcc_db_compaction_keys_total[5m]) > 0)
            * timestamp(etcd_debugging_mvcc_db_compaction_keys_total))[1h:]
          )
        )

    # Leader stability score
    - record: etcd:leader_stability_score
      expr: |
        1 / (increase(etcd_server_leader_changes_seen_total[1h]) + 1)
```

## Debugging Leader Election Issues

When alerts fire, use these queries to investigate:

```promql
# Show which instance is leader
etcd_server_is_leader == 1

# Show instances that see frequent elections
topk(5, increase(etcd_server_leader_changes_seen_total[15m]))

# Check pending consensus proposals
etcd_server_proposals_pending

# Check for slow disk operations
histogram_quantile(
  0.99,
  rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
)
```

## Conclusion

Monitoring etcd leader elections and compaction lag is critical for Kubernetes cluster stability. Frequent leader changes indicate network issues or resource constraints, while compaction lag leads to database bloat and performance degradation. The Prometheus alerts and queries in this guide give you early warning of etcd issues before they impact your cluster.

Start with basic leader change and compaction alerts, then expand to cover network latency, member health, and performance metrics. Combine these alerts with dashboards that visualize trends over time, helping you catch issues early and maintain a stable, performant Kubernetes control plane.
