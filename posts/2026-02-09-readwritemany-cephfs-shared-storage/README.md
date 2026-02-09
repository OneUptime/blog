# How to Set Up ReadWriteMany Volumes with CephFS for Shared Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Ceph

Description: Learn how to configure CephFS with Kubernetes to provide ReadWriteMany persistent volumes for workloads that need shared storage across multiple pods.

---

Most Kubernetes storage solutions provide ReadWriteOnce volumes that attach to a single node. When you need multiple pods across different nodes to access the same storage simultaneously, you need ReadWriteMany (RWX) volumes. CephFS provides a production-ready distributed filesystem perfect for this use case.

## Understanding ReadWriteMany Requirements

ReadWriteMany volumes allow multiple pods running on different nodes to mount and access the same persistent volume concurrently. This access mode enables several important patterns:

Shared content repositories where multiple web servers serve the same static files. Collaborative workspaces where multiple users or applications work on shared data. Distributed processing where worker pods read from and write to a common dataset. Legacy applications designed for shared filesystem access.

CephFS implements a POSIX-compliant distributed filesystem built on top of Ceph's object storage. Unlike ReadWriteOnce block devices, CephFS presents as a mountable filesystem that naturally supports concurrent access from multiple clients.

## Prerequisites

You need a running Ceph cluster with at least one metadata server (MDS) and several object storage daemons (OSDs). You also need the Ceph CSI driver deployed in your Kubernetes cluster.

Check your Ceph cluster status:

```bash
# Verify Ceph cluster health
ceph status

# Check MDS status (required for CephFS)
ceph mds stat

# List available filesystems
ceph fs ls
```

## Creating a CephFS Filesystem

If you don't have a CephFS filesystem yet, create one:

```bash
# Create data and metadata pools
ceph osd pool create cephfs_data 128
ceph osd pool create cephfs_metadata 64

# Create the filesystem
ceph fs new cephfs cephfs_metadata cephfs_data

# Verify filesystem creation
ceph fs ls

# Check MDS status
ceph mds stat
```

The metadata pool stores filesystem metadata like directory structures and file attributes. The data pool stores actual file contents. The MDS manages filesystem operations and coordinates client access.

## Installing Ceph CSI Driver

Deploy the Ceph CSI driver with CephFS support:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: ceph-csi
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cephfs-csi-provisioner
  namespace: ceph-csi
---
apiVersion: v1
kind: Secret
metadata:
  name: csi-cephfs-secret
  namespace: ceph-csi
stringData:
  # Get from: ceph auth get-key client.admin
  userID: admin
  userKey: AQD1ixZg7SRKCxAAqZ0PJqLXFpZ4w5rSl/FYrQ==
  # Optional: additional user for node plugin
  adminID: admin
  adminKey: AQD1ixZg7SRKCxAAqZ0PJqLXFpZ4w5rSl/FYrQ==
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs
provisioner: cephfs.csi.ceph.com
parameters:
  clusterID: b9127830-b0cc-4e34-aa47-9d1a2e9949a8  # ceph fsid
  fsName: cephfs
  pool: cephfs_data

  # CSI node plugin secret
  csi.storage.k8s.io/provisioner-secret-name: csi-cephfs-secret
  csi.storage.k8s.io/provisioner-secret-namespace: ceph-csi
  csi.storage.k8s.io/controller-expand-secret-name: csi-cephfs-secret
  csi.storage.k8s.io/controller-expand-secret-namespace: ceph-csi
  csi.storage.k8s.io/node-stage-secret-name: csi-cephfs-secret
  csi.storage.k8s.io/node-stage-secret-namespace: ceph-csi

reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  - debug
```

Get your cluster ID and auth key:

```bash
# Get cluster ID (fsid)
ceph fsid

# Get admin key
ceph auth get-key client.admin
```

## Deploying the CSI Driver Components

Apply the complete CSI driver deployment:

```yaml
# Download and apply official Ceph CSI manifests
kubectl apply -f https://raw.githubusercontent.com/ceph/ceph-csi/master/deploy/cephfs/kubernetes/csi-provisioner-rbac.yaml
kubectl apply -f https://raw.githubusercontent.com/ceph/ceph-csi/master/deploy/cephfs/kubernetes/csi-nodeplugin-rbac.yaml
kubectl apply -f https://raw.githubusercontent.com/ceph/ceph-csi/master/deploy/cephfs/kubernetes/csi-cephfsplugin-provisioner.yaml
kubectl apply -f https://raw.githubusercontent.com/ceph/ceph-csi/master/deploy/cephfs/kubernetes/csi-cephfsplugin.yaml
```

Verify the driver is running:

```bash
# Check provisioner pod
kubectl get pods -n ceph-csi -l app=csi-cephfsplugin-provisioner

# Check node plugin daemonset
kubectl get pods -n ceph-csi -l app=csi-cephfsplugin

# Verify CSI driver registration
kubectl get csidrivers | grep cephfs
```

## Creating a ReadWriteMany PVC

Request a shared volume:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-storage
  namespace: default
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: cephfs
```

Apply and verify:

```bash
kubectl apply -f shared-pvc.yaml

# Wait for PVC to be bound
kubectl get pvc shared-storage -w

# Check the created PV
kubectl get pv
```

## Using Shared Storage in Multiple Pods

Deploy multiple pods accessing the same volume:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-servers
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:1.21
        ports:
        - containerPort: 80
        volumeMounts:
        - name: shared-content
          mountPath: /usr/share/nginx/html
      volumes:
      - name: shared-content
        persistentVolumeClaim:
          claimName: shared-storage
---
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

All three nginx pods mount the same CephFS volume at /usr/share/nginx/html. Any content written by one pod is immediately visible to all others.

## Real-World Example: Shared WordPress Media

WordPress benefits from shared storage for media uploads:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: wordpress-uploads
  namespace: wordpress
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 100Gi
  storageClassName: cephfs
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wordpress
  namespace: wordpress
spec:
  replicas: 5
  selector:
    matchLabels:
      app: wordpress
  template:
    metadata:
      labels:
        app: wordpress
    spec:
      containers:
      - name: wordpress
        image: wordpress:6.1-apache
        env:
        - name: WORDPRESS_DB_HOST
          value: mysql
        - name: WORDPRESS_DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: password
        ports:
        - containerPort: 80
        volumeMounts:
        - name: wordpress-storage
          mountPath: /var/www/html/wp-content/uploads
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
      volumes:
      - name: wordpress-storage
        persistentVolumeClaim:
          claimName: wordpress-uploads
```

With five WordPress replicas, users upload media to any pod, and all pods immediately serve that media. The shared CephFS volume ensures consistency.

## Performance Tuning

Optimize CephFS performance with mount options:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs-optimized
provisioner: cephfs.csi.ceph.com
parameters:
  clusterID: b9127830-b0cc-4e34-aa47-9d1a2e9949a8
  fsName: cephfs
  pool: cephfs_data
  csi.storage.k8s.io/provisioner-secret-name: csi-cephfs-secret
  csi.storage.k8s.io/provisioner-secret-namespace: ceph-csi
  csi.storage.k8s.io/node-stage-secret-name: csi-cephfs-secret
  csi.storage.k8s.io/node-stage-secret-namespace: ceph-csi
reclaimPolicy: Delete
allowVolumeExpansion: true
mountOptions:
  # Increase read-ahead for better sequential read performance
  - rasize=16384
  # Cache directory information
  - dcache
  # Disable access time updates for better performance
  - noatime
  # Optimize for small files
  - inline_data
```

These mount options improve performance for different workload types.

## Monitoring CephFS Performance

Check filesystem usage and performance:

```bash
# Check CephFS status
ceph fs status cephfs

# Monitor client connections
ceph tell mds.cephfs client ls

# Check filesystem capacity
ceph df

# Monitor MDS performance
ceph daemonperf mds.cephfs

# Check pool statistics
ceph osd pool stats cephfs_data
ceph osd pool stats cephfs_metadata
```

Set up Prometheus metrics collection:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    scrape_configs:
    - job_name: 'ceph'
      static_configs:
      - targets: ['ceph-mgr:9283']
      metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'ceph_mds.*'
        action: keep
```

Key metrics to monitor:

```promql
# MDS latency
ceph_mds_request_latency_sum / ceph_mds_request_latency_count

# Client session count
ceph_mds_sessions

# Metadata pool usage
ceph_pool_stored{pool="cephfs_metadata"}

# Data pool usage
ceph_pool_stored{pool="cephfs_data"}
```

## Handling Common Issues

If pods fail to mount CephFS volumes, check these areas:

```bash
# Check MDS health
ceph mds stat
ceph fs status

# Verify network connectivity from nodes to Ceph monitors
kubectl exec -it <csi-cephfsplugin-pod> -n ceph-csi -- ping <mon-ip>

# Check CSI driver logs
kubectl logs -n ceph-csi -l app=csi-cephfsplugin --tail=100

# Verify secret contents
kubectl get secret csi-cephfs-secret -n ceph-csi -o yaml

# Check authorization
ceph auth get client.admin
```

For permission issues:

```bash
# Create dedicated CephFS user with limited permissions
ceph auth get-or-create client.kubernetes \
  mon 'allow r' \
  mds 'allow rw' \
  osd 'allow rw pool=cephfs_data, allow rw pool=cephfs_metadata'

# Get the key
ceph auth get-key client.kubernetes
```

## Quota Management

Set quotas on CephFS directories:

```bash
# Set max bytes on a directory
setfattr -n ceph.quota.max_bytes -v 10737418240 /mnt/cephfs/project-a

# Set max files
setfattr -n ceph.quota.max_files -v 100000 /mnt/cephfs/project-a

# View quota
getfattr -n ceph.quota.max_bytes /mnt/cephfs/project-a
getfattr -n ceph.quota.max_files /mnt/cephfs/project-a
```

Implement quotas in Kubernetes using subvolume groups:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs-quota
provisioner: cephfs.csi.ceph.com
parameters:
  clusterID: b9127830-b0cc-4e34-aa47-9d1a2e9949a8
  fsName: cephfs
  pool: cephfs_data
  # Create isolated subvolumes with quotas
  subvolumeGroup: kubernetes
  csi.storage.k8s.io/provisioner-secret-name: csi-cephfs-secret
  csi.storage.k8s.io/provisioner-secret-namespace: ceph-csi
  csi.storage.k8s.io/node-stage-secret-name: csi-cephfs-secret
  csi.storage.k8s.io/node-stage-secret-namespace: ceph-csi
```

## Snapshot Support

CephFS supports volume snapshots:

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: cephfs-snapclass
driver: cephfs.csi.ceph.com
deletionPolicy: Delete
parameters:
  clusterID: b9127830-b0cc-4e34-aa47-9d1a2e9949a8
  csi.storage.k8s.io/snapshotter-secret-name: csi-cephfs-secret
  csi.storage.k8s.io/snapshotter-secret-namespace: ceph-csi
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: shared-storage-snap
spec:
  volumeSnapshotClassName: cephfs-snapclass
  source:
    persistentVolumeClaimName: shared-storage
```

Restore from snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-storage-restored
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 50Gi
  storageClassName: cephfs
  dataSource:
    name: shared-storage-snap
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
```

## Best Practices

Use CephFS for read-heavy workloads where multiple pods need shared access to data. For write-heavy workloads with intensive metadata operations, consider if ReadWriteOnce volumes with application-level replication might perform better.

Monitor MDS load carefully. The metadata server becomes a bottleneck under heavy load. Scale MDS by creating multiple active MDS ranks for your filesystem.

Implement proper capacity planning. CephFS performance degrades when the cluster approaches full capacity. Keep usage below 80% for best performance.

Use subvolume groups to organize and isolate different applications or teams using the same CephFS filesystem.

## Conclusion

CephFS provides enterprise-grade shared storage for Kubernetes workloads requiring ReadWriteMany volumes. By leveraging Ceph's distributed architecture and the CSI driver, you can deploy applications that need concurrent multi-node access to persistent storage. Proper configuration, monitoring, and capacity management ensure reliable operation at scale.
