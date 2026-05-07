# How to Use Rootless Podman with Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Rootless, Storage

Description: A hands-on guide to creating, mounting, and managing persistent volumes in rootless Podman, including fixing common permission errors.

---

> "Volumes in rootless Podman work great once you understand how user namespaces remap file ownership."

Persistent data is essential for databases, application state, and configuration files. In rootless Podman, volume management introduces user namespace UID mapping challenges that do not exist in rootful mode. This guide covers everything you need to manage volumes effectively without root.

---

## Creating and Using Named Volumes

Named volumes are the simplest way to persist data in rootless Podman. Podman manages the storage location and permissions automatically.

```bash
# Create a named volume

podman volume create mydata

# Inspect the volume to see where it lives on disk
podman volume inspect mydata

# Run a container with the named volume mounted
podman run -d --name db \
  -e POSTGRES_PASSWORD=example \
  -v mydata:/var/lib/postgresql/data \
  postgres:16

# List all volumes
podman volume ls

# Check volume disk usage
podman system df -v
```

Named volumes are stored under your home directory, typically at `~/.local/share/containers/storage/volumes/`.

## Bind Mounting Host Directories

Bind mounts let you share specific host directories with containers. This is where rootless mode introduces UID mapping complications.

```bash
# Create a host directory for the mount
mkdir -p ~/podman-data/webapp

# This may fail with permission errors if the container runs as a non-root user
podman run --rm --user 1000:1000 \
  -v ~/podman-data/webapp:/data \
  alpine touch /data/test.txt

# Check what UID the container process runs as
podman run --rm --user 1000:1000 \
  -v ~/podman-data/webapp:/data \
  alpine id

# In rootless Podman, container UID 0 maps to your host UID,
# and higher container UIDs map into your subordinate UID/GID range
# Verify the mapping
podman unshare cat /proc/self/uid_map
```

## Fixing Permission Denied Errors

The most common volume issue in rootless Podman is "Permission denied" when a container process runs as a non-root user inside the container.

```bash
# Example: A container runs as UID 1000 inside the container
# That maps to a different UID on the host due to user namespaces

# Option 1: Use podman unshare to set ownership correctly
podman unshare chown -R 1000:1000 ~/podman-data/webapp

# Verify the ownership from the host perspective
ls -ldn ~/podman-data/webapp

# Verify the ownership from the container perspective
podman run --rm --user 1000:1000 \
  -v ~/podman-data/webapp:/data \
  alpine sh -c "touch /data/hello.txt && ls -la /data"
```

On the host, the directory may appear owned by a subordinate UID/GID rather than your login user because rootless Podman applies user namespace mappings.

## Using the :Z and :z SELinux Options

On SELinux-enabled systems like Fedora and RHEL, you need to label volumes correctly:

```bash
# :z applies a shared SELinux label (multiple containers can access)
podman run --rm -v ~/podman-data/webapp:/data:z alpine touch /data/test.txt

# :Z applies a private SELinux label (only this container can access)
podman run --rm -v ~/podman-data/webapp:/data:Z alpine touch /data/test.txt

# Check the SELinux label on the directory
ls -laZ ~/podman-data/webapp
```

## Using the :U Flag for Automatic Ownership Changes

Podman provides the `:U` flag to recursively change ownership on the host to match the container user:

```bash
# The :U flag adjusts host ownership to match the container UID
podman run --rm \
  -v ~/podman-data/webapp:/data:U \
  --user 1000:1000 \
  alpine sh -c "touch /data/hello.txt && ls -la /data/"

# Combine :U with :z for SELinux systems
podman run --rm \
  -v ~/podman-data/webapp:/data:U,z \
  --user 1000:1000 \
  alpine sh -c "touch /data/hello.txt && ls -la /data/"
```

## Working with tmpfs Mounts

For temporary data that does not need to persist, tmpfs mounts avoid host bind-mount ownership issues:

```bash
# Mount a tmpfs volume at /tmp inside the container
podman run --rm \
  --tmpfs /tmp:size=100m \
  alpine sh -c "dd if=/dev/zero of=/tmp/testfile bs=1M count=50 && ls -lh /tmp/testfile"

# Use tmpfs for build caches or temporary processing
podman run --rm \
  --tmpfs /app/cache:size=200m \
  alpine sh -c "echo 'cache is writable' > /app/cache/test && cat /app/cache/test"
```

## Sharing Volumes Between Containers

Multiple rootless containers can share the same volume for data exchange:

```bash
# Create a shared volume
podman volume create shared-data

# Producer container writes data
podman run --rm \
  -v shared-data:/output \
  alpine sh -c "echo 'Hello from producer' > /output/message.txt"

# Consumer container reads data
podman run --rm \
  -v shared-data:/input:ro \
  alpine cat /input/message.txt
```

## Backing Up and Restoring Volumes

Protect your volume data with simple backup and restore procedures:

```bash
# Back up a named volume to a tar archive
podman volume export mydata --output mydata-backup.tar

# Restore a volume from a tar archive
podman volume create mydata-restored
podman volume import mydata-restored mydata-backup.tar

# Verify the restore
podman run --rm -v mydata-restored:/data alpine ls -la /data
```

## Summary

Rootless Podman volumes work reliably once you understand UID namespace remapping. Named volumes are the easiest approach since Podman handles permissions automatically. For bind mounts, use `podman unshare chown` to fix ownership from the container perspective, apply the `:U` flag for automatic ownership changes, and add `:z` or `:Z` on SELinux systems. Use `podman volume export` and `podman volume import` to back up and restore your persistent data.
