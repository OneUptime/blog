# How to Monitor etcd Cluster Health Metrics (Leader Elections, Raft Proposals, DB Size) with the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, etcd, Cluster Health, Kubernetes, Monitoring

Description: Monitor etcd cluster health including leader elections, Raft proposals, and database size using the OpenTelemetry Collector.

etcd is the backbone of every Kubernetes cluster. It stores all cluster state, and when etcd has problems, everything else follows. Monitoring etcd health metrics like leader elections, Raft proposal rates, database size, and network latency gives you early warning before cluster instability becomes an outage.

## Critical etcd Metrics

Here are the metrics you should monitor and what they mean:

### Leader and Consensus
- `etcd_server_has_leader` - Whether this member has a leader (0 = no leader, a critical alert)
- `etcd_server_leader_changes_seen_total` - Number of leader changes (frequent changes indicate instability)
- `etcd_server_is_leader` - Whether this member is the current leader

### Raft Proposals
- `etcd_server_proposals_committed_total` - Total number of consensus proposals committed
- `etcd_server_proposals_applied_total` - Total number of consensus proposals applied
- `etcd_server_proposals_pending` - Number of pending proposals (high values mean the cluster is falling behind)
- `etcd_server_proposals_failed_total` - Number of failed proposals (indicates serious issues)

### Database
- `etcd_mvcc_db_total_size_in_bytes` - Total database size
- `etcd_mvcc_db_total_size_in_use_in_bytes` - Actual data size (difference from total = fragmentation)
- `etcd_debugging_mvcc_keys_total` - Total number of keys

### Network
- `etcd_network_peer_round_trip_time_seconds` - Round-trip time between cluster members
- `etcd_network_peer_sent_failures_total` - Number of failed peer sends

## Collector Configuration

```yaml
receivers:
  prometheus/etcd:
    config:
      scrape_configs:
        - job_name: "etcd"
          scrape_interval: 10s
          scheme: https
          tls_config:
            # etcd typically requires client certificates
            cert_file: /etc/etcd/pki/client.crt
            key_file: /etc/etcd/pki/client.key
            ca_file: /etc/etcd/pki/ca.crt
          static_configs:
            - targets:
                - "etcd-0:2379"
                - "etcd-1:2379"
                - "etcd-2:2379"

processors:
  resource/etcd:
    attributes:
      - key: service.name
        value: "etcd"
        action: upsert
      - key: k8s.cluster.name
        value: "production"
        action: upsert

  # Keep only the metrics that matter
  filter/etcd-essential:
    metrics:
      include:
        match_type: regexp
        metric_names:
          # Leader and consensus
          - "etcd_server_has_leader"
          - "etcd_server_is_leader"
          - "etcd_server_leader_changes_seen_total"
          - "etcd_server_proposals_.*"
          # Database
          - "etcd_mvcc_db_total_size.*"
          - "etcd_mvcc_keys_total"
          - "etcd_debugging_mvcc.*"
          # Network
          - "etcd_network_peer_round_trip_time.*"
          - "etcd_network_peer_sent_failures_total"
          # gRPC
          - "grpc_server_handled_total"
          - "grpc_server_handling_seconds.*"
          # Disk
          - "etcd_disk_wal_fsync_duration_seconds.*"
          - "etcd_disk_backend_commit_duration_seconds.*"

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [prometheus/etcd]
      processors: [resource/etcd, filter/etcd-essential, batch]
      exporters: [otlp]
```

## Deriving Health Indicators

Use the transform processor to create computed health indicators:

```yaml
processors:
  transform/etcd-health:
    metric_statements:
      - context: datapoint
        statements:
          # Flag when proposals are piling up
          - set(attributes["health.status"], "degraded") where metric.name == "etcd_server_proposals_pending" and Float(value_int) > 100
          # Flag when there is no leader
          - set(attributes["health.status"], "critical") where metric.name == "etcd_server_has_leader" and Float(value_int) == 0
```

## Alerting Thresholds

Here are recommended alerting thresholds for etcd metrics:

```yaml
# Critical alerts:
# etcd_server_has_leader == 0 (no leader)
# etcd_server_proposals_failed_total rate > 0 (proposals failing)
# etcd_mvcc_db_total_size_in_bytes > 6GB (approaching default 8GB limit)

# Warning alerts:
# etcd_server_leader_changes_seen_total rate > 3/hour (frequent elections)
# etcd_server_proposals_pending > 5 (proposals backing up)
# etcd_disk_wal_fsync_duration_seconds p99 > 100ms (slow disk)
# etcd_disk_backend_commit_duration_seconds p99 > 250ms (slow commits)
# etcd_network_peer_round_trip_time_seconds p99 > 100ms (network latency)
```

## Database Size Management

Track the ratio of used space to total space to detect fragmentation:

```yaml
processors:
  transform/etcd-fragmentation:
    metric_statements:
      - context: metric
        statements:
          # The difference between total size and in-use size indicates fragmentation
          # Monitor etcd_mvcc_db_total_size_in_bytes vs etcd_mvcc_db_total_size_in_use_in_bytes
          # If total >> in_use, you need to defragment
```

When `etcd_mvcc_db_total_size_in_bytes` is significantly larger than `etcd_mvcc_db_total_size_in_use_in_bytes`, run defragmentation:

```bash
# Defragment each member one at a time
etcdctl defrag --endpoints=https://etcd-0:2379 \
  --cacert=/etc/etcd/pki/ca.crt \
  --cert=/etc/etcd/pki/client.crt \
  --key=/etc/etcd/pki/client.key
```

## Monitoring from Inside Kubernetes

If etcd runs as part of a Kubernetes cluster (managed control plane), the metrics endpoint might be accessible at a different location:

```yaml
receivers:
  prometheus/etcd-k8s:
    config:
      scrape_configs:
        - job_name: "etcd-k8s"
          scrape_interval: 10s
          scheme: https
          tls_config:
            cert_file: /etc/kubernetes/pki/etcd/healthcheck-client.crt
            key_file: /etc/kubernetes/pki/etcd/healthcheck-client.key
            ca_file: /etc/kubernetes/pki/etcd/ca.crt
          # In kubeadm clusters, etcd listens on the host network
          static_configs:
            - targets: ["127.0.0.1:2379"]
```

The Collector pod needs access to the etcd certificates. Mount them from the host:

```yaml
volumes:
  - name: etcd-certs
    hostPath:
      path: /etc/kubernetes/pki/etcd
```

etcd monitoring is non-negotiable for production Kubernetes clusters. The metrics covered here give you full visibility into consensus health, storage capacity, and network performance. Early detection of etcd issues prevents cascading failures across the entire cluster.
