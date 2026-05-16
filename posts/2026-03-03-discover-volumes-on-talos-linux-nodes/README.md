# How to Discover Volumes on Talos Linux Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Volumes, Kubernetes, Storage, Disk Management

Description: A practical guide to discovering and inspecting volumes on Talos Linux nodes using talosctl and the Talos resource API.

---

Talos Linux manages storage through a volume abstraction layer that sits between raw disks and the filesystems that the operating system and Kubernetes workloads use. When you need to understand what volumes exist on a node, how they are configured, and what state they are in, you need to know how to query the Talos volume system. This guide walks you through the process of discovering volumes on Talos Linux nodes.

## What Are Volumes in Talos Linux?

In Talos Linux, a volume is a managed storage unit. Unlike traditional Linux distributions where you might manually create partitions and mount filesystems, Talos handles volume lifecycle through its machine configuration. Volumes can be backed by disk partitions, and Talos tracks their state through its internal resource system.

The key volumes you will encounter on a typical Talos node include:

- **STATE** - stores the machine configuration and other persistent state
- **EPHEMERAL** - used for Kubernetes pod data, container images, and other temporary storage
- **BOOT** - contains the bootloader
- **EFI** - the EFI system partition on UEFI systems
- **META** - stores Talos metadata

## Listing Volumes with talosctl

The most direct way to discover volumes is through the `talosctl` command:

```bash
# List all volumes on a node

talosctl get volumestatus --nodes 192.168.1.10
```

This produces output that shows each volume along with its current state. The output looks something like:

```text
NODE            NAMESPACE   TYPE           ID          VERSION   TYPE        PHASE   LOCATION    SIZE
192.168.1.10    runtime     VolumeStatus   EFI         1         partition   ready   /dev/sda1   100 MB
192.168.1.10    runtime     VolumeStatus   META        1         partition   ready   /dev/sda2   1.0 MB
192.168.1.10    runtime     VolumeStatus   STATE       1         partition   ready   /dev/sda3   105 MB
192.168.1.10    runtime     VolumeStatus   EPHEMERAL   1         partition   ready   /dev/sda4   49.3 GB
```

Each volume has a phase that tells you its current state. The phases defined by Talos are:

- **ready** - the volume is provisioned, mounted, and available
- **waiting** - the volume is waiting for its backing device
- **missing** - the volume's backing device is not found
- **failed** - something went wrong during volume provisioning
- **located** - the backing device has been found but the volume is not yet provisioned
- **provisioned** - the volume has been provisioned but is not yet prepared
- **prepared** - the volume is prepared but not yet mounted
- **closed** - the volume has been closed

## Getting Detailed Volume Information

For deeper inspection, output the volume data in YAML format:

```bash
# Get detailed volume information
talosctl get volumestatus --nodes 192.168.1.10 -o yaml
```

This gives you the full resource specification for each volume, including:

```yaml
metadata:
  namespace: runtime
  type: VolumeStatuses.block.talos.dev
  id: EPHEMERAL
  version: 6
  owner: block.VolumeManagerController
  phase: running
spec:
  phase: ready
  type: partition
  location: /dev/sda4
  mountLocation: /dev/sda4
  partitionIndex: 4
  parentLocation: /dev/sda
  uuid: 99e0d6b3-...
  partitionUUID: 4d4b3a4f-...
  size: 52928438272
  prettySize: 53 GB
  filesystem: xfs
```

This tells you everything about the volume - its backing device, filesystem type, partition index, and exact size in bytes.

## Discovering Volume Configurations

Volumes in Talos are defined through the machine configuration. To see how volumes are configured (as opposed to their runtime state), you can query the `VolumeConfig` resources directly:

```bash
# List all volume configurations
talosctl get volumeconfig --nodes 192.168.1.10

# View a specific volume configuration in detail
talosctl get volumeconfig STATE --nodes 192.168.1.10 -o yaml
```

You can also inspect the full machine configuration that defines how Talos provisions volumes:

```bash
# View the current machine configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml
```

System volume settings appear under `machine.install.disk` and `machine.install.diskSelector` in the configuration, while user-defined volumes are declared through `UserVolumeConfig`, `RawVolumeConfig`, and `ExistingVolumeConfig` documents.

## Inspecting Volume Status Resources

Volume status resources track the operational state of each volume, including any errors that may have occurred during provisioning or operation:

```bash
# Get volume status resources
talosctl get volumestatus --nodes 192.168.1.10
```

For a specific volume:

```bash
# Check the status of the EPHEMERAL volume
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml
```

If a volume failed to provision, the `errorMessage` field in the spec describes what went wrong.

## Discovering Volumes Across the Cluster

When managing a multi-node cluster, you often need to check volume status across all nodes at once:

```bash
# Check volumes across multiple nodes
talosctl get volumestatus --nodes 192.168.1.10,192.168.1.11,192.168.1.12
```

The output includes the node IP for each entry, making it easy to identify which volumes belong to which node.

For a quick health check across the entire cluster, you can script this:

```bash
#!/bin/bash
# Quick volume health check across all nodes
NODES=$(talosctl get members -o json | jq -r '.spec.addresses[0]')

for node in $NODES; do
  echo "=== Volumes on $node ==="
  talosctl get volumestatus --nodes "$node"
  echo ""
done
```

## Understanding Volume Dependencies

Volumes in Talos have dependencies. For example, a partition-backed volume depends on its backing disk being available. If a disk fails or is removed, the dependent volumes transition to the `failed` or `missing` phase.

You can trace these dependencies by looking at the `parentID` and `parentLocation` fields in each `VolumeStatus`:

```bash
# Inspect parent references for all volumes
talosctl get volumestatus --nodes 192.168.1.10 -o yaml | grep -E 'id:|parentID:|parentLocation:'
```

## Working with Custom Volumes

Beyond the system volumes, Talos allows you to define custom volumes through `UserVolumeConfig`, `RawVolumeConfig`, and `ExistingVolumeConfig` documents in the machine configuration. These are typically used for workload storage, dedicated data directories, or additional mount points.

To discover custom volumes alongside system ones:

```bash
# List all disk-related resources
talosctl get disks --nodes 192.168.1.10
talosctl get volumestatus --nodes 192.168.1.10
talosctl get discoveredvolumes --nodes 192.168.1.10
```

User-defined volumes appear with an `u-` prefix in the ID (for example, `u-local-volume`), raw volumes with an `r-` prefix, and existing volumes with an `e-` prefix.

## Monitoring Volume Changes

Talos supports watching resources for changes in real time. This is useful for monitoring volume provisioning during node setup:

```bash
# Watch for volume changes in real time
talosctl get volumestatus --nodes 192.168.1.10 --watch
```

The `--watch` flag keeps the connection open and prints updates whenever a volume's state changes. This is particularly helpful during initial cluster setup when you want to confirm that all volumes are provisioned correctly.

## Using the Talos Dashboard

If you prefer a visual interface, Talos provides a built-in dashboard that you can access through `talosctl`:

```bash
# Open the Talos dashboard
talosctl dashboard --nodes 192.168.1.10
```

The dashboard shows system information including disk and volume status in a terminal-based UI. While it does not give you as much detail as the YAML output, it provides a quick overview of node health including storage status.

## Troubleshooting Volume Discovery Issues

If volumes are not showing up as expected, here are some things to check:

1. Verify that the node is reachable and the Talos API is responding. A simple `talosctl version --nodes <ip>` confirms connectivity.

2. Check if the backing disk exists. Use `talosctl get disks --nodes <ip>` to see what disks the kernel has detected, and `talosctl get discoveredvolumes --nodes <ip>` to see all detected partitions and filesystems.

3. Look at the machine configuration to confirm that volume definitions are correct. Typos in disk selectors or invalid size constraints can prevent volume provisioning.

4. Check system logs for volume-related errors. Use `talosctl logs machined --nodes <ip>` and look for messages related to disk or volume operations.

5. If a volume is stuck in the `waiting` phase, it usually means the backing device has not been found yet. This can happen if a disk is slow to initialize or if the disk selector does not match any available device.

## Summary

Discovering volumes on Talos Linux nodes is a matter of querying the right resources through `talosctl`. The `get volumestatus` command gives you a quick overview, while YAML output provides full details. The `get volumeconfig` and `get discoveredvolumes` commands surface configuration and raw block-device information, and the watch feature enables real-time monitoring. By combining these tools, you can maintain complete visibility into the storage state of every node in your Talos Linux cluster.
