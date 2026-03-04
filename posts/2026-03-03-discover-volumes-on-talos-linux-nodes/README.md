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
talosctl get volumes --nodes 192.168.1.10
```

This produces output that shows each volume along with its current state. The output looks something like:

```text
NODE            NAMESPACE   TYPE     ID          VERSION   PHASE     LOCATION       SIZE
192.168.1.10    runtime     Volume   BOOT        1         Ready     /dev/sda1      512 MB
192.168.1.10    runtime     Volume   EFI         1         Ready     /dev/sda2      100 MB
192.168.1.10    runtime     Volume   META        1         Ready     /dev/sda3      1 MB
192.168.1.10    runtime     Volume   STATE       1         Ready     /dev/sda4      100 MB
192.168.1.10    runtime     Volume   EPHEMERAL   1         Ready     /dev/sda5      49.3 GB
```

Each volume has a phase that tells you its current state. The phases you might see are:

- **Ready** - the volume is provisioned and available
- **Waiting** - the volume is waiting for its backing device
- **Missing** - the volume's backing device is not found
- **Failed** - something went wrong during volume provisioning

## Getting Detailed Volume Information

For deeper inspection, output the volume data in YAML format:

```bash
# Get detailed volume information
talosctl get volumes --nodes 192.168.1.10 -o yaml
```

This gives you the full resource specification for each volume, including:

```yaml
metadata:
  namespace: runtime
  type: Volumes.talos.dev
  id: EPHEMERAL
  version: 1
  phase: running
spec:
  parentID: ""
  type: partition
  locator:
    match: system/EPHEMERAL
  provisioning:
    diskSelector:
      match: ""
    partitionSpec:
      minSize: 0
      maxSize: 0
      grow: true
    filesystemSpec:
      type: xfs
      label: EPHEMERAL
status:
  phase: Ready
  location: /dev/sda5
  size: 52928438272
  filesystem: xfs
  mountpoint: /var
```

This tells you everything about the volume - its disk location, filesystem type, mount point, and exact size in bytes.

## Discovering Volume Configurations

Volumes in Talos are defined through the machine configuration. To see how volumes are configured (as opposed to their runtime state), you can inspect the machine config:

```bash
# View the current machine configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml
```

The volume-related sections appear under `machine.disks` and `machine.install.disk` in the configuration. These define how Talos should provision volumes when the node boots.

## Inspecting Volume Status Resources

Talos also provides volume status resources that give you real-time information about volume health:

```bash
# Get volume status resources
talosctl get volumestatus --nodes 192.168.1.10
```

Volume status resources track the operational state of each volume, including any errors that may have occurred during provisioning or operation.

For a specific volume:

```bash
# Check the status of the EPHEMERAL volume
talosctl get volumestatus EPHEMERAL --nodes 192.168.1.10 -o yaml
```

## Discovering Volumes Across the Cluster

When managing a multi-node cluster, you often need to check volume status across all nodes at once:

```bash
# Check volumes across multiple nodes
talosctl get volumes --nodes 192.168.1.10,192.168.1.11,192.168.1.12
```

The output includes the node IP for each entry, making it easy to identify which volumes belong to which node.

For a quick health check across the entire cluster, you can script this:

```bash
#!/bin/bash
# Quick volume health check across all nodes
NODES=$(talosctl get members -o json | jq -r '.[].spec.addresses[0]')

for node in $NODES; do
  echo "=== Volumes on $node ==="
  talosctl get volumes --nodes "$node"
  echo ""
done
```

## Understanding Volume Dependencies

Volumes in Talos have dependencies. For example, the EPHEMERAL volume depends on its backing disk being available. If a disk fails or is removed, the dependent volumes transition to a failed state.

You can trace these dependencies by looking at the volume resources and their parent IDs:

```bash
# Check volume lifecycle events
talosctl get volumelifecycle --nodes 192.168.1.10 -o yaml
```

## Working with Custom Volumes

Beyond the system volumes, Talos allows you to define custom volumes through the machine configuration. These are typically used for workload storage, dedicated data directories, or additional mount points.

To discover custom volumes:

```bash
# List all disk-related resources
talosctl get disks --nodes 192.168.1.10
talosctl get volumes --nodes 192.168.1.10
talosctl get blockdevices --nodes 192.168.1.10
```

Custom volumes will appear alongside system volumes in the output, but they will have custom IDs that match what you defined in the machine configuration.

## Monitoring Volume Changes

Talos supports watching resources for changes in real time. This is useful for monitoring volume provisioning during node setup:

```bash
# Watch for volume changes in real time
talosctl get volumes --nodes 192.168.1.10 --watch
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

2. Check if the backing disk exists. Use `talosctl disks --nodes <ip>` to see what disks the kernel has detected.

3. Look at the machine configuration to confirm that volume definitions are correct. Typos in disk selectors or invalid size constraints can prevent volume provisioning.

4. Check system logs for volume-related errors. Use `talosctl logs machined --nodes <ip>` and look for messages related to disk or volume operations.

5. If a volume is stuck in the "Waiting" phase, it usually means the backing device has not been found yet. This can happen if a disk is slow to initialize or if the disk selector does not match any available device.

## Summary

Discovering volumes on Talos Linux nodes is a matter of querying the right resources through `talosctl`. The `get volumes` command gives you a quick overview, while YAML output provides full details. Volume status resources let you monitor health, and the watch feature enables real-time monitoring. By combining these tools, you can maintain complete visibility into the storage state of every node in your Talos Linux cluster.
