# How to Configure Log Rotation in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Log Rotation, Kubernetes, Disk Management, Logging

Description: Learn how to configure and manage log rotation on Talos Linux to prevent disk space exhaustion and maintain cluster stability.

---

Log rotation is one of those things that you do not think about until it causes a problem. On a busy Kubernetes cluster, container logs can grow rapidly and consume all available disk space on a node. When that happens, the node becomes unhealthy, pods get evicted, and you end up in a firefighting situation. Talos Linux handles log rotation differently than traditional Linux distributions because of its immutable design, but you still have several controls available to manage log growth.

This guide covers log rotation at every level of a Talos Linux cluster: container logs managed by the kubelet, Talos system service logs, and best practices for keeping disk usage under control.

## How Container Log Rotation Works in Kubernetes

Kubernetes delegates container log management to the container runtime and the kubelet. When a container writes to stdout or stderr, the container runtime (containerd in Talos Linux) captures that output and writes it to log files on the node at `/var/log/pods/`.

The kubelet is responsible for rotating these log files based on two settings: the maximum size of a single log file and the maximum number of rotated log files to keep.

By default, the kubelet uses these values:

```text
containerLogMaxSize: 10Mi
containerLogMaxFiles: 5
```

This means each container can produce up to 50 MB of log data (5 files at 10 MB each) before the oldest logs are deleted.

## Configuring kubelet Log Rotation in Talos Linux

You can adjust the kubelet log rotation settings through the Talos machine configuration. This is done by adding extra arguments to the kubelet configuration.

```yaml
# kubelet-log-rotation.yaml
# Adjust container log rotation settings
machine:
  kubelet:
    extraArgs:
      container-log-max-size: "50Mi"
      container-log-max-files: "3"
```

This configuration sets each container log file to a maximum of 50 MB and keeps a maximum of 3 rotated files. That gives you 150 MB of log history per container.

Apply the configuration:

```bash
# Apply to all nodes in the cluster
talosctl apply-config --nodes 192.168.1.10,192.168.1.20,192.168.1.21 \
  --patch @kubelet-log-rotation.yaml
```

Choose your values based on your logging volume and disk capacity. Nodes with large disks can afford to keep more log history, while nodes with small disks should use more aggressive rotation.

## Calculating Disk Usage from Logs

To plan your log rotation settings, estimate how much disk space logs will consume per node. Here is a rough calculation:

```text
# Disk usage calculation
# pods_per_node * containers_per_pod * max_log_size * max_log_files = total_log_disk

# Example: 50 pods, 2 containers each, 10Mi per file, 5 files
# 50 * 2 * 10Mi * 5 = 5000 Mi = approximately 5 GB

# With adjusted settings: 50 pods, 2 containers, 50Mi per file, 3 files
# 50 * 2 * 50Mi * 3 = 15000 Mi = approximately 15 GB
```

Make sure your node disks have enough headroom for logs, the container images, ephemeral storage, and the operating system itself.

## Talos System Service Log Rotation

Talos system services (machined, apid, trustd, etcd, kubelet itself) maintain their logs in memory buffers rather than writing them to disk files. This design choice means that system service logs do not consume disk space and do not need traditional file-based rotation.

The trade-off is that these logs have a limited history. Once the in-memory buffer fills up, the oldest entries are discarded. For most operational purposes, this is sufficient since you can always forward logs to an external system for long-term retention.

```bash
# View the available log history for a service
talosctl -n 192.168.1.10 logs machined | wc -l

# If you need longer retention, forward to an external system
# This is configured in the machine config
```

## Configuring containerd Log Settings

Containerd, the container runtime used by Talos Linux, also has settings that affect log behavior. While the kubelet handles log rotation for container stdout/stderr, containerd itself produces its own operational logs.

On Talos Linux, containerd configuration is managed through the machine config:

```yaml
# containerd-config.yaml
# Adjust containerd settings including log behavior
machine:
  files:
    - content: |
        [plugins."io.containerd.grpc.v1.cri"]
          max_container_log_line_size = 16384
      path: /var/cri/conf.d/20-customization.toml
      op: create
```

The `max_container_log_line_size` setting controls how long a single log line can be before it gets split. The default is 16384 bytes (16 KB). If your applications produce very long log lines (like detailed JSON objects), you might need to increase this.

## Managing etcd Log Growth

The etcd service on control plane nodes can produce a significant volume of logs, especially during high write loads or when the cluster is recovering from network partitions. Since etcd logs are kept in memory by Talos, they do not directly consume disk space.

However, etcd data itself does grow on disk. The etcd data directory needs periodic compaction, which Kubernetes handles automatically through the API server's `--etcd-compaction-interval` flag.

```yaml
# etcd-compaction.yaml
# Configure etcd compaction through the API server
cluster:
  apiServer:
    extraArgs:
      etcd-compaction-interval: "5m0s"
```

## Monitoring Log Disk Usage

Even with rotation configured, you should monitor disk usage on your nodes to catch problems early. Deploy a monitoring solution that tracks filesystem usage:

```yaml
# node-exporter-disk-alert.yaml
# Prometheus alert rule for high disk usage
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: disk-usage-alerts
  namespace: monitoring
spec:
  groups:
    - name: disk-alerts
      rules:
        - alert: NodeDiskFillingUp
          expr: |
            (node_filesystem_avail_bytes{mountpoint="/"} /
            node_filesystem_size_bytes{mountpoint="/"}) < 0.15
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.instance }} is running low on disk space"
            description: "Less than 15% disk space remaining"
```

You can also check disk usage through talosctl:

```bash
# Check disk usage on a Talos node
talosctl -n 192.168.1.10 usage /var/log

# Get a broader view of disk usage
talosctl -n 192.168.1.10 usage /var
```

## Application-Level Log Rotation

Some applications handle their own log rotation by writing to files inside the container. On Talos Linux (and Kubernetes in general), this is not recommended. Instead, applications should write all logs to stdout and stderr, letting the kubelet handle rotation.

If you have a legacy application that writes to files, use a sidecar container to tail those files and forward them to stdout:

```yaml
# sidecar-log-forwarder.yaml
# Use a sidecar to capture file-based logs
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: legacy-app:1.0
          volumeMounts:
            - name: log-volume
              mountPath: /var/log/app
        - name: log-forwarder
          image: busybox:1.36
          # Tail the application log file and send to stdout
          command: ['sh', '-c', 'tail -F /var/log/app/application.log']
          volumeMounts:
            - name: log-volume
              mountPath: /var/log/app
              readOnly: true
      volumes:
        - name: log-volume
          emptyDir: {}
```

## Garbage Collection for Old Container Data

Beyond log rotation, Talos and kubelet also manage garbage collection for old container images and terminated containers. These settings indirectly affect how much disk space is available for logs:

```yaml
# garbage-collection.yaml
# Configure image and container garbage collection
machine:
  kubelet:
    extraArgs:
      image-gc-high-threshold: "85"
      image-gc-low-threshold: "80"
      eviction-hard: "nodefs.available<10%,imagefs.available<15%"
```

The eviction thresholds define when the kubelet starts evicting pods due to disk pressure. Setting appropriate thresholds prevents the situation where log growth triggers pod evictions.

## Best Practices for Log Rotation on Talos Linux

Keep these recommendations in mind when configuring log rotation for your Talos cluster. First, set container log rotation limits that balance diagnostic utility against disk capacity. The defaults of 10 MB and 5 files are conservative and work for many workloads, but high-throughput services may need larger limits. Second, always forward important logs to an external system so that log rotation does not destroy information you need for post-incident analysis. Third, monitor disk usage actively and set up alerts at 80% and 90% thresholds. Fourth, ensure your applications log to stdout rather than writing to files inside the container. Fifth, review your logging verbosity levels, as reducing unnecessary debug logging at the application level is often more effective than increasing rotation limits.

Log rotation on Talos Linux is straightforward once you understand that it operates at two levels: kubelet-managed container log rotation on disk and Talos-managed service log buffers in memory. Configure both appropriately, and disk space problems from excessive logging become a non-issue.
