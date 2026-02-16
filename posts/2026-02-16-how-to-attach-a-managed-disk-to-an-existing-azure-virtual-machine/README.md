# How to Attach a Managed Disk to an Existing Azure Virtual Machine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Managed Disks, Virtual Machine, Storage, Azure CLI, Cloud Infrastructure, IaaS

Description: A practical guide to creating and attaching managed disks to an existing Azure VM, including formatting and mounting on Linux and Windows.

---

Storage needs grow over time. Maybe your application logs are eating up space, or you need a dedicated disk for a database. Azure Managed Disks make it straightforward to add storage to a running VM without touching the OS disk. In this guide, I will walk through the process of creating a managed disk, attaching it to an existing VM, and then formatting and mounting it inside the operating system.

## What Are Managed Disks?

Azure Managed Disks are block-level storage volumes managed by Azure. Unlike unmanaged disks, you do not have to worry about storage accounts, IOPS limits per account, or managing VHD files yourself. Azure handles the replication, availability, and infrastructure behind the scenes.

There are several disk types to choose from:

- **Ultra Disk**: Highest performance, sub-millisecond latency. Best for I/O-intensive workloads like SAP HANA or top-tier databases.
- **Premium SSD v2**: Flexible performance tuning without needing to change disk size.
- **Premium SSD**: High performance, low latency. Good for production workloads.
- **Standard SSD**: Cost-effective with decent performance. Good for web servers and light workloads.
- **Standard HDD**: Cheapest option. Suitable for backups, dev/test, and infrequently accessed data.

For most production workloads, Premium SSD is the sweet spot between cost and performance.

## Creating a Managed Disk

You can create a managed disk independently and then attach it, or you can create and attach it in a single step. Let me show both approaches.

First, the standalone creation approach:

```bash
# Create a 128 GB Premium SSD managed disk
az disk create \
  --resource-group myResourceGroup \
  --name myDataDisk \
  --size-gb 128 \
  --sku Premium_LRS \
  --location eastus
```

The `--sku` parameter determines the disk type. The options are:

- `Premium_LRS` for Premium SSD
- `StandardSSD_LRS` for Standard SSD
- `Standard_LRS` for Standard HDD
- `UltraSSD_LRS` for Ultra Disk
- `PremiumV2_LRS` for Premium SSD v2

The `LRS` suffix stands for Locally Redundant Storage, meaning three copies of your data are kept within a single datacenter.

## Attaching the Disk to a VM

Now attach the disk you just created to your existing VM:

```bash
# Attach the existing managed disk to a VM
az vm disk attach \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name myDataDisk
```

This operation does not require a VM restart. The disk appears as a new block device inside the operating system.

## Creating and Attaching in One Step

If you prefer a single command, you can skip the separate creation step:

```bash
# Create a new 256 GB Premium SSD and attach it to the VM in one step
az vm disk attach \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name myNewDataDisk \
  --size-gb 256 \
  --sku Premium_LRS \
  --new
```

The `--new` flag tells Azure to create the disk if it does not already exist. This is convenient for quick additions.

## Formatting and Mounting on Linux

After attaching the disk, SSH into your Linux VM. The disk will show up as a raw block device that needs to be partitioned, formatted, and mounted.

Find the new disk:

```bash
# List all block devices to find the newly attached disk
lsblk
```

You should see something like `/dev/sdc` with no partitions. The exact device name depends on how many disks are already attached. Look for the one that matches the size you specified.

Create a partition:

```bash
# Create a single partition spanning the entire disk
sudo parted /dev/sdc --script mklabel gpt mkpart primary ext4 0% 100%
```

Format the partition with ext4:

```bash
# Format the partition with the ext4 filesystem
sudo mkfs.ext4 /dev/sdc1
```

Create a mount point and mount the disk:

```bash
# Create the mount point directory
sudo mkdir -p /datadrive

# Mount the partition to the mount point
sudo mount /dev/sdc1 /datadrive
```

To make the mount persistent across reboots, add it to `/etc/fstab`. But instead of using the device name (which can change), use the UUID:

```bash
# Get the UUID of the partition
sudo blkid /dev/sdc1
```

This outputs something like `UUID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`. Add a line to `/etc/fstab`:

```bash
# Add the mount entry to fstab for persistence across reboots
echo "UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx /datadrive ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab
```

The `nofail` option is important. It prevents the VM from failing to boot if the disk is not available for some reason.

## Formatting and Mounting on Windows

If you are running a Windows VM, the process uses Disk Management or PowerShell.

Connect to your VM via RDP, then open PowerShell as Administrator:

```powershell
# List all raw disks that have not been initialized
Get-Disk | Where-Object PartitionStyle -eq 'RAW'

# Initialize the disk with GPT partition style
Initialize-Disk -Number 2 -PartitionStyle GPT

# Create a new partition using all available space and assign drive letter F
New-Partition -DiskNumber 2 -UseMaximumSize -DriveLetter F

# Format the partition with NTFS
Format-Volume -DriveLetter F -FileSystem NTFS -NewFileSystemLabel "DataDisk" -Confirm:$false
```

The disk number might be different on your VM. Check the output of `Get-Disk` to find the right one.

## Setting Disk Caching

Azure lets you configure caching for each data disk. The caching policy affects performance depending on your workload:

- **None**: No caching. Best for write-heavy workloads like databases with their own caching layer.
- **ReadOnly**: Caches reads in local storage. Good for read-heavy workloads.
- **ReadWrite**: Caches both reads and writes. Good for the OS disk but risky for data disks because cached writes can be lost during a crash.

Set the caching policy on an attached disk:

```bash
# Set read-only caching on a data disk
az vm disk attach \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name myDataDisk \
  --caching ReadOnly
```

For databases, I generally recommend setting caching to `None` and letting the database engine manage its own caching.

## Attaching Multiple Disks

The number of data disks you can attach depends on the VM size. For example, a `Standard_D4s_v5` supports up to 8 data disks. You can check the limit:

```bash
# Check the maximum number of data disks for a VM size
az vm list-sizes --location eastus \
  --query "[?name=='Standard_D4s_v5'].{Name:name, MaxDataDisks:maxDataDiskCount}" \
  --output table
```

If you need to attach multiple disks, you can script it:

```bash
# Attach three 128 GB disks to a VM
for i in 1 2 3; do
  az vm disk attach \
    --resource-group myResourceGroup \
    --vm-name myVM \
    --name "datadisk-${i}" \
    --size-gb 128 \
    --sku Premium_LRS \
    --new
done
```

## Detaching a Disk

If you need to remove a data disk from a VM, you can detach it without deleting the disk:

```bash
# Detach the data disk from the VM (disk is preserved)
az vm disk detach \
  --resource-group myResourceGroup \
  --vm-name myVM \
  --name myDataDisk
```

The disk still exists in your resource group after detaching. You can attach it to a different VM or delete it:

```bash
# Delete a managed disk that is no longer needed
az disk delete \
  --resource-group myResourceGroup \
  --name myDataDisk \
  --yes
```

## Monitoring Disk Performance

After attaching your disk, keep an eye on its performance metrics. Azure provides metrics like disk IOPS consumed, throughput, and queue depth through Azure Monitor.

```bash
# Get disk metrics for the last hour
az monitor metrics list \
  --resource "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Compute/disks/myDataDisk" \
  --metric "Composite Disk Read Operations/sec" \
  --interval PT1M \
  --output table
```

If you consistently see IOPS near the disk limit, it might be time to upgrade to a larger disk (which comes with higher IOPS limits) or switch to a higher performance tier.

## Wrapping Up

Attaching managed disks to Azure VMs is a hot-plug operation that does not require downtime. The whole process takes a few minutes from the Azure side, and then a few more minutes to partition, format, and mount inside the OS. Plan your disk types based on your workload profile, remember to use UUIDs in fstab, and set appropriate caching policies. This is one of those tasks that feels tedious the first time but becomes second nature after you have done it a couple of times.
