# How to Configure SMB/CIFS Client Mounts on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SMB, CIFS, Networking, Storage

Description: Mount Windows shares and Samba servers on Ubuntu using CIFS, including permanent mounts in fstab, credential files for security, and multi-user authentication options.

---

Ubuntu handles SMB/CIFS mounts through the `cifs-utils` package, which provides the `mount.cifs` driver. Whether you're connecting to Windows file shares, a Samba server on Linux, or a NAS device, the process is the same. Getting it right means understanding credential management, mount options, and how to handle the differences between interactive and service mounts.

## Installing the CIFS Client

```bash
# Install the CIFS kernel module and utilities
sudo apt update
sudo apt install -y cifs-utils

# Verify the module is available
modinfo cifs | head -5

# Load it if not already loaded
sudo modprobe cifs

# Confirm it's loaded
lsmod | grep cifs
```

## Manual Mount for Testing

Before setting up permanent mounts, test your connection manually:

```bash
# Create a mount point
sudo mkdir -p /mnt/share

# Mount a Windows share or Samba server
# Replace with your actual server IP, share name, and credentials
sudo mount -t cifs //192.168.1.100/sharename /mnt/share \
  -o username=myuser,password=mypassword,domain=WORKGROUP

# Mount a share with specific protocol version
# Use vers=3.0 for Server 2012+, vers=2.1 for Server 2008 R2
sudo mount -t cifs //192.168.1.100/sharename /mnt/share \
  -o username=myuser,password=mypassword,vers=3.0

# Verify the mount
df -h /mnt/share
mount | grep cifs

# Test read/write access
ls /mnt/share
touch /mnt/share/test-file.txt
rm /mnt/share/test-file.txt

# Unmount when done testing
sudo umount /mnt/share
```

## Setting Up a Credentials File

Never put passwords in `/etc/fstab`. Use a credentials file instead:

```bash
# Create the credentials file
sudo nano /etc/samba/credentials-sharename

# File contents:
# username=myuser
# password=mypassword
# domain=MYDOMAIN

# Restrict access to root only
sudo chown root:root /etc/samba/credentials-sharename
sudo chmod 600 /etc/samba/credentials-sharename

# Verify permissions
ls -la /etc/samba/credentials-sharename
# Should show: -rw------- 1 root root
```

The credentials file format:

```bash
# /etc/samba/credentials-sharename
# Do not quote values, no spaces around =
username=serviceaccount
password=secretpassword
domain=CORP
```

## Permanent Mounts in /etc/fstab

Once you've tested the connection, add the mount to fstab for automatic mounting at boot:

```bash
sudo nano /etc/fstab
```

Add entries like these:

```bash
# /etc/fstab - CIFS mount examples

# Basic share with credentials file
//192.168.1.100/documents /mnt/documents cifs credentials=/etc/samba/credentials-docs,vers=3.0,uid=1000,gid=1000,file_mode=0664,dir_mode=0775 0 0

# Share mounted as a specific user and group
//fileserver.corp.local/home /mnt/nethome cifs credentials=/etc/samba/credentials-corp,vers=3.0,uid=1000,gid=1000,forceuid,forcegid 0 0

# Read-only share
//nas.local/backup /mnt/backup cifs credentials=/etc/samba/credentials-nas,vers=3.0,ro 0 0

# Share with performance tuning options
//fileserver/data /mnt/data cifs credentials=/etc/samba/credentials-data,vers=3.0,cache=loose,rsize=130048,wsize=130048 0 0

# Share that should not be mounted at boot (noauto)
# Mount manually with: sudo mount /mnt/optional
//nas.local/media /mnt/media cifs credentials=/etc/samba/credentials-nas,vers=3.0,noauto,user 0 0
```

Test the fstab entries without rebooting:

```bash
# Mount all fstab entries not currently mounted
sudo mount -a

# If there are errors, mount a specific entry and see the full error
sudo mount /mnt/documents

# Verify all shares mounted correctly
df -h | grep cifs
mount | grep cifs
```

## Understanding Mount Options

The mount options significantly affect behavior, compatibility, and performance.

### Version Options

```bash
# SMB protocol versions
vers=1.0   # SMB1 - insecure, avoid if possible
vers=2.0   # SMB2 - Windows Vista/Server 2008
vers=2.1   # SMB2.1 - Windows 7/Server 2008 R2
vers=3.0   # SMB3 - Windows 8/Server 2012
vers=3.1.1 # SMB3.1.1 - Windows 10/Server 2016 (most secure)
```

### Permission Options

When the server is Windows (which doesn't use Unix UIDs/GIDs), you control file ownership on the client side:

```bash
# Map all files to a specific user and group
uid=1000,gid=1000

# Force the mapping even if the server sends ownership info
forceuid,forcegid

# File and directory permission bits applied to all files
file_mode=0644,dir_mode=0755

# Allow setuid execution (risky, avoid unless needed)
# suid

# Map file modes from server (only works with Unix extension servers)
# nounix  # Disable Unix extensions
```

### Performance Options

```bash
# Cache mode
cache=none    # No client-side caching (safe for concurrent access)
cache=loose   # Cache aggressively (fast but may miss server changes)
cache=strict  # Default - respects server cache hints

# Read/write sizes
rsize=130048  # Read buffer size
wsize=130048  # Write buffer size

# Close connections on last use (good for infrequent access)
sloppy
```

## Multi-User Authentication with pam_mount

For workstations where each user should connect with their own credentials, `pam_mount` can mount SMB shares at login:

```bash
sudo apt install -y libpam-mount

# Configure in /etc/security/pam_mount.conf.xml
sudo nano /etc/security/pam_mount.conf.xml
```

```xml
<!-- /etc/security/pam_mount.conf.xml -->
<?xml version="1.0" encoding="utf-8" ?>
<pam_mount>
  <!-- Mount a share using the login user's credentials -->
  <volume
    user="*"
    fstype="cifs"
    server="192.168.1.100"
    path="%(USER)"
    mountpoint="/mnt/home/%(USER)"
    options="uid=%(USERUID),gid=%(USERGID),sec=ntlm"
  />

  <!-- Unmount when the last session closes -->
  <logout wait="0" hup="0" term="0" kill="0" />
  <mkmountpoint enable="1" remove="true" />
</pam_mount>
```

## Automounting with autofs

For on-demand mounting, `autofs` is often better than fstab - shares are mounted when accessed and unmounted after a timeout:

```bash
sudo apt install -y autofs

# Create the master map
sudo nano /etc/auto.master
```

```bash
# /etc/auto.master
/mnt/cifs /etc/auto.cifs --timeout=300
```

```bash
# /etc/auto.cifs - the CIFS-specific map
# Format: mount-point -options ://server/share

documents -fstype=cifs,credentials=/etc/samba/credentials-docs,vers=3.0 ://192.168.1.100/documents
backup    -fstype=cifs,credentials=/etc/samba/credentials-nas,vers=3.0,ro ://nas.local/backup
```

```bash
sudo systemctl restart autofs

# Accessing /mnt/cifs/documents now triggers auto-mount
ls /mnt/cifs/documents
```

## Troubleshooting Connection Issues

```bash
# Test connectivity to the SMB port
nc -zv 192.168.1.100 445

# Try connecting with smbclient to test credentials and list shares
smbclient -L //192.168.1.100 -U username
smbclient //192.168.1.100/sharename -U username

# Mount with verbose logging
sudo mount -t cifs //192.168.1.100/share /mnt/test \
  -o credentials=/etc/samba/creds,vers=3.0 -v

# If you get "NT_STATUS_ACCESS_DENIED"
# Check the share permissions on the server
# Try adding ,sec=ntlm or ,sec=ntlmssp to the options

# If you get "NT_STATUS_INVALID_NETWORK_RESPONSE"
# Try an older protocol version
sudo mount -t cifs //192.168.1.100/share /mnt/test \
  -o credentials=/etc/samba/creds,vers=2.1

# Check dmesg for kernel-level CIFS messages
sudo dmesg | grep -i cifs

# Enable CIFS debug logging temporarily
echo 7 | sudo tee /proc/fs/cifs/cifsFYI
```

Proper credential management and the right protocol version are the two things that trip up most CIFS mount configurations. Once those are sorted, CIFS mounts on Ubuntu are reliable and reasonably fast.
