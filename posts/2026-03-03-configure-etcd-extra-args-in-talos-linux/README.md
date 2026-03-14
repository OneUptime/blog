# How to Configure etcd Extra Args in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Etcd, Cluster Configuration, Kubernetes, Database

Description: A practical guide to configuring etcd extra arguments in Talos Linux for performance tuning, security hardening, and reliable cluster storage.

---

etcd is the distributed key-value store that backs every Kubernetes cluster. It stores all cluster state - deployments, services, ConfigMaps, secrets, and every other Kubernetes resource. If etcd is slow, your entire cluster feels sluggish. If etcd loses data, your cluster is in trouble. Talos Linux manages etcd as a core system service, but there are many scenarios where you need to tune its behavior through extra arguments.

This guide shows you how to configure etcd extra arguments in Talos Linux for performance, reliability, and security.

## The etcd Configuration Section

etcd settings are configured under `cluster.etcd` in the Talos machine configuration:

```yaml
# Basic etcd extra args configuration
cluster:
  etcd:
    extraArgs:
      election-timeout: "5000"
      heartbeat-interval: "500"
```

Each key-value pair becomes a command-line flag for the etcd process. etcd runs on control plane nodes only.

## Performance Tuning

etcd performance depends heavily on disk I/O latency. Here are the most impactful tuning parameters:

```yaml
# etcd performance tuning
cluster:
  etcd:
    extraArgs:
      # Quota backend bytes (default is 2GB, increase for large clusters)
      quota-backend-bytes: "8589934592"  # 8GB

      # Auto-compaction settings to prevent database bloat
      auto-compaction-mode: "periodic"
      auto-compaction-retention: "5m"

      # Snapshot count (number of transactions between snapshots)
      snapshot-count: "10000"

      # Maximum number of committed transactions to keep in memory
      max-request-bytes: "10485760"  # 10MB
```

The `quota-backend-bytes` setting limits how large the etcd database can grow. The default of 2GB is fine for small clusters, but larger clusters with many resources need more space. If etcd hits the quota, it stops accepting write requests and your cluster becomes read-only.

## Disk I/O Optimization

etcd is extremely sensitive to disk latency. It uses fsync for data durability, which means slow disks directly translate to slow etcd performance:

```yaml
# Disk-related tuning
cluster:
  etcd:
    extraArgs:
      # Increase the election timeout for environments with high disk latency
      election-timeout: "10000"   # 10 seconds (default: 1000ms)
      heartbeat-interval: "1000"  # 1 second (default: 100ms)
```

The `heartbeat-interval` is how often the leader sends heartbeat messages. The `election-timeout` is how long followers wait before starting a new election. The general rule is that `election-timeout` should be at least 5-10 times the `heartbeat-interval`.

In environments with high disk latency (like shared storage or network-attached disks), increase both values. Otherwise, etcd members constantly trigger elections, which disrupts cluster stability.

## Compaction and Defragmentation

Over time, etcd accumulates revisions of keys that are no longer needed. Compaction removes old revisions, and defragmentation reclaims the freed disk space:

```yaml
# Compaction settings
cluster:
  etcd:
    extraArgs:
      # Compact every 5 minutes
      auto-compaction-mode: "periodic"
      auto-compaction-retention: "5m"
```

Even with auto-compaction, the database file does not shrink on disk. To reclaim space, you need to run defragmentation manually:

```bash
# Defragment etcd on a specific node
talosctl etcd defrag --nodes 192.168.1.100
```

Run defragmentation during low-traffic periods because it briefly pauses etcd operations on the node being defragmented.

## Security Configuration

Harden etcd communication with proper TLS settings:

```yaml
# etcd security settings
cluster:
  etcd:
    extraArgs:
      # Require client certificate authentication
      client-cert-auth: "true"

      # Enable peer certificate authentication
      peer-client-cert-auth: "true"

      # Set minimum TLS version
      tls-min-version: "TLS1.2"

      # Restrict cipher suites
      cipher-suites: >-
        TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,
        TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
        TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384,
        TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
```

Talos already configures mutual TLS between etcd members by default, but these extra settings tighten the security further by restricting cipher suites and enforcing minimum TLS versions.

## Monitoring etcd

Enable metrics collection for etcd monitoring:

```yaml
# Enable etcd metrics
cluster:
  etcd:
    extraArgs:
      listen-metrics-urls: "http://0.0.0.0:2381"
      metrics: "extensive"
```

The `metrics` flag supports two levels: `basic` (default) and `extensive`. Extensive metrics include histogram data for RPC latency and database operations, which is valuable for performance analysis but generates more metric data.

With metrics enabled, you can scrape them with Prometheus:

```yaml
# Example Prometheus scrape config for etcd
scrape_configs:
  - job_name: etcd
    static_configs:
      - targets:
          - 192.168.1.100:2381
          - 192.168.1.101:2381
          - 192.168.1.102:2381
```

## Logging Configuration

Adjust etcd logging for debugging:

```yaml
# etcd logging configuration
cluster:
  etcd:
    extraArgs:
      log-level: "info"          # debug, info, warn, error
      log-outputs: "default"     # default sends to stderr
```

Keep the log level at `info` for production. Only switch to `debug` when actively troubleshooting an issue, as debug logging generates significant output.

## Cluster Size Recommendations

etcd performance and configuration depend on cluster size:

```yaml
# Small cluster (1-3 control plane nodes, < 100 worker nodes)
cluster:
  etcd:
    extraArgs:
      quota-backend-bytes: "4294967296"  # 4GB
      auto-compaction-retention: "5m"
      snapshot-count: "10000"
```

```yaml
# Large cluster (3-5 control plane nodes, 100+ worker nodes)
cluster:
  etcd:
    extraArgs:
      quota-backend-bytes: "8589934592"  # 8GB
      auto-compaction-retention: "3m"
      snapshot-count: "5000"
      election-timeout: "5000"
      heartbeat-interval: "500"
      max-request-bytes: "10485760"
```

Larger clusters generate more etcd traffic and store more data, so they need larger quotas and more aggressive compaction.

## Applying etcd Configuration

Apply changes to control plane nodes:

```bash
# Apply to control plane nodes one at a time for safety
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file controlplane.yaml
```

etcd configuration changes require an etcd restart. Apply changes one control plane node at a time and wait for the etcd member to rejoin the cluster before moving to the next node:

```bash
# Check etcd member status after applying
talosctl etcd members --nodes 192.168.1.100

# Wait for the member to show as started before proceeding
talosctl etcd status --nodes 192.168.1.100
```

## Verifying etcd Configuration

Confirm the configuration is applied:

```bash
# Check etcd health
talosctl etcd status --nodes 192.168.1.100

# List etcd members
talosctl etcd members --nodes 192.168.1.100

# Check etcd metrics (if metrics are enabled)
curl http://192.168.1.100:2381/metrics | grep etcd_server_has_leader
```

## Troubleshooting etcd Issues

Common etcd problems and their solutions:

```bash
# Check etcd logs for errors
talosctl logs etcd --nodes 192.168.1.100 | tail -100

# Check for leader election issues
talosctl logs etcd --nodes 192.168.1.100 | grep -i "election\|leader"

# Check disk performance (high fsync latency indicates disk problems)
talosctl logs etcd --nodes 192.168.1.100 | grep "slow fdatasync"
```

If you see "slow fdatasync" warnings, your disk I/O is too slow for etcd. Either move etcd to faster storage (NVMe is strongly recommended) or increase the election and heartbeat timeouts to give etcd more time to complete disk operations.

## Best Practices

Always use NVMe or fast SSD storage for etcd. Network-attached storage is generally too slow. Run etcd on dedicated disks, not shared with other workloads. Monitor etcd latency and disk performance continuously. Set the quota high enough that you never hit it, but low enough that a backup is manageable. Compact and defragment regularly. Never change etcd configuration on all control plane nodes simultaneously - always use a rolling approach to maintain cluster availability.
