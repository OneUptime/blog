# How to Deploy OpenEBS LocalPV for Node-Local High-Performance Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenEBS, LocalPV, Kubernetes

Description: Deploy OpenEBS LocalPV for high-performance node-local storage on Kubernetes with hostpath and device modes, capacity management, and application deployment strategies for stateful workloads.

---

OpenEBS LocalPV provides high-performance persistent storage by using local disks directly attached to Kubernetes nodes. Unlike distributed storage systems that add network overhead, LocalPV eliminates network hops for maximum IOPS and minimal latency. This makes it ideal for performance-sensitive applications like databases, caching layers, and high-throughput data processing that can tolerate node-level failure.

## Understanding LocalPV Architecture

LocalPV operates in multiple modes, including hostpath and LVM. Hostpath mode creates subdirectories on a designated filesystem path, similar to Kubernetes HostPath volumes but with dynamic provisioning. LVM mode provisions logical volumes from local volume groups, providing stronger capacity management, expansion support, and better isolation than hostpath mode.

The key tradeoff with LocalPV is pod affinity. Pods using LocalPV volumes can only run on the node where the volume exists. If that node fails, the pod cannot start on another node until the original node recovers or you manually migrate data. This architecture is acceptable for applications designed with node-level redundancy, like distributed databases.

## Installing OpenEBS

Deploy OpenEBS operators and storage engines.

```bash
# Install OpenEBS via Helm

helm repo add openebs https://openebs.github.io/openebs
helm repo update

# Install OpenEBS control plane
helm install openebs openebs/openebs \
  --namespace openebs \
  --create-namespace \
  --set engines.replicated.mayastor.enabled=false

# Verify installation
kubectl get pods -n openebs
```

## Configuring Hostpath StorageClass

Create a StorageClass using hostpath mode for simple provisioning.

```yaml
# localpv-hostpath-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-hostpath
  annotations:
    openebs.io/cas-type: local
    cas.openebs.io/config: |
      - name: StorageType
        value: hostpath
      - name: BasePath
        value: /var/openebs/local
provisioner: openebs.io/local
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

Key parameters:
- `StorageType: hostpath`: Use filesystem directories
- `BasePath`: Root directory for volume storage
- `WaitForFirstConsumer`: Delays volume creation until pod is scheduled

Apply the StorageClass:

```bash
kubectl apply -f localpv-hostpath-sc.yaml
kubectl get storageclass openebs-hostpath
```

## Preparing LVM Volume Groups

For LVM mode, prepare raw block devices and create a volume group on each storage node.

```bash
# List available block devices on a node
lsblk

# Example output:
# sdb      8:16   0  100G  0 disk
# sdc      8:32   0  100G  0 disk

# Ensure devices are not mounted or partitioned
sudo wipefs -f -a /dev/sdb
sudo pvcreate /dev/sdb
sudo vgcreate lvmvg /dev/sdb
```

Verify the volume group:

```bash
sudo vgs
sudo lvs
```

## LVM Mode StorageClass

Configure a StorageClass for LVM provisioning.

```yaml
# localpv-lvm-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-lvm
provisioner: local.csi.openebs.io
parameters:
  storage: "lvm"
  vgpattern: "^lvmvg$"
  fsType: "ext4"
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
allowVolumeExpansion: true
```

LVM mode provisions logical volumes from matching volume groups, providing better capacity controls and isolation than hostpath mode.

## Creating PVCs with LocalPV

Create PersistentVolumeClaims using LocalPV storage classes.

```yaml
# mysql-localpv.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-data
  namespace: default
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: openebs-hostpath
  resources:
    requests:
      storage: 20Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: default
spec:
  serviceName: mysql
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
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mysql-data
```

Deploy and verify:

```bash
kubectl apply -f mysql-localpv.yaml

# Check PVC binding (happens after pod scheduling)
kubectl get pvc mysql-data -w

# Verify pod is running
kubectl get pods -l app=mysql

# Check which node hosts the volume
kubectl get pv -o wide
```

## Node Affinity Considerations

LocalPV volumes bind to specific nodes. Configure node affinity carefully.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
spec:
  serviceName: redis
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: workload-type
                operator: In
                values:
                - database
              - key: kubernetes.io/hostname
                operator: In
                values:
                - node1
                - node2
                - node3
      containers:
      - name: redis
        image: redis:7
```

This ensures pods schedule only on nodes with appropriate storage.

## Capacity Management

Monitor and manage LocalPV capacity on each node.

```bash
# Check available capacity on nodes
kubectl get pvc -A
kubectl get pv

# View LocalPV volumes per node
kubectl get pv -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0],CAPACITY:.spec.capacity.storage

# Check hostpath capacity on each node
df -h /var/openebs/local

# Check LVM capacity on each node
sudo vgs
```

Configure namespace-level PVC request limits:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: default
spec:
  hard:
    requests.storage: 500Gi
```

## High-Performance Configuration

Optimize LocalPV for maximum performance.

```yaml
# high-perf-localpv-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-localpv-fast
provisioner: local.csi.openebs.io
parameters:
  storage: "lvm"
  vgpattern: "^fastvg$"
  fsType: "ext4"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
mountOptions:
- noatime
- nodiratime
```

Use nvme or SSD devices for LocalPV volumes:

```bash
# Identify fast storage devices
lsblk -d -o name,rota

# ROTA=0 indicates SSD/NVMe
sudo wipefs -f -a /dev/nvme0n1
sudo pvcreate /dev/nvme0n1
sudo vgcreate fastvg /dev/nvme0n1
```

## Monitoring LocalPV

Track LocalPV volume metrics and health.

```bash
# Install the OpenEBS monitoring stack
helm repo add monitoring https://openebs.github.io/monitoring/
helm repo update
helm install monitoring monitoring/monitoring \
  --namespace openebs \
  --create-namespace
```

Key metrics:

```promql
# PersistentVolume capacity from kube-state-metrics
kube_persistentvolume_capacity_bytes

# PVC capacity and available bytes from kubelet
kubelet_volume_stats_capacity_bytes
kubelet_volume_stats_available_bytes

# Hostpath filesystem capacity from node-exporter
node_filesystem_avail_bytes{mountpoint="/var/openebs/local"}

# I/O statistics
rate(node_disk_reads_completed_total[5m])
rate(node_disk_writes_completed_total[5m])
```

## Backup and Disaster Recovery

Implement backup strategies for LocalPV volumes.

```yaml
# velero-backup-schedule.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: mysql-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  template:
    includedNamespaces:
    - default
    labelSelector:
      matchLabels:
        app: mysql
    defaultVolumesToFsBackup: true
    snapshotVolumes: false
    ttl: 720h  # Retain for 30 days
```

For manual backup:

```bash
# Backup using Velero
velero backup create mysql-backup-$(date +%Y%m%d) \
  --include-namespaces default \
  --selector app=mysql \
  --default-volumes-to-fs-backup \
  --snapshot-volumes=false

# Restore from backup
velero restore create --from-backup mysql-backup-20260209
```

## StatefulSet Best Practices

Configure StatefulSets properly with LocalPV.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cassandra
spec:
  serviceName: cassandra
  replicas: 3
  selector:
    matchLabels:
      app: cassandra
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: openebs-localpv-fast
      resources:
        requests:
          storage: 100Gi
  template:
    metadata:
      labels:
        app: cassandra
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - cassandra
            topologyKey: kubernetes.io/hostname
      containers:
      - name: cassandra
        image: cassandra:4.1
        volumeMounts:
        - name: data
          mountPath: /var/lib/cassandra
```

Pod anti-affinity ensures replicas spread across nodes, providing application-level redundancy despite node-local storage.

## Troubleshooting

Common issues and solutions:

```bash
# PVC stuck in Pending
kubectl describe pvc <pvc-name>
# Check events for scheduling issues

# Volume not mounting
kubectl describe pod <pod-name>
kubectl logs -n openebs deploy/openebs-localpv-provisioner
kubectl logs -n openebs deploy/openebs-lvm-localpv-controller

# Check node storage capacity
df -h /var/openebs/local

# Verify block device availability
lsblk
sudo vgs
sudo lvs

# Clean up orphaned volumes
kubectl delete pv <pv-name> --grace-period=0 --force
```

## Conclusion

OpenEBS LocalPV provides high-performance storage by leveraging local node storage directly. While it sacrifices the mobility of network-attached storage, it delivers superior IOPS and latency for applications that can handle node-level failures through application-layer replication. Use hostpath mode for simple deployments or LVM mode for stronger capacity management, volume expansion, and isolation. Combine LocalPV with proper backup strategies and application-level redundancy to build resilient, high-performance stateful applications on Kubernetes.
