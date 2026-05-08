# How to Debug Permission Denied Errors in Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Debugging, Security, SELinux

Description: Learn how to diagnose and fix permission denied errors in Podman containers, covering SELinux, rootless mode, file ownership, and volume mount issues.

---

> Permission denied errors in Podman usually come down to three things: SELinux, rootless UID mapping, or file ownership mismatches.

Running containers with Podman in rootless mode provides excellent security, but it also introduces permission challenges that do not exist with root-level container runtimes. This guide covers the most common causes of permission denied errors and how to resolve each one.

---

## Identify the Error Source

Start by capturing the exact error message from your container.

```bash
# Check container logs for permission errors

podman logs my-container 2>&1 | grep -i "permission denied"

# Run the container interactively to see errors in real time
podman run -it my-image:latest

# Check if the container is running rootless
podman info --format '{{.Host.Security.Rootless}}'
```

## SELinux Volume Mount Issues

On systems with SELinux enabled (RHEL, Fedora, CentOS), volume mounts can be blocked unless the mounted content has a label that container processes are allowed to use.

```bash
# Check if SELinux is enforcing
getenforce

# View SELinux denials related to containers
sudo ausearch -m avc -ts recent | grep container

# Fix: Add the :Z flag for private volumes (single container)
podman run -v /host/data:/container/data:Z my-image:latest

# Fix: Add the :z flag for shared volumes (multiple containers)
podman run -v /host/data:/container/data:z my-image:latest

# Verify the SELinux context was applied
ls -laZ /host/data
```

The `:Z` flag tells Podman to relabel the volume content with a private SELinux label. The `:z` flag uses a shared label so multiple containers can access the same volume.

## Rootless Mode UID Mapping

In rootless mode, Podman maps container UIDs to unprivileged host UIDs. This can cause ownership mismatches.

```bash
# Check your UID mapping
podman unshare cat /proc/self/uid_map

# See that your user appears as root inside the rootless user namespace
podman unshare id

# Check file ownership as seen inside the container
podman unshare ls -la /host/data

# Fix: Change ownership to match the container user
# If the container runs as UID 1000:
podman unshare chown 1000:1000 /host/data

# Alternatively, run the container as your host user
podman run --userns=keep-id -v /host/data:/container/data my-image:latest
```

The `--userns=keep-id` flag maps your host UID directly into the container, so files you own on the host are also owned by you inside the container.

## File System Permission Issues

Sometimes the files inside the image have restrictive permissions.

```bash
# Check file permissions inside the image
podman run --rm my-image:latest ls -la /app/

# Check what user the container runs as
podman image inspect --format '{{.Config.User}}' my-image:latest

# Fix: Run as root to diagnose, then fix properly
podman run --rm --user root my-image:latest ls -la /app/

# Fix: Override the user at runtime
podman run --user 1000:1000 -v /host/data:/app/data:Z my-image:latest
```

## Read-Only Filesystem Errors

Some containers are run with read-only root filesystems or tmpfs mounts.

```bash
# Check if the container has a read-only rootfs
podman container inspect --format '{{.HostConfig.ReadonlyRootfs}}' my-container

# Run with a writable tmp directory
podman run --read-only --tmpfs /tmp:rw,size=100m my-image:latest

# Add specific writable mounts for directories that need write access
podman run --read-only \
  --tmpfs /tmp:rw \
  --tmpfs /var/run:rw \
  -v app-data:/app/data:Z \
  my-image:latest
```

## Debug Permission Issues with Capabilities

Some operations inside containers require Linux capabilities. They can fail if the container uses a restricted capability set or the image drops capabilities it needs.

```bash
# Check what capabilities the container has
podman container inspect --format '{{.EffectiveCaps}}' my-container

# Add specific capabilities if needed
podman run --cap-add SYS_PTRACE my-image:latest

# Common capabilities involved in permission errors:
# --cap-add NET_BIND_SERVICE  (bind to ports below 1024)
# --cap-add SYS_PTRACE        (debugging tools like strace)
# --cap-add DAC_OVERRIDE      (bypass file permission checks)
# --cap-add CHOWN             (change file ownership)

# List all capabilities for debugging
podman run --rm my-image:latest cat /proc/self/status | grep Cap
```

## Debug with strace

When the error is unclear, use `strace` to find exactly which syscall is failing.

```bash
# Run with SYS_PTRACE capability to allow strace
podman run --cap-add SYS_PTRACE -it my-image:latest

# Inside the container, trace the failing process
# (install strace if not present)
strace -f -e trace=open,openat,access /app/entrypoint.sh 2>&1 | grep EACCES
```

## Fixing Permission Errors in Podman Compose

When using Podman Compose, apply the same fixes in your compose file.

```yaml
# podman-compose.yml
services:
  app:
    image: my-image:latest
    user: "1000:1000"
    volumes:
      - ./data:/app/data:Z
    security_opt:
      - label=disable  # Disable SELinux for this container (not recommended for prod)
    cap_add:
      - NET_BIND_SERVICE
```

## Summary

Permission denied errors in Podman stem from SELinux labeling, rootless UID mapping, file ownership, or missing capabilities. The `:Z` volume flag, `--userns=keep-id`, and proper file ownership are the three most common fixes. Always prefer granting minimal permissions rather than running containers as root.
