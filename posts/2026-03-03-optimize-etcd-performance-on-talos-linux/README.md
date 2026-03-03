# How to Optimize etcd Performance on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Kubernetes, Performance Tuning, Storage

Description: A complete guide to optimizing etcd performance on Talos Linux for faster and more reliable Kubernetes clusters

---

etcd is the backbone of every Kubernetes cluster. It stores all cluster state, configuration data, secrets, and service discovery information. When etcd is slow, everything in your cluster feels slow. Pod scheduling delays, API server timeouts, and leader election failures all trace back to etcd performance issues. On Talos Linux, there are specific optimizations you can make to ensure etcd runs at peak performance.

This guide covers storage, network, memory, and configuration tuning for etcd on Talos Linux nodes.

## Why etcd Performance Matters

Every kubectl command, every pod creation, every service update goes through the Kubernetes API server, which reads from and writes to etcd. A healthy etcd cluster should handle requests in under 10 milliseconds. When latency creeps above 100ms, you start seeing cascading failures.

The most common symptoms of poor etcd performance include slow pod scheduling, frequent leader elections, API server request timeouts, and eventually, cluster instability. These problems tend to appear gradually as your cluster grows, making them easy to miss until they become critical.

## Storage: The Most Critical Factor

etcd is a write-ahead log database. Every write operation appends to a log file and then synchronizes to disk with an fsync call. The speed of this fsync operation directly determines etcd's write latency.

On Talos Linux, you should dedicate a separate disk or partition for etcd data. You can configure this in the machine configuration:

```yaml
# talos-machine-config.yaml
machine:
  install:
    disk: /dev/sda                    # OS disk
  disks:
    - device: /dev/nvme0n1            # Dedicated NVMe for etcd
      partitions:
        - mountpoint: /var/lib/etcd
          size: 50GB
```

NVMe drives are strongly recommended for etcd. A good NVMe drive can deliver fsync latencies under 1ms, while a SATA SSD might take 5-10ms. This difference is huge when etcd performs thousands of fsyncs per second.

If you cannot dedicate a separate disk, at least ensure your etcd data directory is on the fastest storage available. Avoid network-attached storage for etcd at all costs. The added network latency makes etcd unreliable.

## Disk I/O Scheduler Tuning

For NVMe drives, the `none` (or `noop`) I/O scheduler is optimal because NVMe devices handle their own request ordering. For SATA SSDs, `mq-deadline` works well.

```yaml
# talos-machine-config.yaml
machine:
  install:
    extraKernelArgs:
      - elevator=none                 # Use noop scheduler for NVMe
  sysctls:
    vm.dirty_ratio: "5"               # Keep dirty page ratio low
    vm.dirty_background_ratio: "2"    # Start flushing early
    vm.dirty_expire_centisecs: "100"  # Expire dirty pages quickly
```

Keeping the dirty page ratios low ensures that write data is flushed to disk promptly. This prevents sudden bursts of I/O when the kernel decides to flush a large backlog of dirty pages, which would cause etcd latency spikes.

## etcd Configuration via Talos

Talos Linux manages etcd as part of the control plane. You can tune etcd-specific settings through the cluster configuration:

```yaml
# talos-machine-config.yaml
cluster:
  etcd:
    extraArgs:
      # Snapshot and compaction
      auto-compaction-mode: periodic
      auto-compaction-retention: "5m"    # Compact every 5 minutes
      snapshot-count: "5000"              # Snapshot every 5000 transactions

      # Quotas
      quota-backend-bytes: "8589934592"   # 8GB backend quota

      # Heartbeat tuning
      heartbeat-interval: "250"           # 250ms heartbeat (default is 100ms)
      election-timeout: "2500"            # 2500ms election timeout

      # Performance
      max-request-bytes: "10485760"       # 10MB max request size
```

The `auto-compaction-retention` setting is particularly important. Without regular compaction, the etcd database grows continuously and performance degrades. Setting it to 5 minutes keeps the database lean.

The `heartbeat-interval` and `election-timeout` should be tuned based on your network latency. The election timeout must be at least 10 times the heartbeat interval, and the heartbeat interval should be approximately the round-trip time between nodes.

## Memory Tuning for etcd

etcd benefits from having enough memory to cache its entire dataset. If etcd starts hitting swap or running out of memory, performance drops dramatically.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    vm.swappiness: "0"                   # Never swap etcd data
    vm.overcommit_memory: "0"            # Default overcommit behavior
```

For the Kubernetes resource limits on etcd, Talos manages this internally, but you should ensure your control plane nodes have enough RAM. A good rule of thumb is to have at least 4x the etcd database size available as RAM. If your etcd database is 2GB, the node should have at least 8GB of RAM.

## Network Tuning for etcd

etcd nodes communicate constantly through Raft consensus. Network latency between etcd members directly affects write latency since a majority of nodes must acknowledge each write.

```yaml
# talos-machine-config.yaml
machine:
  sysctls:
    # Reduce network latency
    net.ipv4.tcp_nodelay: "1"             # Disable Nagle's algorithm
    net.ipv4.tcp_low_latency: "1"         # Prefer latency over throughput
    net.core.rmem_max: "8388608"          # 8MB receive buffer max
    net.core.wmem_max: "8388608"          # 8MB send buffer max

    # Increase connection handling
    net.core.somaxconn: "32768"
    net.ipv4.tcp_max_syn_backlog: "32768"
```

Place your etcd nodes in the same availability zone or rack to minimize network round trips. Cross-datacenter etcd clusters are not recommended due to the latency requirements of the Raft protocol.

## Monitoring etcd Health

You should continuously monitor etcd to catch performance issues before they impact the cluster. Key metrics to track include:

```bash
# Check etcd member health
talosctl etcd members --nodes 10.0.0.1

# Check etcd status
talosctl etcd status --nodes 10.0.0.1

# Get etcd metrics for monitoring
talosctl service etcd --nodes 10.0.0.1
```

The most important etcd metrics to monitor are:

- `etcd_disk_wal_fsync_duration_seconds` - WAL fsync latency, should be under 10ms
- `etcd_disk_backend_commit_duration_seconds` - Backend commit latency
- `etcd_server_leader_changes_seen_total` - Frequent changes indicate instability
- `etcd_network_peer_round_trip_time_seconds` - Peer round-trip time

Set up alerting on these metrics. If WAL fsync duration exceeds 10ms consistently, your storage is too slow. If leader changes happen more than once an hour, there is a network or resource problem.

## Defragmentation

Over time, even with compaction, the etcd database file accumulates free space from deleted keys. Defragmentation reclaims this space and can improve read performance.

```bash
# Run defragmentation on a specific node
talosctl etcd defrag --nodes 10.0.0.1

# Check database size after defrag
talosctl etcd status --nodes 10.0.0.1
```

Run defragmentation during maintenance windows because it blocks etcd briefly. Defrag one member at a time and always defrag the leader last.

## Right-Sizing Your Control Plane Nodes

For etcd performance, the control plane node specifications matter more than most people realize. Here are recommendations based on cluster size:

- Small clusters (under 100 nodes): 4 CPU cores, 16GB RAM, NVMe storage
- Medium clusters (100-500 nodes): 8 CPU cores, 32GB RAM, dedicated NVMe
- Large clusters (500+ nodes): 16 CPU cores, 64GB RAM, high-performance NVMe

The CPU requirement is often underestimated. etcd performs serialization, encryption, and compression on the CPU, and under heavy load these operations become the bottleneck.

## Backup and Recovery

While not directly a performance optimization, regular etcd backups are essential. A corrupted etcd database that needs recovery will cause an outage regardless of how well-tuned your performance is.

```bash
# Take an etcd snapshot
talosctl etcd snapshot /tmp/etcd-backup.snapshot --nodes 10.0.0.1
```

Schedule regular snapshots and verify that you can restore from them. The time to test your backup strategy is before you need it, not during an incident.

## Conclusion

etcd performance optimization on Talos Linux comes down to three things: fast storage, proper network configuration, and appropriate resource allocation. Use NVMe drives, keep etcd members close together on the network, and give your control plane nodes enough CPU and memory. Combine these hardware choices with the configuration tuning described above, and your etcd cluster will handle whatever your Kubernetes workloads throw at it. Monitor continuously, defragment regularly, and always keep backups.
