# How to Set Up OpenEBS for Container-Attached Storage in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenEBS, Storage, ContainerStorage

Description: Learn how to deploy and configure OpenEBS for container-attached storage in Kubernetes, providing local and replicated persistent volumes with features like snapshots, cloning, and storage pools.

---

OpenEBS is a Cloud Native Storage solution that turns Kubernetes nodes into storage controllers, providing containerized block storage. It offers multiple storage engines optimized for different workloads, from local volumes to replicated storage.

## Understanding OpenEBS

OpenEBS provides three main storage engines:

1. **Local PV** - Direct access to local disks (fastest)
2. **Jiva** - Replicated storage using iSCSI
3. **cStor** - Advanced pool-based replicated storage

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
helm repo add openebs https://openebs.github.io/charts
helm repo update

# Install OpenEBS
helm install openebs openebs/openebs \
  --namespace openebs \
  --create-namespace

# Verify installation
kubectl get pods -n openebs

# Expected output shows multiple components:
# openebs-ndm-xxxxx (Node Disk Manager)
# openebs-ndm-operator-xxxxx
# openebs-localpv-provisioner-xxxxx
```

Or install using kubectl:

```bash
kubectl apply -f https://openebs.github.io/charts/openebs-operator.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=openebs -n openebs --timeout=300s
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

## Using OpenEBS Device Local PV

For better performance, use block devices directly:

First, check available disks:

```bash
# List block devices discovered by OpenEBS
kubectl get bd -n openebs

# Example output:
# NAME                                           NODENAME   SIZE
# blockdevice-xxxxx                             node1      100Gi
# blockdevice-yyyyy                             node2      100Gi
```

Create a StorageClass for device volumes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-device
  annotations:
    openebs.io/cas-type: local
    cas.openebs.io/config: |
      - name: StorageType
        value: "device"
      - name: FSType
        value: ext4
provisioner: openebs.io/local
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

## Using OpenEBS cStor for Replication

cStor provides replicated storage with snapshots and clones:

```yaml
apiVersion: cstor.openebs.io/v1
kind: CStorPoolCluster
metadata:
  name: cstor-pool-cluster
  namespace: openebs
spec:
  pools:
    - nodeSelector:
        kubernetes.io/hostname: "node1"
      dataRaidGroups:
        - blockDevices:
            - blockDeviceName: "blockdevice-xxxxx"
      poolConfig:
        dataRaidGroupType: "stripe"
    - nodeSelector:
        kubernetes.io/hostname: "node2"
      dataRaidGroups:
        - blockDevices:
            - blockDeviceName: "blockdevice-yyyyy"
      poolConfig:
        dataRaidGroupType: "stripe"
    - nodeSelector:
        kubernetes.io/hostname: "node3"
      dataRaidGroups:
        - blockDevices:
            - blockDeviceName: "blockdevice-zzzzz"
      poolConfig:
        dataRaidGroupType: "stripe"
```

Apply the pool configuration:

```bash
kubectl apply -f cstor-pool.yaml

# Verify pool creation
kubectl get cspc -n openebs

# Check pool status
kubectl get cspi -n openebs
```

Create a cStor StorageClass:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cstor-csi-disk
provisioner: cstor.csi.openebs.io
allowVolumeExpansion: true
parameters:
  cas-type: cstor
  cstorPoolCluster: cstor-pool-cluster
  replicaCount: "3"
```

## Creating Replicated Volumes

Use the cStor storage class:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: cstor-pvc
spec:
  storageClassName: cstor-csi-disk
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
      storageClassName: cstor-csi-disk
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
  name: cstor-snapshot-class
driver: cstor.csi.openebs.io
deletionPolicy: Delete
```

Take a snapshot:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: cstor-snapshot
spec:
  volumeSnapshotClassName: cstor-snapshot-class
  source:
    persistentVolumeClaimName: cstor-pvc
```

Restore from snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: restored-pvc
spec:
  storageClassName: cstor-csi-disk
  dataSource:
    name: cstor-snapshot
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
# View cStor pools
kubectl get cspc -n openebs

# Check pool instances
kubectl get cspi -n openebs

# View volumes
kubectl get cstorvolume -n openebs

# Check volume replicas
kubectl get cvr -n openebs
```

Monitor with Prometheus:

```bash
# OpenEBS exposes metrics on port 9500
kubectl port-forward -n openebs openebs-cstor-xxxxx 9500:9500

# Access metrics
curl http://localhost:9500/metrics
```

## Volume Expansion

Expand a cStor volume:

```bash
# Edit the PVC
kubectl patch pvc cstor-pvc -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'

# Watch the expansion
kubectl get pvc cstor-pvc -w

# Verify new size
kubectl get pvc cstor-pvc
```

## Best Practices

1. **Use Local PV for speed** when replication is not needed
2. **Use cStor for production** workloads requiring replication
3. **Monitor pool capacity** to avoid running out of space
4. **Set resource limits** on OpenEBS pods
5. **Use node selectors** to control pool placement
6. **Enable monitoring** with Prometheus
7. **Regular snapshots** for data protection
8. **Test disaster recovery** procedures

OpenEBS provides flexible, Kubernetes-native storage options from fast local volumes to enterprise-grade replicated storage, all managed through familiar Kubernetes APIs.
