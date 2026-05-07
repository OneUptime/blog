# How to Use Buildah Mount with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Buildah, Mount, Filesystem, Image Inspection

Description: Learn how to use buildah mount to directly access container filesystems for inspection, modification, and advanced build workflows.

---

> Buildah mount gives you direct filesystem access to a container, bypassing the need to execute commands inside it.

The `buildah mount` command mounts a container's root filesystem to a directory on the host, letting you interact with the container's files using standard Linux tools. This is powerful for debugging, installing software with host tools, or performing bulk file operations. This guide covers how to mount, modify, and unmount container filesystems effectively.

---

## Prerequisites

```bash
# Ensure Buildah is installed

buildah --version

# Buildah mount requires root privileges or unshare
# Check if you are running rootless
id -u
# If non-zero, you will need to use buildah unshare (covered later)

# Create a working container
container=$(buildah from ubuntu:22.04)
echo "Container: $container"
```

## Basic Mount Operations

### Mounting a Container Filesystem

```bash
# Mount the container's root filesystem
# Note: This requires root or buildah unshare for rootless
mountpoint=$(buildah mount $container)
echo "Mounted at: $mountpoint"

# Now you can browse the container's filesystem with host tools
ls $mountpoint/
ls $mountpoint/etc/
cat $mountpoint/etc/os-release

# List all mounted containers
buildah mount
```

### Reading Files from the Mount

```bash
# Use standard Linux commands to inspect the container filesystem
# Check what packages are installed
cat $mountpoint/var/lib/dpkg/status | grep "^Package:" | head -10

# Count total installed packages
cat $mountpoint/var/lib/dpkg/status | grep -c "^Package:"

# Find large files in the container
find $mountpoint -type f -size +1M -exec ls -lh {} \; 2>/dev/null | head -10

# Check the container's network configuration
cat $mountpoint/etc/hosts
cat $mountpoint/etc/resolv.conf
```

### Modifying Files via the Mount

```bash
# Write files directly to the container filesystem using host tools
echo "Hello from the host" > $mountpoint/opt/host-message.txt

# Create directory structures
mkdir -p $mountpoint/app/{config,data,logs}

# Copy files from the host
cp /etc/hostname $mountpoint/app/config/build-host.txt

# Create configuration files
cat << 'EOF' > $mountpoint/app/config/app.conf
# Application configuration
port = 8080
workers = 4
log_level = info
data_dir = /app/data
EOF

# Verify the files exist in the container
buildah run $container -- cat /opt/host-message.txt
buildah run $container -- cat /app/config/app.conf
```

## Advanced Mount Use Cases

### Installing Software with Host Package Managers

```bash
# You can use the host's package management tools on the mounted filesystem
# This is useful when the container does not have a package manager

# Example: Install packages using dnf with a custom root
# (This works when the host has dnf and the container uses rpm-based distro)
# sudo dnf install --installroot=$mountpoint --releasever=39 python3 -y

# For Ubuntu/Debian containers, use debootstrap or chroot
# sudo chroot $mountpoint apt-get update
# sudo chroot $mountpoint apt-get install -y curl
```

### Comparing Container Filesystems

```bash
# Create a second container to compare
container2=$(buildah from ubuntu:22.04)
buildah run $container2 -- apt-get update
buildah run $container2 -- apt-get install -y curl

mountpoint2=$(buildah mount $container2)

# Compare file listings between two containers
diff <(find $mountpoint -type f | sort) <(find $mountpoint2 -type f | sort) | head -30

# Find files unique to the second container (curl's files)
diff <(find $mountpoint -type f | sed "s|$mountpoint||" | sort) \
     <(find $mountpoint2 -type f | sed "s|$mountpoint2||" | sort) \
     | grep "^>" | head -20

buildah umount $container2
buildah rm $container2
```

### Security Scanning the Filesystem

```bash
# Scan the mounted filesystem for sensitive files
echo "=== Checking for SSH keys ==="
find $mountpoint -name "id_rsa" -o -name "id_ed25519" -o -name "*.pem" 2>/dev/null

echo "=== Checking for environment files ==="
find $mountpoint -name ".env" -o -name "*.env" 2>/dev/null

echo "=== Checking for world-writable files ==="
find $mountpoint -perm -o+w -type f 2>/dev/null | head -10

echo "=== Checking setuid binaries ==="
find $mountpoint -perm -4000 -type f 2>/dev/null

echo "=== Checking /etc/passwd for shells ==="
grep -v nologin $mountpoint/etc/passwd | grep -v false
```

### Bulk File Operations

```bash
# Copy an entire application directory tree
mkdir -p /tmp/bulk-app/{bin,lib,conf}
echo '#!/bin/sh' > /tmp/bulk-app/bin/start.sh
echo 'echo running' >> /tmp/bulk-app/bin/start.sh
chmod +x /tmp/bulk-app/bin/start.sh
echo "libdata" > /tmp/bulk-app/lib/utils.so
echo "setting=value" > /tmp/bulk-app/conf/settings.ini

# Copy all files at once using rsync or cp
cp -a /tmp/bulk-app/* $mountpoint/app/

# Set permissions recursively
chmod -R 755 $mountpoint/app/bin/
find $mountpoint/app/conf -type d -exec chmod 755 {} \;
find $mountpoint/app/conf -type f -exec chmod 644 {} \;

# Verify the structure
find $mountpoint/app -type f -exec ls -la {} \;
```

## Using Mount with Rootless Podman

```bash
# In rootless mode, buildah mount requires buildah unshare
# This creates a user namespace where mount operations work

# Unmount first if mounted
buildah umount $container

# Run a script inside buildah unshare to use mount
buildah unshare bash -c '
  container=$(buildah from alpine:3.19)
  mountpoint=$(buildah mount $container)

  # Now you can interact with the filesystem
  echo "Mounted at: $mountpoint"
  ls $mountpoint/

  # Create a file
  echo "rootless mount works" > $mountpoint/test.txt

  # Verify
  cat $mountpoint/test.txt

  # Clean up
  buildah umount $container
  buildah rm $container
'
```

## Unmounting Containers

```bash
# Unmount a specific container
buildah umount $container

# Unmount all mounted containers
buildah umount --all

# Verify no containers are mounted
buildah mount
# Should show no output
```

## Practical Example: Building an Image with Mount

```bash
container=$(buildah from alpine:3.19)
mountpoint=$(buildah mount $container)

# Install packages using the mounted filesystem
# Create a simple application directly on the filesystem
mkdir -p $mountpoint/app
cat << 'PYEOF' > $mountpoint/app/server.py
#!/usr/bin/env python3
from http.server import HTTPServer, SimpleHTTPRequestHandler
print("Server starting on port 8080")
HTTPServer(("0.0.0.0", 8080), SimpleHTTPRequestHandler).serve_forever()
PYEOF
chmod +x $mountpoint/app/server.py

# Install Python via buildah run (since apk needs to run inside the container)
buildah run $container -- apk add --no-cache python3

# Unmount before configuring and committing
buildah umount $container

# Configure and commit
buildah config --workingdir /app $container
buildah config --port 8080 $container
buildah config --entrypoint '["python3", "server.py"]' $container
buildah commit $container mount-demo:latest

# Test with Podman
podman run -d --name mount-test -p 8080:8080 mount-demo:latest
curl http://localhost:8080/

# Clean up
podman stop mount-test && podman rm mount-test
buildah rm $container
```

## Cleaning Up

```bash
buildah umount --all 2>/dev/null
buildah rm --all 2>/dev/null
podman rmi mount-demo:latest 2>/dev/null
rm -rf /tmp/bulk-app
```

## Summary

The `buildah mount` command provides direct filesystem access to container images, enabling workflows that are difficult or impossible with Containerfile-based builds. You can use host tools to inspect, modify, and analyze container filesystems, perform security audits, compare images, and do bulk file operations. For rootless operation, combine mount with `buildah unshare` to work within a user namespace. Always unmount containers when you are done to release the mount points cleanly.
