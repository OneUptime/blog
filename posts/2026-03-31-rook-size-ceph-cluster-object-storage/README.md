# How to Size a Ceph Cluster for Object Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Object Storage, RGW, Capacity Planning, S3

Description: Learn how to size a Rook-Ceph cluster for S3-compatible object storage workloads, including RGW scaling, capacity planning, and erasure coding configuration.

---

## Overview

Ceph RGW (RADOS Gateway) provides S3-compatible object storage on top of Ceph's RADOS layer. Sizing an object storage cluster differs from block or file storage because the primary concern is capacity at low cost rather than IOPS. Large HDDs with erasure coding, multiple RGW instances for throughput, and proper placement group configuration are the key design points.

## Object Storage Workload Characteristics

```text
Typical object workloads:
- Large objects: 1MB to 1TB (backups, media, ML datasets)
- Small objects: 1KB to 1MB (logs, metadata, configs)
- Access pattern: write-once, read-many
- Consistency model: eventual is acceptable
```

## Capacity Planning for Object Storage

Erasure coding is strongly recommended for object storage:

```yaml
EC 4+2: 1.5x raw overhead, tolerates 2 OSD failures
EC 6+3: 1.5x raw overhead, tolerates 3 OSD failures (more nodes)
EC 8+4: 1.5x raw overhead, tolerates 4 OSD failures (large clusters)

Target: 500TB usable
Using EC 6+3: 500TB * 1.5 / 0.8 = 938TB raw required
With 20TB drives: 938TB / 20TB = 47 drives -> 54 drives (9 nodes, 6 drives each)
```

## Node and Drive Selection

```text
For object storage (capacity-optimized):
  Drives: 16TB-20TB SATA HDD (slow is fine)
  Per-node: 8-24 drives
  CPU: 8-16 cores per node
  RAM: 4GB per HDD OSD (BlueStore)
  Network: 10-25GbE
```

## CephObjectStore Configuration

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
  namespace: rook-ceph
spec:
  metadataPool:
    failureDomain: host
    replicated:
      size: 3
  dataPool:
    failureDomain: host
    erasureCoded:
      dataChunks: 6
      codingChunks: 3
  preservePoolsOnDelete: false
  gateway:
    port: 80
    instances: 4      # Scale RGW horizontally for throughput
    resources:
      limits:
        cpu: "4"
        memory: "8Gi"
      requests:
        cpu: "2"
        memory: "4Gi"
```

## Scaling RGW Instances

RGW is stateless and scales horizontally. Add instances as request rates grow:

```bash
# Update RGW instance count
kubectl patch cephobjectstore -n rook-ceph my-store \
  --type=merge -p '{"spec":{"gateway":{"instances":6}}}'

# Verify new RGW pods
kubectl get pods -n rook-ceph -l app=rook-ceph-rgw
```

## Metadata vs Data Pool Sizing

Object metadata (bucket indexes, user data) is stored in a separate replicated pool. Size it appropriately:

```bash
# Rule of thumb: metadata pool needs ~1% of data pool capacity
# For 500TB data: 5TB metadata pool

# Set metadata pool quotas if needed
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  ceph osd pool set-quota my-store.rgw.buckets.index max_bytes 5497558138880
```

## Load Balancing RGW

For production, put RGW instances behind a Kubernetes Service or external load balancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-rgw-lb
  namespace: rook-ceph
spec:
  type: LoadBalancer
  selector:
    app: rook-ceph-rgw
    rook_object_store: my-store
  ports:
  - port: 80
    targetPort: 8080
```

## Estimating Objects Per Pool

```bash
# Current object count and average size
kubectl exec -it -n rook-ceph deploy/rook-ceph-tools -- \
  radosgw-admin bucket stats | python3 -c \
  "import sys,json; d=json.load(sys.stdin); \
   print(sum(b['usage']['rgw.main']['num_objects'] for b in d))"
```

## Summary

Sizing a Rook-Ceph cluster for object storage centers on large HDD capacity with erasure coding to minimize raw overhead, multiple RGW instances for horizontal throughput scaling, and correctly sized metadata pools. EC 6+3 or EC 8+4 provides excellent durability at 1.5x raw overhead, making petabyte-scale object storage deployments cost-competitive with commercial S3 offerings.
