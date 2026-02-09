# How to Implement Storage Performance Tuning with IO Schedulers and Mount Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Performance

Description: Optimize storage performance on Kubernetes through IO scheduler configuration, mount options, and block device tuning for improved throughput and latency in database and high-IO workloads.

---

Storage performance directly impacts application latency and throughput, yet many Kubernetes deployments run with default settings that don't match their workload characteristics. IO schedulers, mount options, and block device parameters offer significant performance improvements when tuned for specific access patterns.

This guide explores tuning techniques for various workload types, from latency-sensitive databases requiring sub-millisecond response times to throughput-oriented batch processing jobs. You'll learn to select appropriate IO schedulers, configure filesystem mount options, and adjust block device settings for optimal performance.

## Understanding IO Schedulers

Linux IO schedulers determine how block IO requests are ordered before being sent to storage devices. The choice of scheduler significantly affects performance based on device type and workload pattern.

Modern kernels support several schedulers: `none` sends requests directly to the device without reordering, ideal for NVMe SSDs with internal queuing. `mq-deadline` provides deadline-based scheduling with separate read and write queues, good for SSDs. `bfq` (Budget Fair Queueing) offers fairness and responsiveness for interactive workloads. `kyber` uses token-based latency targets for predictable performance.

For rotating disks, traditional schedulers like `deadline` and `cfq` may still be available on older kernels, though most modern systems use `mq-deadline` for both SSDs and HDDs.

## Checking Current IO Scheduler Configuration

Identify the current scheduler for each block device.

```bash
# List all block devices
lsblk

# Check scheduler for specific device
cat /sys/block/sda/queue/scheduler

# Check for all devices
for dev in /sys/block/sd*; do
  echo "$dev: $(cat $dev/queue/scheduler)"
done

# On nodes with NVMe devices
for dev in /sys/block/nvme*; do
  echo "$dev: $(cat $dev/queue/scheduler)"
done
```

The current scheduler appears in brackets, e.g., `[none] mq-deadline`.

## Configuring IO Schedulers with Udev Rules

Set schedulers persistently across reboots using udev rules.

```bash
# Create udev rule on each worker node
sudo tee /etc/udev/rules.d/60-io-scheduler.rules <<EOF
# Set none scheduler for NVMe devices
ACTION=="add|change", KERNEL=="nvme[0-9]n[0-9]", ATTR{queue/scheduler}="none"

# Set mq-deadline for SSD devices
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="mq-deadline"

# Set bfq for rotational disks
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="bfq"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
sudo udevadm trigger

# Verify changes
cat /sys/block/nvme0n1/queue/scheduler
cat /sys/block/sda/queue/scheduler
```

For Kubernetes nodes, apply these rules during node provisioning or through a DaemonSet.

## Deploying IO Scheduler Configuration via DaemonSet

Automate scheduler configuration across all nodes with a DaemonSet.

```yaml
# io-tuning-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: io-tuner
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: io-tuner
  template:
    metadata:
      labels:
        app: io-tuner
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: tuner
        image: ubuntu:22.04
        command: ['/bin/bash', '-c']
        args:
        - |
          #!/bin/bash
          set -e

          echo "Starting IO tuning on $(hostname)"

          # Install required tools
          apt-get update -qq
          apt-get install -y -qq util-linux kmod

          # Configure NVMe devices
          for dev in /sys/block/nvme*n*; do
            if [ -d "$dev" ]; then
              DEV_NAME=$(basename $dev)
              echo "Configuring $DEV_NAME for NVMe performance"

              # Set scheduler to none
              echo none > $dev/queue/scheduler

              # Set queue depth
              echo 1024 > $dev/queue/nr_requests

              # Enable write-back caching
              echo write back > $dev/queue/write_cache || true

              # Set read-ahead
              echo 256 > $dev/queue/read_ahead_kb

              # Disable add_random for performance
              echo 0 > $dev/queue/add_random

              echo "$DEV_NAME configured: scheduler=$(cat $dev/queue/scheduler)"
            fi
          done

          # Configure SSD devices
          for dev in /sys/block/sd*; do
            if [ -d "$dev" ]; then
              DEV_NAME=$(basename $dev)
              ROTATIONAL=$(cat $dev/queue/rotational)

              if [ "$ROTATIONAL" == "0" ]; then
                echo "Configuring $DEV_NAME for SSD performance"

                # Set mq-deadline scheduler
                echo mq-deadline > $dev/queue/scheduler

                # Optimize for SSD
                echo 256 > $dev/queue/nr_requests
                echo 128 > $dev/queue/read_ahead_kb
                echo 0 > $dev/queue/add_random

                # Enable TRIM/discard
                echo 0 > $dev/queue/discard_max_bytes || true

                echo "$DEV_NAME configured: scheduler=$(cat $dev/queue/scheduler)"
              fi
            fi
          done

          echo "IO tuning complete. Sleeping..."
          sleep infinity
        securityContext:
          privileged: true
        volumeMounts:
        - name: sys
          mountPath: /sys
      volumes:
      - name: sys
        hostPath:
          path: /sys
      tolerations:
      - effect: NoSchedule
        operator: Exists
```

Deploy and verify the tuning.

```bash
kubectl apply -f io-tuning-daemonset.yaml

# Check tuner logs
kubectl logs -n kube-system daemonset/io-tuner

# Verify on specific node
NODE=worker01
kubectl logs -n kube-system -l app=io-tuner --field-selector spec.nodeName=$NODE
```

## Optimizing Filesystem Mount Options

Mount options significantly affect filesystem performance. Common tuning options include:

```yaml
# storage-class-performance.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/aws-ebs
parameters:
  type: gp3
  iops: "16000"
  throughput: "1000"
mountOptions:
  - noatime          # Don't update access times
  - nodiratime       # Don't update directory access times
  - discard          # Enable TRIM for SSDs
  - nobarrier        # Disable write barriers (use with battery-backed cache)
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

Mount options for different workloads:

```yaml
# For databases (prioritize durability)
# database-storage.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: database-storage
provisioner: driver.longhorn.io
parameters:
  numberOfReplicas: "3"
  staleReplicaTimeout: "30"
mountOptions:
  - noatime
  - nodiratime
  - data=ordered      # ext4: Order data writes
  - barrier=1         # Keep barriers enabled for durability
volumeBindingMode: WaitForFirstConsumer
---
# For high-throughput workloads (prioritize performance)
# throughput-storage.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: throughput-storage
provisioner: driver.longhorn.io
mountOptions:
  - noatime
  - nodiratime
  - data=writeback    # ext4: Don't order data writes
  - nobarrier         # Disable barriers
  - commit=60         # Commit interval in seconds
volumeBindingMode: WaitForFirstConsumer
```

Apply and test mount options.

```bash
kubectl apply -f database-storage.yaml
kubectl apply -f throughput-storage.yaml

# Create test PVC
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: performance-test
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: throughput-storage
  resources:
    requests:
      storage: 50Gi
EOF

# Check mount options in pod
kubectl run -it --rm mount-check --image=ubuntu:22.04 --overrides='
{
  "spec": {
    "containers": [{
      "name": "test",
      "image": "ubuntu:22.04",
      "command": ["/bin/bash"],
      "stdin": true,
      "tty": true,
      "volumeMounts": [{
        "name": "data",
        "mountPath": "/data"
      }]
    }],
    "volumes": [{
      "name": "data",
      "persistentVolumeClaim": {
        "claimName": "performance-test"
      }
    }]
  }
}' -- mount | grep /data
```

## Tuning Block Device Parameters

Adjust queue depth, read-ahead, and other block device settings for performance.

```bash
# On worker nodes, tune for database workload
sudo tee /etc/systemd/system/tune-storage.service <<EOF
[Unit]
Description=Tune storage devices for database workload
After=local-fs.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/tune-storage.sh

[Install]
WantedBy=multi-user.target
EOF

# Create tuning script
sudo tee /usr/local/bin/tune-storage.sh <<'EOF'
#!/bin/bash
set -e

for dev in /sys/block/nvme*n*; do
  if [ -d "$dev" ]; then
    DEV_NAME=$(basename $dev)

    # Queue depth
    echo 1024 > $dev/queue/nr_requests

    # Read-ahead (set higher for sequential reads, lower for random)
    echo 256 > $dev/queue/read_ahead_kb

    # IO scheduler
    echo none > $dev/queue/scheduler

    # Disable entropy contribution
    echo 0 > $dev/queue/add_random

    # Polling mode for ultra-low latency
    echo 1 > $dev/queue/io_poll || true

    echo "Tuned $DEV_NAME for low-latency database workload"
  fi
done
EOF

sudo chmod +x /usr/local/bin/tune-storage.sh
sudo systemctl enable tune-storage
sudo systemctl start tune-storage
```

## Benchmarking Storage Performance

Use fio to benchmark different configurations.

```yaml
# fio-benchmark-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: fio-benchmark
spec:
  containers:
  - name: fio
    image: ljishen/fio:latest
    command: ['sh', '-c', 'sleep infinity']
    volumeMounts:
    - name: data
      mountPath: /data
    resources:
      requests:
        memory: "1Gi"
        cpu: "2"
      limits:
        memory: "2Gi"
        cpu: "4"
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: performance-test
```

Run various benchmark tests.

```bash
kubectl apply -f fio-benchmark-pod.yaml
kubectl wait --for=condition=ready pod/fio-benchmark

# Random read IOPS test
kubectl exec fio-benchmark -- fio \
  --name=rand-read \
  --ioengine=libaio \
  --iodepth=32 \
  --rw=randread \
  --bs=4k \
  --direct=1 \
  --size=10G \
  --numjobs=4 \
  --runtime=60 \
  --group_reporting \
  --directory=/data

# Random write IOPS test
kubectl exec fio-benchmark -- fio \
  --name=rand-write \
  --ioengine=libaio \
  --iodepth=32 \
  --rw=randwrite \
  --bs=4k \
  --direct=1 \
  --size=10G \
  --numjobs=4 \
  --runtime=60 \
  --group_reporting \
  --directory=/data

# Sequential read throughput test
kubectl exec fio-benchmark -- fio \
  --name=seq-read \
  --ioengine=libaio \
  --iodepth=32 \
  --rw=read \
  --bs=1m \
  --direct=1 \
  --size=10G \
  --numjobs=1 \
  --runtime=60 \
  --group_reporting \
  --directory=/data

# Mixed workload (70% read, 30% write)
kubectl exec fio-benchmark -- fio \
  --name=mixed \
  --ioengine=libaio \
  --iodepth=16 \
  --rw=randrw \
  --rwmixread=70 \
  --bs=8k \
  --direct=1 \
  --size=10G \
  --numjobs=4 \
  --runtime=60 \
  --group_reporting \
  --directory=/data
```

## Monitoring IO Performance

Track IO metrics with node-exporter and Prometheus.

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  endpoints:
  - port: metrics
    interval: 15s
```

Query key IO metrics:

```promql
# Disk IO time percentage
rate(node_disk_io_time_seconds_total[5m]) * 100

# Read/write throughput
rate(node_disk_read_bytes_total[5m])
rate(node_disk_written_bytes_total[5m])

# IOPS
rate(node_disk_reads_completed_total[5m])
rate(node_disk_writes_completed_total[5m])

# Average wait time
rate(node_disk_io_time_weighted_seconds_total[5m]) / rate(node_disk_reads_completed_total[5m] + node_disk_writes_completed_total[5m])
```

Create alerts for performance degradation.

```yaml
# prometheus-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: io-performance-alerts
spec:
  groups:
  - name: io-performance
    interval: 30s
    rules:
    - alert: HighDiskIOWait
      expr: rate(node_disk_io_time_weighted_seconds_total[5m]) / rate(node_disk_reads_completed_total[5m] + node_disk_writes_completed_total[5m]) > 0.1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High disk IO wait time on {{ $labels.instance }}"
        description: "Average IO wait time is {{ $value }}s on device {{ $labels.device }}"

    - alert: DiskSaturation
      expr: rate(node_disk_io_time_seconds_total[5m]) > 0.9
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Disk saturation on {{ $labels.instance }}"
        description: "Disk {{ $labels.device }} is saturated ({{ $value | humanizePercentage }} utilization)"
```

Storage performance tuning through IO schedulers, mount options, and block device parameters can dramatically improve application performance without infrastructure changes. By matching scheduler algorithms to device types, selecting appropriate mount options for workload characteristics, and tuning queue depths and read-ahead settings, you extract maximum performance from your storage subsystem. Regular benchmarking and monitoring ensure tuning remains effective as workloads evolve.
