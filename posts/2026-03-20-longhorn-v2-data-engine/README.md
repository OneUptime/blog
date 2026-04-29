# How to Configure Longhorn V2 Data Engine - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, V2 Data Engine, SPDK, NVMe, Kubernetes, Storage, High Performance

Description: Learn how to configure Longhorn's V2 Data Engine based on SPDK to achieve significantly higher IOPS and lower latency compared to the V1 iSCSI-based engine.

---

Longhorn V2 Data Engine (introduced experimentally in Longhorn v1.5) uses SPDK (Storage Performance Development Kit) to deliver near-NVMe performance by bypassing the kernel's storage stack. This guide covers enabling and configuring V2.

---

## Prerequisites

- Longhorn v1.5.0+
- Linux kernel 5.19+ on Longhorn nodes (6.7+ recommended for stability)
- NVMe SSDs strongly recommended
- Hugepages support (2 GiB of 2 MiB-sized pages per Longhorn node)
- Longhorn `block-type` disks on nodes that will host V2 replicas
- `vfio_pci`, `uio_pci_generic`, and `nvme-tcp` kernel modules

---

## Step 1: Prepare Nodes for V2 Data Engine

```bash
# Load required kernel modules

modprobe vfio_pci
modprobe uio_pci_generic
modprobe nvme-tcp

# Make modules persistent across reboots
cat <<'EOF' > /etc/modules-load.d/longhorn-v2.conf
vfio_pci
uio_pci_generic
nvme-tcp
EOF

# Allocate 1024 x 2Mi hugepages (2Gi total) for the current boot
echo 1024 > /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# Verify hugepages are allocated
grep Huge /proc/meminfo

# Restart kubelet so Kubernetes reports the hugepages-2Mi resource
systemctl restart kubelet
```

---

## Step 2: Enable V2 Data Engine in Longhorn

```bash
# Enable V2 data engine globally
kubectl patch settings.longhorn.io v2-data-engine \
  -n longhorn-system \
  --type merge \
  -p '{"value":"true"}'

# Verify the setting
kubectl get settings.longhorn.io v2-data-engine \
  -n longhorn-system \
  -o jsonpath='{.value}'
```

---

## Step 3: Configure Node Hugepages for SPDK

Longhorn's SPDK needs hugepages on each node that will run V2 engine replicas, and Kubernetes should report them as `hugepages-2Mi`:

```bash
# Recommended: make the hugepage allocation persistent via kernel boot parameters
# Add to /etc/default/grub
GRUB_CMDLINE_LINUX="hugepagesz=2M hugepages=1024"

# Apply the GRUB changes using your distro's tooling, reboot, then verify Kubernetes sees the resource
kubectl describe node storage-node-01 | grep -A2 hugepages-2Mi

# If the device has an existing filesystem or partition table, clear it first
wipefs -a /dev/nvme1n1

# V2 replicas must be placed on Longhorn block-type disks
kubectl -n longhorn-system edit node.longhorn.io storage-node-01
```

```yaml
spec:
  disks:
    nvme-disk:
      allowScheduling: true
      evictionRequested: false
      path: /dev/nvme1n1
      storageReserved: 0
      tags:
        - nvme
      diskType: block
```

---

## Step 4: Create a StorageClass Using V2 Data Engine

```yaml
# storageclass-v2.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-v2
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: Immediate
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"
  dataEngine: "v2"
```

---

## Step 5: Create a PVC Using V2

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: high-perf-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn-v2
  resources:
    requests:
      storage: 100Gi
```

---

## Step 6: Verify V2 Volume Performance

```bash
# Check that the volume is using V2 engine
kubectl get volume <volume-name> -n longhorn-system \
  -o jsonpath='{.spec.dataEngine}'

# Run a quick write-throughput check from a pod that mounts the PVC
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: perf-test
spec:
  restartPolicy: Never
  containers:
    - name: perf-test
      image: debian:12-slim
      command: ["/bin/sh", "-c"]
      args:
        - dd if=/dev/zero of=/data/test bs=1M count=1024 conv=fdatasync
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: high-perf-data
EOF

kubectl logs -f pod/perf-test
```

---

## Best Practices

- V2 Data Engine is still a Technical Preview feature - use V1 for critical production workloads unless you have validated V2 for your specific Longhorn release and feature requirements.
- Dedicate specific nodes or Longhorn block disks to V2 storage using tags and selectors.
- Monitor hugepage consumption - SPDK requires consistent hugepage availability to function.
