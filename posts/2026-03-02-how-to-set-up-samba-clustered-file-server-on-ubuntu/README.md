# How to Set Up Samba Clustered File Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Samba, Clustering, High Availability, Storage

Description: Configure a clustered Samba file server on Ubuntu using CTDB for high availability and shared storage, providing fault-tolerant SMB file services.

---

A clustered Samba deployment uses CTDB (Cluster Trivial Database) to coordinate multiple Samba nodes sharing the same storage. When one node fails, the others take over its IP addresses and continue serving clients without interruption. This setup is common in environments that need continuous file access and cannot tolerate the downtime of a standalone file server.

This guide walks through a two-node Samba cluster using CTDB, with shared storage accessed by both nodes. The shared storage could be a SAN, NFS mount, or GlusterFS volume - the cluster layer does not care about the storage type as long as both nodes can access it simultaneously.

## Architecture Overview

The cluster consists of:

- **Node 1:** 192.168.1.10 (private), 192.168.1.20 (virtual IP for clients)
- **Node 2:** 192.168.1.11 (private), 192.168.1.21 (virtual IP for clients)
- **Shared Storage:** /srv/samba/data accessible on both nodes
- **CTDB:** coordinates cluster state, manages virtual IPs, monitors node health

Clients connect to virtual IPs. When a node fails, CTDB moves the virtual IP to a surviving node. Samba on the surviving node picks up the session and clients reconnect automatically (for SMB3) or get a brief error before reconnecting (SMB2).

## Installing Required Packages

Install on both nodes:

```bash
# Update packages
sudo apt update

# Install Samba, CTDB, and Winbind
sudo apt install samba ctdb winbind -y

# Stop services before configuration - CTDB will manage them
sudo systemctl stop smbd nmbd winbind
sudo systemctl disable smbd nmbd winbind
```

## Preparing Shared Storage

Both nodes need read/write access to the same storage path. Here using NFS as an example:

```bash
# On Node 1, export the shared storage via NFS (only if using NFS as shared layer)
sudo apt install nfs-kernel-server -y
echo "/srv/samba/data 192.168.1.11(rw,sync,no_root_squash)" | sudo tee -a /etc/exports
sudo exportfs -ra

# On Node 2, mount Node 1's NFS export
sudo mkdir -p /srv/samba/data
sudo mount -t nfs 192.168.1.10:/srv/samba/data /srv/samba/data
echo "192.168.1.10:/srv/samba/data  /srv/samba/data  nfs  defaults  0  0" | sudo tee -a /etc/fstab
```

For a proper production cluster, use a SAN (iSCSI or FC) with a cluster filesystem like OCFS2 or GFS2, or GlusterFS for a software-defined approach.

## Configuring CTDB

CTDB has its own set of configuration files. These steps are performed on both nodes.

### Create the CTDB Directory Structure

CTDB needs a directory on the shared storage for its database files:

```bash
# Create CTDB database directories on shared storage
sudo mkdir -p /srv/samba/ctdb
sudo mkdir -p /var/lib/ctdb/persistent
sudo mkdir -p /var/lib/ctdb/volatile
sudo mkdir -p /var/lib/ctdb/state
```

### Configure CTDB Daemon

Edit the CTDB configuration file:

```bash
sudo nano /etc/ctdb/ctdbd.conf
```

```bash
# CTDB configuration
# Path to the CTDB recovery lock file - must be on shared storage
CTDB_RECOVERY_LOCK=/srv/samba/ctdb/recovery.lock

# Log level (ERROR, WARNING, NOTICE, INFO, DEBUG)
CTDB_LOGGING=file:/var/log/ctdb/ctdb.log
CTDB_DEBUGLEVEL=NOTICE

# Transport for inter-node communication
CTDB_TRANSPORT=tcp
CTDB_NODE_ADDRESS=192.168.1.10   # Change to 192.168.1.11 on Node 2

# CTDB database directories
CTDB_DBDIR=/var/lib/ctdb/volatile
CTDB_DBDIR_PERSISTENT=/var/lib/ctdb/persistent
CTDB_DBDIR_STATE=/var/lib/ctdb/state
```

### Define Cluster Nodes

Create the nodes file listing all cluster members:

```bash
sudo nano /etc/ctdb/nodes
```

```
192.168.1.10
192.168.1.11
```

This file must be identical on all nodes.

### Define Public Addresses

Public (virtual) addresses are the IPs that float between nodes:

```bash
sudo nano /etc/ctdb/public_addresses
```

```
192.168.1.20/24 enp3s0
192.168.1.21/24 enp3s0
```

Format: `IP/prefix interface` - one virtual IP per node is typical, but more can be listed.

## Configuring Samba for CTDB

CTDB manages Samba, so smb.conf needs specific settings:

```bash
sudo nano /etc/samba/smb.conf
```

```ini
[global]
   workgroup = WORKGROUP
   server string = Samba Cluster
   server role = standalone server
   security = user
   passdb backend = tdbsam

   # Clustering support
   clustering = yes
   ctdbd socket = /var/run/ctdb/ctdbd.socket

   # Use shared storage for Samba databases
   # CTDB manages these paths
   private dir = /var/lib/ctdb/persistent
   lock dir = /var/lib/ctdb/volatile

   # Disable NetBIOS if using DNS for name resolution
   # Or configure nmbd separately
   disable netbios = yes

   # Log settings
   log file = /var/log/samba/log.%m
   max log size = 1000

   # Performance settings
   socket options = TCP_NODELAY
   min receivefile size = 16384
   use sendfile = yes

[Data]
   path = /srv/samba/data
   valid users = @smbusers
   read only = no
   browseable = yes
   create mask = 0664
   directory mask = 0775
```

## Configuring CTDB to Manage Samba

CTDB uses event scripts to start and stop services. Enable the Samba event script:

```bash
# Enable Samba management script
sudo ctdb event script enable legacy 49.winbind
sudo ctdb event script enable legacy 50.samba

# Create the script directory if needed
ls /etc/ctdb/events/legacy/
```

Verify the event scripts exist:

```bash
ls /etc/ctdb/events/legacy/ | grep -E "samba|winbind"
```

## Starting the Cluster

Start CTDB on both nodes (start Node 1 first, then Node 2):

```bash
# On Node 1
sudo systemctl enable ctdb
sudo systemctl start ctdb

# Then on Node 2
sudo systemctl enable ctdb
sudo systemctl start ctdb
```

## Verifying Cluster Health

Check cluster status from either node:

```bash
# Show cluster nodes and their status
sudo ctdb status

# Show which node owns which public address
sudo ctdb ip

# Show CTDB statistics
sudo ctdb statistics

# Show which node is the recovery master
sudo ctdb recmaster
```

Expected output from `ctdb status`:

```
Number of nodes:2
pnn:0 192.168.1.10    OK (THIS NODE)
pnn:1 192.168.1.11    OK
```

Check that public IPs are distributed:

```bash
sudo ctdb ip
# Shows which node currently holds each virtual IP
```

## Testing Failover

Test failover by simulating a node failure:

```bash
# From a client, map the share and open a file
# Then on Node 1, shut down CTDB
sudo systemctl stop ctdb

# Watch on Node 2 - it should take over the virtual IPs
sudo ctdb ip
sudo ip addr show enp3s0   # Should now show both virtual IPs
```

The client will experience a brief disconnection and then reconnect to the surviving node. With SMB3 persistent handles, well-behaved clients can reconnect transparently.

Bring Node 1 back:

```bash
sudo systemctl start ctdb
# CTDB will rebalance the virtual IPs automatically
sudo ctdb ip
```

## Setting Up Shared User Database

For consistent authentication across nodes, use LDAP or configure Samba to use a shared TDB database on the shared storage:

```bash
# Configure passdb backend to use shared storage
# Edit smb.conf to point to shared storage
sudo nano /etc/samba/smb.conf
```

```ini
[global]
   # Use shared storage for the user database
   passdb backend = tdbsam:/srv/samba/ctdb/passdb.tdb
```

Add users on any node:

```bash
sudo useradd -M -s /usr/sbin/nologin smbuser
sudo smbpasswd -a smbuser
# The password is stored in the shared TDB file visible to both nodes
```

## Monitoring with CTDB

CTDB provides built-in monitoring commands:

```bash
# Monitor CTDB events in real time
sudo ctdb eventscript monitor legacy

# Watch cluster status changes
watch -n 2 'ctdb status && echo && ctdb ip'

# Check CTDB log for errors
sudo tail -f /var/log/ctdb/ctdb.log
```

## Common Issues

**Nodes stuck in RECOVERY state:** The recovery lock file on shared storage is inaccessible. Check that the shared storage is mounted and the lock file path is correct.

**Virtual IPs not assigned:** Verify the `public_addresses` file exists and has the correct format. Check that the network interface name matches. Run `ctdb ifaces` to see interface status.

**Split-brain prevention:** The recovery lock ensures only one node is the master at a time. If shared storage is unavailable, CTDB will not allow any node to become master, preventing split-brain at the cost of availability.

A two-node Samba cluster with CTDB provides a practical high-availability solution for SMB file services. For larger environments, CTDB scales to many nodes and integrates with more sophisticated storage backends.
