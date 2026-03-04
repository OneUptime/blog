# How to Configure an iSCSI Target with targetcli on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, iSCSI, targetcli, Storage, SAN, Linux

Description: Set up an iSCSI target on RHEL using targetcli to share block storage over the network for SAN-like functionality.

---

iSCSI (Internet Small Computer Systems Interface) lets you share block storage devices over a TCP/IP network. The server sharing the storage is called the "target" and the client consuming it is the "initiator." On RHEL, the `targetcli` tool provides an interactive shell for configuring iSCSI targets using the LIO (Linux-IO) kernel target subsystem.

## Key Concepts

- **Target**: The server that exports storage
- **Initiator**: The client that connects to the target
- **LUN (Logical Unit Number)**: A block device exported through the target
- **IQN (iSCSI Qualified Name)**: A unique identifier for targets and initiators
- **TPG (Target Portal Group)**: Defines the network endpoint (IP + port) for the target

## Prerequisites

- RHEL server with a spare disk or partition for storage
- Network connectivity between target and initiator

## Step 1: Install targetcli

```bash
sudo dnf install -y targetcli
```

Enable and start the target service:

```bash
sudo systemctl enable --now target
```

## Step 2: Create a Backing Store

You need a block device or file to back the iSCSI LUN. Options include:

**Option A: Use a physical disk or partition**

```bash
# List available disks
lsblk
```

**Option B: Create a file-backed store**

```bash
sudo mkdir -p /var/iscsi-storage
sudo dd if=/dev/zero of=/var/iscsi-storage/lun0.img bs=1M count=10240
```

## Step 3: Configure with targetcli

Launch the interactive shell:

```bash
sudo targetcli
```

### Create a Backstores Object

For a block device:

```bash
/backstores/block create disk0 /dev/sdb
```

For a file:

```bash
/backstores/fileio create disk0 /var/iscsi-storage/lun0.img 10G
```

### Create the iSCSI Target

```bash
/iscsi create iqn.2024.com.example:target1
```

### Create a LUN

```bash
/iscsi/iqn.2024.com.example:target1/tpg1/luns create /backstores/block/disk0
```

### Configure Access (ACL)

Create an ACL for the initiator. The IQN must match the initiator's configured name:

```bash
/iscsi/iqn.2024.com.example:target1/tpg1/acls create iqn.2024.com.example:client1
```

### Set the Portal (IP Address)

By default, the target listens on 0.0.0.0:3260. To bind to a specific IP:

```bash
/iscsi/iqn.2024.com.example:target1/tpg1/portals delete 0.0.0.0 3260
/iscsi/iqn.2024.com.example:target1/tpg1/portals create 192.168.1.10 3260
```

### Save and Exit

```bash
saveconfig
exit
```

## Step 4: Configure the Firewall

```bash
sudo firewall-cmd --permanent --add-port=3260/tcp
sudo firewall-cmd --reload
```

## Step 5: Verify the Configuration

```bash
sudo targetcli ls
```

This shows the full configuration tree:

```bash
o- / .............................................................. [...]
  o- backstores .................................................... [...]
  | o- block ............................................ [Storage Objects: 1]
  | | o- disk0 ................. [/dev/sdb (10.0GiB) write-thru activated]
  o- iscsi .................................................. [Targets: 1]
  | o- iqn.2024.com.example:target1 ............................ [TPGs: 1]
  |   o- tpg1 .................................... [no-gen-acls, no-auth]
  |     o- acls .............................................. [ACLs: 1]
  |     | o- iqn.2024.com.example:client1 ........... [Mapped LUNs: 1]
  |     |   o- mapped_lun0 ................... [lun0 block/disk0 (rw)]
  |     o- luns .............................................. [LUNs: 1]
  |     | o- lun0 ..................... [block/disk0 (/dev/sdb) (default_tg)]
  |     o- portals ........................................ [Portals: 1]
  |       o- 192.168.1.10:3260 .................................... [OK]
```

## Persistent Configuration

The `target` service automatically saves and restores configuration. Verify the saved config:

```bash
cat /etc/target/saveconfig.json
```

## Conclusion

You now have an iSCSI target configured on RHEL using targetcli. The next step is setting up an iSCSI initiator on the client to discover and log in to this target. For production use, add CHAP authentication and consider multipathing for redundancy.
