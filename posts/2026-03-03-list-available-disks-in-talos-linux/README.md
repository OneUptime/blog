# How to List Available Disks in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Management, Linux, Kubernetes, Storage

Description: Learn how to list and inspect available disks on Talos Linux nodes using talosctl and the Talos API for storage planning and troubleshooting.

---

When you are running Talos Linux in production, one of the first things you need to figure out is what disks are available on your nodes. Whether you are planning storage for a Kubernetes cluster, setting up persistent volumes, or troubleshooting disk issues, knowing how to enumerate and inspect disks is fundamental. Talos Linux does not give you a traditional shell, so the usual approach of running `lsblk` or `fdisk -l` directly on the node is not an option. Instead, you work through the Talos API and `talosctl`.

## Why Disk Discovery Matters

Before you can configure volumes, set up encryption, or provision persistent storage for your workloads, you need to know exactly what hardware is available. In a bare-metal deployment, nodes may have different disk configurations. Some might have NVMe drives, others SATA SSDs, and others spinning HDDs. Cloud instances often have ephemeral disks that appear alongside the boot volume. Understanding the disk layout helps you make informed decisions about partitioning, volume management, and storage class selection in Kubernetes.

## Using talosctl to List Disks

The primary tool for interacting with Talos Linux nodes is `talosctl`. To list available disks on a node, you can use the `disks` command:

```bash
# List all disks on a specific node
talosctl disks --nodes 192.168.1.10
```

This command queries the Talos API running on the node and returns a table of all block devices detected by the kernel. The output typically includes columns for the device name, size, model, serial number, and other metadata.

A typical output looks something like this:

```
DEV        MODEL              SERIAL       TYPE   UUID   WWID   MODALIAS      NAME   SIZE     BUS_PATH                                                  SUBSYSTEM   READ_ONLY   SYSTEM_DISK
/dev/sda   Virtual disk        -           HDD    -      -      scsi:...      -      50 GB   /pci0000:00/0000:00:10.0/host0/target0:0:0/0:0:0:0/        /sys/...    false       true
/dev/sdb   Virtual disk        -           HDD    -      -      scsi:...      -      100 GB  /pci0000:00/0000:00:10.0/host0/target0:0:1/0:0:1:0/        /sys/...    false       false
/dev/nvme0n1  Samsung 970 EVO  S4EWNX...   SSD    -      -      pci:...       -      500 GB  /pci0000:00/0000:00:1d.0/0000:3d:00.0/nvme/nvme0/nvme0n1   /sys/...    false       false
```

The `SYSTEM_DISK` column is particularly useful. It tells you which disk Talos is using for its own system partitions. You generally want to avoid using the system disk for workload storage.

## Filtering and Targeting Specific Nodes

If you have a cluster with multiple nodes, you can target all of them at once:

```bash
# List disks across all nodes in the cluster
talosctl disks --nodes 192.168.1.10,192.168.1.11,192.168.1.12
```

Each node's output will be labeled so you can tell which disks belong to which node. This is handy when you are doing a cluster-wide inventory.

You can also use labels or node selectors if you have configured them in your talosconfig:

```bash
# Using a specific context from talosconfig
talosctl disks --context my-cluster --nodes 192.168.1.10
```

## Getting Detailed Disk Information

Beyond the basic listing, you may want to inspect individual disks more closely. The `talosctl get` command with the appropriate resource type gives you structured data:

```bash
# Get block device resources
talosctl get blockdevices --nodes 192.168.1.10
```

This returns block device resources that Talos manages internally. Each block device resource contains detailed information about the device, including its path, size, and type.

For even more detail, you can output the data in YAML or JSON format:

```bash
# Get detailed disk info in YAML format
talosctl get blockdevices --nodes 192.168.1.10 -o yaml
```

The YAML output gives you a complete picture of each disk, including partition tables if they exist, filesystem types, and mount points.

## Inspecting Disk Partitions

To see the partition layout on a specific disk, you can look at the system state:

```bash
# View disk partitions through Talos resource API
talosctl get disks --nodes 192.168.1.10 -o yaml
```

This shows you the current partition table for each disk, including partition sizes, types (like EFI, BIOS boot, Linux filesystem), and labels.

## Checking Disk Health and SMART Data

While Talos does not expose full SMART data through its API by default, you can get basic health indicators from the disk listing. The read-only status, bus path, and device type all give you clues about the disk's configuration and capabilities.

For more detailed health monitoring, you would typically deploy a DaemonSet in your Kubernetes cluster that can access the host devices. Tools like `smartctl` can run in privileged containers to give you SMART data:

```yaml
# Example DaemonSet for disk health monitoring
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: disk-health-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: disk-health
  template:
    metadata:
      labels:
        app: disk-health
    spec:
      containers:
      - name: smartctl
        image: monitoring/smartctl-exporter:latest
        securityContext:
          privileged: true
        volumeMounts:
        - name: dev
          mountPath: /dev
      volumes:
      - name: dev
        hostPath:
          path: /dev
```

## Practical Tips for Disk Discovery

When planning your storage architecture, keep these points in mind:

1. Always check disk availability before applying machine configurations that reference specific devices. If a config references `/dev/sdb` but the disk does not exist on a node, the configuration will fail.

2. Use stable device identifiers whenever possible. Device names like `/dev/sda` can change between reboots. Prefer using disk serial numbers, WWIDs, or bus paths for reliable identification.

3. The system disk is managed by Talos itself. Do not attempt to partition or format it manually. Talos handles the system disk layout automatically.

4. When working with heterogeneous hardware, document the disk layout for each node type. This helps you create appropriate machine configurations for different node roles.

5. NVMe disks appear as `/dev/nvme*` devices and may have different performance characteristics than SATA or SAS devices. Factor this into your storage planning.

## Automating Disk Discovery

You can script disk discovery for large clusters by combining `talosctl` with standard command-line tools:

```bash
# Script to inventory disks across all nodes
#!/bin/bash
NODES="192.168.1.10 192.168.1.11 192.168.1.12"

for node in $NODES; do
  echo "=== Disks on $node ==="
  talosctl disks --nodes "$node" --output table
  echo ""
done
```

For programmatic access, the JSON output format works well with tools like `jq`:

```bash
# Get disk info as JSON and extract sizes
talosctl disks --nodes 192.168.1.10 -o json | jq '.[] | {device: .device, size: .size}'
```

## Wrapping Up

Listing and inspecting disks in Talos Linux is straightforward once you understand that everything goes through `talosctl` and the Talos API. The `disks` command gives you a quick overview, while the resource API (`get blockdevices`, `get disks`) provides deeper inspection capabilities. Make disk discovery a standard part of your cluster setup process, and you will avoid surprises when configuring storage later on. With a solid understanding of what hardware is available on each node, you can confidently move on to volume configuration, encryption, and persistent storage setup for your Kubernetes workloads.
