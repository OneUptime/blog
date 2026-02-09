# How to Configure Storage Class Parameters for IOPS and Throughput Tuning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Performance

Description: Optimize storage performance by configuring StorageClass parameters for IOPS and throughput tuning on cloud and on-premises storage backends, matching workload requirements.

---

StorageClass parameters control the performance characteristics of dynamically provisioned volumes. Properly tuned IOPS and throughput settings ensure applications receive adequate storage performance without over-provisioning expensive high-performance storage. Different workloads require different profiles: databases need consistent IOPS, streaming workloads prioritize throughput, and general applications balance both metrics.

This guide covers configuring performance parameters across AWS EBS, Azure Disks, GCP Persistent Disks, and on-premises storage solutions including NetApp, Pure Storage, and Longhorn.

## Understanding IOPS vs Throughput

IOPS measures the number of I/O operations per second, relevant for workloads with many small random reads/writes like databases and key-value stores. Throughput measures megabytes per second, important for sequential operations like video processing, backups, and big data analytics.

Cloud providers offer different performance tiers: general purpose balanced volumes provide baseline performance with burst capability, provisioned IOPS volumes deliver guaranteed performance for demanding workloads, and throughput-optimized volumes maximize sequential performance for large data transfers.

The relationship between IOPS and throughput depends on block size. At 4KB blocks, 10,000 IOPS equals roughly 40 MB/s throughput. At 1MB blocks, 100 IOPS equals 100 MB/s. Understanding your workload's access pattern determines the appropriate tuning strategy.

## AWS EBS Storage Classes

Configure EBS volumes with specific IOPS and throughput parameters.

```yaml
# aws-gp3-standard.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-standard
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"        # Baseline 3000 IOPS
  throughput: "125"    # Baseline 125 MB/s
  encrypted: "true"
allowVolumeExpansion: true
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
---
# aws-gp3-performance.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-performance
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "16000"       # Maximum 16,000 IOPS
  throughput: "1000"   # Maximum 1,000 MB/s
  encrypted: "true"
allowVolumeExpansion: true
---
# aws-io2-database.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: io2-database
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "64000"       # Up to 64,000 IOPS
  encrypted: "true"
allowVolumeExpansion: true
mountOptions:
  - noatime
  - nodiratime
```

Cost vs performance considerations for EBS:

```bash
# gp3: Best value - $0.08/GB + $0.005/provisioned IOPS + $0.04/MB/s throughput
# io2: Highest performance - $0.125/GB + $0.065/provisioned IOPS
# st1: Throughput optimized - $0.045/GB (500 MB/s max)

kubectl apply -f aws-gp3-standard.yaml
kubectl apply -f aws-gp3-performance.yaml
kubectl apply -f aws-io2-database.yaml
```

## Azure Disk Storage Classes

Configure Azure managed disks with performance tiers.

```yaml
# azure-premium-ssd-v2.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-premium-ssd-v2
provisioner: disk.csi.azure.com
parameters:
  skuName: PremiumV2_LRS
  diskIOPSReadWrite: "5000"
  diskMBpsReadWrite: "125"
allowVolumeExpansion: true
reclaimPolicy: Delete
---
# azure-ultra-disk.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-ultra-disk
provisioner: disk.csi.azure.com
parameters:
  skuName: UltraSSD_LRS
  diskIOPSReadWrite: "64000"
  diskMBpsReadWrite: "2000"
  cachingMode: None
allowVolumeExpansion: true
---
# azure-premium-standard.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azure-premium-standard
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  # P30: 5000 IOPS, 200 MB/s
allowVolumeExpansion: true
```

## GCP Persistent Disk Storage Classes

Configure GCP PD with performance parameters.

```yaml
# gcp-ssd-balanced.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-ssd-balanced
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-balanced
  replication-type: regional-pd
  # Performance scales with size: 6 IOPS/GB, 28 MB/s per GB read, 14 MB/s per GB write
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
---
# gcp-ssd-extreme.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-ssd-extreme
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-extreme
  provisioned-iops-on-create: "100000"
  # Extreme PD: Up to 100,000 IOPS, 2,400 MB/s throughput
allowVolumeExpansion: true
---
# gcp-ssd-standard.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gcp-ssd-standard
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  # Standard SSD: 30 IOPS/GB, 480 MB/s read, 240 MB/s write per volume
allowVolumeExpansion: true
```

## NetApp ONTAP QoS Configuration

Configure ONTAP storage classes with QoS policies.

```yaml
# ontap-qos-high.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ontap-qos-high
provisioner: csi.trident.netapp.io
parameters:
  backendType: "ontap-san"
  qosPolicy: "high-priority"
  # Create QoS policy in ONTAP: qos policy-group create -policy-group high-priority -max-throughput 10000iops
allowVolumeExpansion: true
---
# ontap-adaptive-qos.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ontap-adaptive-qos
provisioner: csi.trident.netapp.io
parameters:
  backendType: "ontap-nas"
  adaptiveQosPolicy: "adaptive-extreme"
  # Adaptive QoS scales with volume size
  # Create in ONTAP: qos adaptive-policy-group create -policy-group adaptive-extreme -expected-iops 6144IOPS/TB -peak-iops 12288IOPS/TB
allowVolumeExpansion: true
```

## Pure Storage QoS Configuration

Configure Pure Storage with bandwidth limits.

```yaml
# pure-high-performance.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pure-high-performance
provisioner: pure-csi
parameters:
  backend: pure-flasharray
  bandwidth_limit: ""      # No limit
  iops_limit: ""           # No limit
  createoptions: -o compressed=false
allowVolumeExpansion: true
---
# pure-limited.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: pure-limited
provisioner: pure-csi
parameters:
  backend: pure-flasharray
  bandwidth_limit: "500M"  # 500 MB/s limit
  iops_limit: "10000"      # 10,000 IOPS limit
allowVolumeExpansion: true
```

## Longhorn Performance Tuning

Configure Longhorn with I/O parameters.

```yaml
# longhorn-high-iops.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-high-iops
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "2"
  staleReplicaTimeout: "20"
  dataLocality: "best-effort"
  diskSelector: "ssd"
  nodeSelector: "storage-node"
  # Engine image with IO optimization
  engineImage: "longhornio/longhorn-engine:v1.5.3"
allowVolumeExpansion: true
mountOptions:
  - noatime
  - nodiratime
volumeBindingMode: WaitForFirstConsumer
```

## Benchmarking Performance

Test actual IOPS and throughput achieved with different storage classes.

```yaml
# fio-benchmark-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: storage-benchmark
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: fio
        image: ljishen/fio
        command: ["/bin/bash", "-c"]
        args:
        - |
          echo "=== Random Read IOPS Test ===" >&2
          fio --name=randread --ioengine=libaio --iodepth=64 --rw=randread --bs=4k --direct=1 --size=10G --numjobs=4 --runtime=60 --group_reporting --directory=/data

          echo "=== Random Write IOPS Test ===" >&2
          fio --name=randwrite --ioengine=libaio --iodepth=64 --rw=randwrite --bs=4k --direct=1 --size=10G --numjobs=4 --runtime=60 --group_reporting --directory=/data

          echo "=== Sequential Read Throughput Test ===" >&2
          fio --name=seqread --ioengine=libaio --iodepth=32 --rw=read --bs=1m --direct=1 --size=10G --numjobs=1 --runtime=60 --group_reporting --directory=/data

          echo "=== Sequential Write Throughput Test ===" >&2
          fio --name=seqwrite --ioengine=libaio --iodepth=32 --rw=write --bs=1m --direct=1 --size=10G --numjobs=1 --runtime=60 --group_reporting --directory=/data
        volumeMounts:
        - name: test-volume
          mountPath: /data
      volumes:
      - name: test-volume
        persistentVolumeClaim:
          claimName: benchmark-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: benchmark-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: gp3-performance  # Change to test different classes
  resources:
    requests:
      storage: 50Gi
```

Run benchmarks:

```bash
kubectl apply -f fio-benchmark-job.yaml
kubectl wait --for=condition=complete job/storage-benchmark --timeout=600s
kubectl logs job/storage-benchmark
```

## Workload-Specific Recommendations

Match storage classes to workload characteristics:

```yaml
# database-storage.yaml - Random I/O focused
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: database
  annotations:
    description: "Optimized for random I/O workloads"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "10000"       # High IOPS for random access
  throughput: "250"    # Moderate throughput
---
# analytics-storage.yaml - Throughput focused
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: analytics
  annotations:
    description: "Optimized for sequential throughput"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"        # Standard IOPS
  throughput: "1000"   # Maximum throughput for large scans
---
# cache-storage.yaml - Balanced
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cache
  annotations:
    description: "Balanced performance for caching"
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "5000"
  throughput: "500"
```

Proper IOPS and throughput configuration ensures applications receive adequate storage performance while controlling costs. By understanding workload access patterns and configuring StorageClass parameters accordingly, you optimize both performance and efficiency. Regular benchmarking validates that provisioned performance matches application requirements and justifies performance tier costs.
