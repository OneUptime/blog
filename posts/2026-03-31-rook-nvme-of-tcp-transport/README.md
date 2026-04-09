# How to Set Up NVMe-oF TCP Transport for Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, TCP, Transport, Storage

Description: Configure NVMe over Fabrics with TCP transport in Ceph for deployments without RDMA hardware, achieving high throughput without specialized network adapters.

---

## Overview

NVMe-oF TCP transport (NVMe/TCP) allows running NVMe over Fabrics on standard Ethernet networks without RDMA hardware (RoCE/InfiniBand). While RDMA provides lower latency, NVMe/TCP on 25GbE+ networks delivers excellent performance for most Ceph use cases.

## Prerequisites

NVMe/TCP requires:
- Linux kernel 5.0+ on initiators (TCP transport module)
- Standard Ethernet network (1GbE minimum, 10GbE+ recommended)
- Ceph Reef (18.x) or later

```bash
# Verify kernel version
uname -r  # must be >= 5.0

# Load NVMe/TCP module
modprobe nvme-tcp
lsmod | grep nvme_tcp
```

## Configure Gateway for TCP Transport

The CephNVMeoFGateway defaults to TCP transport:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
metadata:
  name: nvmeof-tcp-gw
  namespace: rook-ceph
spec:
  image: quay.io/ceph/nvmeof:1.5
  instances: 2
  pool: nvmeof-pool
  group: nvmeof-group
```

Add a TCP listener to the subsystem:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph nvmeof listener add \
  --subsystem nqn.2024-01.io.ceph:my-subsystem \
  --host-name nvmeof-tcp-gw-0 \
  --traddr 10.0.1.10 \
  --trsvcid 4420
```

## Connect Initiator via TCP

```bash
# Discover using TCP transport
nvme discover -t tcp -a 10.0.1.10 -s 4420

# Connect to subsystem
nvme connect \
  --transport tcp \
  --traddr 10.0.1.10 \
  --trsvcid 4420 \
  --nqn nqn.2024-01.io.ceph:my-subsystem \
  --reconnect-delay 10 \
  --ctrl-loss-tmo 600

# Verify connection
nvme list
nvme list-subsys
```

## Optimize TCP for NVMe/TCP

Tune the network stack for NVMe/TCP performance:

```bash
# Increase socket buffer sizes for high throughput
sysctl -w net.core.rmem_max=16777216
sysctl -w net.core.wmem_max=16777216
sysctl -w net.ipv4.tcp_rmem="4096 131072 16777216"
sysctl -w net.ipv4.tcp_wmem="4096 131072 16777216"

# Increase TCP backlog for gateway
sysctl -w net.core.somaxconn=4096
sysctl -w net.ipv4.tcp_max_syn_backlog=4096
```

## Multi-Path TCP Configuration

For redundancy, connect via multiple gateway IPs:

```bash
# Connect to first gateway
nvme connect -t tcp -a 10.0.1.10 -s 4420 \
  -n nqn.2024-01.io.ceph:my-subsystem

# Connect to second gateway (same subsystem)
nvme connect -t tcp -a 10.0.1.11 -s 4420 \
  -n nqn.2024-01.io.ceph:my-subsystem

# Both paths appear under the same subsystem
nvme list-subsys | grep -A5 my-subsystem
# Shows multiple paths with ANA groups
```

## Benchmark NVMe/TCP Performance

```bash
# Random 4K read IOPS (latency-sensitive workloads)
fio --name=nvme-tcp-rand-read \
  --filename=/dev/nvme0n1 \
  --rw=randread \
  --bs=4k \
  --iodepth=64 \
  --numjobs=4 \
  --runtime=60 \
  --direct=1 \
  --ioengine=libaio \
  --group_reporting

# Sequential 1M write throughput
fio --name=nvme-tcp-seq-write \
  --filename=/dev/nvme0n1 \
  --rw=write \
  --bs=1M \
  --iodepth=8 \
  --numjobs=2 \
  --runtime=60 \
  --direct=1 \
  --ioengine=libaio \
  --group_reporting
```

## Summary

NVMe-oF TCP transport enables high-performance storage over standard Ethernet without RDMA hardware. With 25GbE networking and proper TCP tuning (socket buffers, connection backlog), NVMe/TCP achieves near-RDMA performance for sequential workloads. Multi-path configuration using multiple gateways provides both redundancy and aggregate bandwidth increase.
