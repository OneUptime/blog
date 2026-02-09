# How to Configure MinIO Erasure Coding for Data Redundancy on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, Erasure Coding, Data Redundancy

Description: Configure MinIO erasure coding for optimal data protection with parity calculations, drive failure tolerance, storage efficiency, and healing mechanisms for automatic data recovery.

---

Erasure coding is MinIO's core data protection mechanism, dividing objects into data and parity blocks distributed across drives. Unlike simple replication which stores multiple complete copies, erasure coding provides configurable redundancy with better storage efficiency. Understanding erasure coding configuration helps you balance data protection, storage overhead, and performance for your specific requirements.

## Erasure Coding Fundamentals

MinIO uses Reed-Solomon erasure coding which divides each object into N data blocks and M parity blocks. The system tolerates up to M drive failures while maintaining data availability. With 16 drives using 8 data and 8 parity blocks (8+8), you can lose half your drives and still recover all data.

The number of data and parity blocks is determined by the total drive count. MinIO automatically selects optimal configurations based on deployment size, but understanding the mathematics helps you plan capacity and protection levels.

## Drive Count and Parity Configuration

MinIO requires minimum 4 drives for erasure coding. Common configurations:

- 4 drives: 2 data + 2 parity (EC:2)
- 8 drives: 4 data + 4 parity (EC:4)
- 12 drives: 6 data + 6 parity (EC:6)
- 16 drives: 8 data + 8 parity (EC:8)

Each configuration trades storage efficiency for fault tolerance. With 16 drives in EC:8 mode, you get 50% usable capacity but can survive 8 drive failures. With 16 drives in EC:4 mode (possible with custom configuration), you get 75% usable capacity but only survive 4 failures.

## Configuring Erasure Sets

MinIO groups drives into erasure sets. Each set operates independently with its own erasure coding.

```yaml
# minio-ec-config.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: minio
  namespace: minio
spec:
  serviceName: minio
  replicas: 4  # 4 nodes
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: quay.io/minio/minio:latest
        args:
        # 4 nodes × 4 drives = 16 total drives
        # Creates 1 erasure set with EC:8 (8 data + 8 parity)
        - server
        - http://minio-{0...3}.minio.minio.svc.cluster.local/data{1...4}
        - --console-address
        - ":9001"
        env:
        - name: MINIO_ROOT_USER
          valueFrom:
            secretKeyRef:
              name: minio-creds
              key: root-user
        - name: MINIO_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: minio-creds
              key: root-password
        # Erasure coding happens automatically
        # No explicit configuration needed
        volumeMounts:
        - name: data-0
          mountPath: /data1
        - name: data-1
          mountPath: /data2
        - name: data-2
          mountPath: /data3
        - name: data-3
          mountPath: /data4
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: data-0
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: data-1
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: data-2
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
  - metadata:
      name: data-3
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## Calculating Usable Capacity

With erasure coding, usable capacity is less than raw capacity. Calculate as follows:

For EC:N configuration (N parity drives):
```
Usable Capacity = Raw Capacity × ((Total Drives - N) / Total Drives)
```

Examples:
- 16 drives × 100GB with EC:8 = 1600GB × (8/16) = 800GB usable
- 12 drives × 100GB with EC:6 = 1200GB × (6/12) = 600GB usable
- 8 drives × 100GB with EC:4 = 800GB × (4/8) = 400GB usable

## Checking Erasure Configuration

Verify erasure coding settings and health.

```bash
# Install mc client
kubectl run mc --image=minio/mc --rm -it -- sh

# Configure alias
mc alias set myminio http://minio:9000 minioadmin minioadmin123

# Check server info (shows erasure sets)
mc admin info myminio

# Example output:
# ●  minio:9000
#    Uptime: 2 hours
#    Version: 2024-01-31T20:20:33Z
#    Storage Info:
#    4 Online, 0 Offline
#    ┌─────┬────────────────┬──────────┬──────────┐
#    │ Set │ Total Drives   │ EC:8     │ Erasure  │
#    └─────┴────────────────┴──────────┴──────────┘
#       1   16              8+8         Standard
```

## Testing Fault Tolerance

Simulate drive failures to verify erasure coding protection.

```bash
# Check current status
mc admin info myminio

# Simulate drive failure by stopping a pod
kubectl delete pod minio-0 -n minio

# MinIO continues operating
# Try reading and writing objects
mc cp testfile.txt myminio/bucket/test.txt
mc cp myminio/bucket/test.txt downloaded.txt

# Check healing status
mc admin heal myminio
```

MinIO automatically heals data when failed drives return or are replaced.

## Monitoring Erasure Coding Health

Track erasure set health and healing operations.

```promql
# Drives online vs offline
minio_cluster_drive_online_total
minio_cluster_drive_offline_total

# Healing operations
minio_heal_objects_total
minio_heal_objects_heal_total
minio_heal_objects_error_total

# Storage usage considering erasure coding
minio_cluster_capacity_usable_total_bytes
minio_cluster_capacity_usable_free_bytes
```

Create alerts for drive failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: minio-erasure-alerts
spec:
  groups:
  - name: minio-erasure
    rules:
    - alert: MinIODriveOffline
      expr: minio_cluster_drive_offline_total > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "MinIO drive offline"
        description: "{{ $value }} drives are offline"

    - alert: MinIOCriticalDriveLoss
      expr: minio_cluster_drive_offline_total > 4
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Critical number of MinIO drives offline"
        description: "{{ $value }} drives offline - approaching data loss threshold"
```

## Healing and Data Recovery

MinIO automatically heals data when drives recover or are replaced.

```bash
# Start healing scan
mc admin heal --scan deep myminio

# Check healing progress
mc admin heal --verbose myminio

# View healing statistics
mc admin heal --dry-run myminio
```

Healing operates in background without service interruption. MinIO prioritizes recently accessed objects.

## Bitrot Protection

MinIO uses cryptographic hashing to detect bitrot (silent data corruption).

```bash
# Enable bitrot detection (enabled by default)
# MinIO automatically checksums all data blocks

# Force integrity check
mc admin heal --scan deep myminio

# Any corruption is automatically repaired using parity blocks
```

## Performance Considerations

Erasure coding impacts performance. More parity blocks increase write overhead.

```yaml
# For write-heavy workloads, consider fewer parity blocks
# Deploy with more total drives to maintain protection
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: fast-minio
spec:
  pools:
  - servers: 8  # More servers
    volumesPerServer: 2  # Fewer drives per server
    # Results in same total drives but better write distribution
```

CPU usage increases with parity calculation. Allocate sufficient CPU:

```yaml
resources:
  requests:
    cpu: "4000m"
    memory: "8Gi"
  limits:
    cpu: "8000m"
    memory: "16Gi"
```

## Storage Overhead Comparison

Compare erasure coding to replication:

| Method | Raw | Usable | Overhead | Failure Tolerance |
|--------|-----|--------|----------|-------------------|
| EC:8 (16 drives) | 1600GB | 800GB | 100% | 8 drives |
| EC:4 (8 drives) | 800GB | 400GB | 100% | 4 drives |
| Replication ×3 | 1600GB | 533GB | 200% | 2 drives |

Erasure coding provides better storage efficiency than replication while maintaining high fault tolerance.

## Best Practices

Follow these guidelines for optimal erasure coding configuration:

1. Use minimum 16 drives (4 nodes × 4 drives) for production
2. Ensure drives are similar size and performance
3. Use dedicated drives (not OS disks) for MinIO
4. Monitor drive health and replace failures promptly
5. Test disaster recovery scenarios regularly
6. Allocate sufficient network bandwidth for healing

## Advanced Configuration

Configure multiple pools with different erasure settings.

```yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: minio
spec:
  pools:
  - name: high-redundancy
    servers: 4
    volumesPerServer: 4
    # 16 drives, EC:8, survives 8 failures
  - name: balanced
    servers: 4
    volumesPerServer: 2
    # 8 drives, EC:4, survives 4 failures
```

Use bucket policies to direct data to appropriate pools based on importance.

## Conclusion

MinIO erasure coding provides efficient, reliable data protection through mathematical redundancy rather than simple replication. With proper configuration based on your drive count and protection requirements, you achieve optimal balance between storage efficiency, fault tolerance, and performance. Monitor drive health, leverage automatic healing, and test failure scenarios to ensure your erasure coding configuration meets your reliability objectives while maximizing usable capacity.
