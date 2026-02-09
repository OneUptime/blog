# How to Create Prometheus Alerts for Kubernetes etcd Leader Changes and Compaction Lag

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

Ensure Prometheus scrapes etcd metrics. For clusters created with kubeadm:

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
  selector:
    component: etcd
    tier: control-plane
---
apiVersion: v1
kind: Endpoints
metadata:
  name: etcd-metrics
  namespace: kube-system
  labels:
    component: etcd
    tier: control-plane
subsets:
- addresses:
  - ip: 10.0.0.1  # Your etcd node IP
    nodeName: master-1
  - ip: 10.0.0.2
    nodeName: master-2
  - ip: 10.0.0.3
    nodeName: master-3
  ports:
  - name: metrics
    port: 2381
    protocol: TCP
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
      - role: endpoints
        namespaces:
          names:
          - kube-system
      scheme: https
      tls_config:
        ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        cert_file: /etc/prometheus/secrets/etcd-certs/client.crt
        key_file: /etc/prometheus/secrets/etcd-certs/client.key
      relabel_configs:
      - source_labels: [__meta_kubernetes_service_label_component]
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
        rate(etcd_server_leader_changes_seen_total[15m]) > 3
      for: 5m
      labels:
        severity: critical
        component: etcd
      annotations:
        summary: "Frequent etcd leader elections detected"
        description: "etcd cluster on {{ $labels.instance }} is experiencing {{ $value }} leader elections per second. This indicates cluster instability."

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

etcd requires regular compaction to reclaim space. Create alerts for compaction lag:

```yaml
- name: etcd_compaction
  interval: 1m
  rules:
  # Alert when database size grows much larger than used size
  - alert: etcdDatabaseCompactionRequired
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
      summary: "etcd database needs compaction on {{ $labels.instance }}"
      description: "etcd database on {{ $labels.instance }} has {{ $value | humanizePercentage }} unused space. Run compaction to reclaim disk space."

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

  # Alert when compaction is falling behind
  - alert: etcdCompactionFallingBehind
    expr: |
      rate(etcd_debugging_mvcc_db_compaction_keys_total[5m]) == 0
      and
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
      summary: "etcd compaction not running"
      description: "etcd on {{ $labels.instance }} has not compacted data recently despite 1GB+ of reclaimable space."

  # Alert on high database growth rate
  - alert: etcdHighDatabaseGrowthRate
    expr: |
      deriv(etcd_mvcc_db_total_size_in_bytes[30m]) > 100 * 1024 * 1024  # 100MB per 30min
    for: 15m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "etcd database growing rapidly"
      description: "etcd database on {{ $labels.instance }} is growing at {{ $value | humanize1024 }}B per second. Investigate what is driving growth."
```

## Monitoring Compaction Performance

Track compaction operation performance:

```yaml
- name: etcd_compaction_performance
  interval: 1m
  rules:
  # Alert on slow compaction
  - alert: etcdSlowCompaction
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

  # Alert on compaction errors
  - alert: etcdCompactionErrors
    expr: |
      rate(etcd_debugging_mvcc_db_compaction_total_duration_milliseconds_count[5m])
      -
      rate(etcd_debugging_mvcc_db_compaction_keys_total[5m])
      > 0
    for: 5m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "etcd compaction errors detected"
      description: "etcd on {{ $labels.instance }} is experiencing compaction errors."
```

## Detecting Member Failures

Alert when etcd cluster members become unavailable:

```yaml
- name: etcd_cluster_health
  interval: 30s
  rules:
  # Alert on member count changes
  - alert: etcdMemberCountChanged
    expr: |
      changes(etcd_server_has_leader[5m]) > 0
    for: 5m
    labels:
      severity: critical
      component: etcd
    annotations:
      summary: "etcd cluster membership changed"
      description: "etcd cluster membership has changed. Verify all members are healthy."

  # Alert when cluster loses quorum
  - alert: etcdInsufficientMembers
    expr: |
      count(up{job="etcd"} == 1) < ((count(up{job="etcd"}) / 2) + 1)
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
      rate(etcd_server_proposals_failed_total[15m]) > 5
    for: 15m
    labels:
      severity: warning
      component: etcd
    annotations:
      summary: "High rate of failed etcd proposals"
      description: "etcd on {{ $labels.instance }} has {{ $value }} failed proposals per second. This may indicate network issues or slow members."
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
    (etcd_server_is_leader == 1) * timestamp(etcd_server_is_leader)
    [24h]
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
time() - max(
  max_over_time(
    (etcd_debugging_mvcc_db_compaction_keys_total > 0) *
    timestamp(etcd_debugging_mvcc_db_compaction_keys_total)
    [24h]
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
        time() - max(
          max_over_time(
            (etcd_debugging_mvcc_db_compaction_keys_total > 0) *
            timestamp(etcd_debugging_mvcc_db_compaction_keys_total)
            [1h]
          )
        )

    # Leader stability score
    - record: etcd:leader_stability_score
      expr: |
        1 / (rate(etcd_server_leader_changes_seen_total[1h]) + 1)
```

## Debugging Leader Election Issues

When alerts fire, use these queries to investigate:

```promql
# Show which instance is leader
etcd_server_is_leader == 1

# Show instances that see frequent elections
topk(5, rate(etcd_server_leader_changes_seen_total[15m]))

# Check proposal commit latency (high values delay elections)
histogram_quantile(
  0.99,
  rate(etcd_server_proposal_duration_seconds_bucket[5m])
)

# Check for slow disk operations
histogram_quantile(
  0.99,
  rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])
)
```

## Conclusion

Monitoring etcd leader elections and compaction lag is critical for Kubernetes cluster stability. Frequent leader changes indicate network issues or resource constraints, while compaction lag leads to database bloat and performance degradation. The Prometheus alerts and queries in this guide give you early warning of etcd issues before they impact your cluster.

Start with basic leader change and compaction alerts, then expand to cover network latency, member health, and performance metrics. Combine these alerts with dashboards that visualize trends over time, helping you catch issues early and maintain a stable, performant Kubernetes control plane.
