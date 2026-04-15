# How to Tune Linux Kernel Parameters for ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Linux, Kernel, Performance, Tuning, System Configuration

Description: Tune Linux kernel parameters including I/O schedulers, memory settings, and network stack to optimize ClickHouse performance.

---

ClickHouse performance is heavily influenced by the underlying OS configuration. Tuning Linux kernel parameters can dramatically improve query throughput, insert latency, and overall stability for production deployments.

## Disable Transparent Huge Pages

Transparent Huge Pages (THP) cause unpredictable memory allocation latency. Disable them for ClickHouse servers:

```bash
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/enabled
echo never | sudo tee /sys/kernel/mm/transparent_hugepage/defrag
```

Make it permanent in `/etc/rc.local` or via a systemd service.

## Configure Virtual Memory Settings

Adjust the kernel memory overcommit behavior and swappiness:

```bash
# Minimize swap usage (preferred for ClickHouse)
sudo sysctl -w vm.swappiness=1

# Allow memory overcommit for large allocations
sudo sysctl -w vm.overcommit_memory=1

# Flush dirty pages more frequently in smaller batches
sudo sysctl -w vm.dirty_ratio=10
sudo sysctl -w vm.dirty_background_ratio=5
```

Add to `/etc/sysctl.d/99-clickhouse.conf`:

```text
vm.swappiness=1
vm.overcommit_memory=1
vm.dirty_ratio=10
vm.dirty_background_ratio=5
```

## Set the I/O Scheduler

For NVMe drives, use `none` or `mq-deadline`. For spinning disks, use `mq-deadline` or `bfq`:

```bash
# Check current scheduler
cat /sys/block/nvme0n1/queue/scheduler

# Set for NVMe
echo none | sudo tee /sys/block/nvme0n1/queue/scheduler

# Set for HDD
echo mq-deadline | sudo tee /sys/block/sda/queue/scheduler
```

## Increase File Descriptor Limits

ClickHouse opens many files simultaneously. Raise OS limits:

```bash
# /etc/security/limits.d/clickhouse.conf
clickhouse soft nofile 262144
clickhouse hard nofile 262144
```

Also configure in systemd service:

```text
[Service]
LimitNOFILE=262144
```

## Tune Network Stack

For high-throughput network ingestion:

```bash
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728
sudo sysctl -w net.ipv4.tcp_rmem='4096 87380 134217728'
sudo sysctl -w net.ipv4.tcp_wmem='4096 87380 134217728'
sudo sysctl -w net.core.netdev_max_backlog=300000
sudo sysctl -w net.ipv4.tcp_max_syn_backlog=30000
```

## Disable NUMA Balancing for Single-Socket Servers

NUMA auto-balancing can cause memory migration overhead:

```bash
sudo sysctl -w kernel.numa_balancing=0
```

## Set CPU Governor to Performance

Prevent frequency scaling from affecting query latency:

```bash
sudo cpupower frequency-set -g performance
# Or for all cores:
for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
  echo performance | sudo tee "$cpu"
done
```

## Verify Changes

Check that settings persist after reboot by reviewing `sysctl -a` and confirming `/etc/sysctl.d/` files are loaded.

## Summary

Linux kernel tuning for ClickHouse focuses on disabling THP, minimizing swap usage, choosing the right I/O scheduler for your storage type, raising file descriptor limits, and optimizing the network stack. These changes can reduce query latency by 10-30% and significantly improve insert throughput in production environments.
