# How to Set Up LizardFS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LizardFS, Distributed Storage, File System, Storage

Description: A step-by-step guide to deploying LizardFS distributed file system on Ubuntu, covering master server, chunk servers, metadata backup, and client mounting.

---

LizardFS is an open-source distributed file system forked from MooseFS. It stripes files across multiple storage nodes (chunk servers) with configurable replication, presents a single POSIX-compatible mount point to clients, and manages metadata through a dedicated master server. It handles failures gracefully - when a chunk server goes offline, data remains accessible from other nodes as long as you have sufficient replication.

This guide sets up a basic LizardFS cluster on Ubuntu with one master server, two chunk servers, and a metadata backup server.

## Architecture

```
                   [Master Server]
                   192.168.1.10
                   Manages metadata
                        |
         +----------------------------------+
         |                                  |
[Chunk Server 1]               [Chunk Server 2]
192.168.1.11                   192.168.1.12
Stores file chunks             Stores file chunks
```

Clients mount the LizardFS file system and read/write directly to chunk servers after getting chunk locations from the master.

## Prerequisites

- Three Ubuntu 22.04 servers on the same network
- A fourth server for metalogger (metadata backup) - optional but recommended
- All servers can reach each other by hostname or IP

Add LizardFS packages to all servers:

```bash
# Add the LizardFS repository
curl -s https://ppa.lizardfs.com/lizardfs.key | sudo apt-key add -
echo "deb https://ppa.lizardfs.com/stable/ubuntu focal main" | sudo tee /etc/apt/sources.list.d/lizardfs.list
sudo apt update
```

## Setting Up the Master Server

On `192.168.1.10`:

```bash
# Install the master server package
sudo apt install lizardfs-master -y
```

Copy the example configuration:

```bash
sudo cp /etc/lizardfs/mfsmaster.cfg.dist /etc/lizardfs/mfsmaster.cfg
sudo cp /etc/lizardfs/mfsexports.cfg.dist /etc/lizardfs/mfsexports.cfg
```

Edit the master configuration:

```bash
sudo nano /etc/lizardfs/mfsmaster.cfg
```

Key settings:

```ini
# Working directory (metadata storage)
DATA_PATH = /var/lib/lizardfs

# Master server port (default: 9421)
MASTER_PORT = 9421

# Metalogger port for metadata backup
MATOML_LISTEN_PORT = 9419

# Chunk server port
MATOCS_LISTEN_PORT = 9420

# Client (mount) port
MATOCU_LISTEN_PORT = 9421
```

Configure exports (which paths are accessible):

```bash
sudo nano /etc/lizardfs/mfsexports.cfg
```

```
# Allow any host to mount the root filesystem with full access
*    /    rw,alldirs,maproot=0
```

Initialize the metadata and start the master:

```bash
# Initialize metadata (first time only)
sudo lizardfs-master -a

# Start the service
sudo systemctl start lizardfs-master
sudo systemctl enable lizardfs-master

# Verify it is running
sudo systemctl status lizardfs-master
```

Check the master is listening:

```bash
sudo ss -tlnp | grep lizardfs
```

## Setting Up Chunk Servers

On each chunk server (`192.168.1.11` and `192.168.1.12`):

```bash
# Install chunk server
sudo apt install lizardfs-chunkserver -y

# Create data directories (use actual data disks in production)
sudo mkdir -p /data/lizardfs
sudo chown lizardfs:lizardfs /data/lizardfs

# Copy and edit configuration
sudo cp /etc/lizardfs/mfschunkserver.cfg.dist /etc/lizardfs/mfschunkserver.cfg
sudo nano /etc/lizardfs/mfschunkserver.cfg
```

```ini
# Master server connection
MASTER_HOST = 192.168.1.10
MASTER_PORT = 9420

# Chunk server listening port
CSSERV_LISTEN_PORT = 9422

# Where to store chunks
DATA_PATH = /var/lib/lizardfs
```

Create the disk configuration file listing storage paths:

```bash
sudo nano /etc/lizardfs/mfshdd.cfg
```

```
# List one storage directory per line
/data/lizardfs
```

Start the chunk server:

```bash
sudo systemctl start lizardfs-chunkserver
sudo systemctl enable lizardfs-chunkserver
sudo systemctl status lizardfs-chunkserver
```

After a few seconds, the chunk server registers with the master. Verify on the master:

```bash
# On the master server, check connected chunk servers
lizardfs-admin list-chunkservers 192.168.1.10 9421
```

## Setting Up the Metalogger (Metadata Backup)

The metalogger receives continuous metadata updates from the master, providing a warm standby for metadata recovery:

```bash
# Install on a separate server
sudo apt install lizardfs-metalogger -y

sudo cp /etc/lizardfs/mfsmetalogger.cfg.dist /etc/lizardfs/mfsmetalogger.cfg
sudo nano /etc/lizardfs/mfsmetalogger.cfg
```

```ini
MASTER_HOST = 192.168.1.10
MASTER_PORT = 9419
```

```bash
sudo systemctl start lizardfs-metalogger
sudo systemctl enable lizardfs-metalogger
```

## Mounting LizardFS on Clients

Install the client on any machine that needs to access the file system:

```bash
sudo apt install lizardfs-client -y
```

Create a mount point and mount:

```bash
sudo mkdir -p /mnt/lizardfs

# Mount using the lizardfs FUSE client
sudo mfsmount /mnt/lizardfs -H 192.168.1.10 -P 9421

# Verify the mount
df -h /mnt/lizardfs
mount | grep lizardfs
```

For persistent mounting, add to `/etc/fstab`:

```bash
# /etc/fstab entry
mfsmaster=192.168.1.10,mfsport=9421,mfspassword=    /mnt/lizardfs    lizardfs    defaults,_netdev    0    0
```

Or use the `mfsmount` service:

```bash
sudo cp /etc/lizardfs/mfsmount.cfg.dist /etc/lizardfs/mfsmount.cfg
sudo nano /etc/lizardfs/mfsmount.cfg
```

```ini
# Mount point
MFSMASTER = 192.168.1.10
MFSPORT = 9421
MFSMOUNTPOINT = /mnt/lizardfs
```

## Configuring Replication Goals

LizardFS uses "goals" to specify how many copies of each chunk to keep. The default goal is 2 (two copies on different chunk servers).

```bash
# Check the current goal for a path
mfsgetgoal /mnt/lizardfs

# Set goal 3 on a directory (keep 3 copies of all files)
mfssetgoal 3 /mnt/lizardfs/important-data

# Set goal 1 (no replication) for scratch space
mfssetgoal 1 /mnt/lizardfs/scratch

# Set goal recursively
mfssetgoal -r 2 /mnt/lizardfs
```

Custom goals with disk labels (useful for tiered storage):

```bash
# In /etc/lizardfs/mfsgoals.cfg on the master
1 1 : _
2 2 : _ _
ssd 1 : [ssd]  # store on SSD-labeled chunk servers only
ec_4_2 4 2 : [hdd] [hdd] [hdd] [hdd] _ _  # erasure coding
```

## Managing Quotas

LizardFS supports directory quotas:

```bash
# Set a 100 GB soft quota and 110 GB hard quota on a directory
mfssetquota -s 100g -h 110g /mnt/lizardfs/projectA

# Check quota usage
mfsrepquota -a /mnt/lizardfs
```

## Snapshots

LizardFS supports copy-on-write snapshots:

```bash
# Create a snapshot of a directory
mfssnapshot /mnt/lizardfs/data /mnt/lizardfs/data-snapshot-$(date +%Y%m%d)

# List entries (snapshots appear as regular directories)
ls /mnt/lizardfs/
```

Snapshots share blocks with the original until they diverge, so they use minimal extra space initially.

## Monitoring with the Admin Tool

```bash
# Show overall cluster status
lizardfs-admin info 192.168.1.10 9421

# List all connected clients
lizardfs-admin list-mounts 192.168.1.10 9421

# Show chunk distribution across servers
lizardfs-admin list-chunks 192.168.1.10 9421

# Check for endangered chunks (fewer copies than goal)
lizardfs-admin list-endangered-chunks 192.168.1.10 9421
```

## Troubleshooting

**Chunk server not connecting to master:**
```bash
# Check connectivity
nc -zv 192.168.1.10 9420

# Check chunk server logs
sudo journalctl -u lizardfs-chunkserver -n 50
```

**Mount fails with "Connection refused":**
```bash
# Verify master is listening
sudo ss -tlnp | grep 9421

# Check master logs
sudo journalctl -u lizardfs-master -n 50
```

**Files not accessible after chunk server failure:**
If a chunk server goes down and goal is 2, files remain accessible from the surviving server. Check for endangered chunks:
```bash
lizardfs-admin list-endangered-chunks 192.168.1.10 9421
```

Add a replacement chunk server to restore replication.

LizardFS excels at workloads that need a single large shared namespace across many machines - media rendering farms, HPC storage, or any environment where many servers need to read and write a common file tree. The POSIX interface means applications work without modification.
