# How to Configure the EPHEMERAL Volume in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ephemeral Storage, Kubernetes, VOLUME, Container Runtime

Description: Learn how to configure the EPHEMERAL volume in Talos Linux for optimal Kubernetes workload performance and storage management.

---

The EPHEMERAL volume in Talos Linux is one of the most important system volumes. It holds all the data that Kubernetes needs at runtime - container images, pod logs, emptyDir volumes, and other temporary workload data. Getting its configuration right directly impacts your cluster's performance and stability. This guide explains what the EPHEMERAL volume does, how to configure it, and how to optimize it for your specific workloads.

## What the EPHEMERAL Volume Stores

The EPHEMERAL volume is mounted at `/var` on Talos nodes. It serves as the working directory for:

- **Container images** - all pulled images are stored here by containerd
- **Container writable layers** - the read-write layer for running containers
- **Pod logs** - stdout and stderr logs from containers
- **emptyDir volumes** - Kubernetes emptyDir volumes that pods use for scratch space
- **kubelet data** - the kubelet's working directory including pod manifests and secrets
- **CNI state** - container networking plugin state files
- **etcd data** - on control plane nodes, etcd stores its database here

As you can see, nearly all runtime state flows through this volume. If it fills up or performs poorly, your entire node suffers.

## Default EPHEMERAL Configuration

By default, Talos creates the EPHEMERAL volume as the last partition on the system disk. It uses all remaining space after the other system partitions (BOOT, EFI, META, STATE) are allocated. The filesystem type is XFS.

For many deployments, this default works fine. But there are good reasons to customize it, especially when your nodes handle heavy workloads or when you want to separate ephemeral storage from the system disk.

## Configuring EPHEMERAL Size Constraints

You can set minimum and maximum sizes for the EPHEMERAL volume in your machine configuration:

```yaml
# Machine config with EPHEMERAL size constraints
machine:
  install:
    disk: /dev/sda
  volumes:
    - name: EPHEMERAL
      provisioning:
        minSize: 50GB
        maxSize: 200GB
        grow: true
```

Setting `grow: true` tells Talos to expand the volume up to `maxSize` as the disk allows. If you set a `minSize`, Talos will fail to provision the volume if the disk does not have enough free space to meet that minimum.

This is useful when you have a large system disk and want to reserve some space for other partitions while still giving EPHEMERAL room to grow.

## Moving EPHEMERAL to a Separate Disk

For production clusters with heavy workloads, putting the EPHEMERAL volume on its own dedicated disk is a strong move. This isolates workload I/O from system operations and lets you use faster storage (like NVMe) specifically for container runtime data.

```yaml
# Move EPHEMERAL to a dedicated NVMe disk
machine:
  install:
    disk: /dev/sda  # System disk
  volumes:
    - name: EPHEMERAL
      provisioning:
        diskSelector:
          match: 'disk.type == "nvme"'
        grow: true
        filesystemSpec:
          type: xfs
```

With this configuration, Talos will look for an NVMe disk and place the EPHEMERAL volume on it instead of the system disk. The system disk still holds BOOT, EFI, META, and STATE partitions.

## Using Disk Selectors for EPHEMERAL

When specifying a separate disk for EPHEMERAL, disk selectors give you flexible matching:

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        diskSelector:
          # Match by disk size
          match: 'disk.size >= 200u * GB'
        grow: true
```

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        diskSelector:
          # Match by bus path for a specific disk slot
          match: 'disk.busPath == "/pci0000:00/0000:00:1d.0/0000:3d:00.0/nvme/nvme0/nvme0n1"'
        grow: true
```

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        diskSelector:
          # Match by model name
          match: 'disk.model == "Samsung SSD 970"'
        grow: true
```

Pick the selector that makes the most sense for your hardware. Bus path is the most precise, while type and size selectors offer more flexibility across different hardware configurations.

## Filesystem Options

The default filesystem for EPHEMERAL is XFS, which works well for most workloads. XFS handles large files and concurrent writes efficiently, both of which are common patterns for container runtime data.

If you have specific requirements, you can configure the filesystem:

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        filesystemSpec:
          type: xfs
          label: EPHEMERAL
```

Currently, Talos supports XFS and ext4 for data volumes. XFS is recommended for EPHEMERAL because it handles the mixed workload pattern (many small files for container layers, large files for images) better than ext4 in most cases.

## Sizing the EPHEMERAL Volume

How large should EPHEMERAL be? It depends on your workloads, but here are some guidelines:

**Small clusters (dev/test):** 20-50GB is usually sufficient. You are not pulling many images and pod turnover is low.

**Medium clusters (staging):** 50-100GB gives you room for a reasonable number of container images and active pods.

**Large clusters (production):** 100-500GB or more, depending on the number and size of container images you pull. If you run workloads that write heavily to emptyDir volumes, size accordingly.

**GPU/ML workloads:** These often require very large container images (10GB+). Plan for 200GB minimum on nodes that run ML workloads.

Monitor actual usage over time and adjust:

```bash
# Check EPHEMERAL volume usage
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml
```

## Performance Considerations

The EPHEMERAL volume's performance directly affects container startup times, image pull speeds, and pod I/O. Consider these factors:

1. **Disk type matters.** NVMe SSDs significantly outperform SATA SSDs, which in turn outperform spinning disks. Container operations involve many random reads and writes that favor SSD storage.

2. **Separate disks reduce contention.** When EPHEMERAL shares a disk with the system partitions, system operations compete with workload I/O. A dedicated disk eliminates this contention.

3. **Image garbage collection prevents fills.** Kubernetes' kubelet runs image garbage collection automatically, but if your nodes pull many large images, the EPHEMERAL volume can fill up before GC kicks in. Tune kubelet's GC thresholds if needed.

## EPHEMERAL on Control Plane vs Worker Nodes

Control plane nodes typically need less EPHEMERAL space than workers because they run fewer workload containers. However, control plane nodes store etcd data on the EPHEMERAL volume, and etcd performance is critical for cluster health.

For control plane nodes, consider:

```yaml
# Control plane EPHEMERAL on fast storage
machine:
  type: controlplane
  volumes:
    - name: EPHEMERAL
      provisioning:
        diskSelector:
          match: 'disk.type == "nvme"'
        minSize: 50GB
        grow: true
```

Even if the control plane EPHEMERAL volume is smaller, putting it on fast storage ensures etcd latency stays low.

## Monitoring EPHEMERAL Usage

Keep an eye on EPHEMERAL usage to avoid surprises:

```bash
# Quick usage check
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10

# Monitor across all nodes
for node in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo "=== $node ==="
  talosctl get volumestatus EPHEMERAL --nodes "$node" -o yaml | grep -E "size|used"
done
```

Set up Prometheus monitoring for node filesystem metrics to get alerts before the volume fills up:

```yaml
# Prometheus alert rule for EPHEMERAL usage
groups:
- name: talos-storage
  rules:
  - alert: EphemeralVolumeNearFull
    expr: node_filesystem_avail_bytes{mountpoint="/var"} / node_filesystem_size_bytes{mountpoint="/var"} < 0.15
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "EPHEMERAL volume on {{ $labels.instance }} is almost full"
```

## Summary

The EPHEMERAL volume is the workhorse of Talos Linux storage. It holds everything that makes your Kubernetes cluster run - container images, pod data, and runtime state. Configure it thoughtfully by sizing it for your workload, placing it on appropriate storage hardware, and monitoring its usage. For production clusters, dedicating a fast disk to the EPHEMERAL volume pays off in better container startup times and more stable operations. Always test configuration changes in a non-production environment before rolling them out to your live cluster.
