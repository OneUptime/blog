# How to Troubleshoot Disk Space Issues on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Space, Storage, Kubernetes, Troubleshooting

Description: Learn how to identify, diagnose, and resolve disk space issues on Talos Linux nodes before they cause cluster instability and workload failures.

---

Disk space issues on Talos Linux nodes can lead to a cascade of problems. etcd will stop accepting writes, the container runtime will fail to pull images, pods will be evicted, and eventually the node may become completely unresponsive. Since Talos is an immutable operating system, you cannot simply SSH in and clean up files the traditional way. This guide covers how to find what is eating your disk space and how to reclaim it.

## Understanding Talos Disk Layout

Talos uses a specific partition layout that differs from traditional Linux distributions:

- **EFI/BOOT** - Contains the bootloader
- **META** - Stores Talos metadata
- **STATE** - Stores the machine configuration and system state (encrypted only if disk encryption is enabled)
- **EPHEMERAL** - Mounted at `/var`, holds all runtime data including container images, logs, etcd data, and kubelet state

The ephemeral partition is where nearly all disk space issues occur. It contains everything that the node writes during operation.

## Checking Disk Usage

Start by checking overall disk usage:

```bash
# Get a high-level disk usage summary

talosctl -n <node-ip> usage /var

# Check the ephemeral partition specifically
talosctl -n <node-ip> mounts | grep -i ephemeral
```

You can drill into specific directories to find what is consuming the most space:

```bash
# Check container image storage
talosctl -n <node-ip> usage /var/lib/containerd

# Check kubelet data
talosctl -n <node-ip> usage /var/lib/kubelet

# Check log files
talosctl -n <node-ip> usage /var/log

# Check etcd data (control plane nodes only)
talosctl -n <node-ip> usage /var/lib/etcd
```

## Common Cause: Unused Container Images

Over time, container images accumulate as you deploy different versions of your workloads. Old images that are no longer used by any pod still take up disk space.

Kubernetes has a built-in garbage collection mechanism for images, but it may not be aggressive enough for your needs. You can tune the kubelet image garbage collection in the Talos machine config:

```yaml
machine:
  kubelet:
    extraArgs:
      image-gc-high-threshold: "80"  # Start GC when 80% full
      image-gc-low-threshold: "70"   # GC until 70% usage
```

Apply the updated configuration:

```bash
# Apply the configuration change
talosctl apply-config -n <node-ip> --file worker.yaml
```

You can also inspect the images reported on a node from Kubernetes:

```bash
# List images reported in node status (from kubectl)
kubectl get nodes <node-name> -o jsonpath='{.status.images[*].names}' | tr ' ' '\n'
```

## Common Cause: Container Logs

Containers that produce a lot of output will fill up the disk with log files. By default, the kubelet directs the container runtime to write pod logs under `/var/log/pods/`. Check log sizes:

```bash
# Check the total size of pod logs
talosctl -n <node-ip> usage /var/log/pods
```

To prevent log files from consuming all available space, configure log rotation in your machine config:

```yaml
machine:
  kubelet:
    extraArgs:
      container-log-max-size: "50Mi"    # Max size per log file
      container-log-max-files: "3"       # Keep 3 rotated files
```

For workloads that produce excessive logs, consider sending logs to an external system and reducing local retention.

## Common Cause: etcd Data Growth

On control plane nodes, etcd data can grow significantly, especially if you have many Kubernetes resources (ConfigMaps, Secrets, CustomResources). Check etcd size:

```bash
# Check etcd data directory size
talosctl -n <cp-ip> usage /var/lib/etcd

# Check etcd database size through Talos
talosctl -n <cp-ip> etcd status
```

If etcd is consuming too much space, check whether the database is fragmented. Kubernetes API server performs automatic etcd compaction, but defragmentation is what releases unused space back to the filesystem:

```bash
# Defragment to reclaim space, one control plane node at a time
talosctl -n <cp-ip> etcd defrag
```

If you need to compact manually, use etcdctl from a machine with the proper certificates and compact to a known safe revision:

```bash
# Check the current revision
ETCDCTL_API=3 etcdctl \
  --endpoints=https://<cp-ip>:2379 \
  --cacert=etcd-ca.crt \
  --cert=etcd.crt \
  --key=etcd.key \
  endpoint status --write-out=table

# Compact old revisions
ETCDCTL_API=3 etcdctl \
  --endpoints=https://<cp-ip>:2379 \
  --cacert=etcd-ca.crt \
  --cert=etcd.crt \
  --key=etcd.key \
  compact <revision-number>
```

## Common Cause: Persistent Volume Data

If you are using local persistent volumes (like with OpenEBS LocalPV or hostPath volumes), data written by pods is stored on the node disk. Some pod volume data is visible under the kubelet pod directory:

```bash
# Check persistent volume data
talosctl -n <node-ip> usage /var/lib/kubelet/pods
```

Large databases, caches, or logs stored in persistent volumes can quickly fill a disk. Consider using network-attached storage for large persistent volumes instead of local storage.

## Common Cause: Orphaned Pod Data

When pods are deleted, their data directories should be cleaned up. Sometimes this cleanup fails, leaving orphaned directories:

```bash
# List pod data directories
talosctl -n <node-ip> ls /var/lib/kubelet/pods

# Compare with running pods
kubectl get pods --field-selector spec.nodeName=<node-name> -A
```

If there are directories for pods that no longer exist, they may be using significant space. A node reboot or kubelet restart can sometimes clean these up.

## Monitoring Disk Usage

Prevention is better than cure. Set up monitoring to alert you before disk space becomes critical:

```bash
# Check node disk pressure condition
kubectl describe node <node-name> | grep DiskPressure
```

When Kubernetes detects disk pressure, it will start evicting pods from the node. This is actually a safety mechanism, but by the time it kicks in, you may already be experiencing problems.

Configure disk pressure thresholds in the kubelet:

```yaml
machine:
  kubelet:
    extraArgs:
      eviction-hard: "nodefs.available<10%,imagefs.available<10%"
      eviction-soft: "nodefs.available<15%,imagefs.available<15%"
      eviction-soft-grace-period: "nodefs.available=2m,imagefs.available=2m"
```

## Emergency Disk Space Recovery

If a node is critically low on disk space and you need to free up space immediately:

```bash
# 1. Check what is using the most space
talosctl -n <node-ip> usage /var --depth 2

# 2. If container images are the problem, you can cordon the node
#    and let Kubernetes reschedule pods, then clean up
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# 3. After draining, unused images should be eligible for GC
# 4. Once space is recovered, uncordon
kubectl uncordon <node-name>
```

In extreme cases, you may need to reset the node entirely:

```bash
# Nuclear option - wipe and rejoin
talosctl -n <node-ip> reset --graceful=false
talosctl apply-config --insecure -n <node-ip> --file worker.yaml
```

## Sizing Recommendations

To avoid disk space issues, plan your node storage carefully:

- Worker nodes: 50GB minimum for the ephemeral partition, 100GB or more recommended
- Control plane nodes: 50GB minimum, with fast SSD storage for etcd
- If running stateful workloads with local storage, add dedicated disks and do not use the ephemeral partition

Disk space issues on Talos Linux are easier to prevent than to fix. Set up proper garbage collection, log rotation, and monitoring from the start, and you will avoid most problems before they happen.
