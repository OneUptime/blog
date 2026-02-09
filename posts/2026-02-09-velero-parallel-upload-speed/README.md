# How to Use Velero Parallel Upload Options to Speed Up Large Backup Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Performance, Backup Optimization

Description: Learn how to configure Velero parallel upload options to speed up large backup operations, reducing backup windows and meeting aggressive RPO targets through concurrent data transfer optimization.

---

Large Kubernetes clusters with many resources or large persistent volumes can take hours to backup with default Velero settings. Parallel upload configuration significantly reduces backup time by uploading multiple resources and volume snapshots concurrently, helping you meet aggressive RPO targets and minimize backup windows.

## Understanding Velero Upload Concurrency

Velero processes backups in stages:

- Resource backup (API objects): Serialized to JSON and uploaded
- Volume snapshot creation: Creates CSI snapshots or Restic backups
- Data upload: Transfers snapshot data to object storage

Each stage supports parallelization to improve performance.

## Configuring Resource Upload Concurrency

Adjust the number of concurrent resource uploads:

```bash
# Install Velero with increased concurrency
velero install \
  --provider aws \
  --bucket velero-backups \
  --backup-location-config region=us-east-1 \
  --use-node-agent \
  --uploader-type restic \
  --default-repo-maintain-frequency 24h \
  --server-cpu-request 1000m \
  --server-memory-request 512Mi \
  --server-cpu-limit 2000m \
  --server-memory-limit 1Gi
```

Update the Velero deployment to add concurrency flags:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: velero
  namespace: velero
spec:
  template:
    spec:
      containers:
      - name: velero
        image: velero/velero:latest
        args:
        - server
        - --default-backup-ttl=168h
        - --default-volume-snapshot-locations=default
        - --default-backup-storage-location=default
        - --backup-sync-period=1m
        - --default-item-operation-timeout=4h
        - --default-volumes-to-fs-backup=false
        - --parallel-files-upload=8  # Parallel file uploads
        resources:
          requests:
            cpu: 1000m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 1Gi
```

## Configuring Restic Upload Parallelism

For file-level backups with Restic, configure parallel upload workers:

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
        image: velero/velero:latest
        args:
        - node-agent
        - server
        - --uploader-type=restic
        - --parallel-files-upload=8  # 8 concurrent uploads
        resources:
          requests:
            cpu: 1000m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 2Gi
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
    s3Url: https://velero-backups.s3-accelerate.amazonaws.com
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
        env:
        - name: GOMAXPROCS
          value: "4"  # More CPU for parallel processing
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
velero backup create perf-test-$(date +%s) \
  --include-namespaces $NAMESPACE \
  --default-volumes-to-fs-backup \
  --wait

END=$(date +%s)
DURATION=$((END - START))

# Get backup details
BACKUP=$(velero backup get -o json | jq -r '.items | sort_by(.metadata.creationTimestamp) | last')
ITEMS=$(echo $BACKUP | jq -r '.status.totalItems')
SIZE=$(echo $BACKUP | jq -r '.status.progress.totalBytes // 0')

echo "Duration: ${DURATION}s"
echo "Items backed up: $ITEMS"
echo "Data size: $(numfmt --to=iec-i --suffix=B $SIZE)"
echo "Throughput: $(numfmt --to=iec-i --suffix=B $((SIZE / DURATION)))/s"
echo "Items per second: $((ITEMS / DURATION))"
```

## Tuning Network Bandwidth

Optimize network settings for faster uploads:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-agent-config
  namespace: velero
data:
  # Increase TCP buffer sizes
  net.core.rmem_max: "134217728"  # 128MB
  net.core.wmem_max: "134217728"
  net.ipv4.tcp_rmem: "4096 87380 67108864"
  net.ipv4.tcp_wmem: "4096 65536 67108864"
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
  defaultVolumesToFsBackup: true  # Use Restic for deduplication
  storageLocation: default
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
        velero_backup_duration_seconds > 3600
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Backup taking too long"
        description: "Backup {{ $labels.backup }} has been running for over 1 hour"

    - alert: BackupThroughputLow
      expr: |
        rate(velero_backup_items_total[5m]) < 10
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Low backup throughput"
        description: "Backup throughput is below 10 items/second"
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

    # Update Velero deployment
    subprocess.run([
        'kubectl', 'set', 'env', 'deployment/velero',
        f'PARALLEL_FILES_UPLOAD={parallel_uploads}',
        '-n', 'velero'
    ])

    # Wait for rollout
    subprocess.run([
        'kubectl', 'rollout', 'status', 'deployment/velero',
        '-n', 'velero'
    ])

    time.sleep(10)

    # Run backup
    backup_name = f'benchmark-{parallel_uploads}-{int(time.time())}'
    start = time.time()

    subprocess.run([
        'velero', 'backup', 'create', backup_name,
        '--include-namespaces', namespace,
        '--wait'
    ])

    duration = time.time() - start

    # Get backup details
    result = subprocess.run([
        'velero', 'backup', 'describe', backup_name, '-o', 'json'
    ], capture_output=True, text=True)

    backup_data = json.loads(result.stdout)
    items = backup_data['status']['totalItems']

    print(f"Duration: {duration:.1f}s")
    print(f"Items: {items}")
    print(f"Throughput: {items/duration:.2f} items/s")

    # Cleanup
    subprocess.run([
        'velero', 'backup', 'delete', backup_name, '--confirm'
    ])

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
6. **Use volume snapshots**: CSI snapshots are faster than Restic for large volumes
7. **Allocate resources**: Give Velero sufficient CPU and memory for parallel operations

## Conclusion

Optimizing Velero parallel upload configuration dramatically reduces backup times for large Kubernetes clusters. By configuring appropriate concurrency levels, allocating sufficient resources, and leveraging cloud storage optimization features, you can achieve backup speeds that meet aggressive RPO requirements.

Start with moderate parallelism settings, measure performance, and gradually increase concurrency while monitoring resource utilization. Remember that more parallelism requires more CPU, memory, and network bandwidth. Find the sweet spot that maximizes backup speed without overwhelming your infrastructure.

Test your configuration changes in non-production environments and always verify that faster backups still produce reliable, restorable data. Speed without reliability defeats the purpose of backups.
