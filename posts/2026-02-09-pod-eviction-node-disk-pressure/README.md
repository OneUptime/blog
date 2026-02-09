# How to Handle Pod Eviction Caused by Node Disk Pressure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Storage, Troubleshooting

Description: Learn how to identify, prevent, and recover from pod evictions caused by node disk pressure in Kubernetes, including ephemeral storage management and disk cleanup strategies.

---

Disk pressure is a critical but often overlooked cause of pod evictions in Kubernetes. When nodes run low on disk space, the kubelet evicts pods to reclaim storage and prevent system instability. Unlike memory pressure, disk pressure can affect both application data and system operations, making it particularly disruptive.

Understanding how Kubernetes manages disk resources and configuring proper limits helps maintain cluster stability and application availability.

## Understanding Disk Pressure

Kubernetes monitors disk usage on each node using these signals:

- `nodefs.available`: Available disk space on the node filesystem
- `nodefs.inodesFree`: Available inodes on the node filesystem
- `imagefs.available`: Available disk space on the image filesystem (if separate from nodefs)
- `imagefs.inodesFree`: Available inodes on the image filesystem

Default eviction thresholds:

```yaml
# Kubelet configuration
evictionHard:
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
  imagefs.available: "15%"
evictionSoft:
  nodefs.available: "15%"
  imagefs.available: "20%"
evictionSoftGracePeriod:
  nodefs.available: "90s"
  imagefs.available: "90s"
```

When these thresholds are crossed, kubelet begins evicting pods starting with BestEffort QoS, then Burstable, and finally Guaranteed.

## Detecting Disk Pressure

Check node disk pressure status:

```bash
# View disk pressure across nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,DISK_PRESSURE:.status.conditions[?(@.type==\"DiskPressure\")].status

# Detailed node conditions
kubectl describe node <node-name> | grep -A 10 "Conditions:"

# Check actual disk usage on node
kubectl get --raw /api/v1/nodes/<node-name>/proxy/stats/summary | jq '.node.fs'
```

Find pods evicted due to disk pressure:

```bash
# List eviction events
kubectl get events --all-namespaces --field-selector reason=Evicted

# Find disk-related evictions
kubectl get events --all-namespaces -o json | \
  jq -r '.items[] | select(.reason == "Evicted") | select(.message | contains("disk")) |
  {namespace: .involvedObject.namespace, pod: .involvedObject.name, message: .message}'
```

## Configuring Ephemeral Storage Limits

Pods can specify ephemeral storage requests and limits to manage disk usage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: disk-limited-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    resources:
      requests:
        ephemeral-storage: "2Gi"
        memory: "512Mi"
        cpu: "250m"
      limits:
        ephemeral-storage: "4Gi"
        memory: "1Gi"
        cpu: "500m"
    volumeMounts:
    - name: cache
      mountPath: /app/cache
  volumes:
  - name: cache
    emptyDir:
      sizeLimit: "1Gi"  # Additional limit on emptyDir volume
```

The ephemeral storage limit includes:
- Container writable layer
- Log files
- EmptyDir volumes

## Managing Container Logs

Container logs are a common source of disk pressure:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: controlled-logging-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    # Application should log to stdout/stderr, not files
    command: ["/bin/sh", "-c"]
    args:
    - |
      # Use structured logging and control verbosity
      export LOG_LEVEL=INFO
      /app/start.sh
    resources:
      requests:
        ephemeral-storage: "1Gi"
      limits:
        ephemeral-storage: "2Gi"
```

Configure log rotation at the node level:

```yaml
# Kubelet configuration (not pod spec)
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerLogMaxSize: "10Mi"
containerLogMaxFiles: 5
```

## Using EmptyDir Volumes Wisely

EmptyDir volumes consume ephemeral storage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: emptydir-pod
spec:
  containers:
  - name: app
    image: data-processor:1.0
    volumeMounts:
    - name: work-dir
      mountPath: /work
    - name: temp
      mountPath: /tmp
    resources:
      requests:
        ephemeral-storage: "5Gi"
      limits:
        ephemeral-storage: "10Gi"
  volumes:
  - name: work-dir
    emptyDir:
      sizeLimit: "8Gi"  # Limit this specific volume
  - name: temp
    emptyDir:
      sizeLimit: "1Gi"
      medium: Memory  # Use RAM instead of disk for temp files
```

Using `medium: Memory` moves the emptyDir to tmpfs, avoiding disk usage but consuming memory instead.

## Monitoring Disk Usage

Deploy monitoring to detect disk pressure early:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: disk-alerts
data:
  disk-rules.yaml: |
    groups:
    - name: disk-pressure
      rules:
      - alert: NodeDiskPressure
        expr: kube_node_status_condition{condition="DiskPressure",status="true"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Node {{ $labels.node }} is under disk pressure"

      - alert: NodeDiskUsageHigh
        expr: (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}) /
              node_filesystem_size_bytes{mountpoint="/"} > 0.85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.instance }} disk usage above 85%"

      - alert: EphemeralStorageExceeded
        expr: kubelet_volume_stats_used_bytes / kubelet_volume_stats_capacity_bytes > 0.9
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.persistentvolumeclaim }} using >90% ephemeral storage"
```

Create a disk monitoring script:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import json

config.load_kube_config()
v1 = client.CoreV1Api()

def check_node_disk_usage():
    """Check disk usage across all nodes."""
    nodes = v1.list_node()

    for node in nodes.items:
        node_name = node.metadata.name

        # Get node stats via proxy
        try:
            stats_raw = v1.connect_get_node_proxy_with_path(
                node_name, f"stats/summary")
            stats = json.loads(stats_raw)

            fs = stats['node']['fs']
            used_bytes = fs['usedBytes']
            capacity_bytes = fs['capacityBytes']
            available_bytes = fs['availableBytes']

            usage_pct = (used_bytes / capacity_bytes) * 100

            print(f"Node: {node_name}")
            print(f"  Disk Usage: {usage_pct:.1f}%")
            print(f"  Available: {available_bytes / (1024**3):.2f} GB")

            if usage_pct > 85:
                print(f"  WARNING: High disk usage!")

            # Check for disk pressure condition
            for condition in node.status.conditions:
                if condition.type == "DiskPressure" and condition.status == "True":
                    print(f"  CRITICAL: Node under disk pressure!")

        except Exception as e:
            print(f"Error checking {node_name}: {e}")

if __name__ == "__main__":
    check_node_disk_usage()
```

## Cleaning Up Disk Space

Kubernetes automatically performs garbage collection, but you can tune it:

```yaml
# Kubelet configuration
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
imageGCHighThresholdPercent: 85
imageGCLowThresholdPercent: 80
evictionPressureTransitionPeriod: 30s
```

Manual cleanup when needed:

```bash
# Clean unused images on a node
kubectl debug node/<node-name> -it --image=ubuntu
# Inside debug container:
crictl rmi --prune

# Or via kubectl
kubectl get nodes -o name | xargs -I {} kubectl debug {} -it --image=ubuntu -- \
  sh -c "crictl rmi --prune"
```

Create a cleanup DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: disk-cleaner
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: disk-cleaner
  template:
    metadata:
      labels:
        app: disk-cleaner
    spec:
      hostPID: true
      hostNetwork: true
      containers:
      - name: cleaner
        image: ubuntu:22.04
        command: ["/bin/bash"]
        args:
        - -c
        - |
          # Run cleanup periodically
          while true; do
            echo "Running disk cleanup..."

            # Clean old log files
            find /var/log/pods -name "*.log" -mtime +7 -delete

            # Clean old container layers
            df -h /var/lib/containerd

            sleep 3600  # Run every hour
          done
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: containerd
          mountPath: /var/lib/containerd
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
          limits:
            cpu: "100m"
            memory: "128Mi"
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: containerd
        hostPath:
          path: /var/lib/containerd
```

## Preventing Disk Pressure

Use persistent volumes for application data instead of ephemeral storage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: data-heavy-app
spec:
  containers:
  - name: app
    image: database:1.0
    volumeMounts:
    - name: data
      mountPath: /var/lib/db
    resources:
      requests:
        ephemeral-storage: "500Mi"  # Only for logs and temp files
      limits:
        ephemeral-storage: "1Gi"
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: db-data-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: fast-ssd
```

Set namespace-level ephemeral storage quotas:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: ephemeral-storage-quota
  namespace: production
spec:
  hard:
    requests.ephemeral-storage: "100Gi"
    limits.ephemeral-storage: "200Gi"
```

Configure limit ranges:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: storage-limits
  namespace: production
spec:
  limits:
  - max:
      ephemeral-storage: "10Gi"
    min:
      ephemeral-storage: "100Mi"
    default:
      ephemeral-storage: "2Gi"
    defaultRequest:
      ephemeral-storage: "1Gi"
    type: Container
```

## Handling Evicted Pods

Pods evicted due to disk pressure need proper handling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resilient-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: resilient-app
  template:
    metadata:
      labels:
        app: resilient-app
    spec:
      containers:
      - name: app
        image: myapp:1.0
        resources:
          requests:
            ephemeral-storage: "2Gi"
            memory: "512Mi"
          limits:
            ephemeral-storage: "4Gi"
            memory: "1Gi"
        # Clean up temp files on startup
        lifecycle:
          postStart:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                rm -rf /tmp/*
                rm -rf /app/cache/*
```

Automatic cleanup of evicted pods:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-evicted
  namespace: kube-system
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: pod-cleaner
          containers:
          - name: cleanup
            image: bitnami/kubectl:1.28
            command:
            - /bin/bash
            - -c
            - |
              kubectl get pods --all-namespaces --field-selector status.phase=Failed -o json | \
                jq -r '.items[] | select(.status.reason == "Evicted") |
                select(.status.message | contains("disk")) |
                "-n \(.metadata.namespace) \(.metadata.name)"' | \
                xargs -r -n 3 kubectl delete pod
          restartPolicy: OnFailure
```

## Best Practices

Always set ephemeral storage requests and limits for pods that write to disk. This prevents uncontrolled disk usage.

Use persistent volumes for data that needs to survive pod restarts. Ephemeral storage is for temporary files only.

Configure log rotation and retention policies. Prevent logs from consuming excessive disk space.

Monitor disk usage proactively. Set alerts at 80% usage to take action before evictions occur.

Size nodes appropriately. Don't run too many pods on nodes with limited disk space.

Clean up unused container images regularly. Old images can consume significant disk space.

Test disk pressure scenarios in staging. Verify your applications handle evictions and recover correctly.

Document storage requirements for each application. This helps with capacity planning and node sizing.

Use emptyDir with `medium: Memory` for true temporary data like caches, but account for memory usage.

Understanding disk pressure and configuring proper storage limits ensures your Kubernetes clusters remain stable and your applications avoid unexpected evictions due to disk constraints.
