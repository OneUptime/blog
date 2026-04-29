# How to Optimize Longhorn Performance for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Performance, Optimization, Kubernetes, Storage, Production, SUSE Rancher

Description: Learn how to optimize Longhorn storage performance for production workloads by tuning replica counts, network settings, disk configurations, and CPU resource allocation.

---

Longhorn's default settings prioritize safety and ease of use over raw performance. For production workloads, targeted tuning can significantly improve throughput and reduce latency.

---

## Performance Baseline

Before tuning, establish a baseline:

```bash
# Install fio for storage benchmarking

kubectl run fio-test --image=xridge/fio:latest --restart=Never \
  --overrides='{"spec":{"volumes":[{"name":"test","persistentVolumeClaim":{"claimName":"test-pvc"}}],"containers":[{"name":"fio","image":"xridge/fio:latest","command":["sleep","infinity"],"volumeMounts":[{"name":"test","mountPath":"/data"}]}]}}'

kubectl wait --for=condition=Ready pod/fio-test --timeout=120s

# Run sequential write test
kubectl exec fio-test -- fio \
  --name=seq-write \
  --rw=write \
  --bs=1M \
  --size=4G \
  --numjobs=4 \
  --ioengine=libaio \
  --direct=1 \
  --iodepth=32 \
  --time_based \
  --runtime=60 \
  --filename=/data/test \
  --output-format=json

# Run random read/write test (IOPS)
kubectl exec fio-test -- fio \
  --name=rand-rw \
  --rw=randrw \
  --bs=4k \
  --size=1G \
  --numjobs=4 \
  --ioengine=libaio \
  --direct=1 \
  --iodepth=64 \
  --time_based \
  --runtime=60 \
  --filename=/data/test
```

---

## Optimization 1: Reduce Replica Count for Non-Critical Data

```yaml
# High-performance StorageClass with 2 replicas
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-perf
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "2"          # Reduce from 3 - less write amplification
  staleReplicaTimeout: "20"
  dataLocality: "best-effort"    # Try to keep one replica local to the workload
  diskSelector: ""
  nodeSelector: ""
```

---

## Optimization 2: Enable Data Locality

Data locality can reduce latency by trying to keep a replica on the same node as the workload:

```bash
# Set the global default for volumes created in the Longhorn UI
kubectl patch settings.longhorn.io -n longhorn-system \
  default-data-locality \
  --type merge \
  -p '{"value":"best-effort"}'

# Or configure Kubernetes volumes in StorageClass
# dataLocality: "strict-local"   # Requires numberOfReplicas: "1"
# dataLocality: "best-effort"    # Prefer local, fall back to remote
# dataLocality: "disabled"       # Default - no preference
```

---

## Optimization 3: Use Dedicated Disks for Longhorn

```bash
# In the Longhorn UI: Node → Edit Disks → Add a dedicated disk
# Set the disk path to a dedicated SSD mount point

# On the node, mount a dedicated disk:
# /etc/fstab entry:
# /dev/nvme1n1  /var/lib/longhorn-fast  ext4  defaults  0  2

# Then in Longhorn, add the disk with path: /var/lib/longhorn-fast
# and add a tag: "ssd" or "fast"
```

---

## Optimization 4: Tune CPU Resources for V1 Instance Managers

```bash
# Reserve CPU for V1 instance manager pods
kubectl patch settings.longhorn.io -n longhorn-system \
  guaranteed-instance-manager-cpu \
  --type merge \
  -p '{"value":"15"}'     # 15 = 15% of allocatable CPU per instance manager pod

# For high-I/O workloads, increase this value
kubectl patch settings.longhorn.io -n longhorn-system \
  guaranteed-instance-manager-cpu \
  --type merge \
  -p '{"value":"25"}'
```

If you're using the V2 data engine, tune the separate `Guaranteed Instance Manager CPU for V2 Data Engine` setting instead.

---

## Optimization 5: Configure Replica Auto-Balance

```bash
# Enable replica auto-balance to keep minimal redundancy across nodes
kubectl patch settings.longhorn.io -n longhorn-system \
  replica-auto-balance \
  --type merge \
  -p '{"value":"least-effort"}'
```

---

## Optimization 6: Keep Revision Counter Disabled for Performance-Sensitive Workloads

The revision counter updates metadata on every write. Keeping it disabled reduces write-path overhead:

```bash
# Keep revision counter disabled
kubectl patch settings.longhorn.io -n longhorn-system \
  disable-revision-counter \
  --type merge \
  -p '{"value":"true"}'
```

Note: Current Longhorn releases disable the revision counter by default. When it is disabled, Longhorn skips revision-counter checks at startup and auto-salvage falls back to replica head-file metadata.

---

## Optimization 7: Network Tuning

Longhorn replication uses TCP. On high-latency or high-bandwidth networks:

```bash
# Increase network buffer sizes on nodes (via DaemonSet or node configuration)
sysctl -w net.core.rmem_max=268435456
sysctl -w net.core.wmem_max=268435456
sysctl -w net.ipv4.tcp_rmem="4096 87380 268435456"
sysctl -w net.ipv4.tcp_wmem="4096 65536 268435456"
```

---

## Performance Summary

| Setting | Default | Optimized |
|---|---|---|
| Replica count | 3 | 2 (non-critical data) |
| Data locality | disabled | best-effort |
| Instance manager CPU (V1) | 12% | 15-25% |
| Revision counter | disabled | disabled (keep default) |
| Replica auto-balance | disabled | least-effort |

---

## Best Practices

- Apply `dataLocality: strict-local` only when the workload can use a single Longhorn replica and the StorageClass sets `numberOfReplicas: "1"` - otherwise volume creation will fail.
- Benchmark after each change to verify the improvement - not all optimizations help equally for all workload patterns.
- Use dedicated SSDs for Longhorn data directories on database nodes and keep spinning disks for backup or archival volumes.
