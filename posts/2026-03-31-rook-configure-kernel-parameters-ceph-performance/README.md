# How to Configure Kernel Parameters for Ceph Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Kernel, Performance, Tuning, OSD, Network

Description: Tune Linux kernel parameters on Ceph OSD nodes and clients to maximize throughput, reduce latency, and prevent common performance bottlenecks.

---

## Why Tune Kernel Parameters?

Default Linux kernel parameters are designed for general workloads. Ceph OSD nodes and clients benefit significantly from tuning network buffers, memory settings, and I/O scheduler parameters to match storage-intensive workloads.

## Network Parameters

High-throughput Ceph clusters need large network buffers:

```bash
cat << 'EOF' | sudo tee /etc/sysctl.d/90-ceph-network.conf
# Increase TCP buffer sizes
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728

# Increase the connection backlog
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 4096

# Reduce TIME_WAIT connections
net.ipv4.tcp_tw_reuse = 1

# Jumbo frames (if your network supports 9000 MTU)
# net.ipv4.tcp_mtu_probing = 1
EOF

sudo sysctl --system
```

## Memory Parameters

OSD performance is sensitive to memory reclaim behavior:

```bash
cat << 'EOF' | sudo tee /etc/sysctl.d/90-ceph-memory.conf
# Reduce swappiness - avoid swapping Ceph daemons
vm.swappiness = 10

# Reduce dirty page writeback pressure
vm.dirty_ratio = 5
vm.dirty_background_ratio = 2
vm.dirty_expire_centisecs = 500
vm.dirty_writeback_centisecs = 100

# Increase max memory map areas (needed by BlueStore)
vm.max_map_count = 524288
EOF

sudo sysctl --system
```

## I/O Scheduler for SSDs

For NVMe drives, the `none` scheduler is recommended:

```bash
# Check current scheduler
cat /sys/block/nvme0n1/queue/scheduler

# Set to none (for NVMe)
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler

# For HDDs, use mq-deadline
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler
```

Persist via udev rule:

```bash
cat << 'EOF' | sudo tee /etc/udev/rules.d/60-ceph-io-scheduler.rules
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"
EOF
```

## Transparent Huge Pages

Ceph recommends disabling transparent huge pages (THP). While THP can improve performance for some workloads, it causes latency spikes on OSD nodes due to background memory compaction by `khugepaged`:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

## Queue Depth

For high-IOPS NVMe OSDs, increase the queue depth:

```bash
echo 1024 | sudo tee /sys/block/nvme0n1/queue/nr_requests
```

## Summary

Ceph OSD performance tuning centers on three kernel areas: network buffers (increase `rmem_max`/`wmem_max`), memory management (lower `vm.swappiness`, tune dirty page ratios), and I/O scheduler (use `none` for NVMe, `mq-deadline` for HDDs). Persist settings via `/etc/sysctl.d/` and udev rules to survive reboots.
