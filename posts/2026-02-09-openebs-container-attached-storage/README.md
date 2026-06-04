# How to Set Up OpenEBS for Container-Attached Storage in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenEBS, Storage, ContainerStorage

Description: Learn how to deploy and configure OpenEBS for container-attached storage in Kubernetes, providing local and replicated persistent volumes with features like snapshots, cloning, and storage pools.

---

OpenEBS is a Cloud Native Storage solution that turns Kubernetes nodes into storage controllers, providing containerized block storage. It offers multiple storage engines optimized for different workloads, from local volumes to replicated storage.

## Understanding OpenEBS

OpenEBS provides several storage engines, including:

1. **Local PV Hostpath** - Direct access to host directories
2. **Local PV LVM/ZFS** - Local storage backed by LVM volume groups or ZFS pools
3. **Replicated PV Mayastor** - Replicated block storage using NVMe-oF

Benefits:
- Container-native architecture
- No vendor lock-in
- Multiple storage options
- Kubernetes-native operations
- Snapshots and clones

## Installing OpenEBS

Install using Helm:

```bash
# Add OpenEBS Helm repository

helm repo add openebs https://openebs.github.io/openebs
helm repo update

# Install OpenEBS
helm install openebs openebs/openebs \
  --namespace openebs \
  --create-namespace

# Verify installation
kubectl get pods -n openebs

# Expected output shows multiple components, depending on enabled engines:
# openebs-localpv-provisioner-xxxxx
# openebs-lvm-controller-xxxxx
# openebs-zfs-controller-xxxxx
# openebs-agent-core-xxxxx
```

For Replicated PV Mayastor, make sure the Mayastor prerequisites are met, including labeling the worker nodes that will run IO engine pods:

```bash
kubectl label node <node-name> openebs.io/engine=mayastor
```

## Using OpenEBS Local PV

Local PV provides the fastest storage by using host directories:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-hostpath
  annotations:
    openebs.io/cas-type: local
    cas.openebs.io/config: |
      - name: BasePath
        value: "/var/openebs/local/"
      - name: StorageType
        value: "hostpath"
provisioner: openebs.io/local
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

Create a PVC:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: local-pvc
spec:
  storageClassName: openebs-hostpath
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

Test with a pod:

```bash
kubectl apply -f local-pvc.yaml

# Create test pod
kubectl run nginx --image=nginx \
  --overrides='{"spec":{"volumes":[{"name":"storage","persistentVolumeClaim":{"claimName":"local-pvc"}}],"containers":[{"name":"nginx","image":"nginx","volumeMounts":[{"mountPath":"/usr/share/nginx/html","name":"storage"}]}]}}'

# Verify mount
kubectl exec nginx -- df -h /usr/share/nginx/html
```

## Using OpenEBS LVM Local PV

For better performance, use block devices through LVM:

First, create a volume group on the nodes that should provide local storage:

```bash
sudo vgcreate lvmvg /dev/sdb
```

Create a StorageClass for LVM volumes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-lvm
allowVolumeExpansion: true
provisioner: local.csi.openebs.io
parameters:
  storage: "lvm"
  vgpattern: "lvmvg"
  fsType: ext4
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

## Using OpenEBS Replicated PV Mayastor for Replication

Replicated PV Mayastor provides replicated storage with snapshots and clones:

```yaml
apiVersion: "openebs.io/v1beta3"
kind: DiskPool
metadata:
  name: pool-on-node-1
  namespace: openebs
spec:
  node: node1
  disks: ["aio:///dev/disk/by-id/disk-node-1"]
---
apiVersion: "openebs.io/v1beta3"
kind: DiskPool
metadata:
  name: pool-on-node-2
  namespace: openebs
spec:
  node: node2
  disks: ["aio:///dev/disk/by-id/disk-node-2"]
---
apiVersion: "openebs.io/v1beta3"
kind: DiskPool
metadata:
  name: pool-on-node-3
  namespace: openebs
spec:
  node: node3
  disks: ["aio:///dev/disk/by-id/disk-node-3"]
```

Apply the pool configuration:

```bash
kubectl apply -f mayastor-pools.yaml

# Verify pool creation
kubectl get dsp -n openebs
```

Create a Mayastor StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-3
provisioner: io.openebs.csi-mayastor
allowVolumeExpansion: true
parameters:
  protocol: nvmf
  repl: "3"
```

## Creating Replicated Volumes

Use the Mayastor storage class:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mayastor-pvc
spec:
  storageClassName: mayastor-3
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

Deploy a stateful application:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
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
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      storageClassName: mayastor-3
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 20Gi
```

## Taking Snapshots with OpenEBS

Create a VolumeSnapshotClass:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: mayastor-snapshot-class
driver: io.openebs.csi-mayastor
deletionPolicy: Delete
```

Take a snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mayastor-snapshot
spec:
  volumeSnapshotClassName: mayastor-snapshot-class
  source:
    persistentVolumeClaimName: mayastor-pvc
```

Restore from snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-pvc
spec:
  storageClassName: mayastor-3
  dataSource:
    name: mayastor-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

## Monitoring OpenEBS

Check storage pools:

```bash
# View Mayastor pools
kubectl get dsp -n openebs

# View volumes
kubectl get pvc

# Check Mayastor volumes with the kubectl-openebs plugin
kubectl openebs -n openebs mayastor get volumes
```

Monitor with Prometheus:

```bash
# Install the OpenEBS monitoring stack
helm repo add monitoring https://openebs.github.io/monitoring/
helm repo update
helm install monitoring monitoring/monitoring --namespace openebs --create-namespace

# Access Grafana
kubectl get pods -n openebs | grep -i grafana
kubectl port-forward -n openebs pod/<grafana-pod-name> 3000:3000
```

## Volume Expansion

Expand a Mayastor volume:

```bash
# Edit the PVC
kubectl patch pvc mayastor-pvc -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'

# Watch the expansion
kubectl get pvc mayastor-pvc -w

# Verify new size
kubectl get pvc mayastor-pvc
```

## Best Practices

1. **Use Local PV for speed** when replication is not needed
2. **Use Replicated PV Mayastor for production** workloads requiring replication
3. **Monitor pool capacity** to avoid running out of space
4. **Set resource limits** on OpenEBS pods
5. **Use node selectors** to control pool placement
6. **Enable monitoring** with Prometheus
7. **Regular snapshots** for data protection
8. **Test disaster recovery** procedures

OpenEBS provides flexible, Kubernetes-native storage options from fast local volumes to enterprise-grade replicated storage, all managed through familiar Kubernetes APIs.
