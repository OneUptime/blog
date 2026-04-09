# How to Configure NVMe-oF for Maximum Throughput in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, Performance, Throughput

Description: Tune Ceph NVMe-oF gateway, network, and OSD parameters to achieve maximum throughput for high-bandwidth storage workloads like video processing and ML training.

---

## Overview

Achieving maximum NVMe-oF throughput requires tuning at every layer: NVMe queue depth, gateway CPU affinity, network send/receive buffer sizes, and Ceph OSD thread configuration. This guide covers all key parameters.

## Measure Baseline Throughput

```bash
# From the initiator node, benchmark with fio
fio --name=nvmeof-seq-write \
  --filename=/dev/nvme0n1 \
  --rw=write \
  --bs=1M \
  --numjobs=4 \
  --iodepth=32 \
  --runtime=60 \
  --direct=1 \
  --group_reporting \
  --ioengine=libaio

# Sequential read
fio --name=nvmeof-seq-read \
  --filename=/dev/nvme0n1 \
  --rw=read \
  --bs=1M \
  --numjobs=4 \
  --iodepth=32 \
  --runtime=60 \
  --direct=1 \
  --group_reporting \
  --ioengine=libaio
```

## Tune Gateway Resources

Increase CPU and memory for gateway pods:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
spec:
  image: quay.io/ceph/nvmeof:1.5
  instances: 2
  pool: myPool
  group: myGroup
  resources:
    limits:
      cpu: "8"
      memory: "16Gi"
    requests:
      cpu: "4"
      memory: "8Gi"
```

## Tune NVMe Queue Depth

```bash
# On initiator - increase I/O queue depth via sysfs
echo 256 > /sys/block/nvme0n1/queue/nr_requests

# Check current queue depth
cat /sys/block/nvme0n1/queue/nr_requests

# For new NVMe-oF connections, set queue size during connect
# nvme connect -t tcp -a <target_ip> -s 4420 -n <nqn> --queue-size=256
```

## Optimize Network Settings

On both gateway and initiator nodes:

```bash
# Increase TCP socket buffer sizes
sysctl -w net.core.rmem_max=134217728
sysctl -w net.core.wmem_max=134217728
sysctl -w net.ipv4.tcp_rmem="4096 87380 134217728"
sysctl -w net.ipv4.tcp_wmem="4096 65536 134217728"

# Enable TCP window scaling
sysctl -w net.ipv4.tcp_window_scaling=1
```

Make persistent in sysctl.conf:

```bash
cat >> /etc/sysctl.d/99-nvmeof.conf << 'EOF'
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 87380 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
EOF
```

## Optimize OSD for Sequential Throughput

```bash
# Increase OSD op queue budget for large I/Os
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd osd_mclock_scheduler_client_res 50.0

# Tune bluestore cache
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd bluestore_cache_size_ssd 4294967296

# Increase OSD network queue
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph config set osd ms_dispatch_throttle_bytes 1073741824
```

## Summary

Maximum NVMe-oF throughput in Ceph requires tuning gateway CPU/memory resources, increasing NVMe queue depth on initiators, expanding TCP socket buffers on both sides, and tuning Ceph OSD mclock queue weights. With NVMe-backed OSDs and 100GbE networking, individual gateways can sustain 10+ GB/s throughput for sequential workloads.
