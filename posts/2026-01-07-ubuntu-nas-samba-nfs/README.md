# How to Configure Ubuntu as a NAS with Samba and NFS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, NAS, Samba, NFS, Storage

Description: Configure Ubuntu as a network-attached storage server with Samba for Windows clients and NFS for Linux clients.

---

Network-attached storage (NAS) provides centralized file storage accessible to multiple clients over a network. While commercial NAS solutions exist, Ubuntu Server offers a flexible and cost-effective alternative that can be customized to your exact requirements. This guide covers building a robust NAS solution using Samba for Windows compatibility and NFS for Linux/Unix clients, complete with storage planning, security configurations, and performance optimization.

## Prerequisites

Before beginning this setup, ensure you have:

- Ubuntu Server 22.04 LTS or newer installed
- Root or sudo access to the server
- Multiple storage drives (for RAID/ZFS configurations)
- Network connectivity between server and clients
- Basic familiarity with Linux command line

## Storage Planning and Preparation

### Identifying Available Disks

First, identify all available storage devices on your system.

```bash
# List all block devices with size and type information
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT

# Get detailed information about specific disks
sudo fdisk -l /dev/sdb /dev/sdc /dev/sdd

# Check disk health status with SMART
sudo apt install smartmontools -y
sudo smartctl -a /dev/sdb
```

### Choosing a Storage Configuration

You have several options for organizing your storage, each with different trade-offs between performance, redundancy, and capacity.

#### Option 1: Software RAID with mdadm

Software RAID provides redundancy using the Linux kernel's md driver.

```bash
# Install mdadm for software RAID management
sudo apt install mdadm -y

# Create a RAID 5 array using three disks
# RAID 5 provides single disk failure tolerance with good read performance
sudo mdadm --create /dev/md0 \
    --level=5 \
    --raid-devices=3 \
    /dev/sdb /dev/sdc /dev/sdd

# Monitor RAID creation progress
watch cat /proc/mdstat

# Save RAID configuration to persist across reboots
sudo mdadm --detail --scan | sudo tee -a /etc/mdadm/mdadm.conf

# Update initramfs to include RAID configuration
sudo update-initramfs -u
```

```bash
# Format the RAID array with ext4
sudo mkfs.ext4 -L nas_storage /dev/md0

# Create mount point and mount the array
sudo mkdir -p /srv/nas
sudo mount /dev/md0 /srv/nas

# Add entry to fstab for automatic mounting
echo '/dev/md0 /srv/nas ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
```

#### Option 2: ZFS for Advanced Storage Management

ZFS provides integrated volume management, data integrity verification, and snapshots.

```bash
# Install ZFS utilities
sudo apt install zfsutils-linux -y

# Create a ZFS pool with RAIDZ1 (similar to RAID 5)
# Replace disk identifiers with your actual devices
sudo zpool create -f nas_pool raidz1 \
    /dev/disk/by-id/scsi-SATA_DISK1 \
    /dev/disk/by-id/scsi-SATA_DISK2 \
    /dev/disk/by-id/scsi-SATA_DISK3

# Check pool status
sudo zpool status nas_pool
```

```bash
# Create datasets for different share types with appropriate settings
# Datasets allow different compression and quota settings per share

# General file storage with LZ4 compression
sudo zfs create -o compression=lz4 -o atime=off nas_pool/files

# Media storage with no compression (already compressed)
sudo zfs create -o compression=off -o atime=off nas_pool/media

# Backup storage with maximum compression
sudo zfs create -o compression=zstd -o atime=off nas_pool/backups

# Set quotas to prevent any single share from consuming all space
sudo zfs set quota=500G nas_pool/files
sudo zfs set quota=2T nas_pool/media
sudo zfs set quota=1T nas_pool/backups
```

```bash
# Enable automatic snapshots for data protection
sudo apt install zfs-auto-snapshot -y

# Configure snapshot retention policy in crontab
# Keep 4 15-minute, 24 hourly, 7 daily, 4 weekly, 12 monthly snapshots
sudo systemctl enable zfs-auto-snapshot.timer
```

### Creating the Directory Structure

Organize your NAS with a logical directory structure.

```bash
# Create base directories for different share types
sudo mkdir -p /srv/nas/{public,private,media,backups}

# Create subdirectories for organization
sudo mkdir -p /srv/nas/public/{documents,software,templates}
sudo mkdir -p /srv/nas/private/{finance,hr,projects}
sudo mkdir -p /srv/nas/media/{movies,music,photos}
sudo mkdir -p /srv/nas/backups/{daily,weekly,monthly}

# Set appropriate base permissions
sudo chmod 755 /srv/nas
sudo chmod 777 /srv/nas/public
sudo chmod 770 /srv/nas/private
sudo chmod 775 /srv/nas/media
sudo chmod 770 /srv/nas/backups
```

## User and Group Management

Proper user management is essential for access control across both Samba and NFS.

### Creating NAS Groups

```bash
# Create groups for different access levels
sudo groupadd nas_users      # All NAS users
sudo groupadd nas_admins     # Full administrative access
sudo groupadd nas_media      # Media content access
sudo groupadd nas_backup     # Backup operators

# Create system user for guest access (no login shell)
sudo useradd -r -s /usr/sbin/nologin nas_guest
```

### Creating NAS Users

```bash
# Create individual users for NAS access
# These users will authenticate via Samba and/or NFS

# Create a regular NAS user
sudo useradd -m -s /bin/bash -G nas_users alice
sudo passwd alice

# Create a user with media access
sudo useradd -m -s /bin/bash -G nas_users,nas_media bob
sudo passwd bob

# Create an administrator
sudo useradd -m -s /bin/bash -G nas_users,nas_admins,nas_media charlie
sudo passwd charlie

# Add existing system users to NAS groups
sudo usermod -aG nas_users,nas_admins $USER
```

### Setting Directory Ownership

```bash
# Set ownership for shared directories
sudo chown root:nas_users /srv/nas/public
sudo chown root:nas_admins /srv/nas/private
sudo chown root:nas_media /srv/nas/media
sudo chown root:nas_backup /srv/nas/backups

# Set sticky bit and SGID for proper file creation
# SGID ensures new files inherit group ownership
sudo chmod 2775 /srv/nas/public
sudo chmod 2770 /srv/nas/private
sudo chmod 2775 /srv/nas/media
sudo chmod 2770 /srv/nas/backups

# Apply to all subdirectories recursively
sudo find /srv/nas -type d -exec chmod g+s {} \;
```

## Samba Installation and Configuration

Samba provides SMB/CIFS file sharing compatible with Windows, macOS, and Linux.

### Installing Samba

```bash
# Install Samba and related utilities
sudo apt update
sudo apt install samba samba-common-bin smbclient cifs-utils -y

# Check Samba version
smbd --version

# Backup the original configuration
sudo cp /etc/samba/smb.conf /etc/samba/smb.conf.backup
```

### Configuring Samba Users

Samba maintains its own password database separate from system passwords.

```bash
# Add existing system users to Samba
# Users must exist in the system before adding to Samba
sudo smbpasswd -a alice
sudo smbpasswd -a bob
sudo smbpasswd -a charlie

# Enable Samba users
sudo smbpasswd -e alice
sudo smbpasswd -e bob
sudo smbpasswd -e charlie

# List Samba users
sudo pdbedit -L -v
```

### Main Samba Configuration

Create a comprehensive Samba configuration file.

```bash
# Create the main Samba configuration
sudo tee /etc/samba/smb.conf > /dev/null << 'EOF'
#======================= Global Settings =======================
[global]
   # Server identification
   workgroup = WORKGROUP
   server string = Ubuntu NAS Server
   netbios name = UBUNTUNAS

   # Security settings
   security = user
   map to guest = never
   encrypt passwords = yes
   passdb backend = tdbsam

   # Authentication
   server role = standalone server
   obey pam restrictions = yes
   unix password sync = yes
   passwd program = /usr/bin/passwd %u
   passwd chat = *Enter\snew\s*\spassword:* %n\n *Retype\snew\s*\spassword:* %n\n *password\supdated\ssuccessfully* .
   pam password change = yes

   # Protocol settings
   server min protocol = SMB2
   server max protocol = SMB3
   client min protocol = SMB2

   # Logging
   log file = /var/log/samba/log.%m
   max log size = 1000
   logging = file
   panic action = /usr/share/samba/panic-action %d

   # Performance tuning
   socket options = TCP_NODELAY IPTOS_LOWDELAY
   read raw = yes
   write raw = yes
   use sendfile = yes
   aio read size = 16384
   aio write size = 16384

   # macOS compatibility
   fruit:metadata = stream
   fruit:model = MacSamba
   fruit:veto_appledouble = no
   fruit:nfs_aces = no
   fruit:wipe_intentionally_left_blank_rfork = yes
   fruit:delete_empty_adfiles = yes
   vfs objects = fruit streams_xattr

   # Disable printer sharing
   load printers = no
   printing = bsd
   printcap name = /dev/null
   disable spoolss = yes

#======================= Share Definitions =======================

# Public share accessible to all authenticated users
[Public]
   comment = Public File Share
   path = /srv/nas/public
   browseable = yes
   read only = no
   guest ok = no
   valid users = @nas_users
   force group = nas_users
   create mask = 0664
   directory mask = 0775

# Private share for administrators only
[Private]
   comment = Private Administrative Share
   path = /srv/nas/private
   browseable = yes
   read only = no
   guest ok = no
   valid users = @nas_admins
   force group = nas_admins
   create mask = 0660
   directory mask = 0770

# Media share for media group members
[Media]
   comment = Media Files Share
   path = /srv/nas/media
   browseable = yes
   read only = no
   guest ok = no
   valid users = @nas_media @nas_admins
   force group = nas_media
   create mask = 0664
   directory mask = 0775

# Backups share with restricted access
[Backups]
   comment = Backup Storage
   path = /srv/nas/backups
   browseable = yes
   read only = no
   guest ok = no
   valid users = @nas_backup @nas_admins
   force group = nas_backup
   create mask = 0660
   directory mask = 0770

# User home directories
[homes]
   comment = Home Directories
   browseable = no
   read only = no
   valid users = %S
   create mask = 0600
   directory mask = 0700
EOF
```

### Validating and Starting Samba

```bash
# Test the configuration file for errors
testparm

# Restart Samba services
sudo systemctl restart smbd nmbd

# Enable Samba to start at boot
sudo systemctl enable smbd nmbd

# Check service status
sudo systemctl status smbd nmbd
```

### Configuring Firewall for Samba

```bash
# Allow Samba through UFW firewall
sudo ufw allow samba

# Or specify individual ports
sudo ufw allow 139/tcp    # NetBIOS Session
sudo ufw allow 445/tcp    # SMB over TCP
sudo ufw allow 137/udp    # NetBIOS Name Service
sudo ufw allow 138/udp    # NetBIOS Datagram

# Reload firewall
sudo ufw reload

# Verify rules
sudo ufw status numbered
```

## NFS Server Setup

NFS (Network File System) provides native file sharing for Linux and Unix systems.

### Installing NFS Server

```bash
# Install NFS kernel server package
sudo apt install nfs-kernel-server -y

# Check NFS server status
sudo systemctl status nfs-kernel-server

# Verify NFS modules are loaded
lsmod | grep nfs
```

### Configuring NFS Exports

```bash
# Create the NFS exports configuration
sudo tee /etc/exports > /dev/null << 'EOF'
# NFS Export Configuration
# Format: path host(options)

# Public share - read/write access for specific network
# sync: write data to disk before confirming
# no_subtree_check: improves reliability
/srv/nas/public 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)

# Media share - read-only for general access, read-write for trusted hosts
/srv/nas/media 192.168.1.0/24(ro,sync,no_subtree_check)
/srv/nas/media 192.168.1.100(rw,sync,no_subtree_check)
/srv/nas/media 192.168.1.101(rw,sync,no_subtree_check)

# Backups share - restricted to specific backup servers
/srv/nas/backups 192.168.1.50(rw,sync,no_subtree_check,no_root_squash)

# Private share with root squashing for security
/srv/nas/private 192.168.1.0/24(rw,sync,no_subtree_check,root_squash,all_squash,anonuid=1000,anongid=1000)
EOF
```

### Understanding NFS Export Options

```bash
# Common NFS export options explained:
#
# rw              - Read/write access
# ro              - Read-only access
# sync            - Synchronous writes (safer but slower)
# async           - Asynchronous writes (faster but riskier)
# no_subtree_check - Disable subtree checking (recommended)
# root_squash     - Map root to anonymous user (default, more secure)
# no_root_squash  - Allow root access (needed for backup operations)
# all_squash      - Map all users to anonymous
# anonuid/anongid - Specify UID/GID for anonymous mapping
# secure          - Require client port < 1024
# insecure        - Allow any client port
```

### Activating NFS Exports

```bash
# Apply the exports configuration
sudo exportfs -ra

# Verify active exports
sudo exportfs -v

# Show current export table
sudo showmount -e localhost
```

### Configuring Firewall for NFS

```bash
# NFS uses multiple services that need firewall access
# Enable NFS through UFW

# Allow NFS service
sudo ufw allow from 192.168.1.0/24 to any port nfs

# For NFSv3, also allow additional services
sudo ufw allow from 192.168.1.0/24 to any port 111   # rpcbind
sudo ufw allow from 192.168.1.0/24 to any port 2049  # nfs
sudo ufw allow from 192.168.1.0/24 to any port 20048 # mountd

# Reload firewall
sudo ufw reload
```

### Configuring Static Ports for NFSv3

For easier firewall management with NFSv3, configure static ports.

```bash
# Configure NFS to use static ports
sudo tee /etc/default/nfs-kernel-server > /dev/null << 'EOF'
# Number of NFS server threads
RPCNFSDCOUNT=8

# Runtime priority of server
RPCNFSDPRIORITY=0

# Options for rpc.mountd
RPCMOUNTDOPTS="--manage-gids --port 20048"

# Options for rpc.statd
RPCSTATDOPTS="--port 32765 --outgoing-port 32766"

# Options for rpc.lockd
RPCLOCKDOPTS="--port 32803"

# Options for sm-notify
RPCSMNOTIFYOPTS=""

# Enable NFSv4 (also handles v3)
NEED_SVCGSSD=""
EOF

# Configure lockd ports
sudo tee -a /etc/modprobe.d/lockd.conf > /dev/null << 'EOF'
options lockd nlm_udpport=32803 nlm_tcpport=32803
EOF

# Restart NFS server
sudo systemctl restart nfs-kernel-server
```

## Advanced Share Permissions

### Access Control Lists (ACLs)

ACLs provide fine-grained permission control beyond standard Unix permissions.

```bash
# Install ACL utilities
sudo apt install acl -y

# Ensure filesystem supports ACLs (usually enabled by default)
sudo mount | grep /srv/nas

# Set default ACLs for new files in public share
# This ensures all new files inherit proper permissions
sudo setfacl -R -m d:g:nas_users:rwX /srv/nas/public
sudo setfacl -R -m g:nas_users:rwX /srv/nas/public

# Set ACLs for media share
sudo setfacl -R -m d:g:nas_media:rwX /srv/nas/media
sudo setfacl -R -m d:g:nas_admins:rwX /srv/nas/media

# View current ACLs
getfacl /srv/nas/public
```

### Creating Project-Specific Shares

```bash
# Create a project share with specific team access
sudo mkdir -p /srv/nas/projects/project_alpha

# Set ownership and permissions
sudo chown root:nas_users /srv/nas/projects
sudo chmod 2775 /srv/nas/projects

# Create project-specific group
sudo groupadd project_alpha_team

# Set ACLs for the project directory
sudo setfacl -R -m g:project_alpha_team:rwX /srv/nas/projects/project_alpha
sudo setfacl -R -m d:g:project_alpha_team:rwX /srv/nas/projects/project_alpha

# Add users to the project team
sudo usermod -aG project_alpha_team alice
sudo usermod -aG project_alpha_team bob
```

Add the project share to Samba configuration.

```bash
# Add project share to smb.conf
sudo tee -a /etc/samba/smb.conf > /dev/null << 'EOF'

# Project Alpha team share
[ProjectAlpha]
   comment = Project Alpha Team Files
   path = /srv/nas/projects/project_alpha
   browseable = yes
   read only = no
   guest ok = no
   valid users = @project_alpha_team @nas_admins
   force group = project_alpha_team
   create mask = 0664
   directory mask = 0775
EOF

# Reload Samba configuration
sudo smbcontrol all reload-config
```

## Performance Tuning

### Samba Performance Optimization

```bash
# Add performance settings to smb.conf [global] section
sudo tee -a /etc/samba/smb.conf.performance > /dev/null << 'EOF'
# Performance tuning additions for [global] section

   # Asynchronous I/O settings
   aio read size = 1
   aio write size = 1

   # Large read/write buffer sizes
   read raw = yes
   write raw = yes
   max xmit = 65535

   # Disable oplocks for better reliability on busy shares
   # Enable for better single-client performance
   oplocks = yes
   level2 oplocks = yes

   # Use sendfile for efficient file transfers
   use sendfile = yes

   # Minimize stat cache misses
   stat cache = yes

   # Reduce CPU usage
   getwd cache = yes

   # SMB2/3 performance tuning
   server multi channel support = yes
EOF
```

### NFS Performance Optimization

```bash
# Increase NFS server threads for better parallel performance
sudo tee /etc/default/nfs-kernel-server > /dev/null << 'EOF'
# Increase number of NFS daemon threads
# Recommended: 8 threads per CPU core for busy servers
RPCNFSDCOUNT=16

# Priority settings
RPCNFSDPRIORITY=0

# Mount daemon options
RPCMOUNTDOPTS="--manage-gids --port 20048"
EOF

# Restart NFS to apply changes
sudo systemctl restart nfs-kernel-server
```

### System-Level Optimizations

```bash
# Create sysctl configuration for NAS performance
sudo tee /etc/sysctl.d/99-nas-performance.conf > /dev/null << 'EOF'
# Network buffer sizes for high-throughput file serving
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576
net.ipv4.tcp_rmem = 4096 1048576 16777216
net.ipv4.tcp_wmem = 4096 1048576 16777216

# Enable TCP window scaling
net.ipv4.tcp_window_scaling = 1

# Reduce TCP keepalive time
net.ipv4.tcp_keepalive_time = 600

# Increase socket backlog
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535

# VM settings for file server workloads
vm.dirty_ratio = 40
vm.dirty_background_ratio = 10
vm.swappiness = 10
EOF

# Apply sysctl settings
sudo sysctl -p /etc/sysctl.d/99-nas-performance.conf
```

### I/O Scheduler Optimization

```bash
# Check current I/O scheduler for storage devices
cat /sys/block/sda/queue/scheduler

# For SSDs, use 'none' or 'mq-deadline'
# For HDDs, use 'mq-deadline' or 'bfq'
echo 'mq-deadline' | sudo tee /sys/block/sdb/queue/scheduler

# Make I/O scheduler persistent via udev rule
sudo tee /etc/udev/rules.d/60-io-scheduler.rules > /dev/null << 'EOF'
# Set mq-deadline for rotational drives (HDDs)
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", ATTR{queue/scheduler}="mq-deadline"

# Set none for non-rotational drives (SSDs/NVMe)
ACTION=="add|change", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="none"
ACTION=="add|change", KERNEL=="nvme[0-9]*", ATTR{queue/scheduler}="none"
EOF

# Reload udev rules
sudo udevadm control --reload-rules
```

## Monitoring Storage Health

### Setting Up SMART Monitoring

```bash
# Install smartmontools if not already installed
sudo apt install smartmontools -y

# Enable SMART on all drives
sudo smartctl -s on /dev/sdb
sudo smartctl -s on /dev/sdc
sudo smartctl -s on /dev/sdd

# Run a short self-test
sudo smartctl -t short /dev/sdb

# Check SMART status and health
sudo smartctl -H /dev/sdb
```

```bash
# Configure smartd for automatic monitoring
sudo tee /etc/smartd.conf > /dev/null << 'EOF'
# Monitor all drives with SMART capability
# -a: monitor all SMART attributes
# -o on: enable automatic offline testing
# -S on: enable automatic attribute saving
# -n standby,q: skip checks if drive is in standby
# -s (S/../.././02|L/../../6/03): short test daily at 2am, long test Saturday 3am
# -m root: send alerts to root
# -M exec /usr/share/smartmontools/smartd-runner: run alert script

DEVICESCAN -a -o on -S on -n standby,q -s (S/../.././02|L/../../6/03) -m root -M exec /usr/share/smartmontools/smartd-runner
EOF

# Restart smartd service
sudo systemctl restart smartd
sudo systemctl enable smartd
```

### RAID/ZFS Health Monitoring

```bash
# For mdadm RAID arrays
# Check RAID status
cat /proc/mdstat

# Detailed RAID information
sudo mdadm --detail /dev/md0

# Set up email alerts for RAID events
sudo tee /etc/mdadm/mdadm.conf > /dev/null << 'EOF'
MAILADDR admin@example.com
MAILFROM nas-server@example.com
EOF
```

```bash
# For ZFS pools
# Check pool status
sudo zpool status

# Enable ZFS event daemon for notifications
sudo systemctl enable zed
sudo systemctl start zed

# Configure ZED email notifications
sudo tee /etc/zfs/zed.d/zed.rc > /dev/null << 'EOF'
ZED_EMAIL_ADDR="admin@example.com"
ZED_EMAIL_PROG="mail"
ZED_NOTIFY_INTERVAL_SECS=3600
ZED_NOTIFY_VERBOSE=1
EOF

# Run a ZFS scrub to check data integrity
sudo zpool scrub nas_pool

# Schedule regular scrubs via cron
echo '0 2 * * 0 root /sbin/zpool scrub nas_pool' | sudo tee /etc/cron.d/zfs-scrub
```

### Disk Space Monitoring

```bash
# Create a disk space monitoring script
sudo tee /usr/local/bin/check-nas-space.sh > /dev/null << 'EOF'
#!/bin/bash
# NAS disk space monitoring script

THRESHOLD=85
EMAIL="admin@example.com"

# Check each mounted NAS filesystem
for mount in /srv/nas /srv/nas/public /srv/nas/media; do
    if mountpoint -q "$mount" 2>/dev/null; then
        USAGE=$(df "$mount" | awk 'NR==2 {print $5}' | tr -d '%')
        if [ "$USAGE" -gt "$THRESHOLD" ]; then
            echo "Warning: $mount is ${USAGE}% full" | mail -s "NAS Space Alert" "$EMAIL"
        fi
    fi
done

# For ZFS, check pool capacity
if command -v zpool &> /dev/null; then
    CAPACITY=$(zpool list -H -o capacity nas_pool 2>/dev/null | tr -d '%')
    if [ -n "$CAPACITY" ] && [ "$CAPACITY" -gt "$THRESHOLD" ]; then
        echo "Warning: ZFS pool nas_pool is ${CAPACITY}% full" | mail -s "ZFS Space Alert" "$EMAIL"
    fi
fi
EOF

# Make script executable
sudo chmod +x /usr/local/bin/check-nas-space.sh

# Schedule hourly checks
echo '0 * * * * root /usr/local/bin/check-nas-space.sh' | sudo tee /etc/cron.d/nas-space-check
```

### Connection Monitoring

```bash
# Monitor active Samba connections
sudo smbstatus

# Monitor active NFS connections
sudo showmount -a

# Create a comprehensive status script
sudo tee /usr/local/bin/nas-status.sh > /dev/null << 'EOF'
#!/bin/bash
# NAS status monitoring script

echo "=========================================="
echo "NAS Server Status Report"
echo "Generated: $(date)"
echo "=========================================="

echo -e "\n--- Storage Status ---"
df -h /srv/nas* 2>/dev/null

echo -e "\n--- RAID Status ---"
if [ -f /proc/mdstat ]; then
    cat /proc/mdstat
fi

echo -e "\n--- ZFS Pool Status ---"
if command -v zpool &> /dev/null; then
    zpool status 2>/dev/null
fi

echo -e "\n--- Samba Connections ---"
smbstatus -b 2>/dev/null || echo "No active Samba connections"

echo -e "\n--- NFS Exports ---"
exportfs -v

echo -e "\n--- Service Status ---"
systemctl is-active smbd nmbd nfs-kernel-server 2>/dev/null | paste - - -

echo -e "\n--- Disk Health Summary ---"
for disk in /dev/sd[b-z]; do
    if [ -b "$disk" ]; then
        HEALTH=$(sudo smartctl -H "$disk" 2>/dev/null | grep -i "overall-health" | awk '{print $NF}')
        echo "$disk: ${HEALTH:-Unknown}"
    fi
done
EOF

sudo chmod +x /usr/local/bin/nas-status.sh
```

## Client Configuration

### Connecting from Windows

```powershell
# Map a network drive from Windows Command Prompt
net use Z: \\192.168.1.10\Public /user:alice /persistent:yes

# Or using PowerShell
New-PSDrive -Name "Z" -PSProvider FileSystem -Root "\\192.168.1.10\Public" -Persist -Credential (Get-Credential)

# Verify connection
net use
```

### Connecting from Linux (Samba)

```bash
# Install CIFS utilities
sudo apt install cifs-utils -y

# Mount Samba share temporarily
sudo mount -t cifs //192.168.1.10/Public /mnt/nas \
    -o username=alice,uid=$(id -u),gid=$(id -g)

# Create credentials file for secure mounting
sudo tee /root/.nas-credentials > /dev/null << 'EOF'
username=alice
password=your_password
domain=WORKGROUP
EOF
sudo chmod 600 /root/.nas-credentials

# Add to fstab for automatic mounting
echo '//192.168.1.10/Public /mnt/nas cifs credentials=/root/.nas-credentials,uid=1000,gid=1000,file_mode=0664,dir_mode=0775 0 0' | sudo tee -a /etc/fstab
```

### Connecting from Linux (NFS)

```bash
# Install NFS client utilities
sudo apt install nfs-common -y

# Mount NFS share temporarily
sudo mount -t nfs 192.168.1.10:/srv/nas/public /mnt/nas

# Mount with specific options for better performance
sudo mount -t nfs -o rw,hard,intr,rsize=1048576,wsize=1048576,timeo=600 \
    192.168.1.10:/srv/nas/media /mnt/media

# Add to fstab for automatic mounting
echo '192.168.1.10:/srv/nas/public /mnt/nas nfs defaults,rsize=1048576,wsize=1048576,timeo=600 0 0' | sudo tee -a /etc/fstab

# Mount all fstab entries
sudo mount -a
```

### Connecting from macOS

```bash
# Mount Samba share from Terminal
mkdir -p ~/NAS
mount -t smbfs //alice@192.168.1.10/Public ~/NAS

# Or use Finder: Go > Connect to Server (Cmd+K)
# Enter: smb://192.168.1.10/Public

# Mount NFS share
sudo mount -t nfs -o resvport 192.168.1.10:/srv/nas/public /Volumes/NAS
```

## Security Best Practices

### Restricting Network Access

```bash
# Configure Samba to only listen on specific interfaces
# Add to [global] section of smb.conf
sudo tee -a /etc/samba/smb.conf.security > /dev/null << 'EOF'
   # Network binding restrictions
   interfaces = 192.168.1.10/24 lo
   bind interfaces only = yes

   # Host-based access control
   hosts allow = 192.168.1. 127.0.0.1
   hosts deny = 0.0.0.0/0
EOF
```

### Enabling Audit Logging

```bash
# Add audit logging to Samba shares
# Append to share definitions in smb.conf

# Example for Public share with auditing
# [Public]
#    vfs objects = full_audit
#    full_audit:prefix = %u|%I
#    full_audit:success = open opendir write unlink rename mkdir rmdir chmod chown
#    full_audit:failure = all
#    full_audit:facility = local7
#    full_audit:priority = notice

# Configure rsyslog for Samba audit logs
sudo tee /etc/rsyslog.d/50-samba-audit.conf > /dev/null << 'EOF'
local7.* /var/log/samba/audit.log
EOF

sudo systemctl restart rsyslog
```

### Regular Security Updates

```bash
# Create update script for NAS-related packages
sudo tee /usr/local/bin/update-nas.sh > /dev/null << 'EOF'
#!/bin/bash
# Update NAS-related packages

apt update
apt upgrade -y samba samba-common nfs-kernel-server smartmontools
systemctl restart smbd nmbd nfs-kernel-server
echo "NAS packages updated at $(date)" >> /var/log/nas-updates.log
EOF

sudo chmod +x /usr/local/bin/update-nas.sh
```

## Troubleshooting

### Common Samba Issues

```bash
# Check Samba logs for errors
sudo tail -f /var/log/samba/log.smbd

# Test Samba configuration
testparm -s

# Check if Samba ports are listening
sudo ss -tlnp | grep -E '139|445'

# Test connection from server
smbclient -L localhost -U alice

# Check SELinux/AppArmor if enabled
sudo aa-status
```

### Common NFS Issues

```bash
# Check NFS server logs
sudo journalctl -u nfs-kernel-server -f

# Verify exports are active
sudo exportfs -v

# Check RPC services
rpcinfo -p localhost

# Test NFS mount from server
sudo mount -t nfs localhost:/srv/nas/public /mnt/test

# Debug NFS with verbose mounting
sudo mount -t nfs -o v 192.168.1.10:/srv/nas/public /mnt/test
```

### Permission Issues

```bash
# Check effective permissions
namei -l /srv/nas/public/testfile

# Verify user group membership
groups alice

# Check ACLs
getfacl /srv/nas/public

# Test file creation
sudo -u alice touch /srv/nas/public/test_write
```

## Conclusion

You have successfully configured Ubuntu as a comprehensive NAS solution with both Samba and NFS support. This setup provides:

- Flexible storage options with RAID or ZFS for data protection
- Windows, macOS, and Linux client compatibility via Samba
- Native Linux file sharing with NFS
- Granular permission control using groups and ACLs
- Performance optimization for high-throughput file serving
- Comprehensive monitoring for storage health

Remember to regularly:
- Monitor disk health with SMART tools
- Run ZFS scrubs or RAID checks
- Review access logs for security auditing
- Keep the system updated with security patches
- Test backup and recovery procedures

For production environments, consider adding a UPS with automatic shutdown scripts, implementing off-site backup replication, and setting up centralized monitoring with tools like Prometheus and Grafana for long-term visibility into your NAS performance and health.
