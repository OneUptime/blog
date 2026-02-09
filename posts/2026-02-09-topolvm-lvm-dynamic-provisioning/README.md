# How to Use TopoLVM for LVM-Based Dynamic Provisioning in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, TopoLVM, LVM, Storage

Description: Learn how to deploy TopoLVM for LVM-based dynamic provisioning in Kubernetes, leveraging Logical Volume Manager for flexible, high-performance local storage with topology awareness.

---

TopoLVM is a CSI driver that dynamically provisions persistent volumes using LVM (Logical Volume Manager). It provides topology-aware scheduling, ensuring pods are placed on nodes where storage is available, making it ideal for on-premises and bare-metal Kubernetes clusters.

## Understanding TopoLVM

TopoLVM uses Linux LVM to create logical volumes on demand. Key features:

- **Topology-aware scheduling** - Pods scheduled where storage exists
- **Thin provisioning** - Efficient disk space usage
- **Volume expansion** - Grow volumes without downtime
- **Snapshots** - LVM snapshot support
- **Multiple volume groups** - Different storage tiers

## Prerequisites

Prepare nodes with LVM:

```bash
# SSH to each storage node
ssh node1

# Check available disks
lsblk

# Create physical volume (replace /dev/sdb with your disk)
sudo pvcreate /dev/sdb

# Create volume group for TopoLVM
sudo vgcreate topolvm-vg /dev/sdb

# Verify volume group
sudo vgdisplay topolvm-vg

# Repeat on all storage nodes
```

## Installing TopoLVM

Install using Helm:

```bash
# Add TopoLVM Helm repository
helm repo add topolvm https://topolvm.github.io/topolvm
helm repo update

# Install TopoLVM
helm install topolvm topolvm/topolvm \
  --namespace topolvm-system \
  --create-namespace \
  --set lvmd.deviceClasses[0].name=ssd \
  --set lvmd.deviceClasses[0].volume-group=topolvm-vg \
  --set lvmd.deviceClasses[0].default=true \
  --set lvmd.deviceClasses[0].spare-gb=10

# Verify installation
kubectl get pods -n topolvm-system

# Expected pods:
# topolvm-controller (1 replica)
# topolvm-node (DaemonSet on storage nodes)
# topolvm-scheduler (webhook for scheduling)
```

Or install using kubectl:

```bash
kubectl apply -f https://github.com/topolvm/topolvm/releases/latest/download/manifests.yaml
```

## Configuring Storage Classes

Create a basic StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: topolvm-ssd
provisioner: topolvm.cybozu.com
parameters:
  "topolvm.cybozu.com/device-class": "ssd"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
reclaimPolicy: Delete
```

Create multiple storage classes for different tiers:

```yaml
# High-performance SSD storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: topolvm-fast
provisioner: topolvm.cybozu.com
parameters:
  "topolvm.cybozu.com/device-class": "nvme"
  "csi.storage.k8s.io/fstype": "ext4"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Standard HDD storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: topolvm-standard
provisioner: topolvm.cybozu.com
parameters:
  "topolvm.cybozu.com/device-class": "hdd"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
---
# Thin-provisioned storage
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: topolvm-thin
provisioner: topolvm.cybozu.com
parameters:
  "topolvm.cybozu.com/device-class": "ssd"
  "topolvm.cybozu.com/lvcreate-options": "-T"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Apply the storage classes:

```bash
kubectl apply -f storageclasses.yaml

# Verify creation
kubectl get storageclass
```

## Creating Persistent Volumes

Create a PVC using TopoLVM:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: topolvm-ssd
  resources:
    requests:
      storage: 20Gi
```

Deploy a MySQL database:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          value: "password123"
        ports:
        - containerPort: 3306
        volumeMounts:
        - name: data
          mountPath: /var/lib/mysql
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mysql-data-pvc
```

Deploy and verify:

```bash
kubectl apply -f mysql-pvc.yaml
kubectl apply -f mysql-deployment.yaml

# Watch PVC binding
kubectl get pvc mysql-data-pvc -w

# Check which node has the volume
kubectl get pv

# Verify pod is on the same node
kubectl get pod -l app=mysql -o wide
```

## Topology-Aware Scheduling

TopoLVM ensures pods are scheduled on nodes with available storage:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-cluster
spec:
  serviceName: postgres
  replicas: 3
  selector:
    matchLabels:
      app: postgres
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
        - ReadWriteOnce
      storageClassName: topolvm-ssd
      resources:
        requests:
          storage: 50Gi
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          value: "password123"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
```

Each replica gets scheduled on nodes with available storage:

```bash
kubectl apply -f postgres-statefulset.yaml

# Watch pod scheduling
kubectl get pods -l app=postgres -o wide -w

# Each pod is on a different node with available storage capacity
```

## Volume Expansion

Expand a TopoLVM volume:

```bash
# Edit the PVC to increase size
kubectl patch pvc mysql-data-pvc -p '{"spec":{"resources":{"requests":{"storage":"40Gi"}}}}'

# Watch the expansion
kubectl get pvc mysql-data-pvc -w

# Verify on the node
ssh node1
sudo lvs topolvm-vg

# The logical volume size should be increased
```

## Taking Snapshots

Create a VolumeSnapshotClass:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: topolvm-snapshot
driver: topolvm.cybozu.com
deletionPolicy: Delete
```

Take a snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mysql-snapshot
spec:
  volumeSnapshotClassName: topolvm-snapshot
  source:
    persistentVolumeClaimName: mysql-data-pvc
```

Restore from snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-restored-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: topolvm-ssd
  dataSource:
    name: mysql-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 20Gi
```

## Monitoring TopoLVM

Check volume group capacity:

```bash
# On storage nodes
sudo vgs topolvm-vg

# Check logical volumes
sudo lvs topolvm-vg

# View detailed LV information
sudo lvdisplay topolvm-vg
```

Monitor from Kubernetes:

```bash
# Check TopoLVM node capacity
kubectl get nodes -o json | jq '.items[] | {
  name: .metadata.name,
  capacity: .status.capacity."topolvm.cybozu.com/capacity",
  allocatable: .status.allocatable."topolvm.cybozu.com/capacity"
}'

# View TopoLVM controller logs
kubectl logs -n topolvm-system -l app.kubernetes.io/component=controller

# Check node plugin logs
kubectl logs -n topolvm-system -l app.kubernetes.io/component=node
```

## Troubleshooting

Common issues:

```bash
# 1. PVC stuck in Pending
kubectl describe pvc mysql-data-pvc

# Check for events:
# "no node has enough capacity"
# Solution: Add more storage or free up space

# 2. Volume group not found
kubectl logs -n topolvm-system topolvm-node-xxxxx

# Verify VG exists on node
ssh node1 sudo vgs

# 3. Pod not scheduled
kubectl describe pod mysql-xxxxx

# Check scheduler logs
kubectl logs -n topolvm-system -l app.kubernetes.io/component=scheduler

# 4. Expansion failed
# Check LVM capacity
ssh node1 sudo vgs topolvm-vg
```

## Best Practices

1. **Leave spare space** in volume groups (10-20%)
2. **Use thin provisioning** for efficient space usage
3. **Monitor VG capacity** to prevent exhaustion
4. **Label nodes** with storage characteristics
5. **Regular snapshots** for data protection
6. **Test disaster recovery** procedures
7. **Use resource quotas** to control usage
8. **Document LVM layout** for operations

TopoLVM provides a powerful, flexible storage solution for on-premises Kubernetes clusters, leveraging the mature LVM technology while integrating seamlessly with Kubernetes storage APIs and topology-aware scheduling.
