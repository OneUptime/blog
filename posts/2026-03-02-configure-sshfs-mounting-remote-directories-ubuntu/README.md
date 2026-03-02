# How to Configure SSHFS for Mounting Remote Directories on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Filesystem, Storage

Description: Learn how to install and configure SSHFS on Ubuntu to mount remote directories over SSH, enabling transparent file access to remote servers as local filesystems.

---

SSHFS (SSH Filesystem) lets you mount a directory from a remote server on your local machine. Once mounted, you can browse and edit remote files using your local tools - your IDE, file manager, or any application - without any special awareness of the remote connection. It uses SSH for transport, so you get the same authentication and encryption you'd use for a normal SSH session.

## Installing SSHFS

```bash
# Update package list and install sshfs
sudo apt update
sudo apt install sshfs

# Verify the installation
sshfs --version
```

SSHFS depends on FUSE (Filesystem in Userspace), which is typically available on modern Ubuntu kernels. If you get errors about FUSE not being available:

```bash
# Check if fuse module is loaded
lsmod | grep fuse

# Load the fuse module if needed
sudo modprobe fuse

# Ensure your user is in the fuse group (may be required on older systems)
sudo usermod -aG fuse $USER
# Log out and back in after this
```

## Mounting a Remote Directory

Create a local mount point, then mount the remote directory:

```bash
# Create a local directory to use as the mount point
mkdir -p ~/mnt/remote-server

# Mount the remote directory
# Syntax: sshfs [user@]hostname:[directory] mountpoint [options]
sshfs user@remote-server.example.com:/home/user ~/mnt/remote-server

# Mount a specific remote path
sshfs user@192.168.1.100:/var/www/html ~/mnt/webroot

# Verify the mount
mount | grep sshfs
df -h ~/mnt/remote-server
```

After mounting, browse the remote files just like local files:

```bash
# List remote files
ls ~/mnt/remote-server

# Edit a remote file with any editor
nano ~/mnt/remote-server/config.txt

# Copy files to/from the mount
cp ~/local-file.txt ~/mnt/remote-server/
```

## Mounting with Specific SSH Options

```bash
# Use a specific SSH key
sshfs -o IdentityFile=~/.ssh/id_ed25519 user@server:/remote/path ~/mnt/remote

# Use a non-standard SSH port
sshfs -o port=2222 user@server:/remote/path ~/mnt/remote

# Enable compression (useful for slow links)
sshfs -o Compression=yes user@server:/remote/path ~/mnt/remote

# Reconnect automatically if the connection drops
sshfs -o reconnect user@server:/remote/path ~/mnt/remote

# Combine multiple options
sshfs -o IdentityFile=~/.ssh/id_ed25519,port=2222,reconnect,Compression=yes \
    user@server:/remote/path ~/mnt/remote
```

## Using SSH Config Aliases

If you have hosts defined in `~/.ssh/config`, SSHFS respects them:

```
# ~/.ssh/config
Host myserver
    HostName remote-server.example.com
    User ubuntu
    Port 2222
    IdentityFile ~/.ssh/id_ed25519
```

```bash
# Now mount using the SSH config alias
sshfs myserver:/var/www ~/mnt/webroot
```

## Unmounting SSHFS

```bash
# Unmount the filesystem
fusermount -u ~/mnt/remote-server

# Alternative (if fusermount is not available)
umount ~/mnt/remote-server

# Force unmount if the connection is broken
fusermount -u -z ~/mnt/remote-server
```

## Persistent Mounts with /etc/fstab

For mounts that should survive reboots, add them to `/etc/fstab`. This requires non-interactive (passwordless) SSH authentication via keys.

```bash
# First, ensure SSH key authentication works without a passphrase
# (or use ssh-agent)

# Edit fstab
sudo nano /etc/fstab
```

Add an entry:

```
# /etc/fstab entry for SSHFS mount
# user@host:remote_path  local_mountpoint  fuse.sshfs  options  0  0
user@server:/remote/path /home/user/mnt/remote fuse.sshfs defaults,_netdev,allow_other,IdentityFile=/home/user/.ssh/id_ed25519,reconnect,ServerAliveInterval=15 0 0
```

Key options explained:
- `_netdev` - tells the system to wait for networking before mounting
- `allow_other` - allows users other than the mount owner to access files
- `reconnect` - automatically reconnect if the connection drops
- `ServerAliveInterval=15` - send keep-alives to detect dropped connections

For `allow_other` to work, enable it in the FUSE configuration:

```bash
# Edit the FUSE configuration
sudo nano /etc/fuse.conf

# Uncomment this line:
# user_allow_other
```

Test the fstab entry:

```bash
# Mount all fstab entries (test without rebooting)
sudo mount -a

# Or mount a specific fstab entry
sudo mount /home/user/mnt/remote
```

## Using systemd for SSHFS Mounts

systemd mounts are often more reliable than fstab for network filesystems. Create a mount unit:

```bash
# Unit file path must match the mount point path, with / replaced by -
# For mount point /home/user/mnt/remote-server:
sudo nano /etc/systemd/system/home-user-mnt-remote\x2dserver.mount
```

```ini
[Unit]
Description=SSHFS mount for remote server
After=network-online.target
Wants=network-online.target

[Mount]
What=user@server:/remote/path
Where=/home/user/mnt/remote-server
Type=fuse.sshfs
Options=_netdev,allow_other,IdentityFile=/home/user/.ssh/id_ed25519,reconnect,ServerAliveInterval=15,ServerAliveCountMax=3

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the mount
sudo systemctl daemon-reload
sudo systemctl enable home-user-mnt-remote-server.mount
sudo systemctl start home-user-mnt-remote-server.mount

# Check status
sudo systemctl status home-user-mnt-remote-server.mount
```

## Performance Tuning

SSHFS can be slow for certain operations, especially with many small files:

```bash
# Cache attributes and reads for better performance
# cache_timeout is in seconds
sshfs -o cache=yes,kernel_cache,cache_timeout=600,attr_timeout=600 \
    user@server:/remote/path ~/mnt/remote

# Increase the read buffer size
sshfs -o max_read=65536 user@server:/remote/path ~/mnt/remote

# Use the faster cipher for better throughput (less encryption overhead)
sshfs -o Ciphers=aes128-gcm@openssh.com user@server:/remote/path ~/mnt/remote

# Combine performance options
sshfs -o cache=yes,kernel_cache,cache_timeout=600,max_read=65536,Compression=no \
    user@server:/remote/path ~/mnt/remote
```

## Troubleshooting Common Issues

**"Transport endpoint is not connected"**

The SSH connection dropped. Unmount and remount:

```bash
fusermount -u -z ~/mnt/remote-server
sshfs -o reconnect user@server:/remote/path ~/mnt/remote-server
```

**"Permission denied"**

Check that your SSH key is correctly configured and that the remote user has read access to the target directory:

```bash
# Test SSH connection directly first
ssh user@server ls /remote/path

# Check remote directory permissions
ssh user@server ls -la /remote/
```

**Mount hangs on disconnect**

Use `fusermount` with the lazy unmount flag:

```bash
# Lazy unmount - detaches from namespace immediately
fusermount -u -z ~/mnt/remote-server
```

## Summary

SSHFS provides a simple way to access remote filesystems through SSH without running a dedicated file sharing service. Install it with `apt install sshfs`, create a mount point directory, and mount with `sshfs user@server:/path ~/mnt/local`. Use SSH config aliases to simplify connections. For permanent mounts, use `/etc/fstab` or systemd mount units with the `_netdev` option to ensure networking is available first. Tune performance with caching options if you're working with large files or over slow links.
