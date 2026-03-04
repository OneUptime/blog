# How to Master Logical Volume Management for the RHCSA Exam

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RHCSA, LVM, Storage, Certification, Linux

Description: Master LVM operations tested on the RHCSA exam, including creating physical volumes, volume groups, and logical volumes, as well as resizing them.

---

LVM is heavily tested on the RHCSA exam. You need to know how to create, resize, and manage logical volumes confidently.

## Create Physical Volumes

```bash
# Initialize disks as physical volumes
sudo pvcreate /dev/sdb /dev/sdc

# Verify
sudo pvs
sudo pvdisplay /dev/sdb
```

## Create a Volume Group

```bash
# Create a volume group spanning two PVs
sudo vgcreate examvg /dev/sdb /dev/sdc

# Verify
sudo vgs
sudo vgdisplay examvg
```

## Create Logical Volumes

```bash
# Create a logical volume with a specific size
sudo lvcreate -n datalv -L 5G examvg

# Create a logical volume using a percentage of free space
sudo lvcreate -n loglv -l 50%FREE examvg

# Verify
sudo lvs
sudo lvdisplay /dev/examvg/datalv
```

## Create Filesystems and Mount

```bash
# Create an XFS filesystem
sudo mkfs.xfs /dev/examvg/datalv

# Create an ext4 filesystem
sudo mkfs.ext4 /dev/examvg/loglv

# Create mount points
sudo mkdir -p /mnt/data /mnt/logs

# Mount the filesystems
sudo mount /dev/examvg/datalv /mnt/data
sudo mount /dev/examvg/loglv /mnt/logs

# Add to fstab for persistent mounting
echo "/dev/examvg/datalv /mnt/data xfs defaults 0 0" | sudo tee -a /etc/fstab
echo "/dev/examvg/loglv /mnt/logs ext4 defaults 0 0" | sudo tee -a /etc/fstab
```

## Extend a Logical Volume

```bash
# Extend the logical volume by 2 GB
sudo lvextend -L +2G /dev/examvg/datalv

# Resize the XFS filesystem to use the new space
sudo xfs_growfs /mnt/data

# For ext4, use resize2fs instead
sudo lvextend -L +1G /dev/examvg/loglv
sudo resize2fs /dev/examvg/loglv
```

A handy shortcut combines both steps:

```bash
# Extend LV and resize filesystem in one command
sudo lvextend -L +2G -r /dev/examvg/datalv
```

## Reduce a Logical Volume (ext4 only)

```bash
# XFS cannot be shrunk. For ext4:
sudo umount /mnt/logs
sudo e2fsck -f /dev/examvg/loglv
sudo resize2fs /dev/examvg/loglv 2G
sudo lvreduce -L 2G /dev/examvg/loglv
sudo mount /dev/examvg/loglv /mnt/logs
```

Remember: XFS does not support shrinking. The exam may test whether you know this.
