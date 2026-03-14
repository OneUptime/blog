# How to Create LUNs and Map Them to iSCSI Targets on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ISCSI, LUN, Targetcli, Storage, Linux

Description: Create and map multiple LUNs to iSCSI targets on RHEL using targetcli for granular storage provisioning.

---

A LUN (Logical Unit Number) represents a block storage device exported through an iSCSI target. You can create multiple LUNs on a single target and control which initiators can access which LUNs. This allows you to carve up your server's storage and allocate it to different clients.

## Creating Multiple Backstores

Each LUN needs a backstore. You can use block devices, files, or ramdisks.

Open targetcli:

```bash
sudo targetcli
```

### Block Backstores

Use physical disks, partitions, or LVM logical volumes:

```bash
/backstores/block create lun0 /dev/sdb
/backstores/block create lun1 /dev/sdc
/backstores/block create lun2 /dev/vg01/lv_data
```

### File Backstores

Create file-based LUNs with a specified size:

```bash
/backstores/fileio create lun0 /var/iscsi/lun0.img 50G
/backstores/fileio create lun1 /var/iscsi/lun1.img 100G
```

File backstores are created as sparse files by default (they grow as data is written). To pre-allocate the space:

```bash
/backstores/fileio create lun0 /var/iscsi/lun0.img 50G write_back=false
```

### Ramdisk Backstores

For testing or high-performance temporary storage:

```bash
/backstores/ramdisk create ramdisk0 1G
```

## Creating the Target and Mapping LUNs

```bash
# Create the target
/iscsi create iqn.2024.com.example:storage1

# Map backstores to LUNs
/iscsi/iqn.2024.com.example:storage1/tpg1/luns create /backstores/block/lun0
/iscsi/iqn.2024.com.example:storage1/tpg1/luns create /backstores/block/lun1
/iscsi/iqn.2024.com.example:storage1/tpg1/luns create /backstores/fileio/lun2
```

LUNs are numbered automatically starting from 0.

## Controlling LUN Access with ACLs

Create ACLs for different initiators and control which LUNs each can see:

```bash
# Create ACLs
/iscsi/iqn.2024.com.example:storage1/tpg1/acls create iqn.2024.com.example:webserver1
/iscsi/iqn.2024.com.example:storage1/tpg1/acls create iqn.2024.com.example:dbserver1

# Map specific LUNs to webserver1 (only LUN 0)
cd /iscsi/iqn.2024.com.example:storage1/tpg1/acls/iqn.2024.com.example:webserver1
create mapped_lun0 /backstores/block/lun0

# Map specific LUNs to dbserver1 (LUN 1 and LUN 2)
cd /iscsi/iqn.2024.com.example:storage1/tpg1/acls/iqn.2024.com.example:dbserver1
create mapped_lun1 /backstores/block/lun1
create mapped_lun2 /backstores/fileio/lun2
```

By default, when you create an ACL, all LUNs in the TPG are automatically mapped. To disable auto-mapping:

```bash
cd /iscsi/iqn.2024.com.example:storage1/tpg1
set attribute default_cmdsn_depth=64
set attribute generate_node_acls=0
```

Then manually map only the LUNs you want.

## Setting LUN Permissions

You can make LUNs read-only:

```bash
# In the ACL mapped_lun
cd /iscsi/iqn.2024.com.example:storage1/tpg1/acls/iqn.2024.com.example:webserver1
create mapped_lun0 /backstores/block/lun0 write_protect=1
```

## Multiple Targets for Different Use Cases

You can create separate targets for different purposes:

```bash
# Target for web servers
/iscsi create iqn.2024.com.example:web-storage
/iscsi/iqn.2024.com.example:web-storage/tpg1/luns create /backstores/block/lun0

# Target for database servers
/iscsi create iqn.2024.com.example:db-storage
/iscsi/iqn.2024.com.example:db-storage/tpg1/luns create /backstores/block/lun1
```

## Using LVM for Flexible LUN Management

LVM makes it easy to create, resize, and snapshot LUNs:

```bash
# Create a volume group on the storage disk
sudo vgcreate vg_iscsi /dev/sdb

# Create logical volumes for each LUN
sudo lvcreate -L 50G -n lun_web vg_iscsi
sudo lvcreate -L 100G -n lun_db vg_iscsi
sudo lvcreate -L 20G -n lun_logs vg_iscsi
```

Then in targetcli:

```bash
/backstores/block create web /dev/vg_iscsi/lun_web
/backstores/block create db /dev/vg_iscsi/lun_db
/backstores/block create logs /dev/vg_iscsi/lun_logs
```

## Verifying the Configuration

```bash
# Show the full configuration tree
ls /

# Show specific target details
ls /iscsi/iqn.2024.com.example:storage1/tpg1/luns/
ls /iscsi/iqn.2024.com.example:storage1/tpg1/acls/
```

Save the configuration:

```bash
saveconfig
exit
```

## On the Initiator Side

After connecting, the initiator sees multiple disks:

```bash
sudo iscsiadm -m session -P 3
```

Each LUN appears as a separate SCSI device:

```bash
Attached scsi disk sdb    State: running
Attached scsi disk sdc    State: running
```

## Conclusion

Mapping LUNs to iSCSI targets gives you flexible storage provisioning. Use block backstores with LVM for production workloads, file backstores for testing or smaller deployments, and ACLs to control which initiators can access which LUNs. This combination lets you manage storage allocation from a central target server.
