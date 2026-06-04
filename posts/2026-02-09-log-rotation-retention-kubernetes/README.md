# How to Set Up Automatic Log Rotation and Retention Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Logging, Operation

Description: Learn how to configure automatic log rotation and retention policies for Kubernetes container logs to prevent disk space exhaustion while maintaining log availability for troubleshooting.

---

Kubernetes container logs can fill node disks without proper rotation, eventually causing pod evictions. Implementing automatic log rotation and retention policies prevents disk space issues while ensuring logs remain available for debugging. This guide shows you how to configure log rotation at the kubelet level, tune container runtime log-line handling, and use log shippers like Fluent Bit.

## Understanding Kubernetes Log Management

Kubernetes writes container logs to:

```text
/var/log/pods/<namespace>_<pod>_<uid>/<container>/
/var/log/containers/<pod>_<namespace>_<container>-<container-id>.log
```

Without rotation, logs accumulate until disk space runs out. Log rotation limits log file size and the number of retained files, automatically removing old logs when the configured file count is exceeded.

## Configuring kubelet Log Rotation

Configure kubelet to rotate container logs:

```yaml
# /var/lib/kubelet/config.yaml

apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerLogMaxSize: 50Mi     # Maximum size before rotation
containerLogMaxFiles: 5       # Number of rotated files to keep
```

After updating the kubelet configuration file, restart kubelet on each node:

```bash
# Restart kubelet
sudo systemctl daemon-reload
sudo systemctl restart kubelet
```

Older kubelet service setups may still use `--container-log-max-size` and `--container-log-max-files`, but these flags are deprecated in favor of the kubelet configuration file.

For kubeadm clusters, use KubeletConfiguration:

```yaml
apiVersion: kubeadm.k8s.io/v1beta4
kind: ClusterConfiguration
---
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
containerLogMaxSize: "50Mi"
containerLogMaxFiles: 5
```

## Configuring containerd Log Line Limits

Kubernetes uses kubelet settings for container log rotation. For containerd, the related CRI setting controls the maximum size of a single log line before containerd splits it; it does not configure retention or rotation.

```toml
# /etc/containerd/config.toml for containerd 2.x
version = 3

[plugins.'io.containerd.cri.v1.runtime']
  max_container_log_line_size = 65536

  [plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.runc.options]
    SystemdCgroup = true
```

Restart containerd:

```bash
sudo systemctl restart containerd
```

## Using logrotate for System-Level Rotation

Configure logrotate for additional rotation control for Kubernetes system component logs that are written directly under `/var/log`. Use kubelet `containerLogMaxSize` and `containerLogMaxFiles` for container stdout and stderr logs under `/var/log/pods`.

```bash
# /etc/logrotate.d/kubernetes-logs
/var/log/kube-apiserver.log
/var/log/kube-controller-manager.log
/var/log/kube-scheduler.log
/var/log/kube-proxy.log {
    daily
    rotate 7
    maxsize 100M
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
```

Test logrotate:

```bash
# Dry run
sudo logrotate -d /etc/logrotate.d/kubernetes-logs

# Force rotation
sudo logrotate -f /etc/logrotate.d/kubernetes-logs
```

## Implementing Retention with DaemonSet

Create a DaemonSet that manages log retention:

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
      hostPID: true
      hostNetwork: true
      containers:
      - name: log-cleanup
        image: busybox:latest
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            echo "Starting log cleanup..."

            # Remove kubelet-rotated container log files older than 7 days
            find /var/log/pods -type f -name "*.log.*" -mtime +7 -exec rm -f {} \;

            # Clean up orphaned container logs
            for log_file in /var/log/containers/*.log; do
              # Check if symlink is broken
              if [ ! -e "$log_file" ]; then
                echo "Removing orphaned log: $log_file"
                rm -f "$log_file"
              fi
            done

            # Sleep for 1 hour
            sleep 3600
          done
        securityContext:
          privileged: true
        volumeMounts:
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
```

## Fluent Bit with Tail Input Limits

Configure Fluent Bit to limit memory usage from log tailing:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush                     5
        Daemon                    Off
        Log_Level                 info
        Parsers_File              parsers.conf

    [INPUT]
        Name                      tail
        Path                      /var/log/containers/*.log
        multiline.parser          docker, cri
        Tag                       kube.*
        Refresh_Interval          5
        Mem_Buf_Limit             50MB         # Limit memory for this input
        Skip_Long_Lines           On
        Ignore_Older              24h          # Ignore logs older than 24h
        DB                        /var/log/flb_kube.db
        DB.Sync                   Normal

    [FILTER]
        Name                      kubernetes
        Match                     kube.*
        Kube_URL                  https://kubernetes.default.svc:443
        Kube_CA_File              /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File           /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix           kube.var.log.containers.
        Merge_Log                 On
        Keep_Log                  Off

    [OUTPUT]
        Name                      loki
        Match                     kube.*
        Host                      loki.logging.svc.cluster.local
        Port                      3100
        Labels                    job=fluentbit
        Auto_Kubernetes_Labels    On
```

## Monitoring Disk Usage

Create alerts for disk space issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: node-disk-alerts
  namespace: monitoring
spec:
  groups:
  - name: disk_usage
    interval: 30s
    rules:
    # Alert when /var/log is filling up
    - alert: VarLogDiskSpaceRunningOut
      expr: |
        (
          node_filesystem_avail_bytes{mountpoint="/var/log"}
          /
          node_filesystem_size_bytes{mountpoint="/var/log"}
        ) * 100 < 15
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "/var/log disk space low on {{ $labels.instance }}"
        description: "Only {{ $value }}% disk space available on /var/log"

    # Alert on high disk usage growth rate
    - alert: VarLogFillingUpFast
      expr: |
        predict_linear(
          node_filesystem_avail_bytes{mountpoint="/var/log"}[1h],
          4 * 3600
        ) < 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "/var/log will fill up soon on {{ $labels.instance }}"
        description: "/var/log will run out of space in approximately 4 hours"

    # Alert on large container log usage
    - alert: LargeLogFilesDetected
      expr: |
        topk(5,
          sum by (pod, namespace, container) (
            kubelet_container_log_filesystem_used_bytes
          )
        ) > 1000000000  # 1GB
      for: 10m
      labels:
        severity: info
      annotations:
        summary: "Large log volume from {{ $labels.namespace }}/{{ $labels.pod }}"
        description: "Container logs use {{ $value | humanize1024 }}B on the node"
```

## Setting Pod-Level Log Limits

Configure resource limits that indirectly control logs:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      limits:
        ephemeral-storage: "2Gi"  # Includes logs
      requests:
        ephemeral-storage: "1Gi"
    env:
    # Configure app to limit log output
    - name: LOG_LEVEL
      value: "info"
    - name: LOG_MAX_SIZE
      value: "100M"
```

## Automated Cleanup Script

Create a cleanup script for manual or cron execution:

```bash
#!/bin/bash
# /usr/local/bin/k8s-log-cleanup.sh

LOG_DIR="/var/log"
MAX_AGE_DAYS=7
MAX_SIZE_MB=100

echo "Starting Kubernetes log cleanup..."

# Function to check disk usage
check_disk() {
    df -h "$LOG_DIR" | tail -1 | awk '{print $5}' | sed 's/%//'
}

# Function to cleanup old rotated logs
cleanup_old_rotated() {
    echo "Removing rotated container logs older than $MAX_AGE_DAYS days..."
    find "$LOG_DIR/pods" -type f -name "*.log.*" -mtime +$MAX_AGE_DAYS -delete
}

# Function to cleanup large logs
cleanup_large() {
    echo "Removing rotated logs larger than ${MAX_SIZE_MB}MB..."
    find "$LOG_DIR/pods" -type f -name "*.log.*" -size +${MAX_SIZE_MB}M -delete
}

# Function to cleanup orphaned logs
cleanup_orphaned() {
    echo "Removing orphaned container logs..."
    for log in "$LOG_DIR/containers"/*.log; do
        if [ ! -e "$log" ]; then
            rm -f "$log" 2>/dev/null
        fi
    done
}

# Main cleanup
DISK_USAGE=$(check_disk)
echo "Current disk usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt 80 ]; then
    echo "Disk usage high, performing aggressive cleanup..."
    cleanup_old_rotated
    cleanup_large
    cleanup_orphaned
elif [ "$DISK_USAGE" -gt 60 ]; then
    echo "Disk usage moderate, performing standard cleanup..."
    cleanup_old_rotated
    cleanup_orphaned
else
    echo "Disk usage acceptable, performing minimal cleanup..."
    cleanup_old_rotated
fi

DISK_USAGE_AFTER=$(check_disk)
echo "Cleanup complete. Disk usage: ${DISK_USAGE_AFTER}%"
```

Schedule with cron:

```bash
# Add to crontab
0 */6 * * * /usr/local/bin/k8s-log-cleanup.sh >> /var/log/cleanup.log 2>&1
```

## Best Practices Summary

1. **kubelet Configuration**: Set `containerLogMaxSize` to 50-100MB and `containerLogMaxFiles` to 5-10
2. **Log Shipping**: Use Fluent Bit or similar to ship logs off-node quickly
3. **Retention**: Keep local logs for 1-7 days, central logs for 30-90 days
4. **Monitoring**: Alert on disk space and log growth rates
5. **Application Logs**: Configure apps to use appropriate log levels in production
6. **Compression**: Enable log compression for system component logs managed by logrotate
7. **Cleanup**: Run automated cleanup for orphaned and old logs

## Conclusion

Proper log rotation and retention prevents disk space exhaustion while maintaining log availability for troubleshooting. Configure kubelet-level rotation, implement system-level logrotate, and use log shipping to move logs off nodes quickly. Combined with monitoring and alerts, these practices ensure your Kubernetes cluster maintains healthy log management at scale.
