# How to Use the :Z and :z SELinux Volume Options in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, SELinux, Volumes, Security

Description: Learn the difference between :Z and :z SELinux volume options in Podman and when to use each one.

---

> On SELinux-enabled systems running in enforcing mode, volumes must be properly labeled for containers to access them. The :z and :Z flags handle this automatically.

SELinux enforces mandatory access controls that prevent containers from accessing host files unless the files carry a security label that the container is allowed to use. Podman provides the `:z` and `:Z` volume suffixes to automatically relabel files for container access.

---

## Why SELinux Blocks Volume Access

By default, many host directories have SELinux contexts that containers cannot read. Without relabeling, you can see "Permission denied" errors even if standard Unix permissions are correct.

```bash
# Check SELinux status

getenforce

# View the SELinux label on a directory
ls -laZ /home/user/data
# Output: unconfined_u:object_r:user_home_t:s0
```

## The :z Option (Shared Label)

The lowercase `:z` relabels the volume content with a shared SELinux label. Multiple containers can access the same volume simultaneously.

```bash
# Create a shared data directory
mkdir -p /home/user/shared-data

# Mount with :z so multiple containers can access it
podman run -d --name app1 \
  -v /home/user/shared-data:/data:z \
  docker.io/library/alpine:latest tail -f /dev/null

podman run -d --name app2 \
  -v /home/user/shared-data:/data:z \
  docker.io/library/alpine:latest tail -f /dev/null

# Verify the label was changed to container_file_t
ls -laZ /home/user/shared-data
# Output: system_u:object_r:container_file_t:s0
```

## The :Z Option (Private Label)

The uppercase `:Z` relabels the volume content with a private SELinux label unique to that specific container. Only that container should use this volume, except for containers in the same pod because they share an SELinux label.

```bash
# Mount with :Z for exclusive container access
podman run -d --name private-app \
  -v /home/user/private-data:/data:Z \
  docker.io/library/nginx:latest

# The label includes a unique MCS (Multi-Category Security) level
ls -laZ /home/user/private-data
# Output: system_u:object_r:container_file_t:s0:c123,c456
```

## When to Use :z vs :Z

| Option | Label Type | Use Case |
|--------|-----------|----------|
| `:z`   | Shared (`container_file_t`) | Multiple containers share the volume |
| `:Z`   | Private (`container_file_t` + MCS) | Single container exclusive access, except within the same pod |

```bash
# Shared config directory for multiple services
podman run -d -v /etc/myapp/config:/config:z,ro app1
podman run -d -v /etc/myapp/config:/config:z,ro app2

# Private database storage for one container
podman run -d -v /var/lib/pgdata:/var/lib/postgresql/data:Z postgres:16
```

## Caution: Do Not Use :Z on System Directories

Using `:Z` on shared system directories like `/home` or `/etc` will relabel them and potentially break your system.

```bash
# DANGEROUS - never do this
# podman run -v /home:/data:Z alpine  # This breaks home directory access!

# SAFE - use a subdirectory instead
podman run -v /home/user/appdata:/data:Z docker.io/library/alpine:latest
```

## Combining SELinux Options with Other Flags

```bash
# Read-only with shared SELinux label
podman run -d \
  -v /home/user/config:/app/config:z,ro \
  docker.io/library/nginx:latest

# User namespace mapping with private SELinux label
podman run -d \
  -v /home/user/data:/app/data:Z,U \
  docker.io/library/node:20
```

## Summary

On SELinux-enabled hosts, use `:z` for volumes shared across multiple containers and `:Z` for volumes exclusive to a single container. Both options automatically relabel files with the `container_file_t` SELinux type, but `:Z` adds a unique MCS category for isolation. Containers in the same pod share an SELinux label, so they can share a `:Z` volume. Avoid applying `:Z` to broad system directories to prevent breaking host access.
