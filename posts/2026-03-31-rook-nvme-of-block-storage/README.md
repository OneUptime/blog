# How to Set Up NVMe-oF Block Storage with Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Storage

Description: Configure Ceph NVMe-oF gateways in Rook to expose block storage with ultra-low latency for high-performance Kubernetes workloads.

---

## Introduction

NVMe-oF (NVMe over Fabrics) allows Ceph block storage to be accessed with lower latency than traditional iSCSI or RBD by using the NVMe protocol over TCP or RDMA transports. Rook supports deploying Ceph NVMe-oF gateways via the `CephNVMeOFGateway` CRD introduced in Rook v1.19 (experimental). This enables Kubernetes workloads with stringent IOPS and latency requirements to leverage NVMe-oF as an alternative to RBD.

## NVMe-oF Architecture

```mermaid
flowchart LR
    A[Kubernetes Pod] -->|NVMe-oF TCP/RDMA| B[NVMe-oF Gateway\nrook-ceph namespace]
    B --> C[Ceph RBD Pool]
    C --> D[NVMe SSDs / OSDs]
    E[CephNVMeOFGateway CRD] --> B
    F[StorageClass nvmeof] --> A
```

## Prerequisites

- Rook v1.19 or newer (NVMe-oF support, experimental)
- Ceph Reef (v18.2+) or newer
- Linux kernel 5.0+ on worker nodes (for NVMe-oF TCP initiator support)
- `nvme-tcp` kernel module loaded on all worker nodes
- Ceph cluster with NVMe OSDs for best performance

## Step 1: Verify NVMe-oF Kernel Support

```bash
# Check kernel version on all nodes (must be 5.0+)
kubectl get nodes -o custom-columns='NAME:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion'

# Verify nvme-tcp module is available
kubectl get nodes -o name | head -1 | xargs -I{} kubectl debug {} \
  --image=alpine --profile=sysadmin -- \
  modinfo nvme-tcp

# Load the module if not loaded (run on each node or via DaemonSet)
modprobe nvme-tcp
```

## Step 2: Create a DaemonSet to Load nvme-tcp on All Nodes

```yaml
# nvme-tcp-loader.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nvme-tcp-loader
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: nvme-tcp-loader
  template:
    metadata:
      labels:
        app: nvme-tcp-loader
    spec:
      hostNetwork: true
      hostPID: true
      tolerations:
        - operator: Exists
      initContainers:
        - name: load-module
          image: alpine
          command: ["nsenter", "--mount=/proc/1/ns/mnt", "--", "modprobe", "nvme-tcp"]
          securityContext:
            privileged: true
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.9
```

```bash
kubectl apply -f nvme-tcp-loader.yaml
```

## Step 3: Configure a CephBlockPool for NVMe-oF

```yaml
# nvmeof-pool.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: nvmeof-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  # Use NVMe device class for best performance
  deviceClass: nvme
  enableRBDStats: true
```

```bash
kubectl apply -f nvmeof-pool.yaml
```

## Step 4: Deploy the CephNVMeOFGateway

```yaml
# nvmeof-gateway.yaml
apiVersion: ceph.rook.io/v1
kind: CephNVMeOFGateway
metadata:
  name: nvmeof-gw
  namespace: rook-ceph
spec:
  # Container image for the NVMe-oF gateway
  image: quay.io/ceph/nvmeof:1.5
  # Number of gateway instances for high availability
  instances: 2
  # Reference to the Ceph Rados Block Device pool
  pool: nvmeof-pool
  # Gateway group name for HA (ANA group)
  group: nvmeof-group-1
  # Use host network for lowest latency
  hostNetwork: true
```

```bash
kubectl apply -f nvmeof-gateway.yaml

# Check gateway pods are running
kubectl get pods -n rook-ceph -l app=rook-ceph-nvmeof

# Check gateway status
kubectl describe cephnvmeofgateway nvmeof-gw -n rook-ceph
```

## Step 5: Create an NVMe-oF Subsystem

The subsystem defines the NVMe namespace that clients will connect to:

```bash
# Access Rook toolbox or the NVMe-oF gateway pod
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Create an NVMe subsystem
rbd create nvmeof-pool/nvmeof-vol-1 --size 100G

# Register the gateway (requires gateway ID, pool, and group)
# (This may also be done via the Ceph dashboard or CLI depending on Rook version)
ceph nvme-gw create gw-1 nvmeof-pool nvmeof-group-1

# Show NVMe gateways in the pool/group
ceph nvme-gw show nvmeof-pool nvmeof-group-1
```

## Step 6: Connect from a Kubernetes Node (Manual Test)

```bash
# On a Kubernetes worker node with nvme-tcp loaded:
# Discover the NVMe-oF target
nvme discover -t tcp -a <gateway-ip> -s 4420

# Connect to the NVMe subsystem
nvme connect -t tcp \
  -a <gateway-ip> \
  -s 4420 \
  -n nqn.2016-06.io.spdk:cnode1

# List connected NVMe devices
nvme list

# Verify the device is accessible
nvme id-ns /dev/nvme0n1
```

## Step 7: Create a StorageClass for NVMe-oF Volumes

For Kubernetes dynamic provisioning via NVMe-oF, use the dedicated NVMe-oF CSI provisioner (not the standard RBD CSI driver):

```yaml
# storageclass-nvmeof.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-nvmeof
  annotations:
    description: "High-performance NVMe-oF backed block storage"
provisioner: rook-ceph.nvmeof.csi.ceph.com
parameters:
  clusterID: rook-ceph
  # Use the NVMe-dedicated pool
  pool: nvmeof-pool
  # NVMe subsystem NQN
  subsystemNQN: nqn.2016-06.io.spdk:cnode1
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Step 8: Benchmark NVMe-oF Performance

```bash
# Run an FIO benchmark against an NVMe-oF PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: nvmeof-benchmark
spec:
  containers:
    - name: fio
      image: nixery.dev/fio
      command: [
        "fio", "--name=randwrite", "--ioengine=libaio",
        "--rw=randwrite", "--bs=4k", "--numjobs=4",
        "--iodepth=32", "--runtime=60", "--time_based",
        "--filename=/data/testfile", "--size=10g"
      ]
      volumeMounts:
        - name: nvmeof-vol
          mountPath: /data
  volumes:
    - name: nvmeof-vol
      persistentVolumeClaim:
        claimName: nvmeof-test-pvc
EOF
```

## Troubleshooting

```bash
# Gateway pods not starting
kubectl describe pod -n rook-ceph -l app=rook-ceph-nvmeof | grep -A10 Events

# Check if SPDK service is running
kubectl -n rook-ceph exec -it <gateway-pod> -- \
  ps aux | grep spdk

# Verify gateway is reachable
nc -vz <gateway-ip> 4420

# Check Ceph NVMe-oF service status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph nvme-gw show nvmeof-pool nvmeof-group-1
```

## Summary

NVMe-oF block storage with Rook leverages the CephNVMeOFGateway CRD to deploy Ceph NVMe-oF gateway instances that expose RBD images over NVMe TCP or RDMA transports. This provides lower latency than traditional RBD kernel mapping for workloads with ultra-high IOPS requirements. The setup requires Rook v1.19+, Ceph Reef or newer, Linux kernel 5.0+ with the nvme-tcp module, and a dedicated CephBlockPool targeting NVMe-class OSDs. For most Kubernetes workloads, the standard RBD CSI driver still provides the best compatibility, while NVMe-oF is reserved for latency-critical applications.
