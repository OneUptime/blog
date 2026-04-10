# How to Compare Ceph vs AWS EBS for Block Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, AWS EBS, Block Storage, Comparison, Cloud Storage

Description: Compare Ceph and AWS EBS for block storage across cost, performance, portability, latency, and operational model to choose between on-premises and cloud storage.

---

## Overview

AWS EBS (Elastic Block Store) is a managed cloud block storage service. Ceph provides self-managed distributed block storage. This comparison is relevant for teams choosing between cloud-native storage and on-premises or hybrid deployments.

## Architecture Comparison

| Feature | Ceph RBD (Rook) | AWS EBS |
|---------|----------------|---------|
| Deployment | On-premises / self-managed | AWS cloud only |
| Management | Operator-managed | Fully managed |
| Availability | Self-configured replication | 99.99% SLA (AWS) |
| Volume types | Configurable | gp3, io2, st1, sc1 |
| Multi-attach | No (single RWO) | Yes (io1/io2 Multi-Attach) |
| Kubernetes CSI | Rook RBD CSI | AWS EBS CSI |

## Kubernetes Storage Class Comparison

### Ceph RBD via Rook

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
reclaimPolicy: Delete
allowVolumeExpansion: true
```

### AWS EBS gp3

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ebs-gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
volumeBindingMode: WaitForFirstConsumer
```

## Performance Comparison

| Metric | Ceph RBD (NVMe) | EBS gp3 | EBS io2 |
|--------|----------------|---------|---------|
| Max IOPS | ~100K (per volume) | 80,000 | 256,000 |
| Max throughput | 1 GB/s+ | 2,000 MB/s | 4,000 MB/s |
| Latency | 0.5-2ms | ~1ms | Sub-millisecond |
| Cost per GB | Low (hardware) | $0.08/GB/month | $0.125/GB/month |

For cost comparison, a 10 TB volume on EBS gp3 costs approximately $800/month. Equivalent Ceph on-premises hardware would have a higher upfront cost but lower monthly cost at scale.

## Snapshot Comparison

### Ceph RBD Snapshot

```bash
rbd snap create replicapool/my-volume@snap1
rbd snap ls replicapool/my-volume
rbd snap rollback replicapool/my-volume@snap1
```

### AWS EBS Snapshot (AWS CLI)

```bash
aws ec2 create-snapshot \
  --volume-id vol-1234567890abcdef0 \
  --description "my-snapshot"

aws ec2 describe-snapshots \
  --filters Name=volume-id,Values=vol-1234567890abcdef0
```

## Cost Analysis

The cost comparison depends heavily on scale and usage patterns:

| Scenario | Ceph On-Premises | AWS EBS gp3 |
|---------|-----------------|-------------|
| 10 TB storage | ~$0/month (hardware amortized) | ~$800/month |
| 100 TB storage | ~$0/month (hardware amortized) | ~$8,000/month |
| Hardware cost (initial) | $20,000 - $100,000 | $0 (pay-as-you-go) |

EBS is more cost-effective for small volumes or variable workloads. Ceph becomes more cost-effective at scale and for predictable storage needs.

## When to Choose Ceph

- Large-scale storage where EBS costs become prohibitive
- Data sovereignty requirements preventing cloud storage
- Hybrid cloud environments needing consistent on-premises storage
- Workloads with predictable, high-capacity storage needs

## When to Choose AWS EBS

- Cloud-native AWS workloads without on-premises requirements
- Small teams without storage administration expertise
- Variable or unpredictable storage demand
- Fully managed with no operational overhead desired

## Summary

AWS EBS wins on operational simplicity and AWS ecosystem integration. Ceph wins on cost efficiency at scale and data portability. For large on-premises Kubernetes clusters or cost-sensitive environments, Rook/Ceph provides enterprise-grade block storage at a fraction of EBS monthly costs. Cloud-first teams without large storage volumes benefit from EBS's fully managed model.
