# How to Configure NFS Exports with Specific Options on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, NFS, Networking, File Sharing, Linux

Description: Configure NFS exports on Ubuntu with precise control over access permissions, security options, sync behavior, and client-specific settings using /etc/exports options.

---

The `/etc/exports` file controls which directories the NFS server shares, who can access them, and how. The options available are extensive, and choosing the right combination matters for both security and performance. This guide covers the full range of useful export options with practical examples.

## The /etc/exports Format

Each line in `/etc/exports` defines one export:

```text
/path/to/export  client_spec(option1,option2,...) [client_spec2(options...)]
```

Where `client_spec` can be:
- A hostname: `nfsclient.example.com`
- An IP address: `192.168.1.100`
- A subnet in CIDR notation: `192.168.1.0/24`
- A netgroup: `@groupname`
- A wildcard hostname: `*.example.com`
- All hosts: `*`

## Installing and Starting the NFS Server

```bash
# Install NFS server packages
sudo apt update
sudo apt install nfs-kernel-server -y

# Start and enable the service
sudo systemctl enable nfs-kernel-server
sudo systemctl start nfs-kernel-server
```

## Basic Export Configuration

```bash
sudo nano /etc/exports
```

A minimal working export:

```text
/srv/nfs/shared  192.168.1.0/24(rw,sync,no_subtree_check)
```

## Access Control Options

### Read/Write vs Read-Only

```text
# Read-write export
/srv/nfs/data    192.168.1.0/24(rw,sync,no_subtree_check)

# Read-only export for all clients
/srv/nfs/archive  *(ro,sync,no_subtree_check)

# Read-write for admin server, read-only for everyone else
/srv/nfs/config  admin.example.com(rw,sync,no_subtree_check) \
                 192.168.1.0/24(ro,sync,no_subtree_check)
```

### Root Squashing Options

Root squashing controls how the root user on NFS clients is treated:

```text
# Default: root on client maps to nobody on server (secure)
/srv/nfs/shared  192.168.1.0/24(rw,sync,no_subtree_check,root_squash)

# Disable root squashing for trusted backup server only
/srv/nfs/backup  backup.example.com(rw,sync,no_subtree_check,no_root_squash)

# Map ALL client users to the anonymous user (very restrictive)
/srv/nfs/public  *(ro,sync,no_subtree_check,all_squash,anonuid=65534,anongid=65534)
```

The `anonuid` and `anongid` options specify which local UID/GID the anonymous user maps to. Set these to a user with appropriate access to the shared directory:

```bash
# Create a dedicated NFS anonymous user
sudo useradd --system --no-create-home --shell /usr/sbin/nologin nfsanon
id nfsanon  # Note the UID/GID to use in exports
```

```text
/srv/nfs/public  *(ro,sync,no_subtree_check,all_squash,anonuid=999,anongid=999)
```

## Synchronization Options

```text
# sync: Write operations complete only after data is written to disk
# More reliable but slower
/srv/nfs/important  192.168.1.0/24(rw,sync,no_subtree_check)

# async: Write operations return before data hits disk
# Faster but data can be lost if server crashes
/srv/nfs/scratch  192.168.1.0/24(rw,async,no_subtree_check)
```

Always use `sync` for production data. Use `async` only for scratch/temporary space where data loss is acceptable.

## Subtree Checking

```text
# subtree_check: Server verifies requested files are within the exported subtree
# Slight security benefit but can cause issues with renamed files
/srv/nfs/shared  192.168.1.0/24(rw,sync,subtree_check)

# no_subtree_check: No subtree verification (recommended for most cases)
/srv/nfs/shared  192.168.1.0/24(rw,sync,no_subtree_check)
```

Use `no_subtree_check` as the default. The `subtree_check` option was historically recommended for security but causes more problems than it solves in practice, and the NFS man page explicitly recommends disabling it.

## Port and Protocol Options

```text
# insecure: Allow connections from unprivileged ports (>1023)
# Needed for some NFS client implementations
/srv/nfs/shared  *(rw,sync,no_subtree_check,insecure)

# Secure (default): Only accept connections from privileged ports (<1024)
/srv/nfs/shared  192.168.1.0/24(rw,sync,no_subtree_check,secure)
```

## Locking Options

```text
# no_wdelay: Disable write delay (write immediately, don't batch)
# Improves small write latency but may reduce throughput
/srv/nfs/realtime  192.168.1.0/24(rw,sync,no_subtree_check,no_wdelay)
```

## Per-Client Options

A powerful feature of `/etc/exports` is specifying different options for different clients:

```text
# Main export:
# - Backup server gets read-write with no root squash
# - Admin workstations get read-write with root squash
# - Other clients get read-only
/srv/nfs/data  backup.example.com(rw,sync,no_subtree_check,no_root_squash) \
               192.168.1.0/24(rw,sync,no_subtree_check,root_squash) \
               *(ro,sync,no_subtree_check)
```

Note: More specific client specs take precedence over more general ones. Always put the most specific entries first.

## NFSv4 Cross-Mounts and Pseudo Filesystems

With NFSv4, clients typically mount the "export root" - a pseudo-filesystem that organizes all exports under a single tree. Configure the NFSv4 root in `/etc/default/nfs-kernel-server`:

```bash
sudo nano /etc/default/nfs-kernel-server
```

```text
# The NFSv4 pseudo-root (all exports bind-mount under here)
RPCNFSDARGS="--nfs-version 4.1 --syslog"
```

Set up bind mounts for the NFSv4 pseudo-root:

```bash
# Create the NFSv4 root
sudo mkdir -p /srv/nfs4

# Create directories for each export
sudo mkdir -p /srv/nfs4/{data,backup,archive}

# Bind mount actual directories into the NFSv4 tree
sudo mount --bind /srv/nfs/data /srv/nfs4/data
sudo mount --bind /srv/nfs/backup /srv/nfs4/backup
sudo mount --bind /srv/nfs/archive /srv/nfs4/archive

# Make bind mounts persistent
sudo nano /etc/fstab
```

Add to fstab:
```text
/srv/nfs/data     /srv/nfs4/data     none  bind  0  0
/srv/nfs/backup   /srv/nfs4/backup   none  bind  0  0
/srv/nfs/archive  /srv/nfs4/archive  none  bind  0  0
```

Export the NFSv4 tree:

```bash
# In /etc/exports
/srv/nfs4              192.168.1.0/24(rw,sync,fsid=0,no_subtree_check,crossmnt)
/srv/nfs4/data         192.168.1.0/24(rw,sync,no_subtree_check)
/srv/nfs4/backup       backup.example.com(rw,sync,no_subtree_check,no_root_squash)
/srv/nfs4/archive      *(ro,sync,no_subtree_check)
```

The `fsid=0` option marks the export as the NFSv4 root. The `crossmnt` option allows the client to traverse bind mounts.

## Applying Export Changes

After editing `/etc/exports`, apply changes without restarting the NFS server:

```bash
# Re-read exports and update the kernel's export table
sudo exportfs -ra

# Verify the current exports
sudo exportfs -v

# Full output shows all active exports with options
```

## Creating Export Directories with Correct Permissions

```bash
# Create directories for all exports
sudo mkdir -p /srv/nfs/{data,backup,archive,public}

# Set appropriate ownership
sudo chown -R username:groupname /srv/nfs/data

# For all_squash exports, set ownership to the anonuid user
sudo chown -R nfsanon:nfsanon /srv/nfs/public

# Set permissions
sudo chmod 755 /srv/nfs/data        # rx for group/other
sudo chmod 750 /srv/nfs/backup      # no access for other
sudo chmod 755 /srv/nfs/archive     # read-only access
sudo chmod 755 /srv/nfs/public      # public read
```

## Firewall Configuration

```bash
# Allow NFS traffic
sudo ufw allow from 192.168.1.0/24 to any port nfs

# Or open specific ports
sudo ufw allow from 192.168.1.0/24 to any port 2049
sudo ufw allow from 192.168.1.0/24 to any port 111  # rpcbind (NFSv3)
```

For NFSv4 only, only port 2049 is needed. NFSv3 requires additional ports for mountd, statd, and lockd.

## Complete Example /etc/exports

```text
# NFSv4 root (pseudo-filesystem)
/srv/nfs4                   192.168.1.0/24(rw,sync,fsid=0,no_subtree_check,crossmnt,root_squash)

# Production data share - rw for the subnet, extra permissions for backup server
/srv/nfs4/data              192.168.1.0/24(rw,sync,no_subtree_check,root_squash) \
                            backup.example.com(rw,sync,no_subtree_check,no_root_squash)

# Backup storage - only the backup server can write, others read-only
/srv/nfs4/backup            backup.example.com(rw,sync,no_subtree_check,no_root_squash) \
                            admin.example.com(ro,sync,no_subtree_check)

# Public read-only archive - all clients map to anonymous user
/srv/nfs4/archive           *(ro,sync,no_subtree_check,all_squash,anonuid=65534,anongid=65534)
```

After all changes:

```bash
sudo exportfs -ra
sudo exportfs -v
sudo nfsstat --server
```

Proper export configuration is the foundation of a secure NFS deployment. Take time to define exactly which clients need access and what level of access they need, rather than using broad wildcards with permissive options.
