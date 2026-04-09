# How to Compare NVMe-oF vs iSCSI for Ceph Block Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, NVMe-oF, iSCSI, Block Storage, Comparison

Description: Compare NVMe-oF and iSCSI for Ceph block storage access to choose the right protocol for latency, throughput, and operational complexity requirements.

---

## Overview

Ceph supports both iSCSI (via the `ceph-iscsi` gateway and tcmu-runner) and NVMe-oF for block storage network access. Choosing between them depends on latency requirements, existing network hardware, and operational preferences.

## Protocol Architecture Comparison

| Aspect | NVMe-oF | iSCSI |
|---|---|---|
| Protocol overhead | Low (NVMe native) | Higher (SCSI over TCP) |
| Min kernel version | 5.0+ | 2.6.16+ |
| Transport options | TCP, RDMA, FC | TCP, iSER (RDMA) |
| Queue depth | Up to 65535 per queue | Configurable (default 32 per LUN) |
| Parallelism | Native multi-queue | Single queue per LUN |
| Maturity in Ceph | Newer (Reef+) | Stable |

## Latency Comparison

Test both protocols with the same Ceph backend:

```bash
# iSCSI latency test (on iSCSI initiator)
fio --name=iscsi-latency \
  --filename=/dev/sdb \
  --rw=randread \
  --bs=4k \
  --iodepth=1 \
  --numjobs=1 \
  --runtime=30 \
  --direct=1 \
  --ioengine=libaio \
  --lat_percentiles=1

# NVMe-oF latency test (same backend pool)
fio --name=nvmeof-latency \
  --filename=/dev/nvme0n1 \
  --rw=randread \
  --bs=4k \
  --iodepth=1 \
  --numjobs=1 \
  --runtime=30 \
  --direct=1 \
  --ioengine=libaio \
  --lat_percentiles=1
```

Typical results on 10GbE:
- iSCSI 4K randread latency: ~0.8-1.2ms
- NVMe/TCP 4K randread latency: ~0.3-0.6ms

## Throughput Comparison

```bash
# Sequential read throughput comparison
# iSCSI
fio --name=iscsi-seq --filename=/dev/sdb --rw=read \
  --bs=1M --numjobs=4 --iodepth=16 --runtime=30 \
  --direct=1 --ioengine=libaio --group_reporting

# NVMe-oF
fio --name=nvmeof-seq --filename=/dev/nvme0n1 --rw=read \
  --bs=1M --numjobs=4 --iodepth=16 --runtime=30 \
  --direct=1 --ioengine=libaio --group_reporting
```

## Operational Considerations

```bash
# iSCSI initiator setup (more established tooling)
apt-get install open-iscsi
iscsiadm -m discovery -t sendtargets -p 10.0.1.10:3260
iscsiadm -m node --login

# NVMe-oF setup (newer, simpler command structure)
modprobe nvme-tcp
nvme discover -t tcp -a 10.0.1.10 -s 4420
nvme connect -t tcp -a 10.0.1.10 -s 4420 -n nqn.2024-01.io.ceph:sub
```

## When to Choose NVMe-oF

Choose NVMe-oF when:
- Applications require sub-millisecond storage latency
- Running ML training or high-frequency trading workloads
- Using Kubernetes on Kernel 5.0+
- Planning for RDMA network infrastructure

## When to Choose iSCSI

Choose iSCSI when:
- Running legacy applications with iSCSI initiators built-in
- Operating on older kernels (< 5.0)
- Needing maximum ecosystem compatibility (VMware, Windows Server)
- Simpler operational tooling is preferred

## Summary

NVMe-oF outperforms iSCSI in latency (2-4x lower) and IOPS (native multi-queue vs single queue) for Ceph block storage. iSCSI remains the better choice for legacy systems, older kernels, and environments requiring broad ecosystem support like VMware. For new Kubernetes deployments on modern Linux kernels, NVMe/TCP provides measurably better performance without specialized hardware.
