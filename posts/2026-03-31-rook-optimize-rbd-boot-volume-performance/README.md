# How to Optimize RBD for Boot Volume Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Performance, Virtual Machine

Description: Optimize Ceph RBD boot volumes in Rook by configuring SSD pools, image features, caching, and QoS to minimize VM boot times and OS-level I/O latency.

---

## Boot Volume I/O Patterns

Boot volumes have a unique I/O pattern: a burst of reads at startup (OS kernel loading, service initialization), followed by steady mixed read/write I/O during operation. The first 30 seconds after boot are the most I/O intensive.

Key requirements:
- Low latency for small random reads (kernel page loading)
- Adequate sequential read bandwidth for package loading
- Write latency matters less than read latency at boot time

## Pool Design for Boot Volumes

Use NVMe or SSD-backed OSDs for dedicated boot volume pools:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: boot-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  deviceClass: ssd
  parameters:
    pg_num: "64"
    compression_mode: none
```

## Image Features for Boot Volumes

For boot volumes served to VMs, use a minimal but safe feature set:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd create boot-pool/vm-boot-001 --size 50G \
  --image-feature layering,exclusive-lock,object-map,fast-diff
```

The `object-map` feature accelerates snapshot creation during backup operations without impacting boot I/O.

## Clone-Based Boot Volume Provisioning

Store a gold master image and provision boot volumes as clones to speed up provisioning:

```bash
# Create and freeze the master image
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd snap create boot-pool/ubuntu-master@v1

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd snap protect boot-pool/ubuntu-master@v1

# Clone for new VM boot volume
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd clone boot-pool/ubuntu-master@v1 boot-pool/vm-003-boot
```

The clone is immediately available and reads from the parent until COW writes diverge.

## Writeback Cache for Boot Volumes

Enable writeback cache to reduce I/O latency during the initial boot burst:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set boot-pool/vm-003-boot rbd_cache true

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set boot-pool/vm-003-boot rbd_cache_size 67108864
```

64 MB is sufficient for most boot sequences.

## QoS to Prevent Boot Storms

When many VMs boot simultaneously, they compete for OSD resources. Use QoS to throttle individual boot volumes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set boot-pool/vm-003-boot \
    rbd_qos_iops_limit 5000

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd config image set boot-pool/vm-003-boot \
    rbd_qos_read_iops_limit 5000
```

This prevents a mass reboot event from saturating all OSDs.

## Monitoring Boot Performance

Measure boot time from the VM perspective using systemd-analyze:

```bash
systemd-analyze blame | head -10
```

Monitor OSD latency during boot:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf | sort -k3 -rn | head -5
```

## Summary

RBD boot volume performance hinges on SSD pools for low read latency, clone-based provisioning for instant availability, and a modest writeback cache to buffer the boot burst. QoS limits on individual volumes prevent boot storms from impacting other workloads sharing the same OSD pool.
