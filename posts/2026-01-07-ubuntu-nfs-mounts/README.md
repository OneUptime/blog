# How to Mount NFS Shares on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, NFS, Storage, Networking

Description: Mount NFS shares on Ubuntu with persistent fstab configuration, performance tuning, and troubleshooting for networked storage.

---

Network File System (NFS) is one of the most widely used distributed file system protocols, enabling seamless file sharing across Unix and Linux networks. Whether you are setting up a home media server, configuring shared storage for a development team, or building enterprise-grade infrastructure, understanding how to properly mount NFS shares on Ubuntu is essential.

This comprehensive guide covers everything from basic NFS concepts to advanced configuration options, persistent mounts using fstab, performance optimization, and troubleshooting common issues.

## Understanding NFS Basics

### What is NFS?

NFS (Network File System) is a distributed file system protocol originally developed by Sun Microsystems in 1984. It allows a system to share directories and files with others over a network, enabling users to access remote files as if they were local.

### NFS Architecture

NFS follows a client-server model:

- **NFS Server**: The machine that shares (exports) directories
- **NFS Client**: The machine that mounts and accesses the shared directories
- **RPC (Remote Procedure Call)**: The underlying protocol that NFS uses for communication

### NFS Versions

Understanding NFS versions helps you choose the right configuration:

| Version | Features | Use Case |
|---------|----------|----------|
| NFSv2 | Original version, UDP only | Legacy systems (avoid if possible) |
| NFSv3 | TCP support, larger files, async writes | Older compatibility requirements |
| NFSv4 | Stateful, built-in security, firewall-friendly | Modern deployments (recommended) |
| NFSv4.1 | pNFS, session trunking | High-performance parallel access |
| NFSv4.2 | Server-side copy, sparse files | Latest features, storage efficiency |

NFSv4 and later versions are recommended for new deployments due to improved security, performance, and simplified firewall configuration (single port 2049).

## Prerequisites

Before mounting NFS shares, ensure you have:

- Ubuntu 20.04 LTS or later (this guide uses Ubuntu 22.04/24.04)
- Root or sudo access on the client machine
- Network connectivity to the NFS server
- The NFS server address and export path
- Proper firewall rules allowing NFS traffic

## Installing the NFS Client

Ubuntu requires the NFS client utilities to mount NFS shares. The installation process is straightforward.

### Update package lists and install NFS client utilities
```bash
sudo apt update
sudo apt install nfs-common -y
```

The `nfs-common` package includes essential utilities:
- `mount.nfs` and `mount.nfs4`: Mount helpers for NFS filesystems
- `showmount`: Display mount information from an NFS server
- `nfsstat`: Display NFS statistics
- `rpcinfo`: Report RPC information

### Verify the installation by checking the NFS utilities version
```bash
# Check if NFS mount helper is available
mount.nfs -V

# Verify RPC services are available
rpcinfo -p localhost
```

## Discovering Available NFS Exports

Before mounting, you need to know what shares the NFS server is exporting.

### Query the NFS server for available exports (NFSv3)
```bash
# Replace 'nfs-server-ip' with your actual server address
showmount -e nfs-server-ip
```

Example output:
```
Export list for nfs-server-ip:
/srv/nfs/shared    192.168.1.0/24
/srv/nfs/backups   192.168.1.0/24
/home              *(ro)
```

### For NFSv4, exports may be configured differently - check with the server admin
```bash
# NFSv4 uses a pseudo-filesystem root, so exports appear differently
# Common NFSv4 export path: /export/shared instead of /srv/nfs/shared
```

## Manual NFS Mounting

Manual mounting is useful for testing connectivity and temporary access to NFS shares.

### Create a local mount point directory
```bash
# Create the directory where the NFS share will be mounted
sudo mkdir -p /mnt/nfs/shared
```

### Basic NFS mount command for NFSv4 (recommended)
```bash
# Mount an NFSv4 share
sudo mount -t nfs4 nfs-server-ip:/shared /mnt/nfs/shared
```

### Mount with explicit NFSv3 for compatibility with older servers
```bash
# Force NFSv3 if the server doesn't support NFSv4
sudo mount -t nfs -o vers=3 nfs-server-ip:/srv/nfs/shared /mnt/nfs/shared
```

### Verify the mount was successful
```bash
# Check mounted filesystems
df -h /mnt/nfs/shared

# Alternative: use mount command to see NFS mounts
mount | grep nfs

# Test read access by listing the directory
ls -la /mnt/nfs/shared
```

### Unmount when finished (for temporary mounts)
```bash
# Unmount the NFS share
sudo umount /mnt/nfs/shared

# Force unmount if the share is busy (use with caution)
sudo umount -f /mnt/nfs/shared

# Lazy unmount - detaches filesystem and cleans up when not busy
sudo umount -l /mnt/nfs/shared
```

## Persistent Mounts with fstab

For production environments, you want NFS shares to mount automatically at boot time. This is achieved by adding entries to `/etc/fstab`.

### Understanding fstab Format

The `/etc/fstab` file uses the following format:
```
<device>        <mount_point>    <type>    <options>    <dump>    <pass>
```

Fields explained:
- **device**: NFS server and export path (e.g., `server:/export`)
- **mount_point**: Local directory where the share will be mounted
- **type**: Filesystem type (`nfs` or `nfs4`)
- **options**: Mount options (comma-separated)
- **dump**: Backup utility flag (use 0 for NFS)
- **pass**: fsck order (use 0 for NFS - network filesystems aren't checked)

### Create the mount point directory first
```bash
sudo mkdir -p /mnt/nfs/shared
```

### Add an entry to /etc/fstab for persistent mounting
```bash
# Open fstab in your preferred editor
sudo nano /etc/fstab
```

### Basic fstab entry for NFSv4
```
# NFS share from file server - general shared storage
nfs-server-ip:/shared    /mnt/nfs/shared    nfs4    defaults    0    0
```

### fstab entry with common recommended options
```
# NFS share with reliability and performance options
nfs-server-ip:/shared    /mnt/nfs/shared    nfs4    rw,hard,intr,rsize=131072,wsize=131072,timeo=600    0    0
```

### fstab entry for read-only share
```
# Read-only NFS share for configuration files
nfs-server-ip:/configs    /mnt/nfs/configs    nfs4    ro,hard,intr    0    0
```

### Test the fstab entry before rebooting
```bash
# Mount all filesystems defined in fstab (that aren't already mounted)
sudo mount -a

# Check for any errors
echo $?

# Verify the mount
df -h /mnt/nfs/shared
```

### Alternative: mount specific fstab entry
```bash
# Mount just the specific entry using the mount point
sudo mount /mnt/nfs/shared
```

## Essential Mount Options

Choosing the right mount options significantly impacts performance, reliability, and security.

### Connection and Recovery Options

| Option | Description | Recommended Value |
|--------|-------------|-------------------|
| `hard` | Retry NFS requests indefinitely (prevents data corruption) | Use for critical data |
| `soft` | Return error after retrans attempts (faster failure) | Use for non-critical data |
| `intr` | Allow interrupt of NFS operations (deprecated in NFSv4) | Use with hard mounts |
| `timeo=n` | Timeout in tenths of seconds before retry | 600 (60 seconds) |
| `retrans=n` | Number of retries before soft mount fails | 3 |

### fstab entry demonstrating connection options
```
# Hard mount with interrupt capability - best for important data
nfs-server-ip:/data    /mnt/nfs/data    nfs4    hard,timeo=600,retrans=3    0    0
```

### Performance Options

| Option | Description | Recommended Value |
|--------|-------------|-------------------|
| `rsize=n` | Read buffer size in bytes | 131072 (128KB) or higher |
| `wsize=n` | Write buffer size in bytes | 131072 (128KB) or higher |
| `async` | Asynchronous writes (faster but riskier) | Use for temp data |
| `sync` | Synchronous writes (safer but slower) | Use for critical data |
| `noatime` | Don't update access time (performance boost) | Recommended |
| `nodiratime` | Don't update directory access time | Recommended |

### High-performance fstab entry for large file transfers
```
# Optimized for large sequential reads/writes (video editing, backups)
nfs-server-ip:/media    /mnt/nfs/media    nfs4    rw,hard,rsize=1048576,wsize=1048576,noatime,nodiratime    0    0
```

### Security Options

| Option | Description | Use Case |
|--------|-------------|----------|
| `sec=krb5` | Kerberos authentication only | Enterprise security |
| `sec=krb5i` | Kerberos with integrity checking | Integrity verification |
| `sec=krb5p` | Kerberos with privacy (encryption) | Full encryption |
| `sec=sys` | Standard Unix authentication | Default, trusted networks |
| `nosuid` | Ignore setuid bits | Security hardening |
| `noexec` | Prevent execution of binaries | Security hardening |
| `nodev` | Ignore device files | Security hardening |

### Security-hardened fstab entry
```
# Secure mount with execution restrictions
nfs-server-ip:/uploads    /mnt/nfs/uploads    nfs4    rw,hard,nosuid,noexec,nodev    0    0
```

### NFSv4-Specific Options

| Option | Description |
|--------|-------------|
| `nfsvers=4` or `vers=4` | Force NFSv4 |
| `nfsvers=4.1` | Force NFSv4.1 |
| `nfsvers=4.2` | Force NFSv4.2 |
| `proto=tcp` | Use TCP (default and recommended) |
| `clientaddr=IP` | Specify client callback address |

### fstab entry forcing specific NFS version
```
# Force NFSv4.2 for latest features
nfs-server-ip:/data    /mnt/nfs/data    nfs4    nfsvers=4.2,rw,hard    0    0
```

## Handling Boot Order with systemd

Modern Ubuntu uses systemd, which can cause issues with NFS mounts if the network isn't ready at boot time.

### Method 1: Use _netdev option
```
# The _netdev option tells systemd this is a network filesystem
nfs-server-ip:/shared    /mnt/nfs/shared    nfs4    _netdev,rw,hard    0    0
```

### Method 2: Use x-systemd options for fine-grained control
```
# Wait for network and add timeout for mount attempts
nfs-server-ip:/shared    /mnt/nfs/shared    nfs4    _netdev,x-systemd.automount,x-systemd.mount-timeout=30    0    0
```

### Method 3: Create a systemd mount unit for complex scenarios
```bash
# Create a mount unit file
sudo nano /etc/systemd/system/mnt-nfs-shared.mount
```

### Content for the systemd mount unit file
```ini
[Unit]
Description=NFS Share Mount
After=network-online.target
Wants=network-online.target

[Mount]
What=nfs-server-ip:/shared
Where=/mnt/nfs/shared
Type=nfs4
Options=rw,hard,rsize=131072,wsize=131072
TimeoutSec=30

[Install]
WantedBy=multi-user.target
```

### Enable and start the systemd mount unit
```bash
# Reload systemd configuration
sudo systemctl daemon-reload

# Enable the mount to start at boot
sudo systemctl enable mnt-nfs-shared.mount

# Start the mount now
sudo systemctl start mnt-nfs-shared.mount

# Check status
sudo systemctl status mnt-nfs-shared.mount
```

## Using autofs for On-Demand Mounting

Autofs automatically mounts NFS shares when accessed and unmounts them after a period of inactivity. This is ideal for shares that are accessed intermittently.

### Install autofs package
```bash
sudo apt install autofs -y
```

### Configure the master map file
```bash
# Edit the autofs master configuration
sudo nano /etc/auto.master
```

### Add entry to auto.master to define a mount point base
```
# Format: mount-point-base    map-file    options
/mnt/nfs    /etc/auto.nfs    --timeout=300 --ghost
```

Options explained:
- `--timeout=300`: Unmount after 300 seconds (5 minutes) of inactivity
- `--ghost`: Show directories even when not mounted (improves usability)

### Create the map file for NFS shares
```bash
sudo nano /etc/auto.nfs
```

### Content for the auto.nfs map file
```
# Format: mount-directory    mount-options    server:/export
# Each line creates a subdirectory under /mnt/nfs

# General shared storage
shared    -fstype=nfs4,rw,hard,intr    nfs-server-ip:/shared

# Read-only configuration files
configs    -fstype=nfs4,ro,hard    nfs-server-ip:/configs

# High-performance media storage
media    -fstype=nfs4,rw,hard,rsize=1048576,wsize=1048576    nfs-server-ip:/media

# Backup storage with sync for data safety
backups    -fstype=nfs4,rw,hard,sync    nfs-server-ip:/backups
```

### Restart autofs to apply changes
```bash
sudo systemctl restart autofs

# Enable autofs to start at boot
sudo systemctl enable autofs

# Check autofs status
sudo systemctl status autofs
```

### Test autofs by accessing the mount point
```bash
# The share will mount automatically when you access it
ls /mnt/nfs/shared

# Check that it's mounted
mount | grep auto
df -h /mnt/nfs/shared
```

### Using wildcard maps for multiple exports
```bash
# Edit auto.nfs to use wildcard matching
sudo nano /etc/auto.nfs
```

### Wildcard configuration to mount any export from a server
```
# The asterisk matches any directory name
# Accessing /mnt/nfs/anyshare mounts server:/anyshare automatically
*    -fstype=nfs4,rw,hard    nfs-server-ip:/&
```

### Direct maps for specific mount points
```bash
# Add to /etc/auto.master for direct mounts
/-    /etc/auto.direct
```

### Create direct map file
```bash
sudo nano /etc/auto.direct
```

### Content for direct map - mounts at exact paths specified
```
# Direct mounts appear at the exact path specified
/data/shared    -fstype=nfs4,rw,hard    nfs-server-ip:/shared
/var/backups/nfs    -fstype=nfs4,rw,hard,sync    nfs-server-ip:/backups
```

## Monitoring NFS Mounts

Keeping an eye on NFS performance and status helps identify issues before they become problems.

### Check current NFS mount statistics
```bash
# Display NFS client statistics
nfsstat -c

# Display both client and server statistics (if running NFS server)
nfsstat

# Show per-mount statistics
cat /proc/self/mountstats
```

### Monitor NFS operations in real-time
```bash
# Watch NFS statistics update every 2 seconds
watch -n 2 'nfsstat -c'
```

### Check RPC information and connectivity
```bash
# Show RPC services on local machine
rpcinfo -p

# Show RPC services on NFS server
rpcinfo -p nfs-server-ip

# Test NFS server connectivity
rpcinfo -t nfs-server-ip nfs

# Test specific NFS version
rpcinfo -t nfs-server-ip nfs 4
```

### View mount details
```bash
# Detailed view of NFS mounts
cat /proc/mounts | grep nfs

# Check mount options in effect
mount -t nfs4

# View NFS-specific mount information
nfsstat -m
```

## Troubleshooting NFS Issues

NFS problems can stem from network issues, permission mismatches, or configuration errors. Here's a systematic approach to diagnosing and fixing common issues.

### Problem 1: Mount Fails with "Connection Refused"

This typically indicates the NFS server isn't running or isn't accessible.

### Diagnose connection issues
```bash
# Test basic network connectivity
ping -c 3 nfs-server-ip

# Check if NFS port is open
nc -zv nfs-server-ip 2049

# Verify RPC services on server
rpcinfo -p nfs-server-ip
```

### Check firewall rules on the client
```bash
# View current firewall rules
sudo iptables -L -n

# For UFW users
sudo ufw status verbose
```

### Problem 2: Mount Fails with "Permission Denied"

Permission issues usually relate to export configuration on the server.

### Check if your IP is allowed in the server's exports
```bash
# Query server exports
showmount -e nfs-server-ip

# Verify your client's IP address
ip addr show
hostname -I
```

### Problem 3: Mount Hangs or Times Out

Network latency, DNS issues, or server overload can cause hangs.

### Test with a shorter timeout
```bash
# Mount with explicit timeout for testing
sudo mount -t nfs4 -o timeo=50,retrans=2 nfs-server-ip:/shared /mnt/nfs/shared
```

### Check for DNS issues
```bash
# If using hostname instead of IP, verify DNS resolution
nslookup nfs-server
dig nfs-server

# Try mounting with IP address directly
sudo mount -t nfs4 192.168.1.100:/shared /mnt/nfs/shared
```

### Problem 4: Stale File Handle Errors

This occurs when the server's export is changed or recreated.

### Remount to fix stale file handle
```bash
# Unmount the stale mount (may require force)
sudo umount -f /mnt/nfs/shared

# If that fails, try lazy unmount
sudo umount -l /mnt/nfs/shared

# Remount
sudo mount /mnt/nfs/shared
```

### Problem 5: Poor Performance

Slow NFS performance can often be improved with tuning.

### Check current buffer sizes
```bash
# View effective mount options
nfsstat -m

# Check system-wide NFS settings
cat /proc/fs/nfsd/threads 2>/dev/null || echo "Not an NFS server"
```

### Test with larger buffer sizes
```bash
# Remount with larger read/write buffers
sudo umount /mnt/nfs/shared
sudo mount -t nfs4 -o rsize=1048576,wsize=1048576 nfs-server-ip:/shared /mnt/nfs/shared
```

### Benchmark NFS performance
```bash
# Write test - create a 1GB test file
dd if=/dev/zero of=/mnt/nfs/shared/testfile bs=1M count=1024

# Read test - read the test file
dd if=/mnt/nfs/shared/testfile of=/dev/null bs=1M

# Clean up
rm /mnt/nfs/shared/testfile
```

### Problem 6: Nobody/Nogroup User Mapping

Files appear owned by "nobody" or "nogroup" instead of actual users.

### Check ID mapping configuration
```bash
# View current ID mapping
cat /etc/idmapd.conf

# Ensure Domain matches between client and server
grep Domain /etc/idmapd.conf
```

### Fix ID mapping by setting correct domain
```bash
# Edit ID mapping configuration
sudo nano /etc/idmapd.conf
```

### Ensure the Domain matches your network's domain
```
[General]
Domain = example.com
```

### Restart NFS services after changing idmapd.conf
```bash
# Clear the ID mapping cache
sudo nfsidmap -c

# Restart related services
sudo systemctl restart nfs-idmapd

# Remount the NFS share
sudo umount /mnt/nfs/shared
sudo mount /mnt/nfs/shared
```

### Debug Mode for Persistent Issues

### Enable verbose NFS mounting
```bash
# Mount with verbose output
sudo mount -t nfs4 -v nfs-server-ip:/shared /mnt/nfs/shared
```

### Check system logs for NFS-related messages
```bash
# View recent NFS-related kernel messages
dmesg | grep -i nfs | tail -20

# Check syslog for mount daemon messages
grep -i nfs /var/log/syslog | tail -20

# Watch logs in real-time while mounting
sudo tail -f /var/log/syslog &
sudo mount /mnt/nfs/shared
```

### Use rpcdebug for detailed NFS tracing
```bash
# Enable NFS client debugging (generates lots of output)
sudo rpcdebug -m nfs -s all

# Perform the problematic operation
ls /mnt/nfs/shared

# Disable debugging
sudo rpcdebug -m nfs -c all

# Check kernel log for debug output
dmesg | tail -100
```

## Security Best Practices

Securing NFS is crucial, especially in environments with sensitive data.

### Use NFSv4 with Kerberos authentication
```
# fstab entry with Kerberos authentication
nfs-server-ip:/secure    /mnt/nfs/secure    nfs4    sec=krb5p,rw,hard    0    0
```

### Restrict mount options for untrusted content
```
# Prevent execution of files from NFS share
nfs-server-ip:/uploads    /mnt/nfs/uploads    nfs4    rw,nosuid,noexec,nodev    0    0
```

### Firewall configuration for NFSv4 (single port)
```bash
# Allow NFS traffic from specific network only
sudo ufw allow from 192.168.1.0/24 to any port 2049

# For iptables
sudo iptables -A INPUT -p tcp -s 192.168.1.0/24 --dport 2049 -j ACCEPT
```

### Regular security audits
```bash
# Check what's currently mounted
mount -t nfs4

# Verify mount options are as expected
cat /proc/mounts | grep nfs

# Check for world-writable directories in NFS shares
find /mnt/nfs -type d -perm -0002 2>/dev/null
```

## Complete Example Configuration

Here's a comprehensive example putting together everything we've covered.

### Complete fstab configuration for a typical setup
```
# /etc/fstab - NFS mount configuration
# <server:/export>    <mount_point>    <type>    <options>    <dump>    <pass>

# Primary shared storage - high reliability
192.168.1.10:/shared    /mnt/nfs/shared    nfs4    _netdev,rw,hard,intr,rsize=131072,wsize=131072,timeo=600,noatime    0    0

# Media storage - optimized for large files
192.168.1.10:/media    /mnt/nfs/media    nfs4    _netdev,rw,hard,rsize=1048576,wsize=1048576,noatime,nodiratime    0    0

# Configuration files - read-only for safety
192.168.1.10:/configs    /mnt/nfs/configs    nfs4    _netdev,ro,hard    0    0

# Backup storage - sync writes for data integrity
192.168.1.10:/backups    /mnt/nfs/backups    nfs4    _netdev,rw,hard,sync,nosuid,noexec    0    0

# User home directories - with NFSv4.2 features
192.168.1.10:/home    /home/nfs    nfs4    _netdev,nfsvers=4.2,rw,hard,intr    0    0
```

### Script to verify all NFS mounts after boot
```bash
#!/bin/bash
# /usr/local/bin/check-nfs-mounts.sh
# Verify all NFS mounts are accessible

NFS_MOUNTS=(
    "/mnt/nfs/shared"
    "/mnt/nfs/media"
    "/mnt/nfs/configs"
    "/mnt/nfs/backups"
)

for mount in "${NFS_MOUNTS[@]}"; do
    if mountpoint -q "$mount"; then
        if ls "$mount" > /dev/null 2>&1; then
            echo "[OK] $mount is mounted and accessible"
        else
            echo "[ERROR] $mount is mounted but not accessible"
        fi
    else
        echo "[ERROR] $mount is not mounted"
    fi
done
```

### Make the verification script executable
```bash
sudo chmod +x /usr/local/bin/check-nfs-mounts.sh
```

## Summary

Mounting NFS shares on Ubuntu is straightforward once you understand the key concepts:

1. **Install nfs-common** to get the necessary client utilities
2. **Discover exports** using `showmount -e server` (for NFSv3) or consult server documentation
3. **Test with manual mounts** before adding to fstab
4. **Configure persistent mounts** in `/etc/fstab` with appropriate options
5. **Use autofs** for on-demand mounting of intermittently used shares
6. **Choose mount options** based on your requirements for performance, reliability, and security
7. **Handle boot order** with `_netdev` or systemd mount units
8. **Monitor and troubleshoot** using nfsstat, rpcinfo, and system logs

Key recommendations:
- Use NFSv4 or later for improved security and simplified configuration
- Always use `hard` mounts for important data to prevent corruption
- Include `_netdev` in fstab entries to ensure proper boot ordering
- Consider autofs for shares that aren't needed constantly
- Implement security best practices, especially `nosuid`, `noexec`, and `nodev` where appropriate

With these configurations in place, your Ubuntu system will reliably access NFS shares across your network, whether for personal file sharing or enterprise storage infrastructure.
