# How to Use Velero Parallel Upload Options to Speed Up Large Backup Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Performance, Backup Optimization

Description: Learn how to configure Velero parallel upload options to speed up large backup operations, reducing backup windows and meeting aggressive RPO targets through concurrent data transfer optimization.

---

Large Kubernetes clusters with many resources or large persistent volumes can take hours to backup with default Velero settings. Parallel upload configuration can reduce backup time by uploading files for file system backups and CSI snapshot data movement concurrently, helping you meet aggressive RPO targets and minimize backup windows.

## Understanding Velero Upload Concurrency

Velero processes backups in stages:

- Resource backup (API objects): Serialized to JSON and uploaded
- Volume snapshot creation: Creates native or CSI volume snapshots
- Data upload: Transfers file system backup or CSI snapshot data to object storage

Velero can parallelize backup processing across independent backups, node-agent work per node, and file uploads within file system backup or CSI snapshot data movement.

## Configuring File Upload Concurrency

Install Velero with the AWS plugin and node-agent enabled:

```bash
# Install Velero with increased concurrency

velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.14.0 \
  --bucket velero-backups \
  --backup-location-config region=us-east-1 \
  --use-node-agent \
  --uploader-type kopia \
  --default-repo-maintain-frequency 24h \
  --server-cpu-request 1000m \
  --server-memory-request 512Mi \
  --server-cpu-limit 2000m \
  --server-memory-limit 1Gi
```

Set file upload concurrency on the backup request:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: production-backup
  namespace: velero
spec:
  includedNamespaces:
  - production
  defaultVolumesToFsBackup: true
  storageLocation: default
  uploaderConfig:
    parallelFilesUpload: 8  # Parallel file uploads per volume
```

You can also set this from the CLI:

```bash
velero backup create production-backup \
  --include-namespaces production \
  --default-volumes-to-fs-backup \
  --parallel-files-upload 8 \
  --wait
```

## Configuring Kopia Upload Parallelism

For file-level backups with Kopia, configure parallel upload workers per backup:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-fs-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - production
    defaultVolumesToFsBackup: true
    uploaderConfig:
      parallelFilesUpload: 8  # 8 concurrent file uploads per volume
```

Higher parallelism requires more CPU and memory.

## Optimizing S3 Upload Performance

Configure S3-specific upload optimization:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups
  config:
    region: us-east-1
    s3ForcePathStyle: "false"
    enableSharedConfig: "true"
    # S3 automatically uses multipart upload for large files
```

Enable S3 Transfer Acceleration for faster uploads:

```bash
# Enable S3 Transfer Acceleration
aws s3api put-bucket-accelerate-configuration \
  --bucket velero-backups \
  --accelerate-configuration Status=Enabled
```

Update BackupStorageLocation:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups
  config:
    region: us-east-1
    s3Url: https://s3-accelerate.amazonaws.com
    s3ForcePathStyle: "false"
```

## Configuring Node Agent Resource Allocation

Allocate sufficient resources for parallel operations:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-agent
  namespace: velero
spec:
  template:
    spec:
      containers:
      - name: node-agent
        resources:
          requests:
            cpu: "1"
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
```

## Measuring Backup Performance

Track backup duration and throughput:

```bash
#!/bin/bash
# measure-backup-performance.sh

NAMESPACE=$1

echo "Starting performance test..."
START=$(date +%s)

# Create backup
BACKUP_NAME="perf-test-$(date +%s)"
velero backup create "$BACKUP_NAME" \
  --include-namespaces "$NAMESPACE" \
  --default-volumes-to-fs-backup \
  --parallel-files-upload 8 \
  --wait

END=$(date +%s)
DURATION=$((END - START))

# Get backup details
BACKUP=$(velero backup get "$BACKUP_NAME" -o json)
ITEMS=$(echo "$BACKUP" | jq -r '.status.totalItems // 0')

echo "Duration: ${DURATION}s"
echo "Items backed up: $ITEMS"
if [ "$DURATION" -gt 0 ]; then
  echo "Items per second: $((ITEMS / DURATION))"
fi
```

## Tuning Network Bandwidth

Optimize network settings for faster uploads. A Kubernetes ConfigMap by itself will not change kernel TCP settings; apply sysctls through your node configuration management or an approved privileged node tuning mechanism:

```bash
# Example node-level settings; validate with your platform team before applying
sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 67108864"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 67108864"
```

## Implementing Backup Scheduling for Off-Peak Hours

Schedule large backups during low-traffic periods:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: large-volume-backup
  namespace: velero
spec:
  schedule: "0 2 * * *"  # 2 AM when cluster usage is low
  template:
    includedNamespaces:
    - production
    defaultVolumesToFsBackup: true
    ttl: 168h0m0s
```

## Optimizing for Different Workload Types

Configure different parallelism for different workload types:

```yaml
# Fast backup for many small resources
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: microservices-backup
  namespace: velero
spec:
  includedNamespaces:
  - microservices
  defaultVolumesToFsBackup: false  # Use volume snapshots
  storageLocation: default
---
# Slower backup for few large volumes
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: database-backup
  namespace: velero
spec:
  includedNamespaces:
  - database
  defaultVolumesToFsBackup: true  # Use Kopia file system backup for deduplication
  storageLocation: default
  uploaderConfig:
    parallelFilesUpload: 4
```

## Monitoring Upload Performance

Track upload metrics with Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-performance-alerts
  namespace: velero
spec:
  groups:
  - name: velero.performance
    interval: 30s
    rules:
    - alert: SlowBackupUpload
      expr: |
        histogram_quantile(0.95,
          sum(rate(velero_backup_duration_seconds_bucket[30m])) by (le)
        ) > 3600
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Backup taking too long"
        description: "The p95 Velero backup duration is over 1 hour"

    - alert: BackupItemsLow
      expr: |
        velero_backup_items_total < 10
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Low backup item count"
        description: "A completed Velero backup contains fewer than 10 items"
```

## Using Multiple Backup Storage Locations

Distribute load across multiple storage locations:

```yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: primary
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups-primary
  config:
    region: us-east-1
---
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: secondary
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups-secondary
  config:
    region: us-west-2
```

Create schedules targeting different locations:

```yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: backup-to-primary
  namespace: velero
spec:
  schedule: "0 */2 * * *"
  template:
    storageLocation: primary
    includedNamespaces:
    - production-a
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: backup-to-secondary
  namespace: velero
spec:
  schedule: "30 */2 * * *"
  template:
    storageLocation: secondary
    includedNamespaces:
    - production-b
```

## Benchmarking Different Configurations

Compare performance of different settings:

```python
#!/usr/bin/env python3
# benchmark-velero-configs.py

import subprocess
import time
import json

def run_backup_test(parallel_uploads, namespace):
    """Test backup performance with specific parallel upload setting."""

    print(f"\nTesting with parallel_uploads={parallel_uploads}")

    # Run backup
    backup_name = f'benchmark-{parallel_uploads}-{int(time.time())}'
    start = time.time()

    subprocess.run([
        'velero', 'backup', 'create', backup_name,
        '--include-namespaces', namespace,
        '--default-volumes-to-fs-backup',
        '--parallel-files-upload', str(parallel_uploads),
        '--wait'
    ], check=True)

    duration = time.time() - start

    # Get backup details
    result = subprocess.run([
        'velero', 'backup', 'get', backup_name, '-o', 'json'
    ], capture_output=True, text=True, check=True)

    backup_data = json.loads(result.stdout)
    items = backup_data['status']['totalItems']

    print(f"Duration: {duration:.1f}s")
    print(f"Items: {items}")
    print(f"Throughput: {items/duration:.2f} items/s")

    # Cleanup
    subprocess.run([
        'velero', 'backup', 'delete', backup_name, '--confirm'
    ], check=True)

    return {
        'parallel_uploads': parallel_uploads,
        'duration': duration,
        'items': items,
        'throughput': items/duration
    }

if __name__ == '__main__':
    namespace = 'production'
    results = []

    for parallel in [1, 2, 4, 8, 16]:
        results.append(run_backup_test(parallel, namespace))

    print("\n=== Benchmark Results ===")
    for result in results:
        print(f"Parallel={result['parallel_uploads']}: "
              f"{result['duration']:.1f}s, "
              f"{result['throughput']:.2f} items/s")
```

## Best Practices

Follow these practices for optimal performance:

1. **Start conservative**: Begin with parallel_uploads=4, increase gradually
2. **Monitor resources**: Watch CPU and memory usage during backups
3. **Test thoroughly**: Benchmark different configurations in non-production
4. **Consider network**: Ensure network bandwidth can handle parallel uploads
5. **Schedule wisely**: Run large backups during off-peak hours
6. **Use volume snapshots**: CSI snapshots are often faster than file system backup for large volumes
7. **Allocate resources**: Give Velero sufficient CPU and memory for parallel operations

## Conclusion

Optimizing Velero parallel upload configuration dramatically reduces backup times for large Kubernetes clusters. By configuring appropriate concurrency levels, allocating sufficient resources, and leveraging cloud storage optimization features, you can achieve backup speeds that meet aggressive RPO requirements.

Start with moderate parallelism settings, measure performance, and gradually increase concurrency while monitoring resource utilization. Remember that more parallelism requires more CPU, memory, and network bandwidth. Find the sweet spot that maximizes backup speed without overwhelming your infrastructure.

Test your configuration changes in non-production environments and always verify that faster backups still produce reliable, restorable data. Speed without reliability defeats the purpose of backups.
