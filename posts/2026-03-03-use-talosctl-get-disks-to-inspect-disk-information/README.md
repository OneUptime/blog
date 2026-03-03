# How to Use talosctl get disks to Inspect Disk Information

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Disk Inspection, System Administration, Kubernetes

Description: A complete guide to using the talosctl get disks command to inspect disk information on Talos Linux nodes, including output interpretation and practical use cases.

---

When managing Talos Linux nodes, having visibility into the disk hardware is essential. Whether you are planning an installation, troubleshooting storage issues, or auditing your fleet, the `talosctl get disks` command is your primary tool for inspecting disk information. This guide covers everything you need to know about using this command effectively.

## Basic Usage

The simplest form of the command lists all disks detected on a node:

```bash
# List disks on a specific node
talosctl get disks --nodes 192.168.1.10

# Example output:
# NODE          NAMESPACE   TYPE   ID         VERSION   SIZE      MODEL              SERIAL
# 192.168.1.10  runtime     Disk   sda        1         480 GB    INTEL SSDSC2KB48   PHYG012345
# 192.168.1.10  runtime     Disk   sdb        1         4.0 TB    HGST HUS726T4TA    V0HK12345
# 192.168.1.10  runtime     Disk   nvme0n1    1         1.0 TB    Samsung 980 PRO    S5GYNG0R1234
```

Each row represents a physical disk (or virtual disk in a VM environment). The ID column shows the device name you would use in configuration files.

## Understanding the Output Fields

Let's break down each field in the output:

**NODE** - The IP address or hostname of the Talos node. This is helpful when you query multiple nodes at once.

**NAMESPACE** - Always `runtime` for disk resources. This is the Talos resource namespace.

**TYPE** - The resource type, which is `Disk` for disk devices.

**ID** - The device identifier. This corresponds to the block device name under `/dev/`. For example, `sda` means the disk is at `/dev/sda`.

**VERSION** - The resource version in the Talos API. This increments when the resource changes.

**SIZE** - The total capacity of the disk in a human-readable format.

**MODEL** - The disk model string as reported by the hardware.

**SERIAL** - The serial number of the disk, which is unique to each physical device.

## Getting Detailed YAML Output

For more comprehensive information, use the YAML output format:

```bash
# Get detailed disk information in YAML
talosctl get disks --nodes 192.168.1.10 -o yaml
```

This produces output like:

```yaml
node: 192.168.1.10
metadata:
  namespace: runtime
  type: Disks.runtime.talos.dev
  id: sda
  version: 1
spec:
  size: 480103981056
  model: INTEL SSDSC2KB480G8
  serial: PHYG012345678
  modalias: scsi:t-0x00
  wwid: naa.55cd2e414f5eabcd
  busPath: /pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0
  subsystem: /sys/class/block
  rotational: false
  systemDisk: true
  readonly: false
```

The YAML output includes several additional fields that are not in the table view:

- **size**: Exact size in bytes
- **modalias**: Kernel module alias for the disk controller
- **wwid**: World Wide Identifier, a globally unique disk identifier
- **busPath**: The physical path through the system bus to the disk
- **subsystem**: The kernel subsystem the disk belongs to
- **rotational**: Whether the disk is a spinning HDD (true) or SSD/NVMe (false)
- **systemDisk**: Whether Talos is currently installed on this disk
- **readonly**: Whether the disk is in a read-only state

## Querying Multiple Nodes

You can query multiple nodes in a single command by passing multiple `--nodes` flags or a comma-separated list:

```bash
# Query multiple nodes at once
talosctl get disks --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# Or using multiple --nodes flags
talosctl get disks --nodes 192.168.1.10 --nodes 192.168.1.11
```

This is useful for auditing disk configurations across your cluster. The output includes the NODE column, so you can tell which disk belongs to which node.

## Filtering by Specific Disk

If you know the disk ID and want to see only that disk:

```bash
# Get information about a specific disk
talosctl get disks sda --nodes 192.168.1.10

# Or with YAML output
talosctl get disks sda --nodes 192.168.1.10 -o yaml
```

This is helpful when you are troubleshooting a specific disk and do not need the full list.

## Using in Maintenance Mode

When a node is in maintenance mode (before a machine configuration has been applied), you can still inspect disks using the `--insecure` flag:

```bash
# Inspect disks on a node in maintenance mode
talosctl get disks --nodes 192.168.1.10 --insecure
```

This is one of the most important use cases for this command. Before you write a machine configuration, you need to know which disks are available so you can specify the correct installation disk.

## Practical Use Cases

### Pre-Installation Hardware Audit

Before deploying Talos to new hardware, boot into maintenance mode and catalog the disks:

```bash
#!/bin/bash
# Audit disks on a set of new nodes
NODES=("192.168.1.10" "192.168.1.11" "192.168.1.12")

for NODE in "${NODES[@]}"; do
  echo "=== Disks on $NODE ==="
  talosctl get disks --nodes "$NODE" --insecure
  echo ""
done
```

### Verifying System Disk After Installation

After installing Talos, confirm that it installed on the intended disk:

```bash
# Check which disk is marked as the system disk
talosctl get disks --nodes 192.168.1.10 -o yaml | grep -A 2 "systemDisk"

# The systemDisk field will be true for the disk where Talos is installed
```

### Identifying Disks for Storage Configuration

When setting up additional storage (for Rook-Ceph, Longhorn, or local persistent volumes), use `talosctl get disks` to identify available disks:

```bash
# Find disks that are NOT the system disk
talosctl get disks --nodes 192.168.1.10 -o yaml

# Look for disks where systemDisk: false
# These are candidates for additional storage
```

### Monitoring Disk Fleet Consistency

For fleet management, verify that all nodes in a pool have the expected disk configuration:

```bash
#!/bin/bash
# Check disk counts and sizes across worker nodes
WORKERS=("192.168.1.20" "192.168.1.21" "192.168.1.22" "192.168.1.23")

for WORKER in "${WORKERS[@]}"; do
  echo "Node: $WORKER"
  talosctl get disks --nodes "$WORKER" | tail -n +2 | while read line; do
    echo "  $line"
  done
  echo ""
done
```

### Preparing for Disk Replacement

If you need to replace a failing disk, first document the current disk configuration:

```bash
# Document current disk layout before replacement
talosctl get disks --nodes 192.168.1.10 -o yaml > node-10-disks-backup.yaml

# After replacing the disk, compare
talosctl get disks --nodes 192.168.1.10 -o yaml > node-10-disks-new.yaml
diff node-10-disks-backup.yaml node-10-disks-new.yaml
```

## Understanding Disk Properties for Configuration

The properties returned by `talosctl get disks` map directly to the disk selector fields in machine configuration:

```yaml
# Disk selector using properties from talosctl get disks
machine:
  install:
    diskSelector:
      size: '>= 480GB'       # Maps to the size field
      model: 'INTEL*'        # Maps to the model field
      serial: 'PHYG012345*'  # Maps to the serial field
      type: ssd              # Derived from the rotational field
      busPath: '/pci0000*'   # Maps to the busPath field
```

This direct relationship between the inspection command and the configuration options makes it easy to build reliable disk selectors based on actual hardware data.

## Combining with Other Commands

The `talosctl get disks` command works well alongside other Talos resource commands:

```bash
# Check disk information
talosctl get disks --nodes 192.168.1.10

# Check mount points to see how partitions are used
talosctl get mounts --nodes 192.168.1.10

# Check block devices for partition-level detail
talosctl get blockdevices --nodes 192.168.1.10

# Check system disk configuration
talosctl get systemdisk --nodes 192.168.1.10
```

Together, these commands give you a complete picture of the storage subsystem on a Talos node.

## JSON Output for Automation

For scripting and automation, JSON output is often more useful than YAML:

```bash
# Get disk information in JSON format
talosctl get disks --nodes 192.168.1.10 -o json

# Parse with jq to extract specific fields
talosctl get disks --nodes 192.168.1.10 -o json | \
  jq '.spec | {id: .id, size: .size, model: .model, systemDisk: .systemDisk}'
```

This lets you build automation pipelines that make decisions based on disk properties. For example, you could automatically generate machine configurations based on the discovered hardware.

## Troubleshooting with Disk Inspection

If things are not working as expected, `talosctl get disks` is usually the first diagnostic step:

**No disks showing up** - This means the kernel is not detecting any block devices. Check for missing storage drivers or hardware connection issues.

**Fewer disks than expected** - A disk controller might not have its driver loaded, or a disk might be in a failed state. Check the kernel logs with `talosctl dmesg`.

**Wrong system disk** - If `systemDisk: true` is on the wrong disk, you may need to reinstall Talos on the correct disk.

```bash
# Check kernel messages for disk-related errors
talosctl dmesg --nodes 192.168.1.10 | grep -i "disk\|scsi\|nvme\|ata"
```

## Conclusion

The `talosctl get disks` command is an essential tool for anyone managing Talos Linux nodes. It provides visibility into the disk hardware that Talos can see, which is the foundation for making correct installation and storage configuration decisions. Whether you are deploying a single node or managing a fleet of hundreds, this command gives you the information you need to work with storage confidently in the Talos environment.
