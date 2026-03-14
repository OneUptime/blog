# How to Deploy OpenEBS Mayastor Engine with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, OpenEBS, Mayastor, NVMe, High Performance Storage

Description: Deploy OpenEBS Mayastor high-performance NVMe storage engine on Kubernetes using Flux CD for GitOps-managed ultra-low-latency block storage.

---

## Introduction

OpenEBS Mayastor is a high-performance storage engine written in Rust that leverages SPDK (Storage Performance Development Kit) and NVMe-oF (NVMe over Fabrics) to deliver near-native NVMe performance from Kubernetes persistent volumes. It is designed for latency-sensitive workloads like databases, machine learning training, and real-time analytics where storage I/O is the bottleneck.

Mayastor requires nodes with NVMe devices and uses CPU cores dedicated to storage I/O (via DPDK hugepages). It provides synchronous replication through its Nexus architecture and is managed through `DiskPool` and `StorageClass` resources. Deploying through Flux CD gives you GitOps control over disk pool configuration and storage class parameters.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- Worker nodes with NVMe devices and at least 1 GiB of hugepages configured
- Linux kernel 5.13+ recommended for best performance
- `kubectl` and `flux` CLIs installed

## Step 1: Configure Hugepages on Nodes

Mayastor requires hugepages. Configure on each storage node:

```bash
# Add to /etc/sysctl.d/99-hugepages.conf on each node
vm.nr_hugepages = 1024  # 1024 × 2MiB = 2 GiB hugepages

# Apply immediately
sysctl -p /etc/sysctl.d/99-hugepages.conf

# Verify
grep HugePages /proc/meminfo
```

Label storage nodes:

```bash
kubectl label node storage-node-1 openebs.io/engine=mayastor
kubectl label node storage-node-2 openebs.io/engine=mayastor
kubectl label node storage-node-3 openebs.io/engine=mayastor
```

## Step 2: Add the OpenEBS HelmRepository

```yaml
# infrastructure/sources/openebs-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: openebs
  namespace: flux-system
spec:
  interval: 12h
  url: https://openebs.github.io/openebs
```

## Step 3: Deploy OpenEBS with Mayastor

```yaml
# infrastructure/storage/mayastor/mayastor.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: openebs-mayastor
  namespace: openebs
spec:
  interval: 30m
  chart:
    spec:
      chart: openebs
      version: "3.10.0"
      sourceRef:
        kind: HelmRepository
        name: openebs
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    # Enable Mayastor engine
    mayastor:
      enabled: true
      io_engine:
        # CPU cores dedicated to storage I/O
        cpuCount: "2"
        # Hugepages settings
        hugepages2Mi: "1024"   # 1024 × 2 MiB = 2 GiB
        nodeSelector:
          openebs.io/engine: mayastor
        resources:
          limits:
            cpu: "2"
            memory: "1Gi"
            # Request NVMe device access
            hugepages-2Mi: "2Gi"
          requests:
            cpu: "2"
            memory: "1Gi"
            hugepages-2Mi: "2Gi"

    # Disable other engines
    cstor:
      enabled: false
    localprovisioner:
      enabled: false
    ndm:
      enabled: true
```

## Step 4: Create DiskPools

After the operator is running, create DiskPools on each storage node:

```yaml
# infrastructure/storage/mayastor/diskpools.yaml
apiVersion: openebs.io/v1beta2
kind: DiskPool
metadata:
  name: pool-node-1
  namespace: openebs
spec:
  node: storage-node-1
  disks:
    - uring:///dev/nvme0n1   # NVMe device path
---
apiVersion: openebs.io/v1beta2
kind: DiskPool
metadata:
  name: pool-node-2
  namespace: openebs
spec:
  node: storage-node-2
  disks:
    - uring:///dev/nvme0n1
---
apiVersion: openebs.io/v1beta2
kind: DiskPool
metadata:
  name: pool-node-3
  namespace: openebs
spec:
  node: storage-node-3
  disks:
    - uring:///dev/nvme0n1
```

## Step 5: Create StorageClasses

```yaml
# infrastructure/storage/mayastor/storageclasses.yaml
# 3-replica storage class (HA)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-3
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: io.openebs.csi-mayastor
allowVolumeExpansion: true
parameters:
  protocol: nvmf       # use NVMe-oF for data transport
  repl: "3"           # 3 synchronous replicas
  ioTimeout: "30"
---
# 1-replica storage class (maximum performance, no HA)
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-1
provisioner: io.openebs.csi-mayastor
allowVolumeExpansion: true
parameters:
  protocol: nvmf
  repl: "1"
  ioTimeout: "30"
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/mayastor-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: openebs-mayastor
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/mayastor
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: openebs-io-engine
      namespace: openebs
```

## Step 7: Verify and Benchmark

```bash
# Check DiskPools are online
kubectl get diskpool -n openebs

# Create a test PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mayastor-test-pvc
  namespace: default
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: mayastor-3
  resources:
    requests:
      storage: 10Gi
EOF

kubectl get pvc mayastor-test-pvc

# Check Mayastor volume
kubectl get mayastorvolume -n openebs

# Benchmark with fio
kubectl run fio-bench --image=wallnerryan/fiotools \
  --overrides='{"spec":{"volumes":[{"name":"data","persistentVolumeClaim":{"claimName":"mayastor-test-pvc"}}],"containers":[{"name":"fio","image":"wallnerryan/fiotools","command":["fio","--name=randread","--ioengine=libaio","--iodepth=64","--rw=randread","--bs=4k","--direct=1","--size=1G","--filename=/data/test","--output-format=json"],"volumeMounts":[{"name":"data","mountPath":"/data"}]}]}}' \
  --restart=Never
```

## Best Practices

- Dedicate at least 2 CPU cores to Mayastor's I/O engine — these cores are polled 100% of the time for minimal latency.
- Configure hugepages in the Linux kernel boot parameters (`GRUB_CMDLINE_LINUX`) rather than `sysctl` to ensure they are allocated before NUMA memory fragmentation occurs.
- Use `repl: "3"` only when you have NVMe devices on at least 3 nodes — synchronous 3-way replication adds write latency when nodes are geographically separated.
- Monitor Mayastor volume health with `kubectl get mayastorvolume -n openebs` and alert on degraded state.
- Benchmark with `fio` before going to production to verify your NVMe devices and hugepages configuration are correct.

## Conclusion

OpenEBS Mayastor deployed via Flux CD delivers NVMe-grade storage performance from Kubernetes persistent volumes through its SPDK-based, user-space I/O engine. For latency-sensitive workloads like high-frequency databases, real-time analytics, and ML training, Mayastor's architecture eliminates the kernel overhead that limits other storage solutions. With Flux managing the DiskPool and StorageClass configurations, your high-performance storage infrastructure is version-controlled and consistently applied.
