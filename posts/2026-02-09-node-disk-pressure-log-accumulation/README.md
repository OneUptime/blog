# How to Diagnose Kubernetes Node Disk Pressure from Container Log Accumulation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Node Management, Logging

Description: Learn how to diagnose and fix Kubernetes node disk pressure caused by container log accumulation, including log rotation configuration and automated cleanup strategies.

---

Node disk pressure from container log accumulation is a common but preventable problem in Kubernetes clusters. When containers generate logs faster than they're cleaned up, disk space fills until the kubelet triggers eviction. Pods get terminated to free space, but without addressing the root cause, the problem recurs.

This guide covers diagnosing log accumulation issues, configuring proper log rotation, implementing automated cleanup, and preventing disk pressure from logs in production environments.

## Understanding Container Log Management

Kubernetes stores container stdout and stderr logs on the node filesystem, typically under `/var/log/pods/`. The container runtime (containerd, CRI-O) manages these log files and rotates them based on configuration. When rotation is misconfigured or disabled, verbose applications quickly fill disk space.

The kubelet monitors filesystem usage and triggers disk pressure conditions when usage exceeds thresholds. Default thresholds mark nodes as experiencing DiskPressure at 85% usage, and the kubelet begins evicting pods to reclaim space. This protects the node but disrupts running applications.

## Identifying Disk Pressure from Logs

Check node conditions for DiskPressure status.

```bash
# Check all nodes for disk pressure
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
DISK_PRESSURE:.status.conditions[?(@.type==\"DiskPressure\")].status

# Output:
# NAME       DISK_PRESSURE
# worker-1   True
# worker-2   False

# Get detailed node information
kubectl describe node worker-1 | grep -A 10 Conditions

# Look for:
# DiskPressure   True   KubeletHasDiskPressure
```

SSH to the affected node and check disk usage.

```bash
ssh worker-1

# Check overall disk usage
df -h

# Output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1        50G   47G   3G  94% /

# Check which directories consume space
sudo du -h --max-depth=1 /var | sort -rh | head -10

# Output often shows:
# 30G  /var/log
# 15G  /var/lib/containerd
# 2G   /var/lib/kubelet
```

Identify log directories consuming the most space.

```bash
# Check pod log directory sizes
sudo du -sh /var/log/pods/* | sort -rh | head -20

# Output shows problematic pods:
# 8.5G  /var/log/pods/default_verbose-app-6f8d9c7b5-x4k2h_...
# 3.2G  /var/log/pods/monitoring_fluent-bit-xyz_...
# 1.8G  /var/log/pods/production_api-server-abc_...

# Check individual container logs
sudo ls -lh /var/log/pods/default_verbose-app-6f8d9c7b5-x4k2h_*/app/

# Shows multiple rotated log files
# -rw-r----- 1 root root 100M Feb  9 10:00 0.log
# -rw-r----- 1 root root 100M Feb  9 09:00 1.log
# -rw-r----- 1 root root 100M Feb  9 08:00 2.log
```

## Configuring Container Runtime Log Rotation

Configure containerd to rotate logs more aggressively. Edit `/etc/containerd/config.toml` on each node.

```toml
version = 2

[plugins."io.containerd.grpc.v1.cri".containerd]
  [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc]
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
      SystemdCgroup = true

# Container log configuration
[plugins."io.containerd.grpc.v1.cri"]
  [plugins."io.containerd.grpc.v1.cri".containerd]
    [plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options]
      # Maximum size of container log file before rotation
      max_container_log_line_size = 16384  # 16KB per line

  # Enable log rotation
  enable_unprivileged_ports = false
  enable_unprivileged_icmp = false

[plugins."io.containerd.grpc.v1.cri".cni]
  bin_dir = "/opt/cni/bin"
  conf_dir = "/etc/cni/net.d"

[plugins."io.containerd.grpc.v1.cri".registry]
  config_path = "/etc/containerd/certs.d"
```

Configure kubelet log rotation parameters. Edit `/var/lib/kubelet/config.yaml`.

```yaml
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
# Maximum size of a log file before rotation
containerLogMaxSize: 50Mi
# Number of rotated log files to retain
containerLogMaxFiles: 5
# Total max size for all container logs on node
containerLogMaxWorkers: 1
containerLogMonitorInterval: 30s
```

Restart containerd and kubelet to apply changes.

```bash
sudo systemctl restart containerd
sudo systemctl restart kubelet

# Verify configuration is applied
sudo systemctl status containerd
sudo systemctl status kubelet
```

## Implementing Manual Log Cleanup

For immediate disk space recovery, manually clean old container logs.

```bash
ssh worker-1

# Find and remove old log files (be careful with this)
# This removes logs older than 7 days
sudo find /var/log/pods -type f -name "*.log" -mtime +7 -delete

# Remove logs from terminated pods
# These directories persist even after pod deletion
sudo find /var/log/pods -type d -name "*_terminated_*" -mtime +1 -exec rm -rf {} +

# Check disk space after cleanup
df -h /
```

For specific problematic pods, truncate current logs.

```bash
# Identify large current log files
sudo find /var/log/pods -name "0.log" -size +1G

# Truncate without stopping container
sudo truncate -s 0 /var/log/pods/default_verbose-app-xyz_*/app/0.log

# Verify truncation
sudo ls -lh /var/log/pods/default_verbose-app-xyz_*/app/0.log
```

## Deploying Automated Log Cleanup DaemonSet

Create a DaemonSet that automatically cleans old logs on all nodes.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-cleanup
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: log-cleanup
  template:
    metadata:
      labels:
        app: log-cleanup
    spec:
      containers:
      - name: cleanup
        image: alpine:latest
        command:
        - /bin/sh
        - -c
        - |
          #!/bin/sh
          while true; do
            echo "Starting log cleanup cycle..."

            # Remove logs older than 7 days
            find /var/log/pods -type f -name "*.log" -mtime +7 -delete

            # Remove terminated pod logs older than 1 day
            find /var/log/pods -type d -path "*_terminated_*" -mtime +1 -exec rm -rf {} +

            # Truncate very large current logs (>500MB)
            find /var/log/pods -name "0.log" -size +500M -exec truncate -s 100M {} \;

            # Clean old rotated logs (keep only latest 3)
            for pod_dir in /var/log/pods/*/*/; do
              ls -t "${pod_dir}"*.log 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
            done

            echo "Cleanup cycle complete. Sleeping 1 hour..."
            sleep 3600
          done
        resources:
          requests:
            cpu: 10m
            memory: 32Mi
          limits:
            cpu: 100m
            memory: 128Mi
        securityContext:
          privileged: true
        volumeMounts:
        - name: logs
          mountPath: /var/log/pods
      volumes:
      - name: logs
        hostPath:
          path: /var/log/pods
      tolerations:
      - effect: NoSchedule
        operator: Exists
      - effect: NoExecute
        operator: Exists
```

Apply the DaemonSet.

```bash
kubectl apply -f log-cleanup-daemonset.yaml

# Verify it's running on all nodes
kubectl get pods -n kube-system -l app=log-cleanup -o wide
```

## Reducing Application Log Verbosity

Address the source by reducing application log output. Update deployments to use less verbose logging.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: verbose-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1.0
        env:
        - name: LOG_LEVEL
          value: "INFO"  # Change from DEBUG to INFO
        - name: LOG_FORMAT
          value: "json"  # Structured logging is more efficient
        - name: DISABLE_REQUEST_LOGGING
          value: "true"  # Disable verbose request logs
```

Implement log sampling for high-volume endpoints.

```javascript
// Node.js example with Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

// Sample high-volume logs (log 1% of requests)
function shouldLogRequest() {
  return Math.random() < 0.01;
}

app.use((req, res, next) => {
  if (shouldLogRequest()) {
    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      status: res.statusCode
    });
  }
  next();
});
```

## Shipping Logs to External Storage

Instead of relying on local storage, ship logs to centralized logging systems.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: kube-system
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Daemon        off
        Log_Level     info

    [INPUT]
        Name              tail
        Path              /var/log/pods/*/*/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     50MB
        Skip_Long_Lines   On

    [OUTPUT]
        Name              es
        Match             *
        Host              elasticsearch.logging.svc
        Port              9200
        Logstash_Format   On
        Retry_Limit       False

    [OUTPUT]
        Name              s3
        Match             *
        bucket            my-log-bucket
        region            us-east-1
        store_dir         /tmp/fluent-bit
        total_file_size   100M
        upload_timeout    10m
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.0
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: config
          mountPath: /fluent-bit/etc/
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: config
        configMap:
          name: fluent-bit-config
```

## Monitoring Disk Usage

Set up alerts for high disk usage before it reaches critical levels.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
  namespace: monitoring
data:
  alerts.yaml: |
    groups:
    - name: disk
      rules:
      - alert: NodeDiskUsageHigh
        expr: |
          (1 - node_filesystem_avail_bytes{mountpoint="/"}
          / node_filesystem_size_bytes{mountpoint="/"}) > 0.80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Node {{ $labels.instance }} disk usage above 80%"

      - alert: NodeDiskPressure
        expr: |
          kube_node_status_condition{condition="DiskPressure",status="true"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Node {{ $labels.node }} in disk pressure"

      - alert: LargeLogFiles
        expr: |
          node_filesystem_files{mountpoint="/var/log"} > 100000
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Excessive log files on {{ $labels.instance }}"
```

Create dashboards tracking log directory sizes and growth rates.

```bash
# Export disk metrics from nodes
kubectl run disk-monitor --image=prom/node-exporter \
  --restart=Never \
  --hostnetwork=true \
  --hostpid=true
```

Container log accumulation causes preventable disk pressure that disrupts cluster operations. By configuring proper log rotation, implementing automated cleanup, shipping logs to external storage, and reducing application verbosity, you prevent disk space exhaustion. Combined with proactive monitoring and alerting, these practices ensure nodes maintain adequate free space for normal operations without emergency interventions.
