# How to Mount a Samba Share via CIFS on Linux Using IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Samba, CIFS, IPv4, Mount, Linux, SMB

Description: Mount Samba/SMB shares on Linux using the CIFS filesystem driver with an IPv4 server address, specify credentials, and configure mount options for performance and security.

## Introduction

Linux mounts Samba/SMB shares using the CIFS kernel module via the `mount.cifs` command. You specify the server by IPv4 address, provide credentials, and choose mount options that match your use case-interactive desktop use differs from scripted backups.

## Installing CIFS Utils

```bash
# Debian/Ubuntu

sudo apt install cifs-utils

# RHEL/CentOS/Fedora
sudo dnf install cifs-utils

# Verify
mount.cifs -V
```

## Basic Mount Commands

```bash
# Create mount points first
sudo mkdir -p /mnt/samba /mnt/public

# Mount with password on command line (insecure - shows in process list)
sudo mount -t cifs //203.0.113.10/shared /mnt/samba -o username=smbuser,password=secret

# Mount with prompt for password
sudo mount -t cifs //203.0.113.10/shared /mnt/samba -o username=smbuser

# Mount as guest (no authentication)
sudo mount -t cifs //203.0.113.10/public /mnt/public -o guest
```

## Using a Credentials File (Recommended)

```bash
# Create credentials file
sudo mkdir -p /etc/samba
sudo tee /etc/samba/credentials > /dev/null << 'EOF'
username=smbuser
password=secretpassword
domain=WORKGROUP
EOF

sudo chmod 600 /etc/samba/credentials
sudo chown root:root /etc/samba/credentials

# Mount using credentials file
sudo mount -t cifs //203.0.113.10/shared /mnt/samba \
  -o credentials=/etc/samba/credentials
```

## Mount Options Reference

| Option | Description |
|---|---|
| `username=` | SMB username |
| `password=` | SMB password |
| `credentials=` | Path to credentials file |
| `domain=` | Windows domain or workgroup |
| `uid=` | Local user ID when the server does not provide ownership information |
| `gid=` | Local group ID when the server does not provide ownership information |
| `file_mode=0644` | Default file permissions when the server does not provide Unix modes |
| `dir_mode=0755` | Default directory permissions when the server does not provide Unix modes |
| `vers=3` | SMB 3.0 or later protocol version |
| `iocharset=utf8` | Character set |

## Mount with Proper File Permissions

```bash
# Mount with specific UID/GID so a normal user can access when the server allows it
sudo mount -t cifs //203.0.113.10/shared /mnt/samba \
  -o credentials=/etc/samba/credentials,\
uid=$(id -u youruser),\
gid=$(id -g youruser),\
file_mode=0664,\
dir_mode=0775

# Verify files are accessible as normal user
ls -la /mnt/samba
touch /mnt/samba/testfile  # Test write access
```

## Specifying SMB Version

```bash
# SMB 3.0 or later (modern servers - Windows 2012+, Samba 4+)
sudo mount -t cifs //203.0.113.10/shared /mnt/samba \
  -o credentials=/etc/samba/credentials,vers=3

# SMB 2.0 (very old servers - Windows Vista SP1/Windows Server 2008)
sudo mount -t cifs //203.0.113.10/shared /mnt/samba \
  -o credentials=/etc/samba/credentials,vers=2.0
```

## Verifying the Mount

```bash
# List mounted CIFS filesystems
mount | grep cifs

# Check disk space
df -h /mnt/samba

# Test read/write
ls /mnt/samba
echo "test" | sudo tee /mnt/samba/test.txt
cat /mnt/samba/test.txt

# Unmount
sudo umount /mnt/samba
```

## Conclusion

Mount Samba shares on Linux with `mount -t cifs //server_ip/share /mnt/point -o options`. Store credentials in a root-owned file with permissions 600 and reference it with `credentials=`. Set `uid` and `gid` to match the local user for correct file ownership when the server does not provide ownership information. Let modern clients negotiate the default SMB2.1+ dialect when possible, or use `vers=3` to require SMB3 or later. Use `vers=2.0` only for very old servers such as Windows Vista SP1 or Windows Server 2008 that require it.
