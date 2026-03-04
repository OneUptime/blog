# How to Mount Remote File Systems with sshfs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Filesystems, FUSE, Networking

Description: Mount remote directories over SSH with sshfs on Ubuntu, enabling seamless access to files on remote servers as if they were local, with persistent mounts and performance tuning.

---

sshfs (SSH Filesystem) uses FUSE and an SSH connection to mount a remote directory on your local machine. Once mounted, you can browse, read, write, and edit remote files using any local application - your text editor, IDE, file manager, or command-line tools - without manually copying files back and forth.

## Installing sshfs

```bash
# Install sshfs (also installs FUSE as a dependency)
sudo apt update
sudo apt install sshfs -y

# Verify
sshfs --version
# SSHFS version 3.x
```

## Setting Up SSH Key Authentication

sshfs works best with key-based authentication to avoid being prompted for a password repeatedly.

```bash
# Generate an SSH key pair if you do not have one
ssh-keygen -t ed25519 -C "sshfs access to remote servers" -f ~/.ssh/id_ed25519_sshfs

# Copy the public key to the remote server
ssh-copy-id -i ~/.ssh/id_ed25519_sshfs.pub user@remote-server

# Test that key authentication works
ssh -i ~/.ssh/id_ed25519_sshfs user@remote-server 'echo "SSH key auth works"'
```

## Basic Mount

```bash
# Create a local mount point
mkdir -p ~/remote

# Mount a remote directory
# sshfs [user@]host:[dir] mountpoint [options]
sshfs user@192.168.1.100:/home/user ~/remote

# With a specific SSH key
sshfs -o IdentityFile=~/.ssh/id_ed25519_sshfs user@192.168.1.100:/home/user ~/remote

# List the remote files
ls ~/remote/

# Work with remote files normally
cat ~/remote/config.yaml
nano ~/remote/app.conf
cp ~/remote/logs/access.log /tmp/
```

## Common Mount Options

```bash
# Mount with several useful options
sshfs user@remote-server:/srv/app ~/remote \
    -o IdentityFile=~/.ssh/id_ed25519 \
    -o StrictHostKeyChecking=no \      # skip host key prompt (use with caution)
    -o ServerAliveInterval=15 \        # keep the SSH connection alive
    -o ServerAliveCountMax=3 \         # retry 3 times before giving up
    -o reconnect \                     # automatically reconnect if disconnected
    -o port=2222 \                     # non-standard SSH port
    -o follow_symlinks \               # follow symlinks on the remote server
    -o transform_symlinks              # adjust absolute symlinks to be relative
```

## Specifying the Remote Port

For servers running SSH on a non-standard port:

```bash
# Method 1: -o port
sshfs -o port=2222 user@remote:/home/user ~/remote

# Method 2: Use SSH config file for cleaner syntax
nano ~/.ssh/config
```

```text
Host myserver
    HostName 192.168.1.100
    User alice
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
    ServerAliveInterval 15
```

```bash
# Now use the shorthand name
sshfs myserver:/srv/app ~/remote
```

## Unmounting

```bash
# Standard unmount
fusermount3 -u ~/remote

# On older systems
fusermount -u ~/remote

# Lazy unmount (waits for all file handles to close)
fusermount3 -uz ~/remote

# Force unmount (not recommended)
sudo umount -l ~/remote
```

## Persistent Mounts via /etc/fstab

For mounts that should survive reboots:

```bash
sudo nano /etc/fstab
```

Add a line for each persistent sshfs mount:

```text
# Format: sshfs#user@host:/remote/path  /local/mount  fuse  options  0  0

sshfs#alice@192.168.1.100:/srv/app  /mnt/remote-app  fuse  defaults,_netdev,IdentityFile=/home/alice/.ssh/id_ed25519,allow_other,reconnect,ServerAliveInterval=15  0  0
```

The `_netdev` option tells the system to wait for the network before mounting. `allow_other` lets all users access the mount (requires `user_allow_other` in `/etc/fuse.conf`).

```bash
# Enable allow_other if needed
sudo sed -i 's/#user_allow_other/user_allow_other/' /etc/fuse.conf

# Test the fstab entry
sudo mount -a

# Check if it mounted
mount | grep sshfs
df -h /mnt/remote-app
```

## Persistent Mounts via systemd

A systemd mount unit gives better control over ordering and dependencies.

```bash
sudo nano /etc/systemd/system/mnt-remote-app.mount
```

```ini
[Unit]
Description=SSHFS mount for remote app server
After=network-online.target
Wants=network-online.target

[Mount]
What=alice@192.168.1.100:/srv/app
Where=/mnt/remote-app
Type=fuse.sshfs
Options=_netdev,IdentityFile=/home/alice/.ssh/id_ed25519,allow_other,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3

[Install]
WantedBy=multi-user.target
```

```bash
# Create the mount point
sudo mkdir -p /mnt/remote-app

# Enable and start the mount
sudo systemctl daemon-reload
sudo systemctl enable mnt-remote-app.mount
sudo systemctl start mnt-remote-app.mount

# Check status
systemctl status mnt-remote-app.mount
```

## Performance Tuning

sshfs adds overhead compared to local disk access. These options improve throughput.

```bash
# Performance-optimized mount
sshfs user@remote:/path ~/remote \
    -o Ciphers=aes128-gcm@openssh.com \   # fast cipher
    -o Compression=no \                     # disable SSH compression (often slower for binary files)
    -o cache=yes \                          # enable attribute caching
    -o kernel_cache \                       # cache reads in the kernel
    -o auto_cache \                         # invalidate cache when file changes
    -o cache_timeout=115 \                  # attribute cache timeout (seconds)
    -o attr_timeout=115 \
    -o entry_timeout=1200 \
    -o max_readahead=131072 \               # read-ahead buffer size
    -o large_read                           # use larger read packets
```

## Benchmarking sshfs Performance

```bash
# Write speed benchmark
dd if=/dev/zero of=~/remote/test bs=1M count=100 conv=fdatasync
# Typical: 20-80 MB/s depending on network and SSH overhead

# Read speed benchmark
dd if=~/remote/test of=/dev/null bs=1M
# Typical: 50-200 MB/s

# Compare to direct network transfer (no FUSE overhead)
rsync -a --stats user@remote:/large-file /tmp/
```

## Handling Connection Drops

```bash
# Mount with automatic reconnection
sshfs user@remote:/path ~/remote \
    -o reconnect \
    -o ServerAliveInterval=15 \
    -o ServerAliveCountMax=3

# If the mount becomes stale (remote became unavailable)
# First check what is hanging
lsof | grep ~/remote

# Force unmount a stale sshfs mount
fusermount3 -uz ~/remote

# Remount
sshfs user@remote:/path ~/remote
```

## Automount on Demand with autofs

Install autofs to mount sshfs volumes only when accessed.

```bash
# Install autofs
sudo apt install autofs -y

# Configure the master autofs map
sudo nano /etc/auto.master
```

Add:
```text
/mnt/remote  /etc/auto.sshfs  --timeout=60  --ghost
```

```bash
# Create the sshfs-specific map
sudo nano /etc/auto.sshfs
```

```text
# Format: mount-name  fuse.sshfs options  :user@host:/remote/path
app  -fstype=fuse.sshfs,IdentityFile=/home/alice/.ssh/id_ed25519,allow_other  :alice@192.168.1.100:/srv/app
logs  -fstype=fuse.sshfs,IdentityFile=/home/alice/.ssh/id_ed25519,allow_other  :alice@192.168.1.100:/var/log
```

```bash
sudo systemctl restart autofs

# When you access /mnt/remote/app, autofs mounts it automatically
ls /mnt/remote/app/

# After 60 seconds of inactivity, autofs unmounts it
```

## Mounting Multiple Remote Paths

```bash
# Mount multiple remotes from the same server
sshfs user@server:/home/user ~/remote-home
sshfs user@server:/var/log ~/remote-logs
sshfs user@server:/etc ~/remote-etc

# Use SSH multiplexing to reuse the same connection
sshfs user@server:/home/user ~/remote-home \
    -o ControlMaster=auto \
    -o ControlPath=~/.ssh/mux-%r@%h:%p \
    -o ControlPersist=10m

# Second mount reuses the existing SSH connection
sshfs user@server:/var/log ~/remote-logs \
    -o ControlMaster=no \
    -o ControlPath=~/.ssh/mux-%r@%h:%p
```

sshfs is one of the most practical tools in a sysadmin's kit. Any server you can SSH into becomes directly accessible as a local directory, without any server-side software beyond a standard SSH daemon. This makes it ideal for quickly editing configs, browsing logs, or pulling files from any remote system in your infrastructure.
