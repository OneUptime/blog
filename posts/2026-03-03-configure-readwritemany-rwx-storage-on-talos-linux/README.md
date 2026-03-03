# How to Configure ReadWriteMany (RWX) Storage on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Storage, ReadWriteMany, NFS, Longhorn

Description: Learn how to set up ReadWriteMany shared storage on Talos Linux for workloads that need concurrent access from multiple pods.

---

Most Kubernetes storage solutions default to ReadWriteOnce (RWO), meaning only one pod on one node can write to a volume at a time. But plenty of real workloads need multiple pods to read and write to the same volume simultaneously. Think shared media directories, content management systems, or collaborative processing pipelines. This is where ReadWriteMany (RWX) comes in.

Setting up RWX storage on Talos Linux requires some thought because the operating system is immutable and does not allow you to install packages directly on nodes. You cannot just apt-get install an NFS server. Everything has to run as a Kubernetes workload or be configured through the Talos machine configuration.

## What Is ReadWriteMany?

Kubernetes defines three access modes for PersistentVolumes:

- **ReadWriteOnce (RWO)** - The volume can be mounted as read-write by a single node.
- **ReadOnlyMany (ROX)** - The volume can be mounted as read-only by many nodes.
- **ReadWriteMany (RWX)** - The volume can be mounted as read-write by many nodes.

RWX is the most flexible but also the most complex to implement. Not all storage backends support it, and those that do often have trade-offs in performance or consistency.

## Option 1: NFS-Based RWX Storage

NFS is the classic approach to shared storage. On Talos Linux, you have two paths: use an external NFS server or run an NFS server inside Kubernetes.

### External NFS Server

If you have an existing NFS server on your network, you can connect to it from your Talos Linux cluster using the NFS CSI driver.

First, install the NFS CSI driver.

```bash
# Install the NFS CSI driver using Helm
helm repo add csi-driver-nfs https://raw.githubusercontent.com/kubernetes-csi/csi-driver-nfs/master/charts
helm repo update

helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system \
  --set driver.name=nfs.csi.k8s.io
```

Create a StorageClass that points to your NFS server.

```yaml
# StorageClass for external NFS
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs-rwx
provisioner: nfs.csi.k8s.io
parameters:
  server: 192.168.1.100      # Your NFS server IP
  share: /exports/kubernetes  # NFS export path
reclaimPolicy: Retain
volumeBindingMode: Immediate
mountOptions:
  - nfsvers=4.1
  - hard
  - noresvport
```

Now you can create PVCs with RWX access.

```yaml
# PVC using NFS for shared storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: nfs-rwx
  resources:
    requests:
      storage: 100Gi
```

### In-Cluster NFS Server

If you do not have an external NFS server, you can run one inside Kubernetes. The nfs-ganesha-server-and-external-provisioner project lets you turn a local PVC into an NFS share.

```yaml
# Deploy an in-cluster NFS server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nfs-server
  namespace: storage
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nfs-server
  template:
    metadata:
      labels:
        app: nfs-server
    spec:
      containers:
      - name: nfs-server
        image: itsthenetwork/nfs-server-alpine:latest
        ports:
        - containerPort: 2049
          name: nfs
        env:
        - name: SHARED_DIRECTORY
          value: /data
        volumeMounts:
        - name: storage
          mountPath: /data
        securityContext:
          privileged: true
      volumes:
      - name: storage
        persistentVolumeClaim:
          claimName: nfs-backing-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: nfs-server
  namespace: storage
spec:
  ports:
  - port: 2049
    targetPort: 2049
  selector:
    app: nfs-server
  clusterIP: None
```

## Option 2: Longhorn RWX Volumes

Longhorn is a popular distributed storage solution for Kubernetes that supports RWX volumes through its built-in NFS server functionality. On Talos Linux, Longhorn works well because it runs entirely as Kubernetes workloads.

### Installing Longhorn on Talos Linux

Before installing Longhorn, make sure your Talos Linux nodes have the required kernel modules. You may need to add them to your machine configuration.

```yaml
# Talos machine config for Longhorn support
machine:
  sysctls:
    vm.overcommit_memory: "1"
  kubelet:
    extraMounts:
      - destination: /var/lib/longhorn
        type: bind
        source: /var/lib/longhorn
        options:
          - bind
          - rshared
          - rw
```

Apply the configuration and install Longhorn.

```bash
# Apply Talos config
talosctl -n 10.0.0.11 apply-config --file worker-config.yaml

# Install Longhorn
helm repo add longhorn https://charts.longhorn.io
helm repo update

helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultDataPath=/var/lib/longhorn
```

### Creating RWX Volumes with Longhorn

Longhorn supports RWX by creating an NFS share on top of its replicated block storage. Create a StorageClass specifically for RWX access.

```yaml
# Longhorn StorageClass for RWX
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-rwx
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "2880"
  fromBackup: ""
  fsType: ext4
  nfsOptions: "vers=4.1,hard"
```

Then create your RWX PVC.

```yaml
# RWX PVC backed by Longhorn
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-media
  namespace: default
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: longhorn-rwx
  resources:
    requests:
      storage: 50Gi
```

## Option 3: Rook-Ceph CephFS

Rook-Ceph provides CephFS, which natively supports RWX access. CephFS is a POSIX-compliant distributed filesystem that handles concurrent reads and writes from multiple clients.

```bash
# Install Rook-Ceph operator
helm repo add rook-release https://charts.rook.io/release
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace
```

After the operator is running, create a CephCluster and a CephFilesystem.

```yaml
# CephFilesystem for RWX support
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: shared-fs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPools:
    - replicated:
        size: 3
  metadataServer:
    activeCount: 1
    activeStandby: true
---
# StorageClass for CephFS RWX
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs-rwx
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: shared-fs
  pool: shared-fs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Using RWX Storage in Your Workloads

Once you have RWX storage configured, multiple pods can mount the same volume. Here is an example deployment with three replicas all writing to the same shared volume.

```yaml
# Deployment with shared RWX volume
apiVersion: apps/v1
kind: Deployment
metadata:
  name: content-processor
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: content-processor
  template:
    metadata:
      labels:
        app: content-processor
    spec:
      containers:
      - name: processor
        image: myapp/content-processor:latest
        volumeMounts:
        - name: shared-content
          mountPath: /data/shared
      volumes:
      - name: shared-content
        persistentVolumeClaim:
          claimName: shared-media
```

## Performance Considerations

RWX storage is inherently slower than RWO for most workloads. NFS adds network overhead, and distributed filesystems like CephFS have consistency guarantees that add latency. Here are some guidelines.

For read-heavy workloads, RWX performs well. NFS caching helps, and CephFS can distribute reads across multiple metadata servers.

For write-heavy workloads, consider whether you truly need RWX. If pods are writing to different directories, you might be able to use separate RWO volumes instead.

For mixed workloads, test with realistic traffic patterns. The performance characteristics vary significantly between NFS, Longhorn RWX, and CephFS.

```bash
# Simple benchmark to test RWX performance
kubectl exec content-processor-abc123 -- fio \
  --name=rwx-test \
  --ioengine=libaio \
  --rw=randrw \
  --bs=4k \
  --numjobs=4 \
  --size=1G \
  --runtime=60 \
  --directory=/data/shared
```

## Conclusion

ReadWriteMany storage on Talos Linux is achievable through several paths. NFS is the simplest and most broadly compatible option. Longhorn adds replication and Kubernetes-native management. Rook-Ceph with CephFS provides the most robust distributed filesystem experience. Choose the option that matches your performance requirements, operational complexity tolerance, and existing infrastructure. On Talos Linux, the key constraint is that everything must run as a Kubernetes workload or be configured through the machine config, so plan your storage architecture with that in mind from the start.
