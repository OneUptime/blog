# How to Install and Configure DM-Multipath on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DM-Multipath, SAN, Storage, Linux

Description: Install and configure DM-Multipath on RHEL to provide redundant paths to SAN storage devices for improved reliability and performance.

---

DM-Multipath (Device Mapper Multipath) combines multiple I/O paths between a server and its storage into a single device. When one path fails, I/O automatically switches to another path. This is essential for servers connected to SAN (Storage Area Network) storage through Fibre Channel or iSCSI with multiple network paths.

## How Multipath Works

Without multipath, a server with two HBAs (Host Bus Adapters) connected to the same SAN LUN sees two separate block devices (e.g., `/dev/sdb` and `/dev/sdc`) that are actually the same physical storage. Multipath recognizes they are the same device and presents them as a single multipath device (`/dev/mapper/mpathX`).

```
Server                              SAN Storage
+--------+                          +---------+
| HBA 0  |----[ FC Switch A ]------>| Port 0  |
|        |                          |  LUN 0  |
| HBA 1  |----[ FC Switch B ]------>| Port 1  |
+--------+                          +---------+

Without multipath: /dev/sdb, /dev/sdc (same LUN!)
With multipath:    /dev/mapper/mpath0 (single device)
```

## Step 1: Install DM-Multipath

```bash
sudo dnf install -y device-mapper-multipath
```

## Step 2: Generate the Default Configuration

```bash
sudo mpathconf --enable --with_multipathd y
```

This creates `/etc/multipath.conf` with default settings and enables the multipathd service.

## Step 3: Start the Service

```bash
sudo systemctl enable --now multipathd
sudo systemctl status multipathd
```

## Step 4: Verify Multipath Detection

```bash
# List all multipath devices
sudo multipath -ll

# Show all paths
sudo multipath -v2

# Flush and rediscover
sudo multipath -F
sudo multipath -v2
```

## Default Configuration

The generated `/etc/multipath.conf` contains:

```bash
cat /etc/multipath.conf
```

Key default settings:

```
defaults {
    user_friendly_names yes
    find_multipaths yes
}
```

- `user_friendly_names yes`: Uses names like `mpatha`, `mpathb` instead of WWIDs
- `find_multipaths yes`: Only creates multipath devices when multiple paths exist

## Understanding multipath -ll Output

```bash
sudo multipath -ll
```

```
mpatha (3600508b4000c4a37) dm-0 DGC,RAID 5
size=100G features='1 queue_if_no_path' hwhandler='1 emc' wp=rw
|-+- policy='round-robin 0' prio=1 status=active
| |- 3:0:0:0 sdb 8:16 active ready running
| `- 3:0:1:0 sdd 8:48 active ready running
`-+- policy='round-robin 0' prio=0 status=enabled
  |- 4:0:0:0 sdc 8:32 active ready running
  `- 4:0:1:0 sde 8:64 active ready running
```

Reading this output:
- `mpatha`: The multipath device name
- `3600508b4000c4a37`: The WWID (World Wide Identifier)
- `dm-0`: The device-mapper device
- Two path groups, each with two paths
- `active ready running`: Path is working normally

## Step 5: Use Multipath Devices

Always use the multipath device, not individual paths:

```bash
# Format
sudo mkfs.xfs /dev/mapper/mpatha

# Mount
sudo mkdir -p /mnt/san
sudo mount /dev/mapper/mpatha /mnt/san

# In fstab (use the dm device or WWID)
echo '/dev/mapper/mpatha /mnt/san xfs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
```

## Basic multipathd Commands

```bash
# Show topology
sudo multipathd show topology

# Show paths
sudo multipathd show paths

# Show maps
sudo multipathd show maps

# Reconfigure after editing multipath.conf
sudo multipathd reconfigure

# Add a new path
sudo multipathd add path sdf

# Remove a path
sudo multipathd remove path sdf
```

## Conclusion

DM-Multipath is essential for any RHEL server connected to SAN storage. It provides path redundancy and can improve I/O performance through load balancing. Install it, generate the default configuration, and always use multipath device paths instead of individual SCSI device paths for reliable storage access.
