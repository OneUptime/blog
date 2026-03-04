# How to Create Physical Volumes, Volume Groups, and Logical Volumes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, PV, VG, LV, Linux

Description: Step-by-step guide to creating and managing LVM physical volumes, volume groups, and logical volumes on RHEL with practical examples.

---

LVM has three layers of abstraction: Physical Volumes (PVs), Volume Groups (VGs), and Logical Volumes (LVs). Understanding how these layers interact is fundamental to managing storage on RHEL. This guide covers the creation and management of each layer with real commands and practical scenarios.

## The Three LVM Layers

```mermaid
flowchart LR
    subgraph "Physical Volumes"
        PV1[/dev/sdb]
        PV2[/dev/sdc]
        PV3[/dev/sdd]
    end

    subgraph "Volume Groups"
        VG1[appvg]
        VG2[dbvg]
    end

    subgraph "Logical Volumes"
        LV1[app_data]
        LV2[app_logs]
        LV3[db_data]
    end

    PV1 --> VG1
    PV2 --> VG1
    PV3 --> VG2
    VG1 --> LV1
    VG1 --> LV2
    VG2 --> LV3
```

## Working with Physical Volumes

### Creating Physical Volumes

```bash
# Create a PV from a whole disk
sudo pvcreate /dev/sdb

# Create a PV from a partition
sudo pvcreate /dev/sdc1

# Create multiple PVs at once
sudo pvcreate /dev/sdd /dev/sde
```

### Viewing Physical Volume Information

```bash
# Short summary of all PVs
sudo pvs

# Detailed info about a specific PV
sudo pvdisplay /dev/sdb

# Show PV segments (how space is allocated)
sudo pvs -o+pv_used,pv_free
```

### Removing a Physical Volume

```bash
# Remove a PV (must not be part of a VG)
sudo pvremove /dev/sdb
```

## Working with Volume Groups

### Creating Volume Groups

```bash
# Create a VG with one PV
sudo vgcreate appvg /dev/sdb

# Create a VG with multiple PVs
sudo vgcreate dbvg /dev/sdc /dev/sdd

# Create a VG with a specific physical extent size
sudo vgcreate -s 32M storagevg /dev/sde
```

### Viewing Volume Group Information

```bash
# Short summary of all VGs
sudo vgs

# Detailed info
sudo vgdisplay appvg

# Show free and used space
sudo vgs -o+vg_free
```

### Extending a Volume Group

```bash
# Add a new PV to an existing VG
sudo pvcreate /dev/sdf
sudo vgextend appvg /dev/sdf

# Verify the VG now has more space
sudo vgs appvg
```

### Reducing a Volume Group

```bash
# Remove a PV from a VG (must have no data on it)
sudo pvmove /dev/sdb    # Move data off first
sudo vgreduce appvg /dev/sdb

# Remove the PV label
sudo pvremove /dev/sdb
```

## Working with Logical Volumes

### Creating Logical Volumes

```bash
# Create an LV with a specific size
sudo lvcreate -L 100G -n app_data appvg

# Create an LV using a percentage of free space
sudo lvcreate -l 50%FREE -n app_logs appvg

# Create an LV using all remaining space
sudo lvcreate -l 100%FREE -n app_cache appvg
```

### Creating LVs with Specific Options

```bash
# Create a thin pool LV
sudo lvcreate -L 200G --thinpool thin_pool appvg

# Create a thin LV from the pool
sudo lvcreate -V 500G --thin -n thin_data appvg/thin_pool
```

### Viewing Logical Volume Information

```bash
# Short summary
sudo lvs

# Detailed info
sudo lvdisplay appvg/app_data

# Show LV paths and sizes
sudo lvs -o+lv_path,lv_size
```

### Removing a Logical Volume

```bash
# Unmount the filesystem first
sudo umount /data

# Remove the LV
sudo lvremove appvg/app_data

# Confirm when prompted
```

## Putting It All Together

Here is a complete example creating a storage layout for a web server:

```bash
# Initialize disks
sudo pvcreate /dev/sdb /dev/sdc

# Create the volume group
sudo vgcreate webvg /dev/sdb /dev/sdc

# Create logical volumes
sudo lvcreate -L 30G -n www webvg        # Web content
sudo lvcreate -L 10G -n logs webvg       # Log files
sudo lvcreate -l 100%FREE -n db webvg    # Database

# Create filesystems
sudo mkfs.xfs /dev/webvg/www
sudo mkfs.xfs /dev/webvg/logs
sudo mkfs.xfs /dev/webvg/db

# Mount
sudo mkdir -p /var/www /var/log/httpd /var/lib/mysql
sudo mount /dev/webvg/www /var/www
sudo mount /dev/webvg/logs /var/log/httpd
sudo mount /dev/webvg/db /var/lib/mysql

# Verify the layout
lsblk
df -h
```

## Device Paths

LVM creates device nodes in two locations:

```bash
# Traditional path
/dev/vgname/lvname

# Device mapper path
/dev/mapper/vgname-lvname
```

Both paths point to the same device. You can use either in /etc/fstab or mount commands.

## Best Practices

- Do not allocate all VG space to LVs initially, leave room for growth and snapshots
- Use descriptive names for VGs and LVs (e.g., `webvg/www` instead of `vg01/lv01`)
- Document your LVM layout and keep it updated
- Use separate VGs for different workloads when appropriate
- Always verify with `pvs`, `vgs`, and `lvs` after making changes
