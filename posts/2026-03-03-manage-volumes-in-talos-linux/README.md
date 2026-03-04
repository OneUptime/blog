# How to Manage Volumes in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Volumes, Storage, Kubernetes, Infrastructure

Description: A complete guide to managing volumes in Talos Linux, covering creation, configuration, resizing, and lifecycle management through machine config.

---

Volume management in Talos Linux is fundamentally different from what you might be used to with traditional Linux distributions. There is no SSH access, no shell to run `fdisk` or `mkfs`, and no manual partition table editing. Instead, volumes are declared in the machine configuration and managed through the Talos API. This declarative approach brings consistency and reproducibility, but it requires a different mindset. This guide covers everything you need to know about managing volumes in Talos Linux.

## The Declarative Volume Model

Talos Linux follows a declarative model for storage management. You describe the desired state of your volumes in the machine configuration, and Talos takes care of creating partitions, formatting filesystems, and mounting them in the right places. When you change the configuration, Talos reconciles the actual state with your desired state.

This means volume management is really about configuration management. You edit machine configs, apply them to nodes, and let Talos handle the rest.

## Creating Volumes Through Machine Configuration

Volumes are defined in the `machine.disks` section of the Talos machine configuration. Here is an example that creates a data volume on a second disk:

```yaml
# Machine configuration with custom volume
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
          size: 50GB
```

This tells Talos to partition `/dev/sdb`, create a 50GB partition, format it, and mount it at `/var/mnt/data`. The filesystem type defaults to XFS, which is the standard filesystem in Talos.

To apply this configuration to a node:

```bash
# Apply the machine configuration with disk changes
talosctl apply-config --nodes 192.168.1.10 --file machine-config.yaml
```

## Using Disk Selectors Instead of Device Paths

Hard-coding device paths like `/dev/sdb` is fragile because device names can change between reboots. Talos supports disk selectors that let you target disks based on stable properties:

```yaml
machine:
  disks:
    - deviceSelector:
        size: '>= 100GB'
        type: ssd
        busPath: /pci0000:00/0000:00:1d.0/*
      partitions:
        - mountpoint: /var/mnt/data
          size: 0  # Use all available space
```

Disk selectors can match on size, type (SSD or HDD), bus path, model, serial number, and other attributes. This makes your configurations portable across different hardware.

## Managing the EPHEMERAL Volume

The EPHEMERAL volume is special in Talos. It stores container images, pod data, and other Kubernetes runtime state. By default, Talos creates it on the system disk and lets it grow to fill available space.

You can customize the EPHEMERAL volume in the machine config:

```yaml
machine:
  install:
    disk: /dev/sda
    ephemeral:
      minSize: 20GB
      maxSize: 100GB
```

Setting size constraints helps when you need to reserve space on the system disk for other purposes.

## Resizing Volumes

Talos supports volume resizing through configuration changes. If you need a partition to be larger, update the size in the machine config and reapply:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
          size: 100GB  # Previously was 50GB
```

```bash
# Apply the updated configuration
talosctl apply-config --nodes 192.168.1.10 --file machine-config-updated.yaml
```

Keep in mind that growing a partition is straightforward, but shrinking requires more care. Talos will not shrink a partition that contains data larger than the new requested size.

## Monitoring Volume State

After applying configuration changes, monitor the volume state to confirm everything provisioned correctly:

```bash
# Check volume status
talosctl get volumes --nodes 192.168.1.10

# Watch for changes in real time
talosctl get volumes --nodes 192.168.1.10 --watch

# Get detailed status including any errors
talosctl get volumestatus --nodes 192.168.1.10 -o yaml
```

If a volume enters a failed state, the status output includes error messages that explain what went wrong.

## Volume Lifecycle

Volumes in Talos go through a defined lifecycle:

1. **Discovery** - Talos detects available disks
2. **Selection** - disk selectors match disks to volume configurations
3. **Provisioning** - partitions are created and formatted
4. **Ready** - the volume is mounted and available for use
5. **Teardown** - when a node is reset, volumes are cleaned up

You can observe each phase through the volume resources:

```bash
# Track volume lifecycle events
talosctl get volumes --nodes 192.168.1.10 --watch
```

## Managing Multiple Volumes

For nodes that need multiple storage volumes, you define them all in the machine config:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
          size: 200GB
        - mountpoint: /var/mnt/logs
          size: 50GB
    - device: /dev/sdc
      partitions:
        - mountpoint: /var/mnt/backup
          size: 0  # Use entire disk
```

Each disk can have multiple partitions, and you can spread volumes across different physical disks based on performance or reliability requirements.

## Volume Configuration for Different Node Roles

Control plane nodes and worker nodes often have different storage needs. You can maintain separate machine configurations:

```yaml
# Control plane - minimal storage
machine:
  type: controlplane
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/etcd-backup
          size: 10GB

# Worker node - substantial storage for workloads
machine:
  type: worker
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
          size: 500GB
    - device: /dev/sdc
      partitions:
        - mountpoint: /var/mnt/scratch
          size: 0
```

## Handling Volume Errors

When volumes fail to provision, Talos provides diagnostic information through the resource API:

```bash
# Check for volume errors
talosctl get volumes --nodes 192.168.1.10 -o yaml | grep -A 5 "phase: Failed"

# Check system logs for disk-related errors
talosctl logs machined --nodes 192.168.1.10 | grep -i "disk\|volume\|partition"
```

Common issues include:

- **Disk not found** - the device path or disk selector does not match any available disk
- **Insufficient space** - the requested partition size exceeds available disk space
- **Device busy** - the disk is already in use by another volume or system process
- **Filesystem errors** - corruption or incompatible filesystem on an existing partition

## Cleaning Up Volumes

When you need to remove a volume, remove its definition from the machine config and reapply. To completely wipe a node's storage:

```bash
# Reset a node, which wipes all non-system volumes
talosctl reset --nodes 192.168.1.10 --graceful

# For a complete wipe including system disk
talosctl reset --nodes 192.168.1.10 --system-labels-to-wipe STATE --system-labels-to-wipe EPHEMERAL
```

Be very careful with reset operations in production. They are destructive and irreversible.

## Best Practices for Volume Management

Here are some guidelines that will save you trouble down the road:

1. Always use disk selectors instead of hard-coded device paths. Hardware changes should not break your configurations.

2. Keep volume configurations in version control alongside your other infrastructure code. This gives you an audit trail and the ability to roll back.

3. Test volume configurations in a staging environment before applying them to production nodes.

4. Monitor volume health as part of your regular cluster health checks. A failing volume can cascade into Kubernetes scheduling problems.

5. Leave some unallocated space on disks when possible. This gives you room to grow volumes without adding hardware.

6. Document which volumes are used for what purpose. As your cluster grows, it becomes harder to remember why a particular mount point exists.

## Summary

Managing volumes in Talos Linux is a configuration-driven process. You declare your desired storage layout in machine configs, apply them through `talosctl`, and let Talos handle the details. The key tools are `talosctl apply-config` for making changes and `talosctl get volumes` for monitoring state. By embracing the declarative model and following best practices around disk selectors and monitoring, you can maintain reliable storage across your Talos Linux cluster.
