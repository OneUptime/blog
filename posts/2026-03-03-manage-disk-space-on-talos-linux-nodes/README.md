# How to Manage Disk Space on Talos Linux Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Space, Storage Management, Kubernetes, Node Maintenance

Description: Practical strategies for managing disk space on Talos Linux nodes, including monitoring usage, cleaning up resources, and configuring garbage collection.

---

Disk space management on Talos Linux nodes is something that deserves attention, especially as your cluster runs longer and accumulates container images, logs, and pod data. Since Talos is an immutable OS without shell access, traditional disk cleanup approaches do not apply. Instead, you need to work through the Talos API and Kubernetes APIs to keep disk usage under control.

## Understanding Where Disk Space Goes

On a Talos Linux node, disk space consumption falls into a few main categories:

**Container Images** - Every time a pod is scheduled on a node, the container runtime pulls the required images. Over time, unused images accumulate as workloads change.

**Container Writable Layers** - Running containers can write data to their writable filesystem layer. This data persists until the container is removed.

**Pod Logs** - Container logs consume space on the EPHEMERAL partition. Applications that produce high volumes of logs can fill up disk space quickly.

**etcd Data** - On control plane nodes, etcd stores the entire Kubernetes cluster state. Large clusters with many resources can have significant etcd data.

**Persistent Volume Data** - If you are using local persistent volumes, the data stored in them lives on the node's disk.

**Kubernetes Temporary Data** - EmptyDir volumes, ConfigMap and Secret mounts, and other temporary data take up space during pod lifecycle.

```bash
# Check disk usage on a node
talosctl get mounts --nodes 192.168.1.10

# Example output shows partition usage:
# /dev/sda6 (EPHEMERAL) - 45GB used of 200GB (22%)
```

## Monitoring Disk Usage

The first step in managing disk space is knowing how much is being used. Here are several approaches:

### Using talosctl

```bash
# Check mount points and their usage
talosctl get mounts --nodes 192.168.1.10

# Check system statistics
talosctl get systemstat --nodes 192.168.1.10

# List container images on the node
talosctl get images --nodes 192.168.1.10
```

### Using Kubernetes

```bash
# Check node conditions for disk pressure
kubectl describe node worker-01 | grep -A 5 Conditions

# If DiskPressure is True, the node is running low on space
# NAME        STATUS   ROLES    AGE   VERSION
# worker-01   Ready    <none>   30d   v1.29.0
#   DiskPressure   False   ...

# Check resource allocation
kubectl describe node worker-01 | grep -A 15 "Allocated resources"
```

### Using Prometheus Metrics

If you have Prometheus running in your cluster, you can monitor disk usage with queries:

```promql
# Node filesystem usage percentage
(1 - node_filesystem_avail_bytes{mountpoint="/var"} / node_filesystem_size_bytes{mountpoint="/var"}) * 100

# Rate of disk space consumption
rate(node_filesystem_avail_bytes{mountpoint="/var"}[1h])
```

Set up alerting rules to catch disk pressure before it becomes critical:

```yaml
# Prometheus alerting rule for disk space
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: disk-alerts
spec:
  groups:
    - name: disk
      rules:
        - alert: NodeDiskRunningFull
          expr: |
            predict_linear(node_filesystem_avail_bytes{mountpoint="/var"}[6h], 24*3600) < 0
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.instance }} disk predicted to fill within 24h"
```

## Configuring Image Garbage Collection

The kubelet automatically garbage collects unused container images based on configurable thresholds. In Talos, you set these in the machine configuration:

```yaml
machine:
  kubelet:
    extraConfig:
      # Start garbage collecting images when disk is 85% full
      imageGCHighThresholdPercent: 85
      # Stop garbage collecting when disk drops to 80%
      imageGCLowThresholdPercent: 80
      # Minimum age of an unused image before it can be garbage collected
      imageMinimumGCAge: "2m"
```

These thresholds determine when the kubelet starts removing unused images. When disk usage hits the high threshold, the kubelet begins deleting the oldest unused images until usage drops to the low threshold.

```bash
# Apply updated kubelet configuration
talosctl apply-config --nodes 192.168.1.10 --file updated-config.yaml

# Some kubelet config changes take effect without reboot
talosctl apply-config --nodes 192.168.1.10 --file updated-config.yaml --mode auto
```

## Configuring Container Log Rotation

Container logs can grow without bound if not managed. Configure log rotation in the kubelet settings:

```yaml
machine:
  kubelet:
    extraConfig:
      # Maximum size of a single log file
      containerLogMaxSize: "50Mi"
      # Maximum number of log files to retain per container
      containerLogMaxFiles: 5
```

With these settings, each container's log file is rotated when it reaches 50MB, and a maximum of 5 rotated files are kept. This caps log storage at roughly 250MB per container.

## Cleaning Up Unused Resources

### Removing Completed Pods

Completed and failed pods leave behind data. Clean them up regularly:

```bash
# Delete completed pods
kubectl delete pods --field-selector=status.phase==Succeeded --all-namespaces

# Delete failed pods
kubectl delete pods --field-selector=status.phase==Failed --all-namespaces
```

For automated cleanup, configure the TTL controller:

```yaml
# Pod with automatic cleanup after completion
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
spec:
  ttlSecondsAfterFinished: 3600  # Delete 1 hour after completion
  template:
    spec:
      containers:
        - name: processor
          image: my-processor:latest
      restartPolicy: Never
```

### Removing Unused Persistent Volume Claims

Orphaned PVCs that are no longer bound to any pod still consume disk space:

```bash
# Find PVCs that are not mounted by any pod
kubectl get pvc --all-namespaces -o json | \
  jq -r '.items[] | select(.status.phase == "Bound") |
    "\(.metadata.namespace)/\(.metadata.name)"'

# Cross-reference with running pods to find orphans
```

### Pruning Container Images Manually

While the kubelet handles automatic image garbage collection, you can also trigger image cleanup through Kubernetes by restarting the kubelet with more aggressive settings.

## Managing etcd Disk Usage

On control plane nodes, etcd can consume significant disk space, especially in clusters with many resources or frequent updates.

```bash
# Check etcd database size
talosctl etcd status --nodes 192.168.1.10

# Trigger etcd compaction to reclaim space
# This happens automatically, but you can monitor it
talosctl etcd alarm list --nodes 192.168.1.10
```

etcd automatically compacts old revisions, but if the database grows too large, you may need to:

1. Reduce the number of Kubernetes resources (delete unused ConfigMaps, Secrets, etc.)
2. Check for controllers that create excessive events or status updates
3. Consider using a dedicated fast disk for etcd data

## Handling Disk Pressure

When a node hits disk pressure, Kubernetes starts evicting pods to free space. You can configure the eviction thresholds:

```yaml
machine:
  kubelet:
    extraConfig:
      evictionHard:
        nodefs.available: "10%"
        nodefs.inodesFree: "5%"
        imagefs.available: "15%"
      evictionSoft:
        nodefs.available: "15%"
        nodefs.inodesFree: "10%"
        imagefs.available: "20%"
      evictionSoftGracePeriod:
        nodefs.available: "1m"
        imagefs.available: "1m"
```

Soft eviction gives pods a grace period to shut down cleanly, while hard eviction immediately terminates pods. Setting appropriate thresholds prevents your node from running out of disk space entirely.

## Expanding Disk Space

If cleanup is not enough and you need more space, your options depend on the environment:

**Virtual machines** - Expand the virtual disk and perform a Talos upgrade to trigger repartitioning:

```bash
# After expanding the VM disk
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 --preserve
```

**Cloud instances** - Resize the attached volume through your cloud provider's API, then trigger a Talos upgrade.

**Bare metal** - Add additional disks and configure them in the machine configuration, or replace the existing disk with a larger one and reinstall.

## Best Practices Summary

1. Monitor disk usage proactively with Prometheus alerts set to trigger well before the disk fills up
2. Configure image garbage collection thresholds to clean up unused images automatically
3. Set log rotation limits to prevent runaway logging from consuming all disk space
4. Clean up completed jobs and pods regularly
5. Right-size your disks during initial provisioning based on expected workload
6. Use separate disks for workload data when possible to isolate storage concerns
7. Keep etcd lean by cleaning up unused Kubernetes resources

## Conclusion

Managing disk space on Talos Linux nodes requires a combination of monitoring, configuration, and periodic cleanup. Since you cannot log into the node and run traditional cleanup commands, everything must be done through the Talos API or Kubernetes APIs. By setting up proper garbage collection thresholds, log rotation, and monitoring alerts, you can keep disk usage healthy and avoid the disruption that comes with disk pressure evictions.
