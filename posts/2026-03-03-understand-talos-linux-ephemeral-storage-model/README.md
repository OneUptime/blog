# How to Understand Talos Linux Ephemeral Storage Model

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ephemeral Storage, Kubernetes, Storage Architecture, DevOps

Description: Learn how Talos Linux handles ephemeral storage, why node data is designed to be disposable, and how this affects your workloads.

---

Talos Linux treats its nodes as disposable. This is a deliberate design choice that has significant implications for how you think about storage on your Kubernetes cluster. The operating system makes a clear distinction between persistent data (which should survive node restarts and replacements) and ephemeral data (which is expected to disappear).

Understanding the ephemeral storage model is essential for running workloads on Talos Linux without unexpected data loss.

## What Is Ephemeral Storage in Talos?

On a Talos node, the disk is divided into several partitions. The EPHEMERAL partition is the largest writable area and holds all runtime data for the node. This includes container images pulled by containerd, Kubernetes pod data, logs, and temporary files.

The critical thing to understand is that the EPHEMERAL partition is designed to be wiped and recreated. When you reset a Talos node or reinstall the OS, the ephemeral partition is formatted. All data on it is lost.

```bash
# View the disk partitions on a Talos node
talosctl -n 10.0.0.11 get blockdevices

# Check usage of the ephemeral partition
talosctl -n 10.0.0.11 usage /var

# The ephemeral partition is typically mounted at /var
talosctl -n 10.0.0.11 mounts | grep ephemeral
```

## The Partition Layout

A typical Talos disk layout looks like this:

| Partition | Size | Purpose | Survives Reset? |
|-----------|------|---------|-----------------|
| EFI/BIOS | ~100MB | Boot loader | Yes |
| BOOT | ~1GB | Kernel and initramfs | Yes |
| META | ~1MB | Node metadata | Yes |
| STATE | ~100MB | Machine config (encrypted) | Depends on reset type |
| EPHEMERAL | Remaining | Runtime data | No |

The EPHEMERAL partition gets the bulk of the disk space because it needs to store container images, writable container layers, and pod volumes.

```yaml
# You can customize the disk layout in the machine config
machine:
  install:
    disk: /dev/sda
    # The installer automatically creates the partition layout
    # EPHEMERAL gets all remaining space after other partitions
```

## What Lives on the Ephemeral Partition

The /var directory tree on a Talos node is backed by the EPHEMERAL partition. Here is what you will find there:

**/var/lib/containerd** stores all container images and their layers. When kubelet pulls an image to run a pod, the image data ends up here.

**/var/lib/kubelet** contains kubelet state, including pod manifests, volume mounts, and device plugins.

**/var/log/pods** holds container log files. These are the logs you see when you run `kubectl logs`.

**/var/lib/etcd** on control plane nodes stores the etcd data directory. This is the most critical data on any control plane node.

```bash
# Check what is using space on the ephemeral partition
talosctl -n 10.0.0.11 usage /var --depth 2

# View specific directory sizes
talosctl -n 10.0.0.11 usage /var/lib/containerd
talosctl -n 10.0.0.11 usage /var/lib/kubelet
```

## Why Ephemeral?

The ephemeral storage model reflects a core principle of Talos Linux: nodes should be replaceable. If a node fails, you should be able to bring up a new one with the same configuration and have it join the cluster without manual intervention.

This works because Kubernetes already expects nodes to be somewhat ephemeral. Pods can be rescheduled, images can be re-pulled, and cluster state lives in etcd (which should be backed up separately). The only thing a new node needs to rejoin the cluster is the correct machine configuration.

The ephemeral model also simplifies security. Since the partition can be wiped at any time, sensitive data that ends up on disk (like pulled images that might contain credentials baked in) does not persist beyond the life of the node.

## Disk Encryption for Ephemeral Data

Even though ephemeral data is temporary, it can still contain sensitive information while the node is running. Talos supports encrypting the EPHEMERAL partition using LUKS2.

```yaml
# Enable encryption for the ephemeral partition
machine:
  systemDiskEncryption:
    ephemeral:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

With encryption enabled, the ephemeral data is protected at rest. If someone physically removes the disk from the server, they cannot read the data without the encryption key. The key is derived from the node's identity (TPM-based or based on node-specific characteristics), so it is unique to each node.

```bash
# Apply the config with encryption
talosctl -n 10.0.0.11 apply-config --file encrypted-config.yaml

# Note: Enabling encryption on an existing node requires a reinstall
talosctl -n 10.0.0.11 upgrade --image ghcr.io/siderolabs/installer:v1.6.0
```

## Managing Ephemeral Storage Capacity

Since the EPHEMERAL partition holds container images and pod data, it can fill up over time. Here are strategies for managing capacity.

### Garbage Collection

Kubernetes automatically garbage collects unused container images and terminated containers. You can tune this through kubelet configuration.

```yaml
# Configure garbage collection in machine config
machine:
  kubelet:
    extraArgs:
      image-gc-high-threshold: "85"
      image-gc-low-threshold: "80"
      eviction-hard: "imagefs.available<15%,nodefs.available<10%"
```

### Monitoring Usage

Set up monitoring to alert when the ephemeral partition is running low on space.

```bash
# Check node conditions for disk pressure
kubectl describe node talos-worker-01 | grep -A5 "Conditions"

# Prometheus query for node filesystem usage
# node_filesystem_avail_bytes{mountpoint="/var"} / node_filesystem_size_bytes{mountpoint="/var"}
```

### Separate Disks for Data

If you have workloads that need significant local storage, consider using separate disks rather than relying on the ephemeral partition. Talos allows you to configure additional disks in the machine config.

```yaml
# Configure additional disks for workload storage
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
          size: 0  # Use the entire disk
```

This keeps workload data separate from the system's ephemeral storage, preventing one from affecting the other.

## etcd and the Ephemeral Partition

On control plane nodes, etcd data lives on the ephemeral partition at /var/lib/etcd. This is arguably the most important data on any node in the cluster, and the fact that it lives on an ephemeral partition means you absolutely must have a backup strategy.

```bash
# Take an etcd snapshot (do this regularly!)
talosctl -n 10.0.0.11 etcd snapshot db.snapshot

# Verify the snapshot
talosctl -n 10.0.0.11 etcd snapshot db.snapshot --verify
```

If a control plane node's ephemeral partition is lost, you can recover etcd from a snapshot or from the remaining etcd members (if you have more than one control plane node).

```bash
# Recover etcd from a snapshot
talosctl -n 10.0.0.11 bootstrap --recover-from=./db.snapshot
```

## How Resets and Upgrades Affect Ephemeral Data

Different operations have different effects on the ephemeral partition.

**Reboot** preserves the ephemeral partition. All data survives.

**Upgrade** preserves the ephemeral partition. Container images and pod data are retained, which speeds up the process because images do not need to be re-pulled.

**Reset (graceful)** wipes the ephemeral partition. The node returns to a clean state and can rejoin the cluster with a fresh configuration.

**Reset (with --system-labels-to-wipe)** selectively wipes specific partitions.

```bash
# Reboot - preserves ephemeral data
talosctl -n 10.0.0.11 reboot

# Upgrade - preserves ephemeral data
talosctl -n 10.0.0.11 upgrade --image ghcr.io/siderolabs/installer:v1.7.0

# Reset - wipes ephemeral data
talosctl -n 10.0.0.11 reset --graceful

# Reset with selective wipe
talosctl -n 10.0.0.11 reset --system-labels-to-wipe EPHEMERAL
```

## Best Practices for Working with Ephemeral Storage

Never store important data solely on the ephemeral partition. Use PersistentVolumes backed by a distributed storage system or external storage for anything that needs to survive node replacement.

Back up etcd regularly. This is the one piece of ephemeral data that is truly irreplaceable.

Monitor ephemeral storage usage and set up alerts before nodes run out of space. Disk pressure causes pod evictions and can cascade into cluster-wide issues.

Size your nodes appropriately. If you run many different container images, you need more ephemeral storage for the image cache.

Use resource limits for ephemeral storage in your pod specs to prevent any single workload from consuming all available space.

```yaml
# Set ephemeral storage limits on pods
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: app
    image: myapp:latest
    resources:
      requests:
        ephemeral-storage: "2Gi"
      limits:
        ephemeral-storage: "4Gi"
```

## Conclusion

The ephemeral storage model in Talos Linux reinforces the principle that nodes are replaceable. By treating most on-disk data as temporary, Talos encourages patterns that make your cluster more resilient: storing state in distributed systems rather than on local disks, backing up critical data like etcd, and designing workloads that can tolerate node replacement. Understanding which data lives on the ephemeral partition and what happens to it during different lifecycle operations helps you avoid surprises and build robust infrastructure on Talos Linux.
