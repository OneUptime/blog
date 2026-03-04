# How to Set Up FUSE File Systems on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Filesystems, FUSE

Description: Learn how FUSE (Filesystem in Userspace) works on Ubuntu, how to set it up, and how to use popular FUSE-based filesystems including sshfs, encfs, and s3fs.

---

FUSE (Filesystem in Userspace) is a Linux kernel module that allows ordinary users to create and mount filesystem implementations that run entirely in user space, without requiring kernel modifications or root privileges. This makes it possible to mount cloud storage buckets, remote directories over SSH, encrypted containers, and other custom filesystems as if they were regular local directories.

## How FUSE Works

The FUSE architecture has three components:

1. **FUSE kernel module** - bridges the VFS (Virtual Filesystem Switch) layer with user-space code
2. **libfuse** - the userspace library that FUSE filesystem implementations use
3. **FUSE filesystem implementation** - the actual code that handles file operations (reads, writes, directory listings)

When a process reads a file on a FUSE mount, the kernel forwards the request through the FUSE module to the user-space daemon, which handles it and returns the data. This is slower than in-kernel filesystems, but gives unprecedented flexibility.

## Installing FUSE

```bash
# Install the FUSE kernel module and userspace library
sudo apt update
sudo apt install fuse3 libfuse3-dev -y

# Load the FUSE kernel module
sudo modprobe fuse

# Verify the module is loaded
lsmod | grep fuse
# fuse     131072  3

# Check the FUSE version
fusermount3 --version
```

## Configuring FUSE for Non-Root Users

By default, only root can mount FUSE filesystems. To allow regular users:

```bash
# Enable user_allow_other in the FUSE config
sudo nano /etc/fuse.conf

# Uncomment this line:
user_allow_other

# Also ensure your user is in the fuse group
sudo usermod -aG fuse $USER

# Apply group change (log out and back in, or use newgrp)
newgrp fuse

# Verify group membership
groups
```

## sshfs - Mount Remote Directories via SSH

sshfs lets you mount any directory on an SSH-accessible server as a local filesystem.

```bash
# Install sshfs
sudo apt install sshfs -y

# Create a mount point
mkdir -p ~/remote-server

# Mount a remote directory
# Format: user@host:/path/to/remote/dir local/mount/point
sshfs alice@192.168.1.100:/home/alice/projects ~/remote-server

# Now access remote files as if they are local
ls ~/remote-server
nano ~/remote-server/myfile.txt

# Unmount when done
fusermount3 -u ~/remote-server
```

For persistent mounts via `/etc/fstab`:

```bash
sudo nano /etc/fstab

# Add this line:
alice@192.168.1.100:/home/alice/projects  /mnt/remote-server  fuse.sshfs  defaults,_netdev,IdentityFile=/home/alice/.ssh/id_rsa,allow_other  0  0
```

## encfs - Encrypted Filesystem

encfs creates an encrypted directory that is transparently decrypted when mounted.

```bash
# Install encfs
sudo apt install encfs -y

# Create encrypted and decrypted mount directories
mkdir -p ~/.encrypted ~/decrypted

# Initialize the encrypted directory (first time setup)
encfs ~/.encrypted ~/decrypted
# Follow the prompts to set up encryption (standard mode is fine)
# Set a passphrase

# Now files written to ~/decrypted are automatically encrypted in ~/.encrypted
echo "Secret data" > ~/decrypted/secrets.txt
ls ~/decrypted/    # shows: secrets.txt
ls ~/.encrypted/   # shows: encrypted filename

# Unmount (removes access to decrypted files)
fusermount3 -u ~/decrypted

# Remount later (prompts for passphrase)
encfs ~/.encrypted ~/decrypted

# For scripting: pass passphrase via stdin
echo "mypassphrase" | encfs --stdinpass ~/.encrypted ~/decrypted
```

## s3fs - Mount Amazon S3 Buckets

s3fs mounts an S3 bucket as a local directory using FUSE.

```bash
# Install s3fs
sudo apt install s3fs -y

# Store AWS credentials
echo "ACCESS_KEY_ID:SECRET_ACCESS_KEY" > ~/.passwd-s3fs
chmod 600 ~/.passwd-s3fs

# Create mount point
mkdir -p ~/s3-bucket

# Mount the S3 bucket
s3fs my-bucket-name ~/s3-bucket \
    -o passwd_file=~/.passwd-s3fs \
    -o endpoint=us-east-1

# Access files
ls ~/s3-bucket/
cat ~/s3-bucket/myfile.txt

# Upload by writing to the mount
echo "Hello S3" > ~/s3-bucket/newfile.txt

# Unmount
fusermount3 -u ~/s3-bucket
```

For `goofys` (a faster alternative to s3fs):

```bash
# Install goofys
sudo apt install golang -y
go install github.com/kahing/goofys@latest
sudo cp ~/go/bin/goofys /usr/local/bin/

# Mount an S3 bucket
AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=yyy \
    goofys my-bucket ~/s3-bucket
```

## rclone - Mount Cloud Storage (Universal)

rclone supports 40+ cloud storage backends and uses FUSE to mount them.

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure a remote (follow interactive prompts)
rclone config

# Mount the configured remote
rclone mount myremote:bucket-or-path ~/cloud-storage \
    --daemon \
    --vfs-cache-mode writes

# List mounted directories
ls ~/cloud-storage/

# Unmount
fusermount3 -u ~/cloud-storage
```

## Writing a Simple FUSE Filesystem in Python

To understand FUSE internals, a minimal example is illuminating.

```bash
# Install FUSE Python bindings
sudo apt install python3-fuse -y
pip3 install fusepy
```

```python
#!/usr/bin/env python3
# minimal_fuse.py - A FUSE filesystem that serves a single in-memory file

import os
import stat
import errno
from fuse import FUSE, FuseOSError, Operations

class HelloFS(Operations):
    """A minimal FUSE filesystem with a single file."""

    def __init__(self):
        self.data = b"Hello from FUSE!\n"

    def getattr(self, path, fh=None):
        if path == '/':
            # Root directory attributes
            return {
                'st_mode': stat.S_IFDIR | 0o755,
                'st_nlink': 2,
                'st_size': 0,
                'st_uid': os.getuid(),
                'st_gid': os.getgid(),
            }
        elif path == '/hello.txt':
            # File attributes
            return {
                'st_mode': stat.S_IFREG | 0o444,
                'st_nlink': 1,
                'st_size': len(self.data),
                'st_uid': os.getuid(),
                'st_gid': os.getgid(),
            }
        else:
            raise FuseOSError(errno.ENOENT)

    def readdir(self, path, fh):
        if path == '/':
            return ['.', '..', 'hello.txt']
        raise FuseOSError(errno.ENOENT)

    def read(self, path, length, offset, fh):
        if path == '/hello.txt':
            return self.data[offset:offset + length]
        raise FuseOSError(errno.ENOENT)

if __name__ == '__main__':
    import sys
    mountpoint = sys.argv[1]
    FUSE(HelloFS(), mountpoint, nothreads=True, foreground=True)
```

```bash
# Create a mount point and run
mkdir -p /mnt/hellofs
python3 minimal_fuse.py /mnt/hellofs

# In another terminal
ls /mnt/hellofs/    # hello.txt
cat /mnt/hellofs/hello.txt  # Hello from FUSE!

# Stop the filesystem (Ctrl+C in the first terminal)
fusermount3 -u /mnt/hellofs
```

## Performance Tuning for FUSE Mounts

FUSE filesystems can have higher latency than native filesystems due to the context switch between kernel and userspace. Some options reduce this overhead.

```bash
# sshfs with caching and larger reads
sshfs user@host:/path ~/mount \
    -o kernel_cache \
    -o auto_cache \
    -o cache_timeout=115 \
    -o attr_timeout=115 \
    -o entry_timeout=1200 \
    -o max_readahead=131072 \
    -o large_read

# rclone with VFS caching for better performance
rclone mount remote:path ~/mount \
    --vfs-cache-mode full \
    --vfs-cache-max-size 5G \
    --vfs-cache-max-age 24h \
    --buffer-size 512M
```

## Troubleshooting FUSE Mounts

```bash
# Mount is busy - find what is using it
lsof | grep /mnt/myfuse

# Check FUSE-related kernel messages
dmesg | grep fuse

# Debug mode (shows all FUSE operations - very verbose)
sshfs user@host:/path ~/mount -o debug

# Check if mount succeeded
mount | grep fuse

# Lazy unmount when the filesystem is busy
fusermount3 -uz ~/mount
```

FUSE's greatest strength is that it democratizes filesystem development. Adding a new storage backend, creating an encrypted filesystem layer, or presenting data from any source as a filesystem no longer requires kernel programming expertise - it is a userspace programming problem, accessible to anyone familiar with file I/O concepts.
