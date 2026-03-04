# How to Configure LVM on SAN Storage in RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, SAN, Storage, Linux

Description: Learn how to configure Logical Volume Manager (LVM) on SAN-attached storage in RHEL, including multipath setup, physical volume creation, and best practices for enterprise storage.

---

Storage Area Networks (SANs) provide shared block storage that can be presented to multiple servers. Configuring LVM on top of SAN storage in RHEL allows you to take advantage of logical volume management features such as resizing, snapshots, and flexible allocation while using enterprise-grade storage infrastructure. This guide covers the end-to-end process.

## Prerequisites

- A RHEL system with root or sudo access
- SAN storage LUNs already provisioned and zoned to your server
- Fibre Channel HBAs or iSCSI initiator configured
- The `lvm2` and `device-mapper-multipath` packages installed

## Step 1: Verify SAN Connectivity

First, confirm that your server can see the SAN LUNs. For Fibre Channel:

```bash
sudo cat /sys/class/fc_host/host*/port_state
```

You should see `Online` for each HBA port. Scan for new LUNs:

```bash
sudo rescan-scsi-bus.sh
```

Or manually trigger a rescan:

```bash
echo "- - -" | sudo tee /sys/class/scsi_host/host*/scan
```

For iSCSI, discover and log in to targets:

```bash
sudo iscsiadm -m discovery -t sendtargets -p <san_ip>
sudo iscsiadm -m node --login
```

Verify the new devices appear:

```bash
sudo lsblk
```

## Step 2: Configure Multipath

SAN storage typically presents multiple paths to each LUN for redundancy. Configure Device Mapper Multipath to manage these paths.

Install and enable multipath:

```bash
sudo dnf install device-mapper-multipath -y
sudo mpathconf --enable --with_multipathd y
```

Start the multipath daemon:

```bash
sudo systemctl enable --now multipathd
```

Check the multipath topology:

```bash
sudo multipath -ll
```

You should see each LUN with multiple paths listed. Example output:

```bash
mpatha (360000000000000001) dm-2 VENDOR,PRODUCT
size=100G features='0' hwhandler='0' wp=rw
|-+- policy='service-time 0' prio=1 status=active
| `- 1:0:0:1 sdb 8:16 active ready running
`-+- policy='service-time 0' prio=1 status=enabled
  `- 2:0:0:1 sdc 8:32 active ready running
```

## Step 3: Configure LVM to Use Multipath Devices

Edit the LVM configuration to filter out individual path devices and only use multipath devices:

```bash
sudo vi /etc/lvm/lvm.conf
```

Find the `filter` line and set it to accept only multipath devices:

```bash
filter = [ "a|/dev/mapper/mpath.*|", "a|/dev/sda|", "r|.*|" ]
```

This accepts multipath devices and your local boot disk (`/dev/sda`) while rejecting everything else. This prevents LVM from seeing the same LUN through individual paths.

Also ensure the `preferred_names` setting prioritizes multipath names:

```bash
preferred_names = [ "^/dev/mapper/mpath" ]
```

## Step 4: Create Physical Volumes on SAN LUNs

Use the multipath device names to create physical volumes:

```bash
sudo pvcreate /dev/mapper/mpatha
sudo pvcreate /dev/mapper/mpathb
```

Verify the physical volumes:

```bash
sudo pvs
```

## Step 5: Create a Volume Group

Create a volume group spanning one or more SAN LUNs:

```bash
sudo vgcreate vg_san /dev/mapper/mpatha /dev/mapper/mpathb
```

Verify:

```bash
sudo vgdisplay vg_san
```

## Step 6: Create Logical Volumes

Create logical volumes as needed:

```bash
sudo lvcreate -L 50G -n lv_data vg_san
sudo lvcreate -L 20G -n lv_logs vg_san
```

List logical volumes:

```bash
sudo lvs
```

## Step 7: Create File Systems and Mount

Format the logical volumes:

```bash
sudo mkfs.xfs /dev/vg_san/lv_data
sudo mkfs.xfs /dev/vg_san/lv_logs
```

Create mount points and mount:

```bash
sudo mkdir -p /data /logs
sudo mount /dev/vg_san/lv_data /data
sudo mount /dev/vg_san/lv_logs /logs
```

## Step 8: Configure Persistent Mounts

Add entries to `/etc/fstab` for persistent mounts. Use the LVM device path:

```bash
echo '/dev/vg_san/lv_data /data xfs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
echo '/dev/vg_san/lv_logs /logs xfs defaults,_netdev 0 0' | sudo tee -a /etc/fstab
```

The `_netdev` option tells the system that the filesystem depends on network access, which ensures it waits for SAN connectivity before attempting to mount.

## Step 9: Test the Configuration

Verify everything is mounted correctly:

```bash
df -h /data /logs
```

Test fstab by unmounting and remounting:

```bash
sudo umount /data /logs
sudo mount -a
df -h /data /logs
```

## Best Practices for LVM on SAN

### Use Consistent LUN Naming

Configure multipath aliases in `/etc/multipath.conf` for easier identification:

```bash
multipaths {
    multipath {
        wwid 360000000000000001
        alias san_data_01
    }
    multipath {
        wwid 360000000000000002
        alias san_data_02
    }
}
```

Reload multipath after changes:

```bash
sudo systemctl reload multipathd
```

### Set Appropriate Queue Depth

For high-performance SAN workloads, adjust the SCSI queue depth:

```bash
echo 64 | sudo tee /sys/block/sdb/device/queue_depth
```

To make this persistent, create a udev rule.

### Monitor Path Health

Regularly check multipath status:

```bash
sudo multipath -ll
sudo multipathd show paths
```

### Avoid Mixing Local and SAN Disks in a Volume Group

Keep SAN-based volume groups separate from local disk volume groups. This simplifies management and prevents issues if SAN connectivity is lost.

### Configure LVM System ID

When SAN LUNs might be visible to multiple servers, configure LVM system IDs to prevent accidental access:

```bash
sudo vi /etc/lvm/lvm.conf
```

Set:

```bash
system_id_source = "uname"
```

Then stamp the volume group:

```bash
sudo vgchange --systemid $(uname -n) vg_san
```

## Conclusion

Configuring LVM on SAN storage in RHEL combines the flexibility of logical volume management with the reliability and performance of enterprise SAN infrastructure. By properly configuring multipath, LVM filters, and persistent mounts with the `_netdev` option, you create a robust storage stack that handles path failures gracefully and provides the volume management features you need for production workloads.
