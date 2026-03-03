# How to Set Up Home Lab Storage with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Home Lab, Storage, Longhorn, Rook-Ceph, NFS

Description: A comprehensive guide to setting up persistent storage for a Talos Linux home lab cluster using Longhorn, Rook-Ceph, NFS, and local-path provisioner.

---

Storage is the trickiest part of running Kubernetes on bare metal. In the cloud, you click a button and get a persistent volume backed by the provider's storage service. In a home lab running Talos Linux, you need to bring your own storage solution. The good news is that there are several solid options, ranging from dead simple to enterprise-grade.

This guide covers the most practical storage solutions for a Talos Linux home lab.

## Understanding Kubernetes Storage

Kubernetes uses PersistentVolumes (PV) and PersistentVolumeClaims (PVC) to abstract storage. A StorageClass defines how volumes are provisioned. In a home lab, you need at least one StorageClass backed by actual storage on your nodes or network.

The main options are:

- **Local-path provisioner**: Simple, fast, no replication
- **Longhorn**: Replicated block storage, easy to set up
- **Rook-Ceph**: Enterprise-grade, more complex
- **NFS**: Network storage from an external NAS

## Option 1: Local-Path Provisioner

This is the simplest option. It creates volumes on the local disk of whatever node the pod runs on. There is no replication, so if a node dies, the data on that node is gone.

```bash
# Install local-path provisioner
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/master/deploy/local-path-storage.yaml

# Set as default storage class
kubectl patch storageclass local-path -p \
  '{"metadata":{"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
```

Test it:

```yaml
# test-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: test-claim
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
  storageClassName: local-path
---
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: test
      image: busybox
      command: ["sh", "-c", "echo 'Storage works' > /data/test.txt && sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: test-claim
```

**When to use**: Development, testing, workloads where data loss is acceptable, or when you have external backups.

## Option 2: Longhorn

Longhorn is the sweet spot for most home labs. It provides replicated block storage across your nodes, a web UI for management, backup support, and it is relatively easy to set up.

### Prerequisites on Talos

Longhorn needs the iscsi-tools extension on Talos nodes. Add it to your machine configuration:

```yaml
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
  files:
    - content: |
        [Service]
        Environment="ISCSIADM_PREFER_DB_SETTING=true"
      path: /etc/systemd/system/iscsid.service.d/env.conf
      op: create
  # Longhorn also needs these kernel modules
  kernel:
    modules:
      - name: iscsi_tcp
```

Apply the updated configuration and reboot:

```bash
talosctl apply-config --nodes 192.168.1.100 --file controlplane.yaml --mode auto
talosctl apply-config --nodes 192.168.1.101 --file worker.yaml --mode auto
talosctl apply-config --nodes 192.168.1.102 --file worker.yaml --mode auto
```

### Installing Longhorn

```bash
helm repo add longhorn https://charts.longhorn.io
helm repo update

helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace \
  --set defaultSettings.defaultReplicaCount=2 \
  --set defaultSettings.defaultDataLocality=best-effort \
  --set persistence.defaultClassReplicaCount=2
```

Setting `defaultReplicaCount=2` means each volume is replicated to two nodes. For a three-node cluster, this provides single-node failure tolerance without using too much disk space.

### Using Longhorn Storage

```yaml
# app-with-longhorn.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: app-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: longhorn
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: app
          image: myapp:latest
          volumeMounts:
            - name: data
              mountPath: /var/lib/app
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: app-data
```

### Longhorn Backups

Longhorn can back up volumes to S3-compatible storage. If you have a NAS running MinIO, this gives you off-cluster backups:

```bash
# Configure backup target in Longhorn settings
kubectl -n longhorn-system edit settings.longhorn.io backup-target
# Set to: s3://longhorn-backups@us-east-1/
# With appropriate credentials
```

## Option 3: Rook-Ceph

Rook-Ceph brings enterprise-grade distributed storage to your home lab. It supports block storage, shared filesystems, and object storage. The tradeoff is complexity - Ceph is powerful but has more moving parts.

### Prerequisites

Ceph needs raw, unformatted disks. If your nodes have multiple drives, dedicate one for Ceph:

```yaml
# Talos machine config - leave the second disk unformatted
machine:
  install:
    disk: /dev/nvme0n1  # OS disk
    # /dev/sda left raw for Ceph
```

### Installing Rook-Ceph

```bash
# Install the Rook operator
helm install rook-ceph rook-release/rook-ceph \
  --namespace rook-ceph \
  --create-namespace

# Wait for the operator to be ready
kubectl -n rook-ceph wait --for=condition=ready pod -l app=rook-ceph-operator --timeout=300s
```

Create the Ceph cluster:

```yaml
# ceph-cluster.yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  dataDirHostPath: /var/lib/rook
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 2
  storage:
    useAllNodes: true
    useAllDevices: false
    devices:
      - name: sda  # The raw disk on each node
  resources:
    mon:
      requests:
        cpu: 100m
        memory: 512Mi
    osd:
      requests:
        cpu: 200m
        memory: 1Gi
```

Create a StorageClass:

```yaml
# ceph-storageclass.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 2
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
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Delete
```

## Option 4: NFS from External NAS

If you have a NAS (Synology, QNAP, TrueNAS, or even a Raspberry Pi with an external drive), NFS is the simplest way to provide shared storage:

```bash
# Install the NFS CSI driver
helm install csi-driver-nfs csi-driver-nfs/csi-driver-nfs \
  --namespace kube-system
```

Create a StorageClass pointing to your NAS:

```yaml
# nfs-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: nfs
provisioner: nfs.csi.k8s.io
parameters:
  server: 192.168.1.200  # Your NAS IP
  share: /volume1/kubernetes
  mountPermissions: "0777"
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

NFS supports ReadWriteMany access mode, which means multiple pods across different nodes can mount the same volume simultaneously. This is useful for shared file access.

## Choosing the Right Option

For a home lab, here is a practical decision guide:

- **Just getting started**: Use local-path provisioner. Zero setup, works immediately.
- **Want data safety without complexity**: Use Longhorn. It is the best balance of features and simplicity for home labs.
- **Have extra raw disks and want maximum features**: Use Rook-Ceph. It is the most capable but demands the most resources and attention.
- **Already have a NAS**: Use NFS CSI driver. Leverages existing hardware and provides shared storage.

Many home labs use a combination. Longhorn for critical application data that needs replication, and NFS for media files and bulk storage where replication is unnecessary.

## Monitoring Storage

Whatever storage solution you choose, monitor disk usage and performance:

```bash
# Check PVC status
kubectl get pvc -A

# Check node disk usage
kubectl top nodes

# For Longhorn, check the dashboard
kubectl port-forward -n longhorn-system svc/longhorn-frontend 8080:80
# Visit http://localhost:8080
```

Storage is the backbone of any stateful workload. Get it right early, set up monitoring, and plan for growth. Your future self will thank you when that database pod needs more space at midnight.
