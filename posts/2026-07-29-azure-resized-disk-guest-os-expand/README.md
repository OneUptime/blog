# Azure Disk Resized but the Guest OS Still Shows the Old Size

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Managed Disks, Disk Resize, Disk Management

Description: Finish an Azure managed disk expansion by rescanning the guest, extending its partition or volume, and growing the Windows or Linux filesystem.

---

Increasing an Azure managed disk changes the virtual block device's capacity. It does not automatically enlarge every structure inside the guest.

The possible layers are:

```text
Azure managed disk
  -> guest block device
  -> partition (if used)
  -> LVM physical volume -> volume group -> logical volume (if used)
  -> filesystem
  -> mounted volume or drive letter
```

If the portal shows the new size but the operating system does not, one or more lower layers still need a rescan or expansion.

## Protect the data first

Before changing a partition table or filesystem:

- verify a recent backup or create a managed disk snapshot;
- identify the correct disk by Azure LUN, size, and serial;
- check filesystem health;
- confirm MBR or GPT partition style;
- check encryption, Storage Spaces, LVM, mdraid, and clustering;
- record current partitions, mounts, and free space.

Azure managed disks can be expanded but not shrunk. A mistaken large size can also move the disk into a higher billing tier.

For clustered or shared disks, coordinate the operation across all attached VMs. Shared-disk and live-resize restrictions differ from ordinary data disks.

## Verify the Azure layer

Check the disk resource:

```bash
az disk show \
  --resource-group myResourceGroup \
  --name myDisk \
  --query "{sizeGiB:diskSizeGb,sku:sku.name,state:diskState,managedBy:managedBy,maxShares:maxShares}" \
  --output table
```

Confirm the VM references that disk:

```bash
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "storageProfile.{os:osDisk.managedDisk.id,data:dataDisks[].{name:name,lun:lun,id:managedDisk.id}}" \
  --output json
```

If Azure rejected the resize, solve that control-plane error first. Depending on VM size, disk type, shared status, current size, and target size, Azure may require VM deallocation or disk detachment. A successful disk-resource update is the prerequisite for guest expansion.

## Linux: discover the real layout

Do not copy `/dev/sda` from an example without checking the VM:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
sudo fdisk -l
findmnt
sudo pvs
sudo vgs
sudo lvs
```

Azure SCSI data disks can be correlated by LUN under `/dev/disk/azure/` on supported images. NVMe-based VMs use different device naming. Use stable identifiers and the current image documentation.

If the kernel still reports the old block-device size, rescan the discovered SCSI disk. For an illustrative `/dev/sda`:

```bash
echo 1 | sudo tee /sys/class/block/sda/device/rescan
sudo fdisk -l /dev/sda
```

A reboot can also make the guest rediscover geometry. On images configured for automatic root-disk growth, cloud-init may expand the root partition and filesystem during boot; otherwise, a reboot alone does not perform those steps.

## Linux: expand a normal partition and filesystem

Suppose discovery shows:

- disk `/dev/sda`;
- root partition `/dev/sda2`;
- XFS mounted at `/`.

Extend partition 2 into contiguous free space:

```bash
sudo growpart /dev/sda 2
```

Then grow XFS by mount point:

```bash
sudo xfs_growfs /
```

For an ext4 filesystem on the partition:

```bash
sudo resize2fs /dev/sda2
```

Use the tool for the actual filesystem. XFS grows while mounted but does not shrink. `resize2fs` does not operate on XFS. Confirm the result:

```bash
lsblk -f
df -hT
```

`growpart` requires its distribution package, commonly `cloud-guest-utils` or `cloud-utils-growpart`.

## Linux: expand an LVM stack

If a partition contains an LVM physical volume, the steps are different. After extending the containing partition:

```bash
sudo pvresize /dev/sda4
sudo pvs
sudo vgs
sudo lvs
```

Then extend the intended logical volume and filesystem. `lvextend -r` asks LVM to resize the filesystem with the logical volume:

```bash
sudo lvextend -r -l +100%FREE /dev/rootvg/rootlv
```

`+100%FREE` consumes all free extents in that volume group. Do not use it if other logical volumes need the capacity. Select an explicit size after reviewing the storage design.

Separate `/var`, `/home`, `/usr`, and application volumes are common. Extend the volume that is actually full.

## Windows: rescan, then extend the partition

Inside the VM, open Disk Management and choose **Action > Rescan Disks**, or use elevated PowerShell:

```powershell
Update-HostStorageCache
Get-Disk | Format-Table Number, FriendlyName, PartitionStyle, Size
Get-Partition | Format-Table DiskNumber, PartitionNumber, DriveLetter, Size
```

For a basic-disk NTFS or ReFS partition whose unallocated space is directly after it:

```powershell
$supported = Get-PartitionSupportedSize -DriveLetter C
Resize-Partition -DriveLetter C -Size $supported.SizeMax
```

Replace `C` only after identifying the correct volume. Verify:

```powershell
Get-Volume | Format-Table DriveLetter, FileSystem, HealthStatus, Size, SizeRemaining
```

If **Extend Volume** is greyed out or the simple `Resize-Partition` workflow is not appropriate, common reasons include:

- a recovery or other partition lies between the volume and unallocated space;
- MBR's 2 TiB partition limit;
- the volume uses a filesystem other than NTFS or ReFS, or has reached an NTFS allocation-unit size limit;
- Azure Disk Encryption has placed a System Reserved partition after the OS volume, or the volume belongs to a clustered shared disk or Storage Spaces layout that requires its own procedure;
- the workload is a SQL Server marketplace VM with a preconfigured storage pool.

Do not delete a recovery partition without the Windows/Azure procedure for the specific layout.

## MBR, GPT, and size boundaries

MBR generally limits a partition to 2 TiB. Linux data disks and Windows data disks that must exceed this size should use GPT. Converting a live production layout is a separate operation with backup and compatibility requirements.

Azure managed OS disks support up to 4,095 GiB, but an MBR guest layout can make only part of that capacity usable. Large data disks have their own supported limits by SKU and scenario.

## Troubleshoot each layer independently

| Observation | Likely missing step |
|---|---|
| Azure disk still has old size | Control-plane resize failed or wrong disk selected |
| Azure size new, guest disk old | Guest rescan or reboot |
| Guest disk new, partition old | Partition expansion |
| Partition or guest disk new, LVM PV or LV old | `pvresize` or logical-volume expansion |
| Partition or LV new, filesystem old | Filesystem expansion |
| Filesystem new, application still full | Wrong mount, quota, reserved blocks, or app config |

After completion, validate application I/O, monitoring, backup, and a controlled reboot. Keep the snapshot until the workload is healthy, then manage its retention deliberately.

## Official Documentation

- [Expand virtual hard disks on a Linux VM](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/expand-disks)
- [Manage and expand Windows VM data disks](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/tutorial-manage-data-disk)
- [Troubleshoot Azure disk resize failures](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-disk-resize)
- [Troubleshoot a Windows volume that cannot be extended](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/cannot-extend-volume-windows-vm)
