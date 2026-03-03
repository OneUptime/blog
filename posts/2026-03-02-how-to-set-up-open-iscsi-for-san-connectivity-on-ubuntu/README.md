# How to Set Up Open-iSCSI for SAN Connectivity on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, iSCSI, SAN, Storage, open-iscsi

Description: Configure open-iscsi on Ubuntu to connect to enterprise SAN storage arrays, manage persistent sessions, and handle automatic reconnection after reboots.

---

Enterprise SAN (Storage Area Network) systems - from vendors like NetApp, Dell EMC, Pure Storage, and HPE - commonly expose storage over iSCSI. The `open-iscsi` package on Ubuntu provides the initiator daemon and tools needed to discover, connect, and persistently mount these remote block devices. This guide covers the full setup from discovery through persistent mounting with proper handling of reconnects and multi-path configurations.

## Installing open-iscsi

```bash
sudo apt update
sudo apt install open-iscsi -y

# Enable the required services
sudo systemctl enable --now iscsid
sudo systemctl enable --now open-iscsi
```

Verify the services are running:

```bash
systemctl status iscsid
systemctl status open-iscsi
```

## Understanding the Initiator Name

Each iSCSI host has a unique identifier called the IQN (iSCSI Qualified Name). The format is:

```text
iqn.YYYY-MM.com.reversed-domain:optional-string
```

The initiator's IQN is stored in `/etc/iscsi/initiatorname.iscsi`:

```bash
# View the current IQN
cat /etc/iscsi/initiatorname.iscsi

# Typical output:
# InitiatorName=iqn.1993-08.org.debian:01:a1b2c3d4e5f6

# Set a more meaningful IQN (match this in your SAN's host configuration)
cat << 'EOF' | sudo tee /etc/iscsi/initiatorname.iscsi
InitiatorName=iqn.2026-03.com.example:server01.prod
EOF

# Restart iscsid to apply
sudo systemctl restart iscsid
```

Register this IQN in your SAN management interface before attempting to connect, as most enterprise SANs use IQN-based access control.

## Configuring iscsid.conf

The main configuration file at `/etc/iscsi/iscsid.conf` controls session behavior:

```bash
sudo nano /etc/iscsi/iscsid.conf
```

Key settings to review and set:

```ini
# Automatic login on startup
node.startup = automatic

# Session timeout settings (seconds)
node.session.timeo.replacement_timeout = 120

# Connection timeout
node.conn[0].timeo.login_timeout = 15
node.conn[0].timeo.logout_timeout = 15

# Keepalive settings
node.conn[0].timeo.noop_out_interval = 5
node.conn[0].timeo.noop_out_timeout = 5

# Queue depth - increase for high-throughput workloads
node.session.queue_depth = 32

# Initial R2T - disable for faster transfers on high-BDP links
node.session.iscsi.InitialR2T = No

# Immediate data - enable for small writes
node.session.iscsi.ImmediateData = Yes

# Maximum burst length (bytes)
node.session.iscsi.MaxBurstLength = 16776192
node.session.iscsi.FirstBurstLength = 262144

# Error recovery level (0=session, 1=digest, 2=conn)
node.session.err_timeo.abort_timeout = 15
node.session.err_timeo.lu_reset_timeout = 30
node.session.err_timeo.tgt_reset_timeout = 30
```

## Discovering iSCSI Targets

### SendTargets Discovery

The most common discovery method:

```bash
# Discover targets using SendTargets protocol
sudo iscsiadm --mode discovery --type sendtargets --portal 192.168.1.10

# Discovery with specific port
sudo iscsiadm --mode discovery --type sendtargets --portal 192.168.1.10:3260

# Discover from multiple portals (for redundancy)
sudo iscsiadm --mode discovery --type sendtargets --portal 192.168.1.10
sudo iscsiadm --mode discovery --type sendtargets --portal 192.168.1.11
```

Example output:
```text
192.168.1.10:3260,1 iqn.1992-08.com.netapp:sn.storage01:vs.1
192.168.1.11:3260,2 iqn.1992-08.com.netapp:sn.storage01:vs.1
```

The `,1` and `,2` are portal group tags (PGT) - the SAN presents the same target through multiple portals for redundancy.

### iSNS Discovery

For environments with an iSNS (iSCSI Name Service) server:

```bash
# Configure iSNS server in /etc/iscsi/iscsid.conf
# discovery.sendtargets.use_discoveryd = No
# discovery.isns.use_discoveryd = Yes
# discovery.isns.discoveryd_poll_inval = 30

# Discover via iSNS
sudo iscsiadm --mode discovery --type isns --portal isns-server.example.com
```

## Logging In to Targets

```bash
# Log in to a specific target and portal
sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --login

# Log in to all discovered targets
sudo iscsiadm --mode node --loginall=all

# Log in only to targets marked for automatic startup
sudo iscsiadm --mode node --loginall=automatic
```

### Verifying Active Sessions

```bash
# List all active sessions
sudo iscsiadm --mode session

# Detailed session information
sudo iscsiadm --mode session --print 3

# Check kernel messages for the new SCSI device
dmesg | tail -30 | grep -E 'scsi|sd|nvme'

# List block devices - new iSCSI disk should appear
lsblk
```

## Setting Up Automatic Login

Configure targets to reconnect automatically after reboots:

```bash
# Mark a node for automatic startup
sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --op update \
  --name node.startup \
  --value automatic

# Verify the setting was applied
sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --op show | grep startup
```

## CHAP Authentication

Most enterprise SANs require CHAP authentication. Configure it before attempting login:

```bash
# Set up outbound CHAP (host authenticates to SAN)
sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --op update \
  --name node.session.auth.authmethod --value CHAP

# Set the CHAP username and password
sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --op update \
  --name node.session.auth.username --value san_user

sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --op update \
  --name node.session.auth.password --value 'SecurePassword!'
```

For mutual CHAP (bidirectional authentication):

```bash
# In credentials - the SAN authenticates back to the host
sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --op update \
  --name node.session.auth.username_in --value host_user

sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --op update \
  --name node.session.auth.password_in --value 'HostPassword!'
```

## Partitioning and Formatting iSCSI Disks

Once logged in, the iSCSI disk appears as a local block device:

```bash
# Find the new disk
lsblk
ls /dev/sd*

# Create GPT partition table
sudo parted /dev/sdb --script mklabel gpt

# Create a single partition using full disk
sudo parted /dev/sdb --script mkpart primary ext4 0% 100%

# Format with XFS (better for large files and online resize)
sudo mkfs.xfs /dev/sdb1 -L san-data

# Mount
sudo mkdir -p /mnt/san-data
sudo mount /dev/sdb1 /mnt/san-data
```

## Persistent Mounting with fstab

Use UUID instead of device names since iSCSI disk order can change:

```bash
# Get UUID
sudo blkid /dev/sdb1

# Add to /etc/fstab with _netdev and nofail options
# UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx /mnt/san-data xfs defaults,_netdev,nofail 0 0
```

The `_netdev` flag tells systemd to wait for the network before mounting, which is essential for iSCSI. The `nofail` flag prevents the system from hanging during boot if the SAN is unavailable.

## Updating Node Records

When SAN portals change or new portals are added:

```bash
# Remove stale node entries for a target
sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --op delete

# Re-run discovery to get fresh portal list
sudo iscsiadm --mode discovery --type sendtargets --portal 192.168.1.10
```

## Logging Out and Cleanup

```bash
# Log out from a specific session
sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --logout

# Log out from all sessions
sudo iscsiadm --mode node --logoutall=all

# Remove a node record entirely (won't auto-reconnect)
sudo iscsiadm --mode node \
  --targetname iqn.1992-08.com.netapp:sn.storage01:vs.1 \
  --portal 192.168.1.10:3260 \
  --op delete
```

## Troubleshooting Common Issues

```bash
# Check iscsid logs
sudo journalctl -u iscsid -f

# Connection refused
nc -zv 192.168.1.10 3260

# Authentication failure - check CHAP credentials match SAN config
sudo iscsiadm --mode node --op show

# Session drops frequently - check network timeouts
sudo iscsiadm --mode session --print 3 | grep timeout

# Rescan for new LUNs added to existing target
sudo iscsiadm --mode session --rescan
```

When deploying iSCSI in production, combining open-iscsi with multipath-tools gives you both persistent connectivity and redundancy. The multipath daemon groups multiple iSCSI sessions to the same LUN into a single device, handling failover and load balancing transparently.
