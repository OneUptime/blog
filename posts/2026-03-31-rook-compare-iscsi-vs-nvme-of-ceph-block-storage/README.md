# How to Compare iSCSI vs NVMe-oF for Ceph Block Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, iSCSI, NVMe-oF, Performance

Description: Compare iSCSI and NVMe-oF protocols for accessing Ceph block storage, covering latency, throughput, complexity, and use case suitability.

---

## Protocol Overview

Both iSCSI and NVMe-oF (NVMe over Fabrics) allow clients to access remote block storage, but they differ significantly in performance characteristics and operational complexity.

- **iSCSI** encapsulates SCSI commands in TCP packets. It is mature, widely supported, and works over standard Ethernet infrastructure.
- **NVMe-oF** exposes NVMe command queues over a network fabric (TCP, RDMA, or Fibre Channel). It offers much lower latency and higher parallelism.

## Performance Comparison

| Metric | iSCSI | NVMe-oF (TCP) | NVMe-oF (RDMA) |
|--------|-------|---------------|-----------------|
| Latency | 100-500 us | 50-150 us | 10-50 us |
| Queue Depth | Configurable (default 32 per LUN) | Up to 65536 per queue (multi-queue) | Up to 65536 per queue (multi-queue) |
| CPU Overhead | Moderate | Low-Moderate | Very Low |
| Max IOPS | ~1M | ~5M | ~10M |

## Testing iSCSI Performance with Ceph

Run a benchmark against a Ceph RBD image over iSCSI:

```bash
# After connecting and seeing /dev/sdb as the iSCSI device
fio --name=iscsi-test \
  --filename=/dev/sdb \
  --rw=randread \
  --bs=4k \
  --numjobs=4 \
  --iodepth=32 \
  --runtime=60 \
  --group_reporting
```

## Testing NVMe-oF Performance with Ceph

Ceph supports NVMe-oF through the `nvmeof` gateway (spdk-based or kernel nvmet):

```bash
# After connecting NVMe-oF namespace as /dev/nvme0n1
fio --name=nvmeof-test \
  --filename=/dev/nvme0n1 \
  --rw=randread \
  --bs=4k \
  --numjobs=4 \
  --iodepth=32 \
  --runtime=60 \
  --group_reporting
```

## When to Use iSCSI

Choose iSCSI when:
- Your clients are Windows servers or VMware hosts that lack NVMe-oF initiators
- You need broad OS compatibility without custom drivers
- Latency requirements are above 500 microseconds
- Your team has existing iSCSI expertise

```bash
# Quick iSCSI setup check
iscsiadm -m session
targetcli ls /iscsi
```

## When to Use NVMe-oF

Choose NVMe-oF when:
- Your workloads require sub-100-microsecond latency
- Applications issue highly concurrent I/O (databases, analytics)
- Clients are modern Linux systems that support nvme-tcp
- You want lower CPU overhead per I/O operation

```bash
# Check NVMe-oF support on the client
modprobe nvme-tcp
nvme discover -t tcp -a 10.0.1.10 -s 4420
```

## Ceph NVMe-oF Gateway Setup

The Ceph NVMe-oF gateway is deployed through the orchestrator:

```yaml
service_type: nvmeof
service_id: nvmeof.pool
placement:
  hosts:
    - gateway1
    - gateway2
spec:
  pool: rbd
  enable_auth: false
```

```bash
ceph orch apply -i nvmeof-spec.yaml
```

## Coexistence

Both protocols can run simultaneously on the same Ceph cluster. Legacy applications can use iSCSI while new high-performance workloads use NVMe-oF.

## Summary

iSCSI is the right choice for broad compatibility and existing infrastructure, while NVMe-oF offers significantly lower latency and higher throughput for demanding workloads. Ceph supports both protocols, making it possible to deploy iSCSI for Windows/VMware clients alongside NVMe-oF for high-performance Linux workloads without any conflict.
