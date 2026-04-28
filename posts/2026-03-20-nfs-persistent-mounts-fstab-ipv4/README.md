# How to Configure Persistent NFS Mounts via /etc/fstab on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NFS, IPv4, Fstab, Persistent Mount, Linux, Automount

Description: Add NFS shares to /etc/fstab for automatic mounting at boot, configure appropriate options for reliability, and set up systemd automount as an alternative.

## Introduction

Adding NFS mounts to `/etc/fstab` makes them mount automatically at boot. This requires careful option selection-if the NFS server is unreachable during boot, a poorly configured fstab entry can cause the system to hang. The `_netdev` and `soft` options prevent this.

## /etc/fstab Entry Format

```bash
# Format:

# server:/path  /local/mountpoint  fstype  options  dump  pass

# Basic NFSv4 mount
203.0.113.10:/srv/data  /mnt/nfs-data  nfs4  defaults  0  0

# Recommended options for reliability (must be on a single line):
203.0.113.10:/srv/data  /mnt/nfs-data  nfs  rw,soft,_netdev,nfsvers=4,rsize=65536,wsize=65536  0  0
```

## Recommended fstab Options

| Option | Purpose |
|---|---|
| `_netdev` | Wait for network before mounting (essential!) |
| `soft` | Return error if server unreachable (prevents boot hang) |
| `nfsvers=4` | Explicit NFSv4 |
| `rsize=65536` | Large read buffer |
| `wsize=65536` | Large write buffer |
| `noatime` | Skip access time updates |
| `bg` | Retry mount in background if initial attempt fails |

## Complete fstab Examples

```bash
# /etc/fstab

# Web content share (read-only)
203.0.113.10:/var/www/html  /var/www/html  nfs  ro,soft,_netdev,nfsvers=4  0  0

# Shared data (read-write)
203.0.113.10:/srv/data  /mnt/data  nfs  rw,soft,_netdev,nfsvers=4,rsize=65536,wsize=65536  0  0

# Backup share (read-write, retry in background)
203.0.113.10:/srv/backups  /mnt/backups  nfs  rw,bg,soft,_netdev  0  0
```

## Creating Mount Points and Testing

```bash
# Create mount points
sudo mkdir -p /mnt/data /mnt/backups

# Test the fstab entry without rebooting
sudo mount -a

# Check if mount succeeded
mount | grep nfs
df -h | grep nfs

# Test specific entry
sudo mount /mnt/data
sudo ls /mnt/data
```

## systemd Automount (Alternative)

```bash
# systemd automount mounts NFS only when first accessed

# Create mount unit: /etc/systemd/system/mnt-data.mount
cat > /etc/systemd/system/mnt-data.mount << 'EOF'
[Unit]
Description=NFS Data Mount
After=network-online.target
Wants=network-online.target

[Mount]
What=203.0.113.10:/srv/data
Where=/mnt/data
Type=nfs
Options=rw,soft,_netdev,nfsvers=4

[Install]
WantedBy=multi-user.target
EOF

# Create automount unit: /etc/systemd/system/mnt-data.automount
cat > /etc/systemd/system/mnt-data.automount << 'EOF'
[Unit]
Description=NFS Data Automount
After=network-online.target

[Automount]
Where=/mnt/data
# Unmount after 10 minutes of inactivity
TimeoutIdleSec=600

[Install]
WantedBy=multi-user.target
EOF

# Enable automount
sudo systemctl daemon-reload
sudo systemctl enable --now mnt-data.automount
```

## Troubleshooting Boot Issues

```bash
# If system hangs during boot due to NFS mount:
# 1. Boot with single user mode or live CD
# 2. Comment out the NFS line in /etc/fstab
# 3. Add 'soft' and '_netdev' options
# 4. Verify NFS server is reachable before mounting

# Check boot-time mount failures
sudo journalctl -b | grep -i "nfs\|mount"

# Test if NFS server is reachable
ping -c 3 203.0.113.10
showmount -e 203.0.113.10
```

## Conclusion

Add `_netdev` to all NFS fstab entries so the system waits for network before attempting to mount. Use `soft` to avoid boot hangs if the server is unreachable. Test changes with `mount -a` before rebooting. For on-demand mounting, use systemd automount units which mount NFS shares only when accessed.
