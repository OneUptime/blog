# How to Configure Raw Block Volumes in Kubernetes for Database Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, RawBlock, Database

Description: Learn how to configure and use raw block volumes in Kubernetes for high-performance database workloads, bypassing the filesystem layer for maximum IOPS and lowest latency.

---

Raw block volumes provide direct access to block devices without a filesystem, offering maximum performance for databases and applications that implement their own storage management. This eliminates filesystem overhead and gives applications complete control over storage.

## Understanding Raw Block Volumes

Raw block volumes differ from filesystem volumes:

**Filesystem Volumes:**
- Mounted as a directory
- OS manages file operations
- Filesystem overhead and caching
- Easier to use but slower

**Raw Block Volumes:**
- Exposed as block device (e.g., /dev/sdb)
- Application manages block I/O directly
- No filesystem overhead
- Maximum performance for databases

Use raw block when:
- Running databases with custom storage engines (Oracle, MySQL InnoDB)
- Needing maximum IOPS and lowest latency
- Application handles block-level operations
- Avoiding filesystem overhead

## Creating a Raw Block StorageClass

Configure a StorageClass for raw block volumes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: raw-block-storage
provisioner: ebs.csi.aws.com
parameters:
  type: io2
  iops: "50000"  # High IOPS for databases
  encrypted: "true"
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## Creating a Raw Block PVC

Request a volume with Block mode:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-block-pvc
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Block  # Request raw block device
  storageClassName: raw-block-storage
  resources:
    requests:
      storage: 100Gi
```

Apply and verify:

```bash
kubectl apply -f raw-block-pvc.yaml

# Check the volume mode
kubectl get pvc database-block-pvc -o yaml | grep volumeMode
# Output: volumeMode: Block
```

## Using Raw Block Volumes in Pods

Mount as a block device using `volumeDevices`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres-raw-block
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: "password123"
    # Use volumeDevices instead of volumeMounts
    volumeDevices:
    - name: data
      devicePath: /dev/xvda  # Device path in container
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: database-block-pvc
```

However, standard PostgreSQL expects a filesystem. For demonstration, use a custom init script:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: database-raw-block
spec:
  initContainers:
  - name: format-device
    image: alpine:latest
    command:
    - /bin/sh
    - -c
    - |
      # Format the block device with ext4
      if ! blkid /dev/xvda; then
        echo "Formatting /dev/xvda..."
        mkfs.ext4 /dev/xvda
      fi
      # Mount it temporarily to create directory structure
      mkdir -p /mnt/data
      mount /dev/xvda /mnt/data
      mkdir -p /mnt/data/pgdata
      umount /mnt/data
    volumeDevices:
    - name: data
      devicePath: /dev/xvda
    securityContext:
      privileged: true
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      value: "password123"
    - name: PGDATA
      value: /mnt/pgdata
    command:
    - /bin/bash
    - -c
    - |
      # Mount the formatted device
      mount /dev/xvda /mnt
      # Start postgres
      docker-entrypoint.sh postgres
    volumeDevices:
    - name: data
      devicePath: /dev/xvda
    securityContext:
      privileged: true
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: database-block-pvc
```

## Raw Block with MySQL

MySQL can use raw block devices directly:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
data:
  my.cnf: |
    [mysqld]
    innodb_flush_method=O_DIRECT
    innodb_file_per_table=1
---
apiVersion: v1
kind: Pod
metadata:
  name: mysql-raw-block
spec:
  containers:
  - name: mysql
    image: mysql:8.0
    env:
    - name: MYSQL_ROOT_PASSWORD
      value: "password123"
    volumeDevices:
    - name: data
      devicePath: /dev/mysql-data
    volumeMounts:
    - name: config
      mountPath: /etc/mysql/conf.d
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: mysql-block-pvc
  - name: config
    configMap:
      name: mysql-config
```

## StatefulSet with Raw Block Volumes

Deploy a database cluster using raw block:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: scylladb-cluster
spec:
  serviceName: scylladb
  replicas: 3
  selector:
    matchLabels:
      app: scylladb
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes:
        - ReadWriteOnce
      volumeMode: Block  # Raw block for each replica
      storageClassName: raw-block-storage
      resources:
        requests:
          storage: 500Gi
  template:
    metadata:
      labels:
        app: scylladb
    spec:
      containers:
      - name: scylladb
        image: scylladb/scylla:latest
        args:
        - --smp
        - "4"
        - --memory
        - "8G"
        volumeDevices:
        - name: data
          devicePath: /dev/scylla-data
```

## Performance Testing

Benchmark raw block vs filesystem:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: fio-benchmark
spec:
  containers:
  - name: fio
    image: dmonakhov/alpine-fio
    command:
    - fio
    - --name=random-rw
    - --ioengine=libaio
    - --iodepth=64
    - --rw=randrw
    - --bs=4k
    - --size=10G
    - --numjobs=4
    - --runtime=60
    - --group_reporting
    - --filename=/dev/xvda
    volumeDevices:
    - name: test-volume
      devicePath: /dev/xvda
    securityContext:
      privileged: true
  volumes:
  - name: test-volume
    persistentVolumeClaim:
      claimName: raw-block-test-pvc
  restartPolicy: Never
```

Run the benchmark:

```bash
kubectl apply -f fio-benchmark.yaml
kubectl wait --for=condition=complete pod/fio-benchmark --timeout=300s
kubectl logs fio-benchmark

# Compare with filesystem benchmark by changing to volumeMounts
```

## Monitoring Raw Block Volumes

Track block device usage:

```bash
# List raw block PVCs
kubectl get pvc -o json | jq -r '.items[] |
  select(.spec.volumeMode == "Block") |
  "\(.metadata.name): \(.spec.resources.requests.storage)"'

# Check device in running pod
kubectl exec database-raw-block -- lsblk

# View I/O statistics
kubectl exec database-raw-block -- iostat -x 1 5
```

## Converting Between Block and Filesystem

You cannot directly convert, but can migrate data:

```bash
# Create new filesystem PVC
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: database-fs-pvc
spec:
  accessModes:
    - ReadWriteOnce
  volumeMode: Filesystem
  storageClassName: standard-storage
  resources:
    requests:
      storage: 100Gi
EOF

# Run a migration pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: migrate-data
spec:
  containers:
  - name: migrator
    image: alpine:latest
    command:
    - /bin/sh
    - -c
    - |
      # Mount the raw block device
      mount /dev/source /mnt/source
      # Copy to filesystem volume
      cp -a /mnt/source/* /mnt/dest/
      umount /mnt/source
    volumeDevices:
    - name: source
      devicePath: /dev/source
    volumeMounts:
    - name: dest
      mountPath: /mnt/dest
    securityContext:
      privileged: true
  volumes:
  - name: source
    persistentVolumeClaim:
      claimName: database-block-pvc
  - name: dest
    persistentVolumeClaim:
      claimName: database-fs-pvc
  restartPolicy: Never
EOF
```

## Best Practices

1. **Use for high-performance databases** that support raw block
2. **Ensure application compatibility** before switching to raw block
3. **Implement backup strategies** that work with block devices
4. **Monitor I/O performance** to verify benefits
5. **Use privileged containers** when formatting devices
6. **Test failover scenarios** thoroughly
7. **Document device paths** and configurations
8. **Consider filesystem overhead** before switching

Raw block volumes provide the ultimate performance for databases and applications that can manage block-level I/O, but require more careful configuration and application support than traditional filesystem volumes.
