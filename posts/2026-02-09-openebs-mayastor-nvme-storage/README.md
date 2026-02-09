# How to Configure OpenEBS Mayastor for NVMe-Based Storage on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenEBS, Mayastor, NVMe

Description: Deploy OpenEBS Mayastor for high-performance NVMe-based storage on Kubernetes with replicated volumes, CSI integration, performance optimization, and advanced storage pool management.

---

OpenEBS Mayastor delivers high-performance replicated storage by directly accessing NVMe devices through SPDK (Storage Performance Development Kit). By bypassing the kernel, Mayastor achieves low latency and high throughput that approaches raw device performance while maintaining replication for data protection. This makes it suitable for demanding workloads like databases, analytics, and high-frequency trading systems.

## Mayastor Architecture

Mayastor runs on user-space SPDK framework, using polling instead of interrupts to minimize latency. Storage pools aggregate NVMe devices, and replicated volumes distribute data across pools on different nodes. Each volume has one or more replicas ensuring data survives node failures.

The CSI driver integrates Mayastor with Kubernetes, handling volume provisioning, attachment, and lifecycle management. The control plane manages replica placement, health monitoring, and automatic rebuild when replicas fail.

## Prerequisites

Mayastor requires specific system configuration:

```bash
# Enable HugePages (required for SPDK)
echo 1024 | sudo tee /sys/kernel/mm/hugepages/hugepages-2048kB/nr_hugepages

# Make persistent across reboots
echo "vm.nr_hugepages = 1024" | sudo tee -a /etc/sysctl.conf

# Load required kernel modules
sudo modprobe nvme_tcp
sudo modprobe nvme_fabrics

# Make persistent
echo "nvme_tcp" | sudo tee -a /etc/modules-load.d/mayastor.conf
echo "nvme_fabrics" | sudo tee -a /etc/modules-load.d/mayastor.conf

# Disable SELinux or configure appropriately
sudo setenforce 0
```

Label nodes designated for Mayastor storage:

```bash
kubectl label nodes node1 node2 node3 openebs.io/engine=mayastor
```

## Installing Mayastor

Deploy Mayastor using Helm.

```bash
# Add OpenEBS Helm repository
helm repo add mayastor https://openebs.github.io/mayastor-extensions
helm repo update

# Create namespace
kubectl create namespace mayastor

# Install Mayastor
helm install mayastor mayastor/mayastor \
  --namespace mayastor \
  --set csi.node.kubeletDir="/var/lib/kubelet"

# Verify installation
kubectl get pods -n mayastor
```

Expected pods:
- mayastor-csi-controller: CSI driver controller
- mayastor-csi-node: CSI driver on each node
- mayastor-io-engine: SPDK-based storage engine
- mayastor-etcd: Metadata storage

## Creating Storage Pools

Define storage pools backed by NVMe devices.

```yaml
# mayastor-pool.yaml
apiVersion: openebs.io/v1alpha1
kind: DiskPool
metadata:
  name: pool-on-node1
  namespace: mayastor
spec:
  node: node1
  disks:
  - /dev/nvme0n1
---
apiVersion: openebs.io/v1alpha1
kind: DiskPool
metadata:
  name: pool-on-node2
  namespace: mayastor
spec:
  node: node2
  disks:
  - /dev/nvme0n1
---
apiVersion: openebs.io/v1alpha1
kind: DiskPool
metadata:
  name: pool-on-node3
  namespace: mayastor
spec:
  node: node3
  disks:
  - /dev/nvme0n1
```

Apply and verify:

```bash
kubectl apply -f mayastor-pool.yaml

# Check pool status
kubectl get diskpool -n mayastor

# View pool details
kubectl describe diskpool pool-on-node1 -n mayastor
```

## Creating StorageClass

Define StorageClass for replicated Mayastor volumes.

```yaml
# mayastor-storageclass.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-3-replica
parameters:
  protocol: nvmf
  repl: "3"
  ioTimeout: "60"
  fsType: ext4
provisioner: io.openebs.csi-mayastor
volumeBindingMode: Immediate
reclaimPolicy: Delete
allowVolumeExpansion: true
```

Parameters explained:
- `protocol: nvmf`: Use NVMe-oF for network access
- `repl: "3"`: Three replicas for high availability
- `ioTimeout: "60"`: I/O timeout in seconds
- `fsType: ext4`: Filesystem type

Apply the StorageClass:

```bash
kubectl apply -f mayastor-storageclass.yaml
kubectl get storageclass mayastor-3-replica
```

## Deploying Applications with Mayastor

Create a database using Mayastor storage.

```yaml
# postgres-mayastor.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
  namespace: default
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: mayastor-3-replica
  resources:
    requests:
      storage: 50Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: default
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
          value: "supersecret"
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: postgres-data
```

Deploy and verify:

```bash
kubectl apply -f postgres-mayastor.yaml

# Check PVC binding
kubectl get pvc postgres-data

# Verify replicas are distributed
kubectl get volumes -n mayastor
kubectl describe volume <volume-id> -n mayastor

# Check pod status
kubectl get pods -l app=postgres
```

## Performance Benchmarking

Measure Mayastor performance with fio.

```yaml
# mayastor-benchmark.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: benchmark-pvc
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: mayastor-3-replica
  resources:
    requests:
      storage: 10Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: fio-benchmark
spec:
  containers:
  - name: fio
    image: ljishen/fio:latest
    command:
    - sleep
    - infinity
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: benchmark-pvc
```

Run benchmarks:

```bash
kubectl apply -f mayastor-benchmark.yaml
kubectl wait --for=condition=ready pod/fio-benchmark

# Random read IOPS
kubectl exec fio-benchmark -- fio \
  --name=random-read \
  --ioengine=libaio \
  --iodepth=32 \
  --rw=randread \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --numjobs=4 \
  --runtime=60 \
  --group_reporting \
  --filename=/data/testfile

# Random write IOPS
kubectl exec fio-benchmark -- fio \
  --name=random-write \
  --ioengine=libaio \
  --iodepth=32 \
  --rw=randwrite \
  --bs=4k \
  --direct=1 \
  --size=1G \
  --numjobs=4 \
  --runtime=60 \
  --group_reporting \
  --filename=/data/testfile
```

## Replica Management

Mayastor automatically manages replicas for high availability.

```bash
# View volume and replicas
kubectl get volumes -n mayastor
kubectl describe volume <volume-id> -n mayastor

# Manually trigger rebuild if needed
kubectl mayastor -n mayastor volume rebuild <volume-id>

# Check rebuild progress
kubectl mayastor -n mayastor volume status <volume-id>
```

## Monitoring Mayastor

Track Mayastor metrics with Prometheus.

```yaml
# ServiceMonitor for Mayastor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mayastor-metrics
  namespace: mayastor
spec:
  selector:
    matchLabels:
      app: mayastor
  endpoints:
  - port: metrics
    interval: 30s
```

Key metrics:

```promql
# Pool capacity
mayastor_pool_capacity_bytes

# Pool usage
mayastor_pool_used_bytes

# Volume IOPS
rate(mayastor_volume_read_ops_total[5m])
rate(mayastor_volume_write_ops_total[5m])

# Volume throughput
rate(mayastor_volume_read_bytes_total[5m])
rate(mayastor_volume_write_bytes_total[5m])

# Replica status
mayastor_replica_state
```

Create alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mayastor-alerts
  namespace: mayastor
spec:
  groups:
  - name: mayastor
    rules:
    - alert: MayastorReplicaDegraded
      expr: mayastor_replica_state{state!="online"} > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Mayastor replica degraded"

    - alert: MayastorPoolAlmostFull
      expr: (mayastor_pool_used_bytes / mayastor_pool_capacity_bytes) > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Mayastor pool usage above 85%"
```

## High Availability Configuration

Configure topology constraints for replica placement.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-ha
parameters:
  protocol: nvmf
  repl: "3"
  ioTimeout: "60"
  fsType: ext4
  topology: "kubernetes.io/hostname"
provisioner: io.openebs.csi-mayastor
volumeBindingMode: WaitForFirstConsumer
allowedTopologies:
- matchLabelExpressions:
  - key: kubernetes.io/hostname
    values:
    - node1
    - node2
    - node3
```

## Volume Snapshots

Create snapshots for backup and cloning.

```yaml
# mayastor-snapshot-class.yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshotClass
metadata:
  name: mayastor-snapshot-class
driver: io.openebs.csi-mayastor
deletionPolicy: Delete
---
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot
spec:
  volumeSnapshotClassName: mayastor-snapshot-class
  source:
    persistentVolumeClaimName: postgres-data
```

Restore from snapshot:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-restored
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: mayastor-3-replica
  dataSource:
    name: postgres-snapshot
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  resources:
    requests:
      storage: 50Gi
```

## Troubleshooting

Common issues and solutions:

```bash
# Check Mayastor component health
kubectl get pods -n mayastor
kubectl logs -n mayastor -l app=mayastor-io-engine

# Verify HugePages configuration
grep HugePages /proc/meminfo

# Check NVMe devices are accessible
kubectl exec -n mayastor <mayastor-pod> -- nvme list

# View pool status
kubectl get diskpool -n mayastor
kubectl describe diskpool <pool-name> -n mayastor

# Check volume health
kubectl mayastor -n mayastor volume list
kubectl mayastor -n mayastor volume status <volume-id>

# Verify CSI driver
kubectl get csidrivers
kubectl describe csidriver io.openebs.csi-mayastor
```

## Performance Tuning

Optimize Mayastor for maximum performance.

```yaml
# High-performance StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-performance
parameters:
  protocol: nvmf
  repl: "2"  # Reduce replicas for better write performance
  ioTimeout: "30"
  fsType: xfs  # XFS for large files
provisioner: io.openebs.csi-mayastor
mountOptions:
- noatime
- nodiratime
- discard
```

Allocate more CPU to io-engine pods:

```yaml
resources:
  requests:
    cpu: "4000m"
    memory: "8Gi"
  limits:
    cpu: "8000m"
    memory: "16Gi"
```

## Conclusion

OpenEBS Mayastor brings enterprise-grade NVMe performance to Kubernetes with software-defined storage that rivals dedicated storage arrays. By leveraging SPDK and NVMe-oF, it delivers low latency and high throughput while maintaining data protection through replication. Mayastor is ideal for demanding stateful workloads requiring both performance and resilience. Properly configure storage pools, monitor replica health, and benchmark performance to ensure optimal operation for your specific workload requirements.
