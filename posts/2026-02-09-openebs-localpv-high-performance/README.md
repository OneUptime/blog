# How to Deploy OpenEBS LocalPV for Node-Local High-Performance Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenEBS, LocalPV, Kubernetes

Description: Deploy OpenEBS LocalPV for high-performance node-local storage on Kubernetes with hostpath and device modes, capacity management, and application deployment strategies for stateful workloads.

---

OpenEBS LocalPV provides high-performance persistent storage by using local disks directly attached to Kubernetes nodes. Unlike distributed storage systems that add network overhead, LocalPV eliminates network hops for maximum IOPS and minimal latency. This makes it ideal for performance-sensitive applications like databases, caching layers, and high-throughput data processing that can tolerate node-level failure.

## Understanding LocalPV Architecture

LocalPV operates in two modes: hostpath and device. Hostpath mode creates subdirectories on a designated filesystem path, similar to Kubernetes HostPath volumes but with dynamic provisioning. Device mode provisions entire block devices (disks) for each PVC, providing complete device isolation and maximum performance.

The key tradeoff with LocalPV is pod affinity. Pods using LocalPV volumes can only run on the node where the volume exists. If that node fails, the pod cannot start on another node until the original node recovers or you manually migrate data. This architecture is acceptable for applications designed with node-level redundancy, like distributed databases.

## Installing OpenEBS

Deploy OpenEBS operators and storage engines.

```bash
# Install OpenEBS via Helm
helm repo add openebs https://openebs.github.io/charts
helm repo update

# Install OpenEBS control plane
helm install openebs openebs/openebs \
  --namespace openebs \
  --create-namespace \
  --set engines.replicated.mayastor.enabled=false

# Verify installation
kubectl get pods -n openebs
```

Alternatively, use kubectl:

```bash
kubectl apply -f https://openebs.github.io/charts/openebs-operator.yaml

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l name=openebs-localpv-provisioner -n openebs --timeout=300s
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

## Preparing Block Devices

For device mode, prepare raw block devices on each node.

```bash
# List available block devices on a node
lsblk

# Example output:
# sdb      8:16   0  100G  0 disk
# sdc      8:32   0  100G  0 disk

# Ensure devices are not mounted or partitioned
sudo wipefs -a /dev/sdb
sudo wipefs -a /dev/sdc
```

Label nodes with block devices:

```bash
kubectl label nodes node1 openebs.io/block-device=available
kubectl label nodes node2 openebs.io/block-device=available
kubectl label nodes node3 openebs.io/block-device=available
```

## Device Mode StorageClass

Configure StorageClass for block device provisioning.

```yaml
# localpv-device-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-device
  annotations:
    openebs.io/cas-type: local
    cas.openebs.io/config: |
      - name: StorageType
        value: device
      - name: FSType
        value: ext4
provisioner: openebs.io/local
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
allowVolumeExpansion: false
```

Device mode provisions entire devices, providing better isolation and performance than hostpath mode.

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
  template:
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
              - key: openebs.io/block-device
                operator: In
                values:
                - available
```

This ensures pods schedule only on nodes with appropriate storage.

## Capacity Management

Monitor and manage LocalPV capacity on each node.

```bash
# Check available capacity on nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,CAPACITY:.status.capacity.storage

# View LocalPV volumes per node
kubectl get pv -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeAffinity.required.nodeSelectorTerms[0].matchExpressions[0].values[0],CAPACITY:.spec.capacity.storage

# Set up capacity alerts
kubectl top nodes
```

Configure capacity limits per node:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openebs-capacity-config
  namespace: openebs
data:
  node-capacity.yaml: |
    nodes:
      node1:
        maxCapacity: 500Gi
        reservedCapacity: 50Gi
      node2:
        maxCapacity: 500Gi
        reservedCapacity: 50Gi
```

## High-Performance Configuration

Optimize LocalPV for maximum performance.

```yaml
# high-perf-localpv-sc.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: openebs-localpv-fast
  annotations:
    openebs.io/cas-type: local
    cas.openebs.io/config: |
      - name: StorageType
        value: device
      - name: FSType
        value: ext4
      - name: MountOptions
        value: "noatime,nodiratime,nobarrier"
provisioner: openebs.io/local
volumeBindingMode: WaitForFirstConsumer
mountOptions:
- noatime
- nodiratime
- discard
```

Use nvme or SSD devices for LocalPV volumes:

```bash
# Identify fast storage devices
lsblk -d -o name,rota

# ROTA=0 indicates SSD/NVMe
# Dedicate these devices to LocalPV
```

## Monitoring LocalPV

Track LocalPV volume metrics and health.

```yaml
# ServiceMonitor for Prometheus
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: openebs-localpv
  namespace: openebs
spec:
  selector:
    matchLabels:
      openebs.io/component: localpv-provisioner
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics:

```promql
# Volume capacity
openebs_volume_capacity_bytes

# Volume usage
openebs_volume_used_bytes

# Provisioning errors
rate(openebs_volume_provision_failed_total[5m])

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
    snapshotVolumes: true
    ttl: 720h  # Retain for 30 days
```

For manual backup:

```bash
# Backup using Velero
velero backup create mysql-backup-$(date +%Y%m%d) --include-namespaces default --selector app=mysql

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
kubectl logs -n openebs -l openebs.io/component=localpv-provisioner

# Check node storage capacity
df -h /var/openebs/local

# Verify block device availability
lsblk
kubectl get blockdevice -n openebs

# Clean up orphaned volumes
kubectl delete pv <pv-name> --grace-period=0 --force
```

## Conclusion

OpenEBS LocalPV provides high-performance storage by leveraging local node storage directly. While it sacrifices the mobility of network-attached storage, it delivers superior IOPS and latency for applications that can handle node-level failures through application-layer replication. Use hostpath mode for simple deployments or device mode for maximum isolation and performance. Combine LocalPV with proper backup strategies and application-level redundancy to build resilient, high-performance stateful applications on Kubernetes.
