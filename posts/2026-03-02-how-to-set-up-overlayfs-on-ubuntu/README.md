# How to Set Up OverlayFS on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Filesystems, Containers

Description: Learn how OverlayFS works on Ubuntu and how to set up overlay mounts for layered filesystems, understanding the mechanism that powers Docker container layers.

---

OverlayFS is a union filesystem that layers multiple directories on top of each other, presenting them as a single unified directory tree. It is the technology behind Docker container layers, allowing containers to share a common base image while each container gets its own writable layer. You can also use OverlayFS directly for testing, live system patching, and creating ephemeral environments.

## How OverlayFS Works

OverlayFS merges multiple directories (layers) into a single mount point:

- **Lower directory (lowerdir)** - read-only base layer(s). Multiple lower directories are supported.
- **Upper directory (upperdir)** - writable layer where all changes go
- **Work directory (workdir)** - required internal scratch space used by the kernel (must be on the same filesystem as upperdir)
- **Merged directory (mergeddir)** - the unified view presented to users and applications

When you read a file, OverlayFS looks in the upper layer first, then falls back to the lower layers in order. When you write a file that exists only in a lower layer, it is copied to the upper layer first (copy-on-write), then modified there.

## Checking OverlayFS Support

```bash
# Verify the kernel module is available
modinfo overlay

# Load the module if not already loaded
sudo modprobe overlay

# Confirm it is loaded
lsmod | grep overlay
# overlay               114688  0

# Verify your kernel supports it
grep -r OVERLAY_FS /boot/config-$(uname -r)
# CONFIG_OVERLAY_FS=m or CONFIG_OVERLAY_FS=y
```

## Basic OverlayFS Mount

Create a simple overlay that demonstrates the layering behavior.

```bash
# Create the directory structure
mkdir -p /tmp/overlay/{lower,upper,work,merged}

# Populate the lower (read-only) directory
echo "from lower" > /tmp/overlay/lower/base_file.txt
echo "shared file" > /tmp/overlay/lower/shared.txt

# Mount the overlay filesystem
sudo mount -t overlay overlay \
    -o lowerdir=/tmp/overlay/lower,upperdir=/tmp/overlay/upper,workdir=/tmp/overlay/work \
    /tmp/overlay/merged

# View the merged result - shows lower layer contents
ls /tmp/overlay/merged/
# base_file.txt  shared.txt

cat /tmp/overlay/merged/base_file.txt
# from lower
```

## Understanding Copy-on-Write

Modifications to lower-layer files are captured in the upper layer.

```bash
# Modify a file that exists in the lower layer
echo "modified in upper" > /tmp/overlay/merged/shared.txt

# Check where the change went
cat /tmp/overlay/merged/shared.txt
# modified in upper (reading from upper layer)

cat /tmp/overlay/lower/shared.txt
# shared file (lower layer is unchanged)

ls /tmp/overlay/upper/
# shared.txt (copy with modifications is in upper)

# Create a new file in the merged view
echo "new file" > /tmp/overlay/merged/new_file.txt

# It appears in the upper layer, not the lower
ls /tmp/overlay/upper/
# shared.txt  new_file.txt

ls /tmp/overlay/lower/
# base_file.txt  shared.txt  (new_file.txt is NOT here)
```

## Deleting Files in an Overlay

Deleting a lower-layer file creates a "whiteout" in the upper layer.

```bash
# Delete a file from the merged view
rm /tmp/overlay/merged/base_file.txt

# The file is gone from the merged view
ls /tmp/overlay/merged/
# shared.txt  new_file.txt

# But the lower layer is untouched
ls /tmp/overlay/lower/
# base_file.txt  shared.txt

# A whiteout entry was created in the upper layer
ls -la /tmp/overlay/upper/
# c--------- ... base_file.txt (character device with 0,0 = whiteout)
```

## Multiple Lower Layers

OverlayFS supports multiple lower layers, which is how Docker builds images from multiple layers.

```bash
mkdir -p /tmp/multilayer/{layer1,layer2,layer3,upper,work,merged}

# Create files in different layers
echo "layer1 content" > /tmp/multilayer/layer1/file1.txt
echo "layer2 content" > /tmp/multilayer/layer2/file2.txt
echo "shared in layer1" > /tmp/multilayer/layer1/shared.txt
echo "overridden in layer2" > /tmp/multilayer/layer2/shared.txt

# Mount with multiple lower layers (colon-separated, first listed = highest priority)
sudo mount -t overlay overlay \
    -o lowerdir=/tmp/multilayer/layer3:/tmp/multilayer/layer2:/tmp/multilayer/layer1,\
upperdir=/tmp/multilayer/upper,\
workdir=/tmp/multilayer/work \
    /tmp/multilayer/merged

# Verify the merge - layer2 wins for shared.txt
cat /tmp/multilayer/merged/shared.txt
# overridden in layer2

ls /tmp/multilayer/merged/
# file1.txt  file2.txt  shared.txt
```

## Persistent Overlay Mount

Make the overlay mount persist across reboots by adding it to `/etc/fstab`.

```bash
# Create persistent directories
sudo mkdir -p /srv/overlay/{base,changes,work,view}

# Populate the base layer with your read-only content
sudo rsync -a /path/to/base-content/ /srv/overlay/base/

# Add to /etc/fstab
echo "overlay /srv/overlay/view overlay lowerdir=/srv/overlay/base,upperdir=/srv/overlay/changes,workdir=/srv/overlay/work 0 0" | \
    sudo tee -a /etc/fstab

# Mount all fstab entries
sudo mount -a

# Verify
mount | grep overlay
```

## Practical Use: Writable Testing Environment

Use OverlayFS to create a disposable testing overlay on top of a production directory.

```bash
#!/bin/bash
# Create a writable testing overlay over a production config directory

PROD_DIR="/etc/nginx"
TEST_DIR="/tmp/nginx-test"

mkdir -p "${TEST_DIR}/upper" "${TEST_DIR}/work" "${TEST_DIR}/merged"

sudo mount -t overlay overlay \
    -o "lowerdir=${PROD_DIR},upperdir=${TEST_DIR}/upper,workdir=${TEST_DIR}/work" \
    "${TEST_DIR}/merged"

echo "Testing environment ready at ${TEST_DIR}/merged"
echo "Changes will not affect ${PROD_DIR}"
echo ""
echo "To see changes made during testing:"
echo "  ls ${TEST_DIR}/upper"
echo ""
echo "To apply changes to production:"
echo "  rsync -a ${TEST_DIR}/upper/ ${PROD_DIR}/"
echo ""
echo "To discard all changes:"
echo "  sudo umount ${TEST_DIR}/merged && rm -rf ${TEST_DIR}"
```

## Using OverlayFS for Live Patching

You can run services against an overlay view of their configuration, allowing instant rollback.

```bash
# Example: Test new nginx config without touching production
sudo mkdir -p /srv/overlay/nginx/{upper,work,merged}

# Mount overlay on top of /etc/nginx
sudo mount -t overlay overlay \
    -o "lowerdir=/etc/nginx,upperdir=/srv/overlay/nginx/upper,workdir=/srv/overlay/nginx/work" \
    /srv/overlay/nginx/merged

# Modify the test config
sudo nano /srv/overlay/nginx/merged/nginx.conf

# Test nginx with the overlay config
sudo nginx -t -c /srv/overlay/nginx/merged/nginx.conf

# If it works, apply to production
sudo cp -r /srv/overlay/nginx/upper/* /etc/nginx/
sudo nginx -s reload

# If not, just unmount and discard
sudo umount /srv/overlay/nginx/merged
sudo rm -rf /srv/overlay/nginx/upper/*
```

## Unmounting Overlay Filesystems

```bash
# Unmount the overlay
sudo umount /tmp/overlay/merged

# Force unmount if busy
sudo umount -l /tmp/overlay/merged  # lazy unmount
sudo umount -f /tmp/overlay/merged  # force unmount

# Verify it is unmounted
mount | grep overlay
```

## OverlayFS in Docker

To understand how Docker uses OverlayFS, examine a running container.

```bash
# View Docker's overlay storage
sudo ls /var/lib/docker/overlay2/

# Inspect a container's filesystem layers
CONTAINER_ID=$(docker ps -q | head -1)
docker inspect "$CONTAINER_ID" | python3 -c "
import sys, json
data = json.load(sys.stdin)[0]
gd = data['GraphDriver']
print('Driver:', gd['Name'])
for k, v in gd['Data'].items():
    print(f'{k}: {v}')
"
# GraphDriver.Data will show LowerDir, UpperDir, WorkDir, MergedDir
```

OverlayFS is a foundational piece of the modern Linux container ecosystem. Understanding how it works directly helps when debugging container storage issues, building custom container runtimes, or creating any scenario where you need a layered, copy-on-write view of a filesystem.
