# How to Use Docker Volumes with SELinux Labels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Volumes, SELinux, Security, Linux, DevOps, Permissions

Description: A hands-on guide to configuring Docker volumes with SELinux labels to prevent access denied errors on enforcing systems.

---

SELinux (Security-Enhanced Linux) adds mandatory access control to Linux. When SELinux is in enforcing mode, it controls which processes can access which files based on security labels, not just traditional Unix permissions. Docker containers run with a specific SELinux context, and volumes need matching labels or the container gets hit with "Permission denied" errors, even when the Unix file permissions look correct.

This is a common source of frustration on RHEL, CentOS, Fedora, and any other distribution that ships with SELinux enabled by default. The fix is not to disable SELinux. The fix is to label your volumes correctly.

## Understanding SELinux Contexts

Every file and process on an SELinux system has a security context. You can see a file's context with the `-Z` flag:

```bash
# View SELinux labels on files in a directory
ls -laZ /var/lib/docker/volumes/
```

A typical SELinux context looks like this: `system_u:object_r:container_file_t:s0`

The important part is the type label: `container_file_t`. Docker containers expect volumes to have this type. If a volume has a different type, like `default_t` or `user_home_t`, the container process cannot read or write to it.

## The :z and :Z Volume Flags

Docker provides two flags for automatic SELinux relabeling when mounting volumes:

- `:z` (lowercase) - shared label. Multiple containers can access the volume.
- `:Z` (uppercase) - private label. Only the specific container can access the volume.

### Using :z for Shared Volumes

```bash
# Mount a host directory with shared SELinux label
docker run --rm -v /opt/shared-data:/data:z alpine ls -la /data
```

The `:z` flag tells Docker to relabel the directory with `container_file_t` and allow shared access. Any container that mounts this directory with `:z` can read and write to it.

### Using :Z for Private Volumes

```bash
# Mount a host directory with private SELinux label (single container only)
docker run --rm -v /opt/private-data:/data:Z alpine ls -la /data
```

The `:Z` flag applies a more restrictive label that includes the container's unique MCS (Multi-Category Security) label. This means only that specific container instance can access the data. Other containers that try to mount the same directory will get access denied, even with `:z`.

### Combining with Read-Only

You can combine SELinux flags with the read-only flag:

```bash
# Mount with shared SELinux label and read-only access
docker run --rm -v /opt/config:/config:z,ro alpine cat /config/app.conf
```

## How Relabeling Works

When you use `:z` or `:Z`, Docker runs `chcon` (change context) on the mounted directory recursively. For `:z`, it applies:

```bash
# This is what Docker does internally when you use :z
chcon -Rt container_file_t /opt/shared-data
```

For `:Z`, Docker applies a label that includes the container's specific MCS level:

```bash
# This is roughly what Docker does internally for :Z
chcon -Rt container_file_t -l s0:c123,c456 /opt/private-data
```

The MCS label (`s0:c123,c456`) is unique per container, which is why `:Z` provides isolation between containers.

### Warning About Relabeling System Directories

Never use `:Z` on system directories like `/etc`, `/usr`, or `/home`. Docker will recursively relabel everything in that directory, which can break your host system:

```bash
# NEVER do this - it will relabel /etc and potentially lock you out
# docker run -v /etc:/host-etc:Z alpine cat /host-etc/hostname  # DO NOT RUN
```

If you need to mount system directories, use `:z` with read-only:

```bash
# Safe way to mount host config files
docker run --rm -v /etc/hostname:/etc/hostname:z,ro alpine cat /etc/hostname
```

## SELinux with Docker Compose

In Docker Compose, you specify SELinux labels in the volume mount string:

```yaml
# docker-compose.yml with SELinux labels
version: "3.8"

services:
  web:
    image: nginx:alpine
    volumes:
      # Shared SELinux label for content served by nginx
      - ./html:/usr/share/nginx/html:z,ro
      # Private SELinux label for nginx config
      - ./nginx.conf:/etc/nginx/nginx.conf:Z,ro

  app:
    image: myapp:latest
    volumes:
      # Shared label so both app and worker can access
      - app_data:/var/lib/app:z
      # Private label for this container's temp files
      - /opt/app-temp:/tmp/app:Z

  worker:
    image: myapp:latest
    command: ["worker"]
    volumes:
      # Same shared volume as the app service
      - app_data:/var/lib/app:z

volumes:
  app_data:
```

Notice that `app_data` uses `:z` in both services because they need shared access. The temp directory uses `:Z` because only the app service should access it.

## Named Volumes vs Bind Mounts

Named Docker volumes (created with `docker volume create`) generally work without SELinux issues because Docker manages their labels automatically. The SELinux problem primarily affects bind mounts where you specify a host path.

```bash
# Named volumes - Docker handles SELinux labels automatically
docker run --rm -v my_named_vol:/data alpine touch /data/test.txt

# Bind mounts - you need :z or :Z
docker run --rm -v /opt/host-data:/data:z alpine touch /data/test.txt
```

If you can use named volumes instead of bind mounts, do so. It avoids SELinux labeling headaches entirely.

## Manual SELinux Label Management

Sometimes you want to set labels manually rather than letting Docker relabel on every container start. This is useful for large directories where recursive relabeling takes too long.

### Set the Label Once

```bash
# Permanently set the SELinux type on a directory for Docker access
sudo semanage fcontext -a -t container_file_t "/opt/app-data(/.*)?"
sudo restorecon -Rv /opt/app-data
```

The `semanage fcontext` command creates a persistent rule, and `restorecon` applies it. Now the directory keeps its `container_file_t` label even after a system relabel.

### Verify Labels

```bash
# Check the current SELinux label on a directory
ls -dZ /opt/app-data

# Check what the policy says the label should be
sudo semanage fcontext -l | grep app-data
```

### Create a Custom SELinux Policy Module

For complex setups, you might need a custom policy. First, generate denials, then create a module from them:

```bash
# Check for SELinux denials related to Docker
sudo ausearch -m avc -ts recent | grep docker

# Generate a policy module from recent denials
sudo ausearch -m avc -ts recent | audit2allow -M docker-custom

# Install the custom policy module
sudo semodule -i docker-custom.pp
```

## Troubleshooting SELinux Denials

### Check if SELinux Is Causing the Problem

```bash
# Temporarily set SELinux to permissive mode (logs but does not block)
sudo setenforce 0

# Try your Docker command again
docker run --rm -v /opt/data:/data alpine ls /data

# If it works now, SELinux was blocking access
# Switch back to enforcing mode
sudo setenforce 1
```

### Read the Audit Log

```bash
# View recent SELinux denials for container processes
sudo ausearch -m avc -ts recent --comm docker
```

The audit log tells you exactly which access was denied, which process triggered it, and what the expected label should be.

### Common Error Patterns

**Error:** `Permission denied` with correct Unix permissions
**Fix:** Add `:z` or `:Z` to the volume mount

**Error:** Volume works for one container but not another
**Fix:** You probably used `:Z` (private). Switch to `:z` (shared) if multiple containers need access.

**Error:** Relabeling is slow on large directories
**Fix:** Use `semanage fcontext` to set labels permanently instead of relying on Docker's runtime relabeling.

## SELinux with Rootless Docker

When running Docker in rootless mode, SELinux interactions change slightly. The container runs under your user's SELinux context instead of the system Docker context:

```bash
# Check what SELinux context your rootless Docker containers use
docker run --rm alpine cat /proc/1/attr/current
```

Rootless Docker typically requires `:z` on bind mounts just like regular Docker. The main difference is that the MCS labels may be assigned from your user's range rather than the system range.

## Summary

SELinux and Docker work well together once you understand the labeling system. Use `:z` for shared volumes, `:Z` for private volumes, and prefer named volumes over bind mounts when possible. For persistent labeling on large directories, use `semanage fcontext` instead of runtime relabeling. Never disable SELinux to "fix" Docker permission issues. The proper fix is always to apply the correct labels.
