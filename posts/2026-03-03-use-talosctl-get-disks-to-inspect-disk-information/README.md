# How to Use talosctl get disks to Inspect Disk Information

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Disk Inspection, System Administration, Kubernetes

Description: A complete guide to using the talosctl get disks command to inspect disk information on Talos Linux nodes, including output interpretation and practical use cases.

---

When managing Talos Linux nodes, having visibility into the disk hardware is essential. Whether you are planning an installation, troubleshooting storage issues, or auditing your fleet, the `talosctl get disks` command is your primary tool for inspecting disk information. This guide covers everything you need to know about using this command effectively.

## Basic Usage

The simplest form of the command lists all disks detected on a node:

```bash
# List disks on a specific node

talosctl get disks --nodes 192.168.1.10

# Example output:
# NODE          NAMESPACE   TYPE   ID         VERSION   SIZE      READ ONLY   TRANSPORT   ROTATIONAL   WWID                 MODEL              SERIAL
# 192.168.1.10  runtime     Disk   sda        1         480 GB    false       sata        false        naa.55cd2e414f5eab  INTEL SSDSC2KB48   PHYG012345
# 192.168.1.10  runtime     Disk   sdb        1         4.0 TB    false       sata        true         naa.5000cca0123456   HGST HUS726T4TA    V0HK12345
# 192.168.1.10  runtime     Disk   nvme0n1    1         1.0 TB    false       nvme                     nvme.eui.12345678    Samsung 980 PRO    S5GYNG0R1234
```

Each row represents a physical disk (or virtual disk in a VM environment). The ID column shows the Linux block device name.

## Understanding the Output Fields

Let's break down each field in the output:

**NODE** - The IP address or hostname of the Talos node. This is helpful when you query multiple nodes at once.

**NAMESPACE** - Always `runtime` for disk resources. This is the Talos resource namespace.

**TYPE** - The resource type, which is `Disk` for disk devices.

**ID** - The device identifier. This corresponds to the block device name under `/dev/`. For example, `sda` means the disk is at `/dev/sda`.

**VERSION** - The resource version in the Talos API. This increments when the resource changes.

**SIZE** - The total capacity of the disk in a human-readable format.

**READ ONLY** - Whether the disk is in a read-only state.

**TRANSPORT** - The storage transport, such as `sata`, `nvme`, or `virtio`, when Talos can determine it.

**ROTATIONAL** - Whether the disk is rotational media. HDDs typically show `true`; SSDs and NVMe devices typically show `false`.

**WWID** - The disk's World Wide Identifier, when available.

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
  type: Disks.block.talos.dev
  id: sda
  version: 1
  owner: block.DisksController
  phase: running
spec:
  dev_path: /dev/sda
  size: 480103981056
  pretty_size: 480 GB
  io_size: 512
  sector_size: 512
  readonly: false
  cdrom: false
  model: INTEL SSDSC2KB480G8
  serial: PHYG012345678
  modalias: scsi:t-0x00
  wwid: naa.55cd2e414f5eabcd
  bus_path: /pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0
  sub_system: /sys/class/block
  transport: sata
  rotational: false
  symlinks:
    - /dev/disk/by-id/wwn-0x55cd2e414f5eabcd
    - /dev/disk/by-path/pci-0000:00:1f.2-ata-1
```

The YAML output includes several additional fields that are not in the table view:

- **dev_path**: Full block device path, such as `/dev/sda`
- **size**: Exact size in bytes
- **pretty_size**: Human-readable disk size
- **io_size**: I/O size in bytes
- **sector_size**: Sector size in bytes
- **readonly**: Whether the disk is in a read-only state
- **cdrom**: Whether the device is a CD-ROM
- **modalias**: Kernel module alias for the disk controller
- **wwid**: World Wide Identifier, a globally unique disk identifier
- **bus_path**: The physical path through the system bus to the disk
- **sub_system**: The kernel subsystem the disk belongs to
- **transport**: Storage transport for the disk
- **rotational**: Whether the disk is a spinning HDD (true) or SSD/NVMe (false)
- **symlinks**: Stable disk symlink paths, such as `/dev/disk/by-id/...` or `/dev/disk/by-path/...`

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
talosctl get disk sda --nodes 192.168.1.10

# Or with YAML output
talosctl get disk sda --nodes 192.168.1.10 -o yaml
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
# Check which disk Talos is using as the system disk
talosctl get systemdisk --nodes 192.168.1.10 -o yaml

# The disk_id and dev_path fields identify the disk where Talos is installed
```

### Identifying Disks for Storage Configuration

When setting up additional storage (for Rook-Ceph, Longhorn, or local persistent volumes), use `talosctl get disks` to identify available disks:

```bash
# Find disks that are NOT the system disk
talosctl get disks --nodes 192.168.1.10 -o yaml
talosctl get systemdisk --nodes 192.168.1.10 -o yaml

# Compare the disk list with the systemdisk output
# Non-system disks are candidates for additional storage
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
apiVersion: v1alpha1
kind: RawVolumeConfig
name: example-data
provisioning:
  diskSelector:
    match: "disk.size >= 480u * GB && disk.model.startsWith('INTEL') && disk.serial.startsWith('PHYG012345') && !disk.rotational && disk.bus_path.startsWith('/pci0000')"
  minSize: 100GB
  maxSize: 100GB
```

This direct relationship between the inspection command and the configuration options makes it easy to build reliable disk selector expressions based on actual hardware data.

## Combining with Other Commands

The `talosctl get disks` command works well alongside other Talos resource commands:

```bash
# Check disk information
talosctl get disks --nodes 192.168.1.10

# Check mount points to see how partitions are used
talosctl get mountstatus --nodes 192.168.1.10

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
  jq '{id: .metadata.id, size: .spec.size, model: .spec.model, transport: .spec.transport, rotational: .spec.rotational}'
```

This lets you build automation pipelines that make decisions based on disk properties. For example, you could automatically generate machine configurations based on the discovered hardware.

## Troubleshooting with Disk Inspection

If things are not working as expected, `talosctl get disks` is usually the first diagnostic step:

**No disks showing up** - This means the kernel is not detecting any block devices. Check for missing storage drivers or hardware connection issues.

**Fewer disks than expected** - A disk controller might not have its driver loaded, or a disk might be in a failed state. Check the kernel logs with `talosctl dmesg`.

**Wrong system disk** - If `talosctl get systemdisk` identifies the wrong disk, you may need to reinstall Talos on the correct disk.

```bash
# Check kernel messages for disk-related errors
talosctl dmesg --nodes 192.168.1.10 | grep -i "disk\|scsi\|nvme\|ata"
```

## Conclusion

The `talosctl get disks` command is an essential tool for anyone managing Talos Linux nodes. It provides visibility into the disk hardware that Talos can see, which is the foundation for making correct installation and storage configuration decisions. Whether you are deploying a single node or managing a fleet of hundreds, this command gives you the information you need to work with storage confidently in the Talos environment.
