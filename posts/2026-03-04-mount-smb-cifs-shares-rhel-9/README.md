# How to Mount SMB/CIFS Shares on RHEL Linux Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SMB, CIFS, Mounting, Linux

Description: Mount Windows or Samba SMB/CIFS shares on RHEL Linux clients, covering manual mounts, persistent fstab entries, and credential management.

---

## Accessing SMB Shares from Linux

Linux can mount SMB/CIFS shares from Windows servers, Samba servers, or NAS devices. On RHEL, the cifs-utils package provides the mount.cifs helper that handles the connection.

## Prerequisites

- RHEL with root access
- An SMB/CIFS share accessible on the network
- Valid credentials for the share (unless it allows guest access)

## Step 1 - Install Required Packages

```bash
# Install CIFS utilities and Samba client
sudo dnf install -y cifs-utils samba-client
```

## Step 2 - Discover Available Shares

```bash
# List shares on a remote server
smbclient -L //192.168.1.10 -U username

# For guest access
smbclient -L //192.168.1.10 -N
```

## Step 3 - Manual Mount

```bash
# Create a mount point
sudo mkdir -p /mnt/smb-share

# Mount the share
sudo mount -t cifs //192.168.1.10/shared /mnt/smb-share -o username=smbuser,password=secret

# Verify
df -h /mnt/smb-share
ls /mnt/smb-share
```

## Using a Credentials File

Putting passwords on the command line or in fstab is a security risk. Use a credentials file instead:

```bash
# Create the credentials file
sudo tee /root/.smbcredentials << EOF
username=smbuser
password=secret
domain=WORKGROUP
EOF

# Restrict permissions
sudo chmod 600 /root/.smbcredentials
```

Mount using the credentials file:

```bash
sudo mount -t cifs //192.168.1.10/shared /mnt/smb-share -o credentials=/root/.smbcredentials
```

## Persistent Mount in /etc/fstab

```bash
# Add to fstab
echo "//192.168.1.10/shared  /mnt/smb-share  cifs  credentials=/root/.smbcredentials,_netdev,nofail  0 0" | sudo tee -a /etc/fstab

# Test
sudo mount -a
df -h /mnt/smb-share
```

## Mount Options

| Option | Description |
|--------|-------------|
| `credentials=FILE` | Path to credentials file |
| `uid=USER` | Set owner of mounted files |
| `gid=GROUP` | Set group of mounted files |
| `file_mode=0644` | Set permissions for files |
| `dir_mode=0755` | Set permissions for directories |
| `vers=3.0` | Force SMB protocol version |
| `sec=ntlmssp` | Authentication mechanism |
| `_netdev` | Wait for network before mounting |
| `nofail` | Do not block boot if mount fails |
| `iocharset=utf8` | Character set for filenames |

### Example with Full Options

```bash
//192.168.1.10/shared  /mnt/smb-share  cifs  credentials=/root/.smbcredentials,uid=1000,gid=1000,file_mode=0644,dir_mode=0755,vers=3.0,_netdev,nofail  0 0
```

## Mounting with Active Directory Credentials

For domain-joined shares:

```bash
# Using domain credentials
sudo mount -t cifs //fileserver.example.com/shared /mnt/smb-share \
    -o username=jdoe,domain=EXAMPLE,password=secret

# Or in the credentials file
echo "username=jdoe" | sudo tee /root/.smbcredentials
echo "password=secret" | sudo tee -a /root/.smbcredentials
echo "domain=EXAMPLE" | sudo tee -a /root/.smbcredentials
```

## Using Kerberos Authentication

If the system is joined to an AD domain:

```bash
# Get a Kerberos ticket
kinit jdoe@EXAMPLE.COM

# Mount with Kerberos (no password needed)
sudo mount -t cifs //fileserver.example.com/shared /mnt/smb-share -o sec=krb5,cruid=$(id -u)
```

## Mount Architecture

```mermaid
graph LR
    Client[RHEL Client] -->|mount.cifs| K[Kernel CIFS Module]
    K -->|SMB Protocol| Server[SMB Server]
    Cred[Credentials File] --> K
    FSTAB[/etc/fstab] --> K
```

## Mounting Guest/Anonymous Shares

```bash
# Guest mount (no credentials)
sudo mount -t cifs //192.168.1.10/public /mnt/public -o guest

# Or
sudo mount -t cifs //192.168.1.10/public /mnt/public -o username=guest,password=
```

## SMB Protocol Versions

RHEL defaults to SMB 3.0. You can force specific versions:

```bash
# Force SMB 3.0
sudo mount -t cifs //server/share /mnt/share -o vers=3.0,credentials=/root/.smbcredentials

# Force SMB 2.1
sudo mount -t cifs //server/share /mnt/share -o vers=2.1,credentials=/root/.smbcredentials
```

## Troubleshooting

```bash
# Enable verbose mount debugging
sudo dmesg | tail -20

# Check mount with verbose output
sudo mount -t cifs //192.168.1.10/shared /mnt/smb-share -o credentials=/root/.smbcredentials -v

# Check if the share is reachable
smbclient //192.168.1.10/shared -U smbuser

# Check kernel CIFS module
lsmod | grep cifs
```

## Unmounting

```bash
# Normal unmount
sudo umount /mnt/smb-share

# Lazy unmount if busy
sudo umount -l /mnt/smb-share
```

## Wrap-Up

Mounting SMB/CIFS shares on RHEL is straightforward with cifs-utils. Use credentials files instead of putting passwords in fstab, include `_netdev` and `nofail` for persistent mounts, and specify the SMB version when connecting to older servers. For domain environments, Kerberos authentication provides the cleanest integration.
