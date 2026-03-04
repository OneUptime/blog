# How to Master Logical Volume Management for the RHCSA Exam

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Certification

Description: Step-by-step guide on master logical volume management for the rhcsa exam with practical examples and commands.

---

LVM is a critical topic on the RHCSA exam. This guide covers all LVM operations you need to master for RHEL certification.

## Physical Volumes

```bash
# Create physical volumes
sudo pvcreate /dev/sdb /dev/sdc

# Display PV information
sudo pvs
sudo pvdisplay /dev/sdb
```

## Volume Groups

```bash
# Create a volume group
sudo vgcreate exam_vg /dev/sdb /dev/sdc

# Extend a volume group
sudo vgextend exam_vg /dev/sdd

# Display VG information
sudo vgs
sudo vgdisplay exam_vg
```

## Logical Volumes

```bash
# Create a logical volume with a fixed size
sudo lvcreate -L 5G -n data_lv exam_vg

# Create a logical volume using percentage of free space
sudo lvcreate -l 50%FREE -n logs_lv exam_vg

# Display LV information
sudo lvs
sudo lvdisplay /dev/exam_vg/data_lv
```

## Create and Mount File Systems

```bash
# Create XFS filesystem
sudo mkfs.xfs /dev/exam_vg/data_lv

# Create ext4 filesystem
sudo mkfs.ext4 /dev/exam_vg/logs_lv

# Create mount points and mount
sudo mkdir -p /mnt/data /mnt/logs
sudo mount /dev/exam_vg/data_lv /mnt/data
sudo mount /dev/exam_vg/logs_lv /mnt/logs
```

## Add Persistent Mounts

```bash
# Add to /etc/fstab
echo '/dev/exam_vg/data_lv /mnt/data xfs defaults 0 0' | sudo tee -a /etc/fstab
echo '/dev/exam_vg/logs_lv /mnt/logs ext4 defaults 0 0' | sudo tee -a /etc/fstab

# Verify fstab entries
sudo mount -a
df -h
```

## Extend Logical Volumes

```bash
# Extend an LV and resize the XFS filesystem
sudo lvextend -L +2G /dev/exam_vg/data_lv
sudo xfs_growfs /mnt/data

# Extend an LV and resize ext4 in one step
sudo lvextend -L +1G -r /dev/exam_vg/logs_lv
```

## Reduce a Logical Volume (ext4 only)

```bash
sudo umount /mnt/logs
sudo e2fsck -f /dev/exam_vg/logs_lv
sudo resize2fs /dev/exam_vg/logs_lv 3G
sudo lvreduce -L 3G /dev/exam_vg/logs_lv
sudo mount /dev/exam_vg/logs_lv /mnt/logs
```

## Remove LVM Components

```bash
sudo umount /mnt/data
sudo lvremove /dev/exam_vg/data_lv
sudo vgremove exam_vg
sudo pvremove /dev/sdb /dev/sdc
```

## Practice Exercises

1. Create a 10 GB logical volume, format it as XFS, mount it persistently
2. Extend the logical volume by 5 GB and grow the filesystem
3. Create a volume group spanning three disks with a 2 GB logical volume

## Conclusion

LVM management is heavily tested on the RHCSA exam. Practice creating, extending, and managing LVM components until the commands become second nature.

