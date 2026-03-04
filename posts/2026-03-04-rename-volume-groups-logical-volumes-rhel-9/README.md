# How to Rename Volume Groups and Logical Volumes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, Storage, Linux

Description: Learn how to safely rename LVM volume groups and logical volumes on RHEL, including updating all references in fstab, bootloader, and application configurations.

---

Renaming LVM volume groups and logical volumes is sometimes necessary when consolidating storage, standardizing naming conventions, or repurposing systems. While the rename operations themselves are straightforward, the critical part is updating all references to the old names throughout the system. This guide walks through the complete process on RHEL.

## Prerequisites

- A RHEL system with root or sudo access
- Existing LVM volume groups and logical volumes
- The `lvm2` package installed

## Renaming a Volume Group

### Step 1: Check Current Configuration

List all volume groups and their logical volumes:

```bash
sudo vgs
sudo lvs
```

Identify all references to the volume group you want to rename:

```bash
grep "old_vg" /etc/fstab
```

### Step 2: Rename the Volume Group

Use the `vgrename` command:

```bash
sudo vgrename old_vg new_vg
```

You can also use the volume group UUID:

```bash
sudo vgrename Abc123-xYz4-5678-Abcd-EfGh-IjKl-MnOpQr new_vg
```

Verify the rename:

```bash
sudo vgs
```

### Step 3: Update /etc/fstab

The most important step after renaming is updating `/etc/fstab`. Device paths change when you rename a volume group:

```bash
sudo sed -i 's|/dev/old_vg/|/dev/new_vg/|g' /etc/fstab
```

Verify the changes:

```bash
cat /etc/fstab
```

### Step 4: Update the Bootloader

If the renamed volume group contains the root filesystem or boot partition, update the GRUB configuration:

```bash
sudo sed -i 's/old_vg/new_vg/g' /etc/default/grub
sudo grub2-mkconfig -o /boot/grub2/grub.cfg
```

For UEFI systems:

```bash
sudo grub2-mkconfig -o /boot/efi/EFI/redhat/grub.cfg
```

### Step 5: Rebuild the initramfs

If the root filesystem is on the renamed volume group, rebuild the initramfs to include the new name:

```bash
sudo dracut -f
```

This ensures the system can find the root filesystem during early boot.

## Renaming a Logical Volume

### Step 1: Rename the Logical Volume

Use the `lvrename` command:

```bash
sudo lvrename vg_data lv_old lv_new
```

Or use the full path:

```bash
sudo lvrename /dev/vg_data/lv_old /dev/vg_data/lv_new
```

Verify:

```bash
sudo lvs
```

### Step 2: Update /etc/fstab

```bash
sudo sed -i 's|/dev/vg_data/lv_old|/dev/vg_data/lv_new|g' /etc/fstab
```

### Step 3: Update Mount Points

If the logical volume is currently mounted, remount with the new device path:

```bash
sudo umount /dev/vg_data/lv_old
sudo mount /dev/vg_data/lv_new /mountpoint
```

Or simply remount all:

```bash
sudo umount -a
sudo mount -a
```

## Renaming Both Volume Group and Logical Volume

When renaming both, rename the volume group first, then the logical volume:

```bash
# Rename the volume group
sudo vgrename old_vg new_vg

# Rename the logical volume
sudo lvrename new_vg lv_old lv_new

# Update fstab
sudo sed -i 's|/dev/old_vg/lv_old|/dev/new_vg/lv_new|g' /etc/fstab

# Verify
cat /etc/fstab
sudo lvs
```

## Renaming the Root Volume Group

Renaming the volume group that contains the root filesystem requires extra care. The safest approach is to boot from a rescue environment:

1. Boot from the RHEL installation media and choose the rescue option.
2. Do not mount the installed system (or mount it manually).
3. Activate the volume group:

```bash
vgchange -ay old_vg
```

4. Rename:

```bash
vgrename old_vg new_vg
```

5. Mount the root filesystem:

```bash
mount /dev/new_vg/lv_root /mnt/sysroot
```

6. Update fstab:

```bash
sed -i 's/old_vg/new_vg/g' /mnt/sysroot/etc/fstab
```

7. Update GRUB:

```bash
sed -i 's/old_vg/new_vg/g' /mnt/sysroot/etc/default/grub
```

8. Chroot and rebuild:

```bash
chroot /mnt/sysroot
grub2-mkconfig -o /boot/grub2/grub.cfg
dracut -f
exit
```

9. Reboot:

```bash
reboot
```

## Updating Application References

After renaming, check for any applications or services that reference the old names:

```bash
sudo grep -r "old_vg" /etc/
sudo grep -r "lv_old" /etc/
```

Common locations to check:

- `/etc/fstab` - filesystem mounts
- `/etc/default/grub` - bootloader configuration
- `/etc/exports` - NFS exports
- `/etc/samba/smb.conf` - Samba shares
- Docker or container storage configurations
- Database configuration files that reference data directories
- Systemd mount units in `/etc/systemd/system/`

## Using UUIDs to Avoid Rename Issues

To minimize the impact of future renames, consider using UUIDs in `/etc/fstab` instead of device paths:

```bash
sudo blkid /dev/new_vg/lv_new
```

Then use the UUID in fstab:

```
UUID=abcd1234-ef56-7890-abcd-1234567890ab /data xfs defaults 0 0
```

With UUID-based mounts, renaming the volume group or logical volume does not require fstab updates.

## Conclusion

Renaming LVM volume groups and logical volumes on RHEL is a simple operation, but the follow-up work of updating all system references is where mistakes can cause boot failures or service disruptions. Always check `/etc/fstab`, the bootloader configuration, and any application configs that reference LVM paths. Consider using UUIDs in fstab to reduce the impact of future naming changes.
