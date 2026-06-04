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
sudo modprobe nvme-tcp
sudo modprobe nvme-fabrics

# Make persistent
echo "nvme-tcp" | sudo tee -a /etc/modules-load.d/mayastor.conf
echo "nvme-fabrics" | sudo tee -a /etc/modules-load.d/mayastor.conf

# Restart kubelet or reboot after changing HugePages so Kubernetes sees the new allocation
sudo systemctl restart kubelet
```

Label nodes designated for Mayastor storage:

```bash
kubectl label nodes node1 node2 node3 openebs.io/engine=mayastor
```

## Installing Mayastor

Deploy Mayastor using Helm.

```bash
# Add OpenEBS Helm repository
helm repo add openebs https://openebs.github.io/openebs
helm repo update

# Create namespace
kubectl create namespace openebs

# Install Mayastor
helm install openebs openebs/openebs \
  --namespace openebs \
  --set mayastor.csi.node.kubeletDir="/var/lib/kubelet"

# Verify installation
kubectl get pods -n openebs
```

Expected pods:
- openebs-csi-controller: CSI driver controller
- openebs-csi-node: CSI driver on each node
- mayastor-io-engine: SPDK-based storage engine
- openebs-agent-core: Mayastor control plane agent

## Creating Storage Pools

Define storage pools backed by NVMe devices.

```yaml
# mayastor-pool.yaml
apiVersion: openebs.io/v1beta3
kind: DiskPool
metadata:
  name: pool-on-node1
  namespace: openebs
spec:
  node: node1
  disks:
  - aio:///dev/disk/by-id/nvme-node1-disk
---
apiVersion: openebs.io/v1beta3
kind: DiskPool
metadata:
  name: pool-on-node2
  namespace: openebs
spec:
  node: node2
  disks:
  - aio:///dev/disk/by-id/nvme-node2-disk
---
apiVersion: openebs.io/v1beta3
kind: DiskPool
metadata:
  name: pool-on-node3
  namespace: openebs
spec:
  node: node3
  disks:
  - aio:///dev/disk/by-id/nvme-node3-disk
```

Apply and verify:

```bash
kubectl apply -f mayastor-pool.yaml

# Check pool status
kubectl get diskpool -n openebs

# View pool details
kubectl describe diskpool pool-on-node1 -n openebs
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
  fsType: ext4
provisioner: io.openebs.csi-mayastor
volumeBindingMode: Immediate
reclaimPolicy: Delete
allowVolumeExpansion: true
```

Parameters explained:
- `protocol: nvmf`: Use NVMe-oF for network access
- `repl: "3"`: Three replicas for high availability
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
kubectl mayastor get volumes -n openebs
kubectl mayastor get volume-replica-topology <volume-id> -n openebs

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
kubectl mayastor get volumes -n openebs
kubectl mayastor get volume-replica-topology <volume-id> -n openebs

# View rebuild history
kubectl mayastor get rebuild-history <volume-id> -n openebs

# Check volume details
kubectl mayastor get volume <volume-id> -n openebs
```

## Monitoring Mayastor

Track Mayastor metrics with Prometheus.

```yaml
# ServiceMonitor for Mayastor
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mayastor-metrics
  namespace: openebs
  labels:
    app: mayastor
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
disk_pool_total_size_bytes

# Pool usage
disk_pool_used_size_bytes

# Volume IOPS
delta(volume_num_read_ops[5m]) / 300
delta(volume_num_write_ops[5m]) / 300

# Volume throughput
delta(volume_bytes_read[5m]) / 300
delta(volume_bytes_written[5m]) / 300

# Replica status
disk_pool_status
```

Create alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mayastor-alerts
  namespace: openebs
spec:
  groups:
  - name: mayastor
    rules:
    - alert: MayastorPoolDegraded
      expr: disk_pool_status > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Mayastor pool degraded or faulted"

    - alert: MayastorPoolAlmostFull
      expr: (disk_pool_used_size_bytes / disk_pool_total_size_bytes) > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Mayastor pool usage above 85%"
```

## High Availability Configuration

Configure topology constraints for replica placement.

```bash
kubectl mayastor label node node1 zone=zone-a -n openebs
kubectl mayastor label node node2 zone=zone-b -n openebs
kubectl mayastor label node node3 zone=zone-c -n openebs
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: mayastor-ha
parameters:
  protocol: nvmf
  repl: "3"
  fsType: ext4
  nodeSpreadTopologyKey: |
    zone
provisioner: io.openebs.csi-mayastor
volumeBindingMode: WaitForFirstConsumer
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
kubectl get pods -n openebs
kubectl logs -n openebs daemonset/mayastor-io-engine -c mayastor

# Verify HugePages configuration
grep HugePages /proc/meminfo

# Check NVMe devices are accessible
kubectl exec -n openebs <mayastor-io-engine-pod> -c mayastor -- nvme list

# View pool status
kubectl get diskpool -n openebs
kubectl describe diskpool <pool-name> -n openebs

# Check volume health
kubectl mayastor get volumes -n openebs
kubectl mayastor get volume <volume-id> -n openebs

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
