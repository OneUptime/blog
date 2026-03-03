# How to Understand the STATE Partition in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Partitions, STATE Partition, Machine Configuration, Disk Management, Kubernetes

Description: Learn what the STATE partition in Talos Linux stores, how it persists machine configuration, and why it matters for node identity and cluster membership.

---

Talos Linux takes an opinionated approach to managing nodes in a Kubernetes cluster. One of the things that sets it apart from traditional Linux distributions is its partitioning scheme. Among the partitions Talos creates during installation, the STATE partition holds a central role. It is where Talos stores the persistent identity of a node, including the machine configuration, certificates, and everything needed to rejoin the cluster after a reboot.

## What Is the STATE Partition?

The STATE partition is a dedicated partition on a Talos Linux node's disk that stores the machine's persistent configuration data. When you apply a machine configuration to a node, that configuration is written to the STATE partition. It stays there across reboots, upgrades, and even some types of resets.

Think of the STATE partition as the node's memory. It remembers who the node is, which cluster it belongs to, what role it plays (control plane or worker), and what network settings it should use.

## What Gets Stored in the STATE Partition?

The STATE partition contains several categories of data:

**Machine Configuration** - The full YAML machine configuration that you apply with `talosctl apply-config`. This includes cluster membership details, network configuration, Kubernetes settings, and any custom patches you have applied.

**TLS Certificates** - Talos generates and stores TLS certificates used for internal communication. These certificates allow the node to authenticate with the Talos API and with other cluster components.

**Cluster Identity** - Information about the cluster the node belongs to, including the cluster name, cluster ID, and endpoint addresses for the control plane.

**etcd Data Directory Pointers** - For control plane nodes, the STATE partition may also reference data related to etcd membership, which helps the node rejoin the etcd cluster after a restart.

```bash
# View the current machine configuration stored on a node
talosctl get machineconfig --nodes 192.168.1.10 -o yaml

# Check the node identity information
talosctl get nodename --nodes 192.168.1.10
```

## How the STATE Partition Differs from Other Partitions

Talos creates several partitions during installation. Here is a quick comparison to help you understand where the STATE partition fits:

```text
Disk Layout on a Talos Node:
  EFI/BIOS  - Boot firmware partition
  BOOT      - Kernel and initramfs
  META      - Small metadata key-value store
  STATE     - Machine configuration and certificates
  EPHEMERAL - Kubernetes pods, container images, logs
```

The STATE partition is distinct from the EPHEMERAL partition in an important way. The EPHEMERAL partition is designed to be wiped or rebuilt without losing the node's identity. If you drain a node's workloads and wipe the EPHEMERAL partition, the node can still rejoin the cluster because its configuration lives on the STATE partition.

The META partition, on the other hand, stores smaller pieces of metadata like the installed Talos version and upgrade state. The STATE partition is where the bulk of the configuration data lives.

## How Talos Reads the STATE Partition During Boot

When a Talos node boots, it goes through a sequence of steps to bring up the operating system and join the Kubernetes cluster. Here is a simplified version of what happens:

1. The bootloader loads the kernel and initramfs from the BOOT partition
2. The early boot process reads the META partition for version and boot hints
3. Talos reads the machine configuration from the STATE partition
4. Network interfaces are configured based on the machine configuration
5. The Talos API server starts, making the node accessible via `talosctl`
6. Kubernetes components (kubelet, etcd if applicable) start up
7. The node registers with the Kubernetes API server

Step 3 is where the STATE partition becomes critical. Without a valid machine configuration on the STATE partition, the node cannot proceed with the rest of the boot sequence. It will sit in maintenance mode, waiting for a configuration to be applied.

```bash
# If a node is in maintenance mode, apply configuration
talosctl apply-config --nodes 192.168.1.10 \
  --file worker.yaml --insecure
```

The `--insecure` flag is needed when the node does not yet have a configuration, since TLS trust has not been established yet.

## Applying and Updating Configuration on the STATE Partition

Every time you use `talosctl apply-config` or `talosctl patch`, Talos writes the updated configuration to the STATE partition. Some changes take effect immediately, while others require a reboot.

```bash
# Apply a full machine configuration
talosctl apply-config --nodes 192.168.1.10 --file controlplane.yaml

# Patch an existing configuration (add a label, for example)
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '[{"op": "add", "path": "/machine/nodeLabels/role", "value": "storage"}]'

# Apply configuration with automatic reboot if needed
talosctl apply-config --nodes 192.168.1.10 --file controlplane.yaml --mode auto
```

After each of these operations, the STATE partition is updated with the new configuration. The previous configuration is replaced, so it is a good idea to keep copies of your machine configuration files in version control.

## STATE Partition and Encryption

Talos Linux supports encrypting the STATE partition for security-sensitive environments. When encryption is enabled, the machine configuration and certificates are protected at rest. This is especially useful in edge deployments or environments where physical access to the disk is a concern.

```yaml
# Example machine configuration snippet for STATE partition encryption
machine:
  systemDiskEncryption:
    state:
      provider: luks2
      keys:
        - nodeID: {}
          slot: 0
```

With encryption enabled, the STATE partition is decrypted during boot using keys derived from the node's identity. This means the data is protected if someone removes the disk and tries to read it on another machine.

## What Happens During a Reset?

Talos supports different types of resets, and the behavior of the STATE partition depends on which type you choose:

```bash
# Graceful reset - removes the node from the cluster, wipes STATE and EPHEMERAL
talosctl reset --nodes 192.168.1.10 --graceful

# Reset with preserved STATE partition
talosctl reset --nodes 192.168.1.10 --graceful \
  --system-labels-to-wipe EPHEMERAL
```

A full reset wipes both the STATE and EPHEMERAL partitions, effectively turning the node back into a blank machine ready for a fresh configuration. A selective reset can preserve the STATE partition, allowing the node to keep its identity while clearing workload data.

This is useful in scenarios where you want to rebuild a node's container runtime or clear out corrupted pod data without having to reconfigure the node from scratch.

## STATE Partition Size and Format

The STATE partition uses a standard filesystem (typically ext4 or xfs depending on the Talos version). Its size is determined during installation and is generally small compared to the EPHEMERAL partition. The machine configuration YAML, certificates, and related files do not take much space.

You can check the partition layout using `talosctl`:

```bash
# Inspect disk and partition information
talosctl get disks --nodes 192.168.1.10
talosctl get mounts --nodes 192.168.1.10

# Example output showing partition sizes
# /dev/sda1 - EFI     - 100MB
# /dev/sda2 - BIOS    - 1MB
# /dev/sda3 - BOOT    - 1GB
# /dev/sda4 - META    - 1MB
# /dev/sda5 - STATE   - 100MB
# /dev/sda6 - EPHEMERAL - remaining disk space
```

## Troubleshooting STATE Partition Issues

If a node is not booting correctly or is stuck in maintenance mode, the STATE partition is one of the first things to check.

**Node stuck in maintenance mode** - This usually means the STATE partition does not have a valid machine configuration. Apply a configuration using `talosctl apply-config --insecure`.

**Configuration drift** - If you suspect the on-disk configuration does not match what you expect, retrieve it with `talosctl get machineconfig -o yaml` and compare it to your source files.

**Corrupted STATE partition** - In rare cases, disk errors can corrupt the STATE partition. A full reset followed by re-applying the configuration is the standard recovery path.

```bash
# Retrieve the current config from a running node
talosctl get machineconfig --nodes 192.168.1.10 -o yaml > current-config.yaml

# Compare with your expected configuration
diff current-config.yaml expected-config.yaml
```

## Best Practices

1. Always keep your machine configuration files in version control. The STATE partition stores the active configuration, but having a source of truth outside the cluster is essential for disaster recovery.

2. Use encryption for the STATE partition in production environments where physical security of the disk cannot be guaranteed.

3. Before performing destructive operations like resets, make sure you have copies of the machine configuration for each node.

4. Periodically verify that the configuration on each node matches your expected configuration. Configuration drift can happen if patches are applied ad hoc.

## Conclusion

The STATE partition is the persistent identity of a Talos Linux node. It stores everything the node needs to know about itself and its cluster membership. Understanding what it contains, how it gets updated, and how it survives reboots and upgrades will help you manage Talos clusters with confidence. Whether you are troubleshooting a node that will not boot or planning a cluster-wide configuration change, the STATE partition is at the center of the story.
