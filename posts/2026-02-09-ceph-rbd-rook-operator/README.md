# How to Deploy Ceph RBD Storage Class with Rook Operator on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Kubernetes

Description: Deploy Ceph RBD block storage using the Rook operator on Kubernetes with storage class configuration, pool management, and performance optimization for persistent volumes.

---

Ceph RBD (RADOS Block Device) provides distributed block storage that integrates seamlessly with Kubernetes through the Rook operator. Rook automates Ceph cluster deployment, management, and lifecycle operations, transforming complex storage administration into declarative Kubernetes resources. This approach delivers enterprise-grade storage with high availability, scalability, and performance.

## Understanding Rook and Ceph RBD

Rook is a Kubernetes operator that deploys and manages Ceph clusters using custom resources. Instead of manually configuring Ceph daemons, you define a CephCluster resource and Rook handles deployment, scaling, upgrades, and failure recovery automatically.

Ceph RBD creates block devices that pods can mount like traditional disks, providing ReadWriteOnce storage suitable for databases, message queues, and stateful applications. Under the hood, Ceph distributes data across multiple OSDs (Object Storage Daemons) with configurable replication or erasure coding for reliability.

## Installing Rook Operator

Deploy the Rook operator which watches for Ceph-related custom resources.

```bash
# Clone Rook repository for deployment manifests
git clone --single-branch --branch v1.13.0 https://github.com/rook/rook.git
cd rook/deploy/examples

# Create Rook namespace and CRDs
kubectl create -f crds.yaml
kubectl create -f common.yaml

# Deploy Rook operator
kubectl create -f operator.yaml

# Verify operator is running
kubectl get pods -n rook-ceph
```

The operator pod should reach Running state within a minute. Check logs if issues occur:

```bash
kubectl logs -n rook-ceph deployment/rook-ceph-operator
```

## Preparing Storage Nodes

Ceph requires raw block devices or directories on cluster nodes. Identify nodes with available storage.

```bash
# List nodes and their storage
kubectl get nodes
lsblk  # Run on each storage node

# Example output showing available disk
# sdb      8:16   0  500G  0 disk  # Available for Ceph
```

Label nodes designated for storage:

```bash
kubectl label nodes node1 node2 node3 role=storage-node
```

## Deploying Ceph Cluster

Create a CephCluster resource defining your storage cluster configuration.

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
    allowUnsupported: false
  dataDirHostPath: /var/lib/rook
  skipUpgradeChecks: false
  continueUpgradeAfterChecksEvenIfNotHealthy: false
  mon:
    count: 3
    allowMultiplePerNode: false
  mgr:
    count: 2
    allowMultiplePerNode: false
  dashboard:
    enabled: true
    ssl: false
  monitoring:
    enabled: true
  network:
    connections:
      encryption:
        enabled: false
      compression:
        enabled: false
  crashCollector:
    disable: false
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
    - name: "node1"
      devices:
      - name: "sdb"
    - name: "node2"
      devices:
      - name: "sdb"
    - name: "node3"
      devices:
      - name: "sdb"
```

Deploy the cluster:

```bash
kubectl apply -f ceph-cluster.yaml

# Watch cluster creation (takes 5-10 minutes)
watch kubectl get pods -n rook-ceph

# Check cluster health
kubectl get cephcluster -n rook-ceph
```

Expected pods include mon (monitors), mgr (managers), osd (storage daemons), and mds (metadata servers).

## Creating RBD Storage Pool

Define a CephBlockPool for RBD volumes with replication or erasure coding.

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
    requireSafeReplicaSize: true
  deviceClass: ssd
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-block
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: replicapool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
  csi.storage.k8s.io/fstype: ext4
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
- discard
```

Apply the configuration:

```bash
kubectl apply -f ceph-block-pool.yaml

# Verify pool creation
kubectl get cephblockpool -n rook-ceph
kubectl get storageclass rook-ceph-block
```

## Testing RBD Volumes

Create a PVC using the Ceph RBD storage class.

```yaml
# test-rbd-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-pvc
  namespace: default
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: rook-ceph-block
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
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mysql-pvc
```

Deploy and verify:

```bash
kubectl apply -f test-rbd-pvc.yaml

# Check PVC binding
kubectl get pvc mysql-pvc

# Verify pod is running
kubectl get pods -l app=mysql

# Check RBD image was created
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- rbd ls replicapool
```

## Accessing Ceph Dashboard

The Ceph dashboard provides visual cluster monitoring and management.

```bash
# Get dashboard password
kubectl get secret -n rook-ceph rook-ceph-dashboard-password -o jsonpath="{['data']['password']}" | base64 --decode && echo

# Port forward to access dashboard
kubectl port-forward -n rook-ceph svc/rook-ceph-mgr-dashboard 8443:8443

# Open https://localhost:8443 in browser
# Username: admin
# Password: (from above command)
```

## Performance Optimization

Tune RBD settings for better performance.

```yaml
# high-performance-pool.yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: fast-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  replicated:
    size: 2  # Reduce to 2 for better write performance
    requireSafeReplicaSize: false
  parameters:
    compression_mode: none
    pg_num: "128"
    pgp_num: "128"
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-rbd
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: fast-pool
  imageFormat: "2"
  imageFeatures: layering,fast-diff,object-map,deep-flatten,exclusive-lock
  csi.storage.k8s.io/fstype: ext4
mountOptions:
- discard
- noatime
- nodiratime
```

## Monitoring Ceph Cluster

Deploy Prometheus monitoring for Ceph metrics.

```yaml
# servicemonitor.yaml
apiVersion: v1
kind: Service
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
  labels:
    app: rook-ceph-mgr
spec:
  ports:
  - name: http-metrics
    port: 9283
    protocol: TCP
    targetPort: 9283
  selector:
    app: rook-ceph-mgr
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: rook-ceph-mgr
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: rook-ceph-mgr
  endpoints:
  - port: http-metrics
    interval: 30s
```

Key metrics to monitor:

```promql
# Cluster health status
ceph_health_status

# Total storage capacity
ceph_cluster_total_bytes

# Storage used
ceph_cluster_total_used_bytes

# OSD up/down status
ceph_osd_up

# PG states
ceph_pg_total
```

## Volume Snapshots

Create snapshots of RBD volumes for backup and cloning.

```yaml
# volume-snapshot.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: csi-rbdplugin-snapclass
driver: rook-ceph.rbd.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: rook-ceph
  csi.storage.k8s.io/snapshotter-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/snapshotter-secret-namespace: rook-ceph
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mysql-snapshot
spec:
  volumeSnapshotClassName: csi-rbdplugin-snapclass
  source:
    persistentVolumeClaimName: mysql-pvc
```

Restore from snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-restore
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: rook-ceph-block
  dataSource:
    name: mysql-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 10Gi
```

## Troubleshooting

Common issues and solutions:

```bash
# Check cluster health
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph health detail

# List OSDs
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph osd tree

# Check PG status
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph pg stat

# View operator logs
kubectl logs -n rook-ceph deploy/rook-ceph-operator

# Check CSI provisioner logs
kubectl logs -n rook-ceph deploy/csi-rbdplugin-provisioner

# Verify RBD images
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- rbd ls replicapool
```

## Scaling the Cluster

Add more storage nodes to increase capacity.

```yaml
# Update CephCluster to add new node
spec:
  storage:
    nodes:
    - name: "node1"
      devices:
      - name: "sdb"
    - name: "node2"
      devices:
      - name: "sdb"
    - name: "node3"
      devices:
      - name: "sdb"
    - name: "node4"  # New node
      devices:
      - name: "sdb"
```

Apply the update:

```bash
kubectl apply -f ceph-cluster.yaml

# Watch new OSD creation
watch kubectl get pods -n rook-ceph
```

## Conclusion

Rook simplifies Ceph RBD deployment on Kubernetes, providing enterprise-grade block storage with automated management. The operator handles complex Ceph operations through declarative custom resources, while CSI integration enables seamless PVC provisioning. With proper configuration of pools, replication, and performance tuning, Ceph RBD through Rook delivers reliable, scalable storage for stateful workloads. Monitor cluster health regularly and leverage snapshots for data protection and disaster recovery.
