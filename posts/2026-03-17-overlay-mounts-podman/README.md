# How to Use Overlay Mounts with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Overlay, Volumes, Filesystem

Description: Learn how to use overlay mounts in Podman to layer directories and provide copy-on-write semantics for container volumes.

---

> Overlay mounts let you layer multiple directories together, allowing containers to see a merged view while keeping the original data untouched through copy-on-write.

Overlay mounts in Podman use the Linux OverlayFS to combine multiple directory layers. This is useful when you want to provide a base set of files that containers can appear to modify without altering the originals.

---

## Understanding Overlay Mounts

An overlay mount combines a lower (read-only) directory with an upper (writable) directory. The container sees a merged view of both. Writes go to the upper layer, leaving the lower layer unchanged.

```bash
# Basic overlay volume syntax with :O

podman run --rm \
  -v /home/user/base-config:/config:O \
  docker.io/library/alpine:latest ls /config
```

## Creating an Overlay Mount with a Persistent Upper Layer

```bash
# Prepare base, upper, and work directories
mkdir -p /home/user/base-config
mkdir -p /home/user/override-config
mkdir -p /home/user/overlay-work

echo "base_setting=true" > /home/user/base-config/app.conf
echo "override_setting=true" > /home/user/override-config/app.conf

# Mount as overlay - the upper layer takes precedence
podman run --rm \
  -v /home/user/base-config:/config:O,upperdir=/home/user/override-config,workdir=/home/user/overlay-work \
  docker.io/library/alpine:latest cat /config/app.conf
```

## Using Overlay for Development Workflows

Overlay mounts are useful in development to test changes against default files without modifying the originals:

```bash
# Base image has default nginx config
# Overlay a temporary writable layer on top
podman run -d --name dev-nginx \
  -v /home/user/default-nginx:/etc/nginx/conf.d:O \
  -p 8080:80 \
  docker.io/library/nginx:latest

# Any changes inside the container are written to the container storage upper layer
# The base files remain unchanged
```

## Overlay Volume Options

```bash
# Specify workdir and upperdir explicitly
podman run --rm \
  -v /home/user/lower:/data:O,upperdir=/home/user/upper,workdir=/home/user/work \
  docker.io/library/alpine:latest sh -c "echo hello > /data/newfile.txt && cat /data/newfile.txt"

# The new file appears in the upper directory on the host
cat /home/user/upper/newfile.txt
# Output: hello

# The lower directory is untouched
ls /home/user/lower/newfile.txt
# Output: No such file or directory
```

## Read-Only Mounts

```bash
# Mount the directory as read-only for strict protection
podman run --rm \
  -v /home/user/base-config:/config:ro \
  docker.io/library/alpine:latest cat /config/app.conf
```

## Overlay vs Bind Mounts

| Feature | Overlay Mount | Bind Mount |
|---------|--------------|------------|
| Copy-on-write | Yes | No |
| Original files protected | Yes | No |
| Persistent upper layer | Optional | No |
| Performance | Slight overhead | Direct access |

## Combining with SELinux

```bash
# Use overlay mounts on SELinux-enabled systems
podman run --rm \
  -v /home/user/base:/config:O \
  docker.io/library/alpine:latest ls /config
# Podman labels overlay volume content with a private label
```

## Summary

Overlay mounts in Podman provide copy-on-write layering for container volumes. They are ideal for scenarios where you need to provide base files that containers can appear to modify without altering the originals. Use explicit `upperdir` and `workdir` options when you need non-volatile storage for modifications.
