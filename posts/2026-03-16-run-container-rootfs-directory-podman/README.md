# How to Run a Container from a Rootfs Directory in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootfs, Container Image

Description: Learn how to create and run a Podman container directly from a root filesystem directory without a traditional container image.

---

> Running containers from a rootfs directory gives you full control over the filesystem layout without needing a Dockerfile or image registry.

Podman supports running containers directly from a root filesystem (rootfs) directory on your host machine. This is useful for testing custom Linux distributions, debugging filesystem layouts, or running minimal containers built from scratch. This guide shows you how to prepare a rootfs and run it as a Podman container.

---

## What Is a Rootfs Directory?

A rootfs (root filesystem) is a directory structure that contains everything a Linux system needs to run: binaries, libraries, configuration files, and device nodes. It mirrors the `/` directory of a Linux system. Podman can use this directory directly as the container's filesystem.

## Creating a Minimal Rootfs

You can create a rootfs from an existing container image or build one from scratch.

### Extracting Rootfs from an Existing Image

```bash
# Create a directory for the rootfs

mkdir -p /tmp/my-rootfs

# Export an existing image's filesystem
podman create --name temp-container docker.io/library/alpine:latest
podman export temp-container | tar -xf - -C /tmp/my-rootfs
podman rm temp-container

# Verify the rootfs structure
ls /tmp/my-rootfs
```

### Building a Minimal Rootfs from Scratch

```bash
# Create a bare-minimum rootfs with busybox
mkdir -p /tmp/minimal-rootfs/{bin,proc,sys,dev,etc,tmp}

# Copy a statically linked busybox binary
podman run --rm docker.io/library/busybox:latest cat /bin/busybox > /tmp/minimal-rootfs/bin/busybox
chmod +x /tmp/minimal-rootfs/bin/busybox

# Create symlinks for common commands
for cmd in sh ls cat echo env mkdir; do
  ln -s /bin/busybox /tmp/minimal-rootfs/bin/$cmd
done

# Verify the layout
ls -la /tmp/minimal-rootfs/bin/
```

## Running a Container from a Rootfs Directory

Use the `--rootfs` flag to tell Podman to use a directory as the container's root filesystem.

```bash
# Run a container from the rootfs directory
podman run --rm --rootfs /tmp/my-rootfs \
  /bin/sh -c 'echo "Hello from rootfs container"; cat /etc/os-release'
```

## Running with Network Access

Containers started from rootfs directories work with Podman's standard networking.

```bash
# Run with network access
podman run --rm --rootfs /tmp/my-rootfs \
  /bin/sh -c 'wget -qO- http://httpbin.org/ip 2>/dev/null || echo "wget not available"'
```

## Mounting Additional Filesystems

Combine rootfs with volume mounts for additional flexibility.

```bash
# Run with a volume mount
mkdir -p /tmp/shared-data

podman run --rm \
  --rootfs /tmp/my-rootfs \
  -v /tmp/shared-data:/data:z \
  /bin/sh -c 'echo "Mounted data:"; ls /data'
```

## Running Interactive Sessions

```bash
# Start an interactive shell in the rootfs container
podman run --rm -it \
  --rootfs /tmp/my-rootfs \
  /bin/sh
```

## Using Rootfs with Overlay Filesystem

Podman supports overlay modifications on top of the rootfs using the `:O` modifier. This keeps the original rootfs directory unchanged.

```bash
# Run with overlay so changes do not affect the original rootfs
podman run --rm \
  --rootfs /tmp/my-rootfs:O \
  /bin/sh -c 'echo "test" > /tmp/overlay-file; cat /tmp/overlay-file'

# Verify the original rootfs is unchanged
ls /tmp/my-rootfs/tmp/
```

## Setting Environment Variables

```bash
# Pass environment variables to a rootfs container
podman run --rm \
  --rootfs /tmp/my-rootfs \
  --env MY_VAR=hello \
  --env APP_ENV=production \
  /bin/sh -c 'echo "MY_VAR=$MY_VAR APP_ENV=$APP_ENV"'
```

## Running as a Specific User

```bash
# Run the rootfs container as a specific user ID
podman run --rm \
  --rootfs /tmp/my-rootfs \
  --user 1000:1000 \
  /bin/sh -c 'id'
```

## Rootfs with Resource Limits

You can apply all standard Podman resource constraints to rootfs containers.

```bash
# Run rootfs container with memory and CPU limits
podman run --rm \
  --rootfs /tmp/my-rootfs \
  --memory 128m \
  --cpus 0.5 \
  /bin/sh -c 'echo "Resource-limited rootfs container"'
```

## Debugging Rootfs Issues

If a rootfs container fails to start, check for missing dependencies.

```bash
# Check if essential directories exist
ls -la /tmp/my-rootfs/{bin,lib,etc,proc,sys,dev} 2>&1

# Test the binary directly
file /tmp/my-rootfs/bin/sh

# Check for missing shared libraries
podman run --rm --rootfs /tmp/my-rootfs \
  /bin/sh -c 'ldd /bin/sh 2>/dev/null || echo "Static binary or ldd unavailable"'
```

## Cleaning Up

```bash
# Remove the rootfs directory when done
rm -rf /tmp/my-rootfs /tmp/minimal-rootfs
```

## Summary

Running containers from a rootfs directory in Podman gives you direct control over the container's filesystem. Use `--rootfs` to point Podman at any directory with a valid Linux filesystem layout. Combine it with the `:O` overlay modifier to keep the source directory clean. This approach is ideal for custom environments, testing, and minimal container setups.
