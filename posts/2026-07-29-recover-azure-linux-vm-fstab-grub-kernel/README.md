# Recover an Azure Linux VM After fstab, GRUB, or Kernel Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Linux, Disaster Recovery, Troubleshooting

Description: Recover a nonbooting Azure Linux VM using Boot diagnostics, Serial Console, Azure Linux Auto Repair, or a repair VM and chroot workflow.

---

An invalid `/etc/fstab`, damaged GRUB or EFI configuration, broken initramfs, or newly installed kernel can stop an Azure Linux VM before SSH and the Azure Linux Agent start. Recovery should begin with the serial evidence, then use the least invasive path:

1. Serial Console for an online correction;
2. Azure Linux Auto Repair for a supported automated repair;
3. a repair VM and chroot for controlled offline work.

Take or preserve a disk copy before filesystem, bootloader, or package changes.

## Identify the failure from Boot diagnostics

Fetch the serial log:

```bash
az vm boot-diagnostics get-boot-log \
  --resource-group myResourceGroup \
  --name myVM
```

Typical signatures:

| Symptom | Likely area |
|---|---|
| Timed out waiting for a device, then emergency mode | `/etc/fstab`, missing disk, wrong UUID |
| `grub rescue>` or no GRUB menu | GRUB or EFI configuration |
| Kernel panic after selecting latest kernel | Kernel or initramfs |
| Cannot open root device or missing Hyper-V storage modules | initramfs or kernel configuration |
| Filesystem errors and manual fsck prompt | Filesystem corruption |
| No serial output | Serial/GRUB console configuration or earlier platform issue |

Confirm Azure Start succeeded. An allocation failure is not a Linux disk problem.

## Try Serial Console first

Azure Serial Console can work when networking and SSH do not. If the VM reaches emergency or single-user mode, make the narrowest possible correction.

For an `fstab` failure:

```bash
cp -a /etc/fstab /etc/fstab.before-azure-repair
blkid
lsblk -f
vi /etc/fstab
mount -a
```

Use UUIDs instead of volatile device names such as `/dev/sdc`. For a nonessential data disk that may be absent at boot, use documented options such as `nofail` with appropriate timeout behavior. Do not add `nofail` to a critical root filesystem merely to suppress an error.

`mount -a` validates most entries before reboot. It does not fully reproduce early boot ordering, so review `journalctl -xb` after the next boot.

For a bad new kernel, select a known-good older kernel from GRUB when available, boot it, then inspect package and initramfs state. Do not delete the only known-good kernel.

## Use Azure Linux Auto Repair

Azure Linux Auto Repair, or ALAR, runs through the `vm-repair` CLI extension against an OS-disk copy attached to a rescue VM.

Install or update the extension:

```bash
az extension add --name vm-repair --upgrade
```

Create the repair VM:

```bash
az vm repair create \
  --resource-group myResourceGroup \
  --name myVM \
  --verbose
```

The command can prompt for repair credentials and public-IP association. For noninteractive automation, pass the required values through an approved secret workflow and review private-networking options.

Run the action that matches the evidence:

```bash
az vm repair run \
  --resource-group myResourceGroup \
  --name myVM \
  --run-id linux-alar2 \
  --parameters fstab \
  --run-on-repair \
  --verbose
```

Current documented ALAR actions include:

- `fstab` to validate and correct common nonessential mount problems;
- `grubfix` to reinstall GRUB and regenerate configuration;
- `efifix` for Gen2 EFI boot software and `grub.cfg`;
- `initrd` to rebuild initramfs with required Azure Hyper-V modules;
- `kernel` to select a previously installed kernel;
- `serialconsole` to repair serial console configuration;
- `corrupt` for basic, nondestructive filesystem repair attempts.

Choose one or more comma-separated actions only when the diagnosis supports them. Automated repair still changes a disk and requires post-recovery review.

Restore the repaired copy:

```bash
az vm repair restore \
  --resource-group myResourceGroup \
  --name myVM \
  --verbose
```

Microsoft notes that the original and new disks are not deleted during restore. Keep them until validation, then clean up deliberately.

## Repair manually with a rescue VM

Manual repair is appropriate when ALAR does not cover the issue or you need to inspect state before changing it.

The safe workflow is:

1. stop the affected VM;
2. snapshot or copy its OS disk;
3. attach the copy to a compatible Linux repair VM;
4. identify partitions and LVM;
5. mount the root filesystem and any separate `/boot` and EFI partitions;
6. bind virtual filesystems and enter `chroot`;
7. repair configuration or packages;
8. unmount cleanly and swap the repaired disk.

Never assume device names. Identify the copied disk:

```bash
lsblk -o NAME,SIZE,TYPE,FSTYPE,LABEL,UUID,MOUNTPOINT
sudo blkid
sudo pvs
sudo vgs
sudo lvs
```

Device names can change after attachment. If LVM volume-group names collide with the repair VM, use LVM's documented import or activation options rather than activating ambiguously.

An illustrative mount layout is:

```bash
sudo mkdir -p /mnt/repair
sudo mount /dev/mapper/rootvg-rootlv /mnt/repair
sudo mount /dev/sdc2 /mnt/repair/boot
sudo mount /dev/sdc1 /mnt/repair/boot/efi

sudo mount -t proc /proc /mnt/repair/proc
sudo mount -t sysfs /sys /mnt/repair/sys
sudo mount --bind /dev /mnt/repair/dev
sudo mount --bind /dev/pts /mnt/repair/dev/pts
sudo mount --bind /run /mnt/repair/run
sudo chroot /mnt/repair
```

Those device names are placeholders. Mount only the partitions discovered on the copied disk. A distribution with Btrfs subvolumes, encrypted volumes, mdraid, or a different LVM layout needs its own procedure.

## Repair common root causes

### Broken `fstab`

Inside the mounted copy:

```bash
cp -a /etc/fstab /etc/fstab.before-repair
blkid
cat /etc/fstab
mount -a
```

Comment or correct only the failing entry. After boot, reattach missing data disks or replace invalid UUIDs and test the intended mount.

### GRUB or EFI

GRUB commands vary by distribution, firmware generation, and package family. Regenerating configuration might use `update-grub`, `grub2-mkconfig`, or distribution tooling. Installing a bootloader to the wrong disk can damage the repair VM, so follow Microsoft's matching Gen1/Gen2 and distribution article or use ALAR `grubfix`/`efifix`.

### Kernel or initramfs

Keep a known-good kernel. Rebuild initramfs with distribution tools such as `update-initramfs` or `dracut` only after confirming the root and boot mounts. Azure Linux requires Hyper-V modules including `hv_vmbus`, `hv_netvsc`, and `hv_storvsc` in the relevant boot path.

ALAR `kernel` can select a previously installed version, while `initrd` targets a damaged initramfs.

### Filesystem corruption

Do not run a repair tool on a mounted filesystem. Identify its type:

- use `e2fsck` for unmounted ext2, ext3, and ext4 filesystems;
- use `xfs_repair` for unmounted XFS according to XFS guidance.

Filesystem repair can lose data. Preserve a snapshot and use the filesystem-specific Microsoft troubleshooting flow.

## Validate and harden after recovery

After the VM boots:

```bash
systemctl --failed
journalctl -b -p warning
findmnt --verify
lsblk -f
uname -r
```

Then verify:

- SSH and Azure Linux Agent;
- every VM extension;
- data-disk mounts and application services;
- monitoring and backup;
- initramfs for installed kernels;
- a second controlled reboot.

Use UUIDs in `fstab`, retain at least one known-good kernel, test kernel updates in a representative image, and ensure Boot diagnostics and Serial Console are ready before the next failure.

## Official Documentation

- [Troubleshoot Linux VM boot errors due to fstab](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/linux-virtual-machine-cannot-start-fstab-errors)
- [Use Azure Linux Auto Repair](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/repair-linux-vm-using-alar)
- [Troubleshoot Azure Linux VM boot errors](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/boot-error-troubleshoot-linux)
- [Recover from kernel-related boot issues](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/kernel-related-boot-issues)
- [Use a Linux troubleshooting VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-recovery-disks-linux)
