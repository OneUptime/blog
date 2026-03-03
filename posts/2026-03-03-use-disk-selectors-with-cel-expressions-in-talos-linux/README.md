# How to Use Disk Selectors with CEL Expressions in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Selectors, CEL Expressions, Storage, Kubernetes

Description: Master disk selectors using CEL expressions in Talos Linux to target specific disks dynamically based on hardware attributes.

---

One of the challenges with managing storage in a Kubernetes cluster is dealing with varying hardware. Different nodes might have different disk models, sizes, and types. Hard-coding device paths like `/dev/sda` into your configuration is brittle - device names can shift between reboots or when hardware changes. Talos Linux solves this with disk selectors that use CEL (Common Expression Language) expressions. CEL gives you a powerful, flexible way to match disks based on their actual properties rather than their device names.

## What is CEL?

CEL stands for Common Expression Language. It is a lightweight expression language developed by Google that is used in various cloud-native projects. If you have worked with Kubernetes CEL validation rules or Google Cloud IAM conditions, you have seen CEL before. It provides a safe, side-effect-free way to evaluate boolean expressions against structured data.

In the context of Talos Linux, CEL expressions evaluate against disk attributes to determine which disk should be used for a particular volume.

## Available Disk Attributes

When writing CEL expressions for disk selectors, you have access to these disk attributes:

- `disk.size` - the total size of the disk in bytes
- `disk.name` - the device name (e.g., "sda", "nvme0n1")
- `disk.model` - the disk model string
- `disk.serial` - the disk serial number
- `disk.modalias` - the kernel modalias string
- `disk.uuid` - the disk UUID
- `disk.wwid` - the World Wide ID
- `disk.type` - the disk type ("ssd" or "hdd")
- `disk.busPath` - the sysfs bus path
- `disk.subsystem` - the subsystem (e.g., "block")
- `disk.readOnly` - whether the disk is read-only (boolean)
- `disk.systemDisk` - whether Talos is using this as the system disk (boolean)
- `disk.transport` - the transport type (e.g., "nvme", "sata", "scsi")

You also have size constants available: `KB`, `MB`, `GB`, `TB` which can be used with the unsigned integer suffix `u` for size comparisons.

## Basic CEL Disk Selector Examples

Here is a simple selector that matches any SSD:

```yaml
machine:
  disks:
    - deviceSelector:
        match: 'disk.type == "ssd"'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

Matching by size threshold:

```yaml
machine:
  disks:
    - deviceSelector:
        match: 'disk.size >= 100u * GB'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

Matching by transport type to specifically target NVMe drives:

```yaml
machine:
  disks:
    - deviceSelector:
        match: 'disk.transport == "nvme"'
      partitions:
        - mountpoint: /var/mnt/fast-data
          size: 0
```

## Combining Conditions

CEL supports logical operators, so you can combine multiple conditions:

```yaml
machine:
  disks:
    - deviceSelector:
        # Match an SSD that is at least 200GB and not the system disk
        match: 'disk.type == "ssd" && disk.size >= 200u * GB && !disk.systemDisk'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

You can use `&&` (AND), `||` (OR), and `!` (NOT) to build complex matching rules:

```yaml
machine:
  disks:
    - deviceSelector:
        # Match either an NVMe drive or a large SSD
        match: 'disk.transport == "nvme" || (disk.type == "ssd" && disk.size >= 500u * GB)'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

## Matching by Model or Serial Number

For environments where you need to target specific hardware:

```yaml
machine:
  disks:
    - deviceSelector:
        # Match a specific disk model
        match: 'disk.model == "Samsung SSD 970 EVO Plus"'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

```yaml
machine:
  disks:
    - deviceSelector:
        # Match a specific disk by serial number
        match: 'disk.serial == "S4EWNX0M123456"'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

Serial numbers are unique identifiers, so this is the most precise way to target a specific physical disk.

## Using String Functions

CEL provides string functions that are useful for partial matching:

```yaml
machine:
  disks:
    - deviceSelector:
        # Match any Samsung disk
        match: 'disk.model.startsWith("Samsung")'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

```yaml
machine:
  disks:
    - deviceSelector:
        # Match disks with "EVO" in the model name
        match: 'disk.model.contains("EVO")'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

Available string methods include `startsWith()`, `endsWith()`, `contains()`, and `matches()` for regex patterns.

## Bus Path Matching

Bus paths provide a stable way to identify disk slots on a server. Even if the disk is replaced, the bus path stays the same as long as the new disk goes into the same physical slot:

```yaml
machine:
  disks:
    - deviceSelector:
        # Match a disk in a specific PCIe slot
        match: 'disk.busPath.startsWith("/pci0000:00/0000:00:1d.0")'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

This is particularly useful in bare-metal environments where you want to assign specific disk slots to specific purposes.

## Size Range Matching

When you need disks within a certain size range:

```yaml
machine:
  disks:
    - deviceSelector:
        # Match disks between 100GB and 500GB
        match: 'disk.size >= 100u * GB && disk.size <= 500u * GB'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

This prevents accidentally matching very small or very large disks that might be intended for other purposes.

## Excluding the System Disk

Almost always, you want to exclude the system disk when selecting disks for workload storage:

```yaml
machine:
  disks:
    - deviceSelector:
        # Any non-system SSD
        match: '!disk.systemDisk && disk.type == "ssd"'
      partitions:
        - mountpoint: /var/mnt/data
          size: 0
```

The `disk.systemDisk` boolean makes this straightforward.

## Using CEL with Volume Configurations

CEL disk selectors also work with volume configurations for system volumes like EPHEMERAL:

```yaml
machine:
  volumes:
    - name: EPHEMERAL
      provisioning:
        diskSelector:
          match: 'disk.transport == "nvme" && !disk.systemDisk'
        grow: true
```

This moves the EPHEMERAL volume to a non-system NVMe disk, which can significantly improve container runtime performance.

## Debugging CEL Expressions

If your disk selector is not matching as expected, start by listing all available disks and their properties:

```bash
# List all disks with details
talosctl disks --nodes 192.168.1.10

# Get full disk properties in YAML
talosctl get disks --nodes 192.168.1.10 -o yaml
```

Compare the actual disk attributes with your CEL expression. Common mistakes include:

- Forgetting the unsigned integer suffix (`u`) when using size constants. Write `100u * GB`, not `100 * GB`.
- Case sensitivity in string comparisons. Disk model strings are case-sensitive.
- Missing the negation on `systemDisk`. If you do not exclude the system disk, your selector might match it.

## Practical Example: Multi-Tier Storage

Here is a real-world example that sets up tiered storage using CEL selectors:

```yaml
machine:
  disks:
    # Fast tier - NVMe for database workloads
    - deviceSelector:
        match: 'disk.transport == "nvme" && !disk.systemDisk'
      partitions:
        - mountpoint: /var/mnt/fast
          size: 0
    # Capacity tier - large SATA SSDs for general storage
    - deviceSelector:
        match: 'disk.type == "ssd" && disk.transport != "nvme" && disk.size >= 1u * TB'
      partitions:
        - mountpoint: /var/mnt/capacity
          size: 0
    # Archive tier - HDDs for cold storage
    - deviceSelector:
        match: 'disk.type == "hdd" && !disk.readOnly'
      partitions:
        - mountpoint: /var/mnt/archive
          size: 0
```

## Summary

CEL expressions in Talos Linux disk selectors give you a robust, flexible way to target the right disks for the right purposes. Instead of relying on fragile device paths, you describe what kind of disk you want based on its actual properties. This makes your configurations portable across different hardware and resilient to device name changes. Start with simple selectors and compose more complex ones as your needs grow. Always verify your expressions against actual disk properties using `talosctl disks` to ensure your selectors match the intended devices.
