# How to Set Up AFS (Andrew File System) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, AFS, Networking, Storage, Linux

Description: Install and configure OpenAFS on Ubuntu to access AFS file systems, covering client setup, cell configuration, Kerberos authentication, and basic file operations.

---

AFS (Andrew File System) is a distributed network file system developed at Carnegie Mellon University in the 1980s and still in active use at universities and research institutions worldwide. It differs from NFS in its global namespace, strong caching, and Kerberos-based authentication. If you need to access institutional AFS cells (common at universities) or set up your own AFS infrastructure, this guide covers the client setup on Ubuntu.

## What Makes AFS Different

AFS uses a global namespace. Every AFS cell (roughly equivalent to a domain) is mounted under `/afs`. The cell `andrew.cmu.edu` is at `/afs/andrew.cmu.edu`. Files from different institutions share one namespace, making cross-institutional access straightforward once authenticated.

AFS uses Kerberos tokens for authentication. When you authenticate, you receive an AFS token that's valid for a period of time (typically 25 hours). Without a valid token, you have only "anonymous" access to world-readable volumes.

The client caches file data locally for performance. Reading a file transfers it to your local cache and subsequent reads come from disk, making repeated access to the same files very fast.

## Installing OpenAFS on Ubuntu

OpenAFS is in Ubuntu's package repositories:

```bash
# Update package lists
sudo apt update

# Install the OpenAFS client and utilities
# The kernel module will be compiled or fetched during installation
sudo apt install -y openafs-client openafs-krb5 openafs-modules-dkms

# During installation you'll be prompted for:
# - AFS cell name: enter your institution's cell (e.g., andrew.cmu.edu)
#   or your own cell name if you're setting up a new one
# - Database server: the IP or hostname of the AFS database server
# - Cache size: disk space to use for the local AFS cache (in kilobytes)

# If you need to reconfigure later:
sudo dpkg-reconfigure openafs-client
```

The DKMS (Dynamic Kernel Module Support) package automatically rebuilds the kernel module when you update the kernel, which is important for long-term maintenance.

## Understanding the Configuration Files

AFS configuration lives in `/etc/openafs/`:

```bash
ls /etc/openafs/
# afs.conf          - main client configuration
# CellServDB        - database server addresses for known cells
# ThisCell          - name of the default cell
# cacheinfo         - cache location and size
```

The `ThisCell` file contains your default cell name:

```bash
cat /etc/openafs/ThisCell
# andrew.cmu.edu
```

The `CellServDB` file maps cell names to database server addresses. This is how the client knows which servers to contact for a given cell:

```bash
# /etc/openafs/CellServDB (format: cell name on header line, server IPs below)
>andrew.cmu.edu   # Andrew.CMU.EDU
128.2.10.2        #afsdb1.andrew.cmu.edu
128.2.10.65       #afsdb2.andrew.cmu.edu
128.2.10.110      #afsdb3.andrew.cmu.edu
```

The cache configuration:

```bash
cat /etc/openafs/cacheinfo
# /afs:/var/cache/openafs:500000
# Format: AFS_mount_point:cache_directory:cache_size_in_kilobytes
```

Adjust the cache size based on available disk space. A larger cache improves performance for repeated file access:

```bash
# 2GB cache (2,000,000 kilobytes)
echo "/afs:/var/cache/openafs:2000000" | sudo tee /etc/openafs/cacheinfo
```

## Starting the AFS Client

```bash
# Enable and start the OpenAFS client service
sudo systemctl enable openafs-client
sudo systemctl start openafs-client

# Check status
sudo systemctl status openafs-client

# The /afs directory should now be accessible
ls /afs

# List cells visible to the client
ls /afs/
# Shows mounted cells: andrew.cmu.edu, cs.cmu.edu, etc.

# Navigate to your cell
ls /afs/andrew.cmu.edu/
```

## Authenticating with Kerberos

AFS uses Kerberos tokens for authentication. You need a valid Kerberos ticket first, then convert it to an AFS token:

```bash
# Install Kerberos client utilities
sudo apt install -y krb5-user

# Configure Kerberos for your realm
# Edit /etc/krb5.conf with your realm information
sudo nano /etc/krb5.conf
```

```ini
# /etc/krb5.conf - Kerberos configuration
[libdefaults]
    default_realm = ANDREW.CMU.EDU
    dns_lookup_realm = true
    dns_lookup_kdc = true
    ticket_lifetime = 24h
    forwardable = true

[realms]
    ANDREW.CMU.EDU = {
        kdc = kerberos.andrew.cmu.edu
        admin_server = kerberos.andrew.cmu.edu
    }

[domain_realm]
    .andrew.cmu.edu = ANDREW.CMU.EDU
    andrew.cmu.edu = ANDREW.CMU.EDU
```

```bash
# Get a Kerberos ticket
kinit yourusername@ANDREW.CMU.EDU

# Verify the ticket
klist

# Convert the Kerberos ticket to an AFS token
aklog

# Verify you have an AFS token
tokens

# You should see output like:
# Tokens held by the Cache Manager:
# User's (AFS ID 12345) tokens for afs@andrew.cmu.edu [Expires Jan 16 14:30]
```

## Accessing Files and Directories

With a valid token, you have access to files in your cell according to your AFS permissions:

```bash
# List your home directory (path varies by cell)
ls /afs/andrew.cmu.edu/usr/yourusername/

# Copy a file from AFS
cp /afs/andrew.cmu.edu/usr/yourusername/document.pdf ~/

# AFS Access Control Lists (ACLs) control permissions
# List the ACL for a directory
fs listacl /afs/andrew.cmu.edu/usr/yourusername/

# Output shows rights for each user/group:
# Access list for /afs/andrew.cmu.edu/usr/yourusername/ is
# Normal rights:
#   yourusername rlidwka  (all rights)
#   system:anyuser l      (list only for anonymous users)

# AFS rights explained:
# r - read file data
# l - list directory contents
# i - insert (create) files
# d - delete files
# w - write file data
# k - lock files
# a - administer (change ACL)
```

## Managing AFS Tokens and Cache

```bash
# Check token expiration
tokens

# Renew tokens before they expire
aklog

# Destroy tokens (log out of AFS)
unlog

# Check cache status
fs getquota /afs/andrew.cmu.edu/usr/yourusername/

# View cache manager statistics
fs getcacheparms

# Flush cached data for a specific file (force re-read from server)
fs flushvol /afs/andrew.cmu.edu/usr/yourusername/

# Flush the entire cache
fs flush /afs

# Check which volume a path belongs to
fs whereis /afs/andrew.cmu.edu/usr/yourusername/
```

## Automatic Authentication with PAM

For workstations where users log in with their institution credentials, configure PAM to get AFS tokens at login:

```bash
# Install the PAM AFS module
sudo apt install -y libpam-afs-session

# Add to /etc/pam.d/common-auth (or the appropriate PAM config)
# This runs after Kerberos authentication succeeds
echo "session optional pam_afs_session.so" | \
  sudo tee -a /etc/pam.d/common-session

# Users who authenticate with Kerberos will automatically
# receive AFS tokens during login
```

## Setting Up a New AFS Cell

If you're creating a new AFS infrastructure rather than joining an existing one, the process involves additional components:

```bash
# Install server components
sudo apt install -y openafs-server openafs-fileserver openafs-dbserver

# Initialize the AFS server configuration
# This is a complex process - here's the high-level overview:

# 1. Set up Kerberos KDC for your realm first
# sudo apt install -y krb5-kdc krb5-admin-server

# 2. Create the AFS service principal in Kerberos
# kadmin.local -q "addprinc afs/yourcell.example.com"

# 3. Initialize the AFS database servers (bosserver)
# sudo /usr/sbin/bosserver -noauth &

# 4. Add the database server processes
# bos create <server> ptserver simple /usr/lib/openafs/ptserver -cell yourcell.example.com
# bos create <server> vlserver simple /usr/lib/openafs/vlserver -cell yourcell.example.com

# Full server setup is extensively documented in the OpenAFS documentation
# at https://docs.openafs.org/
```

## Troubleshooting Common Issues

```bash
# Client fails to start - check the kernel module
sudo modprobe openafs
sudo dmesg | grep -i afs

# "server or network unreachable" errors
# Check CellServDB has correct server IPs
ping afsdb1.andrew.cmu.edu
fs checkservers

# Token issues - no access after aklog
klist  # Check Kerberos ticket is valid
tokens # Check AFS token

# Retry authentication
kdestroy  # Destroy old tickets
kinit yourusername@REALM
aklog

# Cache corruption
sudo systemctl stop openafs-client
sudo rm -rf /var/cache/openafs/*
sudo systemctl start openafs-client

# Check OpenAFS client logs
journalctl -u openafs-client
```

AFS has a steeper learning curve than NFS, but its global namespace, built-in caching, and Kerberos security model make it a genuinely different tool suited for different use cases - particularly in academic and research environments where cross-institutional file sharing with strong security is valuable.
