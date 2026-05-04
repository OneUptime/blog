# How to Configure Longhorn V2 Data Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, V2 Data Engine, SPDK, NVMe, Performance

Description: Configure and enable Longhorn's V2 Data Engine based on SPDK for ultra-high performance storage with significantly lower CPU overhead and latency.

## Introduction

Longhorn's V2 Data Engine (introduced as a preview feature in Longhorn v1.5.0) is a new storage engine based on SPDK (Storage Performance Development Kit). Unlike the V1 engine which uses a user-space iSCSI target (tgt) exposed via the kernel iSCSI initiator, the V2 engine uses SPDK's user-space NVMe-oF (TCP) stack to achieve near-bare-metal NVMe performance with drastically lower CPU utilization. This guide explains how to configure and use the V2 Data Engine.

## V1 vs V2 Data Engine Comparison

| Feature | V1 Engine | V2 Engine |
|---------|-----------|-----------|
| Storage subsystem | User-space tgt + kernel iSCSI initiator | User-space SPDK |
| Protocol | iSCSI | NVMe-oF TCP |
| Typical IOPS | 100K-500K | 1M+ |
| CPU efficiency | Standard | Much lower CPU per IOPS |
| Latency | ~100-500μs | ~50-100μs |
| Stability | Production (GA) | Preview (as of v1.7) |
| NVMe requirement | No | Recommended |

## Prerequisites

- Longhorn v1.6.0 or later (V2 was first introduced as preview in v1.5.0)
- Linux kernel 5.15 or later with NVMe-oF TCP support; v5.19 or newer is strongly recommended (Longhorn warns that 5.15 hosts can unexpectedly reboot on volume IO errors)
- AMD64 (with SSE4.2) or ARM64 CPU; each V2 instance-manager pod consumes ~1 CPU core for the SPDK target daemon
- NVMe SSDs recommended (though not strictly required)

### Verify Kernel Support

```bash
# Check kernel version (5.15+ minimum; 5.19+ recommended)

uname -r

# Verify the kernel modules SPDK needs
modprobe nvme-tcp
modprobe vfio_pci
modprobe uio_pci_generic
lsmod | grep -E 'nvme_tcp|vfio_pci|uio_pci_generic'

# Load modules permanently
cat <<EOF >> /etc/modules
nvme-tcp
vfio_pci
uio_pci_generic
EOF
```

### Configure Hugepages

SPDK requires hugepages for its memory allocator:

```bash
# Configure 2 GiB of hugepages per node (minimum for SPDK)
# Add to /etc/sysctl.conf for persistence
echo "vm.nr_hugepages = 1024" >> /etc/sysctl.conf
sysctl -p

# Verify hugepages
cat /proc/meminfo | grep HugePages
# HugePages_Total: 1024
# HugePages_Free: 1024

# Or configure via Kubernetes (requires node restart or DaemonSet)
```

## Enable V2 Data Engine in Longhorn

### Step 1: Enable the V2 Data Engine Feature

```bash
# Enable the V2 data engine in Longhorn settings
kubectl patch settings.longhorn.io v2-data-engine \
  -n longhorn-system \
  --type merge \
  -p '{"value": "true"}'

# Wait for V2 engine pods to be created
kubectl get pods -n longhorn-system | grep instance-manager
```

### Step 2: Configure the V2 Hugepage Limit and CPU Reservation

The V2 hugepage allocation and CPU guarantee are configured via cluster-wide Longhorn settings, not per-node spec fields:

```bash
# Set the hugepage limit (in MiB) used by each V2 instance manager.
# Default is 2048 (2 GiB); raise it if you plan to run many V2 replicas per node.
kubectl patch settings.longhorn.io v2-data-engine-hugepage-limit \
  -n longhorn-system \
  --type merge \
  -p '{"value": "2048"}'

# Reserve CPU (in millicpus) for each V2 instance-manager pod.
# Default is 1250m, matching SPDK's busy-poll requirement.
kubectl patch settings.longhorn.io guaranteed-instance-manager-cpu-for-v2-data-engine \
  -n longhorn-system \
  --type merge \
  -p '{"value": "1250"}'
```

### Step 3: Add a Block-Type Disk for V2 Volumes

V2 volumes must be backed by `block`-type disks (raw block devices), not the filesystem-type disks used by V1. Edit the Longhorn `Node` resource and add the device under `spec.disks`:

```bash
kubectl -n longhorn-system edit nodes.longhorn.io worker-node-1
```

```yaml
# Example snippet to add to spec.disks
apiVersion: longhorn.io/v1beta2
kind: Node
metadata:
  name: worker-node-1
  namespace: longhorn-system
spec:
  allowScheduling: true
  disks:
    nvme0n1:
      path: /dev/nvme0n1
      diskType: block
      allowScheduling: true
      tags:
        - nvme
```

## Create a V2 StorageClass

```yaml
# storageclass-v2.yaml - StorageClass using the V2 data engine
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-v2
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  dataLocality: "best-effort"
  fsType: "ext4"
  # Enable V2 data engine for this storage class
  dataEngine: "v2"
  # Recommended disk selector for NVMe disks
  diskSelector: "nvme"
```

```bash
kubectl apply -f storageclass-v2.yaml
```

## Deploy a Test Workload with V2 Engine

```yaml
# test-v2-pvc.yaml - PVC using V2 data engine
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: v2-engine-test
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn-v2
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: v2-test-pod
spec:
  containers:
    - name: app
      image: busybox
      command: ["sleep", "3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: v2-engine-test
```

```bash
kubectl apply -f test-v2-pvc.yaml

# Verify the V2 engine is being used
kubectl describe volume.longhorn.io <volume-name> -n longhorn-system | grep "Data Engine"
```

## Benchmarking V2 vs V1 Performance

```bash
# Compare performance between V1 and V2 engines
# First, create benchmark PVCs for each engine type

# Benchmark V2 engine
kubectl exec -it v2-test-pod -- \
  fio --name=v2-bench \
    --rw=randread \
    --bs=4k \
    --size=1g \
    --filename=/data/bench \
    --ioengine=libaio \
    --iodepth=128 \
    --direct=1 \
    --numjobs=4 \
    --output-format=json 2>&1 | tee v2-results.json
```

## Monitoring V2 Engine Metrics

```bash
# List instance-manager pods (V2 pods are identified by the data-engine=v2 label,
# not by a "v2" suffix in the pod name).
kubectl get pods -n longhorn-system -l longhorn.io/data-engine=v2

# View V2 engine specific logs
kubectl logs -n longhorn-system \
  $(kubectl get pods -n longhorn-system \
    -l longhorn.io/instance-manager-type=engine \
    -l longhorn.io/data-engine=v2 \
    -o name | head -1) \
  --tail=50
```

## Limitations of V2 Data Engine (Beta)

As of Longhorn v1.7, the V2 engine has some limitations:
- No support for RWX (ReadWriteMany) volumes
- No volume encryption support yet
- Snapshots work differently (snapshot is a point-in-time copy of the device)
- Backup to external targets may have limitations

## Conclusion

Longhorn's V2 Data Engine represents a significant leap in storage performance for latency-sensitive applications. By leveraging SPDK's user-space NVMe processing, it achieves much higher IOPS with lower CPU overhead compared to the V1 engine. While still in beta, the V2 engine is worth evaluating for performance-critical workloads. Monitor its development in Longhorn releases, and always test thoroughly before adopting it for production workloads.
