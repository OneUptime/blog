# How to Configure Longhorn for High IOPS Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Performance, IOPS, Optimization

Description: Optimize Longhorn configuration for high IOPS workloads including database servers and analytics applications with NVMe SSDs and performance-tuned settings.

## Introduction

High IOPS workloads such as databases, message queues, and analytics engines have demanding storage requirements. Longhorn can be tuned to deliver significantly better I/O performance by optimizing disk selection, data locality settings, replica placement, and filesystem configuration. This guide covers the key optimizations for high IOPS use cases.

## Understanding IOPS Bottlenecks in Longhorn

Longhorn's write path involves multiple hops:
1. Application writes to the volume
2. Longhorn engine processes the write
3. Write is replicated to all replicas (synchronously)
4. Confirmation is returned to the application

Each hop adds latency. Performance tuning focuses on minimizing these delays.

## Hardware Optimization

### NVMe Drive Detection and Tagging

```bash
# Identify NVMe drives on nodes

lsblk -d -o NAME,TYPE,ROTA,SIZE
# ROTA=0 means solid state (NVMe/SSD)

# Tag Longhorn nodes with NVMe storage for workload routing
kubectl label node worker-nvme-1 storage-type=nvme
kubectl label node worker-nvme-2 storage-type=nvme
kubectl label node worker-nvme-3 storage-type=nvme
```

In the Longhorn UI, tag your NVMe disks:
1. Navigate to **Node** → Edit node → Disk → Add tag `nvme`

## Create High-Performance StorageClass

```yaml
# storageclass-high-iops.yaml - Optimized StorageClass for IOPS-intensive workloads
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-nvme
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  # Use 3 replicas for availability
  numberOfReplicas: "3"
  # Keep a replica local to reduce read latency
  dataLocality: "best-effort"
  # Only use NVMe-tagged disks for replicas (Longhorn disk tag, not a k8s label)
  diskSelector: "nvme"
  # XFS is often better for database workloads
  fsType: "xfs"
  staleReplicaTimeout: "30"
```

```bash
kubectl apply -f storageclass-high-iops.yaml
```

## Use Strict Local Data Locality for Maximum Performance

For single-replica, latency-critical workloads (trading off availability for performance):

```yaml
# storageclass-strict-local.yaml - Maximum performance with strict local access
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-strict-local
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  # Single replica for maximum write performance (no replication overhead)
  numberOfReplicas: "1"
  # All data must be on the local node - zero network overhead
  dataLocality: "strict-local"
  diskSelector: "nvme"
  fsType: "xfs"
```

> **Trade-off:** Single replica means no redundancy. Only use this when you have application-level redundancy (e.g., database clustering).

## Tune Longhorn Global Settings for Performance

```bash
# Disable automatic snapshot cleanup after replica rebuilds to prevent
# latency spikes (default is "true"; set to "false" to disable)
kubectl patch settings.longhorn.io auto-cleanup-system-generated-snapshot \
  -n longhorn-system \
  --type merge \
  -p '{"value": "false"}'

# Shorten the wait before replenishing a degraded replica so volumes
# return to full redundancy faster
kubectl patch settings.longhorn.io replica-replenishment-wait-interval \
  -n longhorn-system \
  --type merge \
  -p '{"value": "60"}'   # 60 seconds instead of default 600

# Configure concurrent rebuild limit to avoid impacting production I/O
kubectl patch settings.longhorn.io concurrent-replica-rebuild-per-node-limit \
  -n longhorn-system \
  --type merge \
  -p '{"value": "3"}'
```

## Database-Specific Pod Configuration

```yaml
# postgres-high-iops.yaml - PostgreSQL optimized for NVMe storage
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql-ha
  namespace: databases
spec:
  serviceName: postgresql
  replicas: 1
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      # Schedule on NVMe nodes for best storage performance
      nodeSelector:
        storage-type: nvme
      containers:
        - name: postgresql
          image: postgres:15
          env:
            - name: POSTGRES_PASSWORD
              value: strongpassword
            # Tune PostgreSQL to work well with direct I/O
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          args:
            # Increase shared buffers for better cache hit rate
            - -c
            - shared_buffers=256MB
            - -c
            # Hint the planner about total memory available for caching
            - effective_cache_size=512MB
            - -c
            # Spread checkpoint writes to reduce I/O bursts
            - checkpoint_completion_target=0.9
          resources:
            requests:
              memory: "2Gi"
              cpu: "2"
            limits:
              memory: "4Gi"
              cpu: "4"
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        # Use the NVMe-optimized storage class
        storageClassName: longhorn-nvme
        resources:
          requests:
            storage: 100Gi
```

## Filesystem Mount Options for Better Database Performance

```yaml
# storageclass-db-optimized.yaml - Storage class with database-tuned mount options
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-db
provisioner: driver.longhorn.io
allowVolumeExpansion: true
parameters:
  numberOfReplicas: "3"
  dataLocality: "best-effort"
  diskSelector: "nvme"
  fsType: "xfs"
# Mount options for database workloads
mountOptions:
  - noatime    # Disable access time updates to reduce write overhead
  - nodiratime # Disable directory access time updates
```

## Benchmarking Storage Performance

```bash
# Deploy an fio benchmark pod to test Longhorn volume performance
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: storage-benchmark
  namespace: default
spec:
  containers:
    - name: fio
      image: nixery.dev/shell/fio
      command:
        - sh
        - -c
        - |
          echo "Running sequential write benchmark..."
          fio --name=seqwrite \
              --rw=write \
              --bs=128k \
              --size=1g \
              --filename=/data/test \
              --ioengine=libaio \
              --iodepth=32 \
              --direct=1 \
              --numjobs=1
          echo "Running random read IOPS benchmark..."
          fio --name=randread \
              --rw=randread \
              --bs=4k \
              --size=1g \
              --filename=/data/test \
              --ioengine=libaio \
              --iodepth=128 \
              --direct=1 \
              --numjobs=4
      volumeMounts:
        - name: storage
          mountPath: /data
  volumes:
    - name: storage
      persistentVolumeClaim:
        claimName: benchmark-pvc
  restartPolicy: Never
EOF
```

## Conclusion

Optimizing Longhorn for high IOPS workloads requires a combination of hardware selection, storage class configuration, data locality settings, and application-level tuning. Using NVMe-tagged disks with best-effort or strict-local data locality dramatically reduces I/O latency by keeping data close to the consuming workload. Always benchmark your configuration with realistic workloads before deploying to production, and monitor I/O metrics to identify bottlenecks over time.
