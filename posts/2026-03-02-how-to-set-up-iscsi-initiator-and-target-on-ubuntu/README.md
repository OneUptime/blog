# How to Set Up iSCSI Initiator and Target on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Storage, iSCSI, SAN, Networking

Description: Step-by-step guide to configuring an iSCSI target using targetcli and an iSCSI initiator using open-iscsi on Ubuntu for network-attached block storage.

---

iSCSI (Internet Small Computer Systems Interface) lets you attach block storage devices over a standard IP network. It's commonly used to give physical and virtual machines access to centralized storage arrays without dedicated Fibre Channel hardware. On Ubuntu, you can set up both the target (storage server) and initiator (storage client) using open-source tools.

## Overview

- **iSCSI Target** - The server that exports storage. You'll use `targetcli` to configure this.
- **iSCSI Initiator** - The client that connects to the target and uses the storage. You'll use `open-iscsi` for this.

In this setup:
- Target server IP: 192.168.1.10
- Initiator (client) IP: 192.168.1.20

## Setting Up the iSCSI Target

### Install targetcli

```bash
# On the storage server
sudo apt update
sudo apt install targetcli-fb -y
```

### Create a Backing Storage Device

First, decide on your backing store. You can use a file, a block device, or an LVM volume.

```bash
# Option 1: Create a file-based backing store
sudo dd if=/dev/zero of=/srv/iscsi-disk1.img bs=1M count=10240  # 10GB file

# Option 2: Use an existing block device or LVM volume
# sudo lvcreate -L 50G -n iscsi-lun1 vg_data
```

### Configure targetcli

```bash
# Launch the targetcli interactive shell
sudo targetcli
```

Inside targetcli:

```text
# Navigate to backstores and create a fileio backstore
/> cd /backstores/fileio
/backstores/fileio> create disk1 /srv/iscsi-disk1.img 10G write_back=false

# For a block device:
# /backstores/block> create disk1 /dev/sdb

# Create the iSCSI target with an IQN (iSCSI Qualified Name)
/backstores/fileio> cd /iscsi
/iscsi> create iqn.2026-03.com.example:storage.lun1

# Create a portal (listening interface)
/iscsi/iqn.2026-03.com.example:storage.lun1/tpg1/portals> create 192.168.1.10 3260

# Add a LUN mapping
/iscsi/iqn.2026-03.com.example:storage.lun1/tpg1/luns> create /backstores/fileio/disk1

# Set up ACL for the initiator (use the initiator's IQN)
/iscsi/iqn.2026-03.com.example:storage.lun1/tpg1/acls> create iqn.2026-03.com.example:initiator1

# Disable authentication for testing (enable in production)
/iscsi/iqn.2026-03.com.example:storage.lun1/tpg1> set attribute authentication=0
/iscsi/iqn.2026-03.com.example:storage.lun1/tpg1> set attribute generate_node_acls=0

# Save configuration and exit
/> saveconfig
/> exit
```

### Enable and Start the Target Service

```bash
sudo systemctl enable --now rtslib-fb-targetctl
# or on some Ubuntu versions:
sudo systemctl enable --now targetclid
```

### Open Firewall Port

```bash
# iSCSI uses TCP port 3260
sudo ufw allow 3260/tcp
```

## Setting Up the iSCSI Initiator

### Install open-iscsi

```bash
# On the client machine
sudo apt update
sudo apt install open-iscsi -y
```

### Configure the Initiator IQN

The initiator has a unique IQN stored in `/etc/iscsi/initiatorname.iscsi`. Set it to match what you configured in the ACL on the target:

```bash
# View current IQN
cat /etc/iscsi/initiatorname.iscsi

# Set the initiator name to match what you put in the ACL
echo "InitiatorName=iqn.2026-03.com.example:initiator1" | sudo tee /etc/iscsi/initiatorname.iscsi

# Restart the service to apply
sudo systemctl restart iscsid
```

### Discover Targets

```bash
# Discover available targets on the storage server
sudo iscsiadm --mode discovery --type sendtargets --portal 192.168.1.10

# Expected output:
# 192.168.1.10:3260,1 iqn.2026-03.com.example:storage.lun1
```

### Log In to the Target

```bash
# Log in to all discovered targets
sudo iscsiadm --mode node --loginall=automatic

# Or log in to a specific target
sudo iscsiadm --mode node --targetname iqn.2026-03.com.example:storage.lun1 --portal 192.168.1.10:3260 --login
```

### Verify the Connection

```bash
# Check active sessions
sudo iscsiadm --mode session --print 3

# The iSCSI disk should appear as a new block device
lsblk
dmesg | tail -20  # Look for new SCSI device messages
```

You should see a new disk (e.g., `/dev/sdb`) added to the system.

## Using the iSCSI Disk

Once connected, the iSCSI disk behaves like any local block device:

```bash
# Create a partition
sudo fdisk /dev/sdb

# Create a filesystem
sudo mkfs.ext4 /dev/sdb1

# Mount the filesystem
sudo mkdir -p /mnt/iscsi
sudo mount /dev/sdb1 /mnt/iscsi

# Test read/write
sudo dd if=/dev/zero of=/mnt/iscsi/testfile bs=1M count=1024 oflag=direct
```

## Persistent Mounting

Configure the iSCSI connection to survive reboots:

```bash
# Mark the node for automatic login on boot
sudo iscsiadm --mode node --targetname iqn.2026-03.com.example:storage.lun1 \
  --portal 192.168.1.10:3260 --op update --name node.startup --value automatic

# Enable the iscsid service
sudo systemctl enable iscsid
sudo systemctl enable open-iscsi
```

For `/etc/fstab` mounting, use the `_netdev` option to delay mounting until the network is ready:

```bash
# Get the UUID of the iSCSI partition
sudo blkid /dev/sdb1

# Add to /etc/fstab
# UUID=xxxx-xxxx /mnt/iscsi ext4 defaults,_netdev,nofail 0 0
```

## Setting Up CHAP Authentication (Production)

For production environments, enable CHAP authentication:

```bash
# On the initiator, edit /etc/iscsi/iscsid.conf
sudo nano /etc/iscsi/iscsid.conf
```

```ini
# Set CHAP credentials
node.session.auth.authmethod = CHAP
node.session.auth.username = initiator_user
node.session.auth.password = SecurePassword123

# For mutual CHAP (target also authenticates to initiator)
node.session.auth.username_in = target_user
node.session.auth.password_in = AnotherSecurePassword
```

In targetcli, configure the matching credentials:

```text
/iscsi/iqn.2026-03.com.example:storage.lun1/tpg1> set attribute authentication=1
/iscsi/iqn.2026-03.com.example:storage.lun1/tpg1/acls/iqn.2026-03.com.example:initiator1> set auth userid=initiator_user
/iscsi/iqn.2026-03.com.example:storage.lun1/tpg1/acls/iqn.2026-03.com.example:initiator1> set auth password=SecurePassword123
```

## Monitoring and Troubleshooting

```bash
# Check target status
sudo targetcli ls

# View active iSCSI sessions on the target
sudo targetcli /iscsi/iqn.2026-03.com.example:storage.lun1/tpg1/sessions ls

# Check initiator sessions
sudo iscsiadm --mode session

# Logout from a target
sudo iscsiadm --mode node --targetname iqn.2026-03.com.example:storage.lun1 \
  --portal 192.168.1.10:3260 --logout

# View iSCSI kernel messages
dmesg | grep -i iscsi

# Check network connectivity to target
nc -zv 192.168.1.10 3260
```

## Performance Tuning

iSCSI performance depends heavily on the underlying network. Dedicated storage VLANs and jumbo frames improve throughput significantly:

```bash
# Enable jumbo frames on the storage network interface
sudo ip link set eth1 mtu 9000

# Make it permanent in netplan
# In /etc/netplan/01-storage.yaml:
# network:
#   ethernets:
#     eth1:
#       mtu: 9000
```

For production deployments, consider using multiple network paths with MPIO (Multipath I/O) to provide both redundancy and higher aggregate bandwidth, which is covered separately in the Multipath I/O configuration guide.
