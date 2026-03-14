# How to Set Up an iSCSI Initiator and Discover Targets on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ISCSI, Initiator, Storage, SAN, Linux

Description: Configure an iSCSI initiator on RHEL to discover and connect to iSCSI targets, making remote block storage available as local disks.

---

The iSCSI initiator is the client side of an iSCSI connection. It discovers targets on the network, logs in to them, and presents the remote LUNs as local block devices that you can partition, format, and mount like any other disk.

## Step 1: Install the iSCSI Initiator

```bash
sudo dnf install -y iscsi-initiator-utils
```

Enable and start the services:

```bash
sudo systemctl enable --now iscsid
sudo systemctl enable --now iscsi
```

## Step 2: Configure the Initiator Name

Each initiator needs a unique IQN. Edit the initiator name file:

```bash
sudo vi /etc/iscsi/initiatorname.iscsi
```

Set the name to match the ACL you configured on the target:

```bash
InitiatorName=iqn.2024.com.example:client1
```

Restart iscsid to pick up the change:

```bash
sudo systemctl restart iscsid
```

## Step 3: Discover Targets

Use the `iscsiadm` command to discover available targets:

```bash
sudo iscsiadm -m discovery -t sendtargets -p 192.168.1.10:3260
```

Output shows discovered targets:

```bash
192.168.1.10:3260,1 iqn.2024.com.example:target1
```

The discovery results are stored in `/var/lib/iscsi/`:

```bash
ls /var/lib/iscsi/nodes/
ls /var/lib/iscsi/send_targets/
```

## Step 4: Log In to the Target

```bash
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 --login
```

Successful output:

```bash
Logging in to [iface: default, target: iqn.2024.com.example:target1, portal: 192.168.1.10,3260]
Login to [iface: default, target: iqn.2024.com.example:target1, portal: 192.168.1.10,3260] successful.
```

## Step 5: Verify the New Disk

After login, a new block device appears:

```bash
lsblk
```

You should see a new disk (e.g., `/dev/sdb`). Check its details:

```bash
sudo iscsiadm -m session -P 3
```

This shows detailed session information including the device mapping:

```bash
Attached scsi disk sdb    State: running
```

## Step 6: Use the Disk

Format and mount the new disk:

```bash
sudo mkfs.xfs /dev/sdb
sudo mkdir -p /mnt/iscsi
sudo mount /dev/sdb /mnt/iscsi
```

## Managing Sessions

```bash
# List active sessions
sudo iscsiadm -m session

# Show session details
sudo iscsiadm -m session -P 3

# Log out of a specific target
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 --logout

# Log out of all targets
sudo iscsiadm -m node --logoutall=all

# Delete a discovered target
sudo iscsiadm -m node -T iqn.2024.com.example:target1 -p 192.168.1.10:3260 -o delete
```

## Useful iscsiadm Modes

```bash
# Discovery mode - find targets
sudo iscsiadm -m discovery -t sendtargets -p <target_ip>

# Node mode - manage target configurations
sudo iscsiadm -m node

# Session mode - manage active sessions
sudo iscsiadm -m session

# Interface mode - manage network interfaces
sudo iscsiadm -m iface
```

## Discovering Multiple Targets

If you have multiple iSCSI targets:

```bash
# Discover from multiple portals
sudo iscsiadm -m discovery -t sendtargets -p 192.168.1.10:3260
sudo iscsiadm -m discovery -t sendtargets -p 192.168.1.11:3260

# Log in to all discovered targets
sudo iscsiadm -m node --loginall=all

# List all sessions
sudo iscsiadm -m session
```

## Conclusion

Setting up an iSCSI initiator on RHEL involves installing the initiator utilities, configuring a unique IQN, discovering targets, and logging in. The remote LUNs appear as local block devices that you can use like any other disk. For production setups, configure CHAP authentication for security and persistent sessions for automatic reconnection after reboots.
