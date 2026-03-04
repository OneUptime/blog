# How to Set Up SSHFS for Remote File Access Over SSH on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSHFS, SSH, Remote Access, Linux

Description: Learn how to mount remote directories over SSH using SSHFS on RHEL 9 for seamless file access without NFS or Samba.

---

SSHFS lets you mount a remote directory over SSH as if it were a local filesystem. No NFS server setup, no Samba configuration, no firewall exceptions beyond SSH. If you can SSH to a server, you can mount its filesystem. It is one of the most practical FUSE tools available.

## Why SSHFS

- Zero server-side configuration (just needs SSH access)
- Encrypted by default (runs over SSH)
- Works through firewalls that allow SSH
- No additional ports to open
- Simple to set up and tear down

The tradeoff is performance - SSHFS is slower than NFS for heavy workloads because every operation goes through SSH encryption and the FUSE layer.

## Installation

```bash
# Install SSHFS
dnf install -y fuse-sshfs
```

Verify the installation:

```bash
# Check sshfs is available
which sshfs
sshfs --version
```

## Basic Usage

### Mount a Remote Directory

```bash
# Mount remote /data directory locally
mkdir -p /mnt/remote
sshfs user@remotehost:/data /mnt/remote
```

You will be prompted for the SSH password unless you have key-based authentication set up.

### Mount with SSH Key

```bash
# Mount using a specific SSH key
sshfs -o IdentityFile=/home/user/.ssh/id_rsa user@remotehost:/data /mnt/remote
```

### Mount a Specific Port

```bash
# Connect to SSH on a non-standard port
sshfs -p 2222 user@remotehost:/data /mnt/remote
```

## Recommended Mount Options

For practical daily use, include these options:

```bash
# Mount with recommended options
sshfs user@remotehost:/data /mnt/remote \
    -o reconnect \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=3 \
    -o allow_other \
    -o default_permissions \
    -o noatime
```

What these do:
- `reconnect` - automatically reconnect if the connection drops
- `ServerAliveInterval=15` - send keepalive every 15 seconds
- `ServerAliveCountMax=3` - disconnect after 3 failed keepalives
- `allow_other` - let other users access the mount (requires `/etc/fuse.conf` setting)
- `default_permissions` - use kernel permission checking
- `noatime` - skip access time updates

## Performance Tuning

SSHFS performance can be improved with compression and buffer settings:

```bash
# Mount with performance optimizations
sshfs user@remotehost:/data /mnt/remote \
    -o Compression=yes \
    -o Ciphers=aes128-gcm@openssh.com \
    -o reconnect \
    -o max_read=131072 \
    -o max_write=131072
```

- `Compression=yes` - compress data in transit (helps on slow links, hurts on fast LANs)
- `Ciphers=aes128-gcm@openssh.com` - use a fast cipher (AES-GCM is hardware accelerated)

For LAN use where encryption overhead matters:

```bash
# Faster cipher for LAN connections
sshfs user@remotehost:/data /mnt/remote \
    -o Ciphers=aes128-gcm@openssh.com \
    -o reconnect
```

## Unmounting

```bash
# Unmount SSHFS
fusermount -u /mnt/remote

# Force unmount if busy
fusermount -uz /mnt/remote
```

## Making It Persistent with fstab

Add an fstab entry for automatic mounting at boot:

```bash
# Add to /etc/fstab
echo "user@remotehost:/data  /mnt/remote  fuse.sshfs  _netdev,user,idmap=user,IdentityFile=/root/.ssh/id_rsa,reconnect,ServerAliveInterval=15,allow_other  0 0" >> /etc/fstab
```

Important notes:
- `_netdev` tells systemd to wait for network before mounting
- You must use key-based auth (no interactive password prompt at boot)
- The SSH key must be accessible to the user that mounts

Test it:

```bash
mount /mnt/remote
```

## Automounting with systemd

For on-demand mounting that only connects when you access the directory:

```bash
# Create the mount unit
cat > /etc/systemd/system/mnt-remote.mount << 'EOF'
[Unit]
Description=SSHFS mount to remote server
After=network-online.target

[Mount]
What=user@remotehost:/data
Where=/mnt/remote
Type=fuse.sshfs
Options=_netdev,IdentityFile=/root/.ssh/id_rsa,reconnect,ServerAliveInterval=15,allow_other

[Install]
WantedBy=multi-user.target
EOF

# Create the automount unit
cat > /etc/systemd/system/mnt-remote.automount << 'EOF'
[Unit]
Description=Automount SSHFS remote

[Automount]
Where=/mnt/remote
TimeoutIdleSec=600

[Install]
WantedBy=multi-user.target
EOF

# Enable automount
systemctl enable --now mnt-remote.automount
```

With this setup, the mount happens automatically when you access `/mnt/remote` and disconnects after 10 minutes of inactivity.

## Setting Up SSH Key Authentication

For unattended SSHFS mounts, key-based auth is required:

```bash
# Generate a key pair (if you do not have one)
ssh-keygen -t ed25519 -f /root/.ssh/sshfs_key -N ""

# Copy the public key to the remote server
ssh-copy-id -i /root/.ssh/sshfs_key.pub user@remotehost
```

Test that passwordless login works:

```bash
ssh -i /root/.ssh/sshfs_key user@remotehost "echo connected"
```

## User-Level SSHFS Mounts

Regular users can mount SSHFS without root:

```bash
# As a regular user
mkdir -p ~/remote
sshfs myuser@remotehost:/home/myuser ~/remote
```

To unmount:

```bash
fusermount -u ~/remote
```

## Troubleshooting

### "Transport endpoint is not connected"

The SSH connection dropped. Unmount and remount:

```bash
fusermount -uz /mnt/remote
sshfs user@remotehost:/data /mnt/remote -o reconnect
```

### "Permission denied"

Check SSH access:

```bash
# Test SSH directly
ssh user@remotehost "ls /data"
```

Check FUSE permissions:

```bash
# Verify /etc/fuse.conf has user_allow_other
grep user_allow_other /etc/fuse.conf
```

### Slow Performance

For large directories, listing files can be slow:

```bash
# Use cache to speed up directory listings
sshfs user@remotehost:/data /mnt/remote \
    -o cache=yes \
    -o cache_timeout=600 \
    -o dir_cache=yes
```

## Summary

SSHFS on RHEL 9 is the quickest way to mount remote filesystems when you already have SSH access. Install `fuse-sshfs`, mount with performance and reconnection options, and use key-based authentication for unattended mounts. It is not as fast as NFS, but for development access, file transfers, and ad-hoc remote work, it is hard to beat for simplicity.
