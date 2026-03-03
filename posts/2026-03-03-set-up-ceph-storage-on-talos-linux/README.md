# How to Set Up Ceph Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ceph, Distributed Storage, Kubernetes, Persistent Volumes

Description: Set up Ceph distributed storage on Talos Linux for resilient, scalable persistent volumes in your Kubernetes cluster.

---

Ceph is a distributed storage system that provides block, file, and object storage through a unified platform. When combined with Talos Linux, it creates a powerful foundation for Kubernetes persistent storage that can survive node failures and scale with your needs. Setting up Ceph on Talos requires some specific configuration because Talos is an immutable operating system without a traditional package manager. This guide covers everything from preparing Talos nodes for Ceph to deploying and verifying the storage cluster.

## Why Ceph on Talos Linux?

Ceph brings several capabilities that single-node storage cannot provide:

- **Data replication** - data is copied across multiple nodes, surviving hardware failures
- **Self-healing** - when a node fails, Ceph automatically rebalances data to maintain the desired replication level
- **Scalability** - add more nodes and disks to increase capacity without downtime
- **Multi-protocol** - provides block storage (RBD), file storage (CephFS), and object storage (RGW) from the same cluster
- **Kubernetes integration** - native CSI driver for seamless persistent volume provisioning

## Prerequisites

For a production Ceph deployment on Talos Linux, you need:

- At least 3 worker nodes (for data replication)
- Each node should have at least one dedicated disk for Ceph (separate from the Talos system disk)
- Sufficient memory (Ceph monitors and OSDs are memory-hungry)
- Network connectivity between all nodes (10 GbE recommended for production)

## Preparing Talos Nodes for Ceph

Talos nodes need specific configuration to support Ceph. The key requirements are kernel modules and extra disk configuration.

### Enable Required Kernel Modules

Ceph needs the `rbd` kernel module for block device support. Add it to your machine config:

```yaml
machine:
  kernel:
    modules:
      - name: rbd
```

### Configure Extra Disks

Ceph needs raw, unpartitioned disks. Do not configure these disks in the `machine.disks` section - leave them for Ceph to manage directly:

```yaml
# Machine config for a Ceph node
machine:
  type: worker
  kernel:
    modules:
      - name: rbd
  # Do NOT configure /dev/sdb here - leave it for Ceph
  # Only configure the system disk
  install:
    disk: /dev/sda
```

### Allow Ceph Pods to Access Host Resources

Ceph needs access to the host's block devices. Configure the kubelet to allow this:

```yaml
machine:
  kubelet:
    extraMounts:
      - destination: /var/lib/rook
        type: bind
        source: /var/lib/rook
        options:
          - bind
          - rshared
```

## Deploying Ceph with Rook

Rook is the standard way to run Ceph on Kubernetes. It provides an operator that manages the Ceph cluster lifecycle.

### Install the Rook Operator

```bash
# Add the Rook Helm repo
helm repo add rook-release https://charts.rook.io/release
helm repo update

# Install the Rook operator
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace \
  --set csi.enableRbdDriver=true \
  --set csi.enableCephfsDriver=true
```

### Wait for the Operator

```bash
# Wait for the operator to be ready
kubectl -n rook-ceph get pods --watch
```

### Create the Ceph Cluster

Create a CephCluster resource that describes your storage cluster:

```yaml
# ceph-cluster.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 2
  dashboard:
    enabled: true
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
      - name: "sdb"  # The dedicated Ceph disk
    config:
      osdsPerDevice: "1"
  resources:
    mon:
      requests:
        cpu: "500m"
        memory: "1Gi"
    osd:
      requests:
        cpu: "500m"
        memory: "2Gi"
```

```bash
kubectl apply -f ceph-cluster.yaml
```

### Monitor Cluster Deployment

```bash
# Watch pods come up
kubectl -n rook-ceph get pods --watch

# Check Ceph cluster health
kubectl -n rook-ceph exec -it $(kubectl -n rook-ceph get pod -l app=rook-ceph-tools -o jsonpath='{.items[0].metadata.name}') -- ceph status
```

## Creating Storage Classes

Once Ceph is running, create storage classes for your workloads:

### Block Storage (RBD)

```yaml
# ceph-block-pool.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 3
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

### Shared Filesystem (CephFS)

```yaml
# ceph-filesystem.yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: ceph-filesystem
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - name: data0
      replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-filesystem
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: ceph-filesystem
  pool: ceph-filesystem-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
allowVolumeExpansion: true
```

## Testing the Storage

Create a test PVC and pod to verify everything works:

```yaml
# test-ceph.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ceph-test-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: ceph-block
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: ceph-test-pod
spec:
  containers:
  - name: test
    image: busybox
    command: ["sh", "-c", "echo 'Ceph works!' > /data/test.txt && cat /data/test.txt && sleep 3600"]
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: ceph-test-pvc
```

```bash
kubectl apply -f test-ceph.yaml

# Verify the PVC is bound
kubectl get pvc ceph-test-pvc

# Check the pod logs
kubectl logs ceph-test-pod
```

## Monitoring Ceph Health

Deploy the Rook toolbox for ongoing management:

```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/release-1.13/deploy/examples/toolbox.yaml

# Access Ceph CLI
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd status
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
```

## Summary

Setting up Ceph on Talos Linux gives your Kubernetes cluster production-grade distributed storage. The key is proper Talos configuration (kernel modules, leaving disks unpartitioned for Ceph) and a well-tuned Rook deployment. Start with block storage for most workloads, add CephFS when you need shared filesystem access, and monitor cluster health through the Rook toolbox and Ceph dashboard. With three or more nodes and dedicated disks, Ceph provides the resilient, scalable storage that production Kubernetes clusters need.
