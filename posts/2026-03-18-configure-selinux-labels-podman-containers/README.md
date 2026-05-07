# How to Configure SELinux Labels for Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Linux, Security, SELinux, Labels

Description: Learn how to configure SELinux labels for Podman containers to enforce mandatory access control policies on containerized workloads.

---

> SELinux labels add a mandatory access control layer that restricts containers even if they escape other security boundaries.

SELinux (Security-Enhanced Linux) assigns security labels to every process, file, and resource on the system. Podman integrates tightly with SELinux to automatically label container processes and their file access. By customizing these labels, you can enforce strict isolation policies that go beyond standard Linux permissions.

This guide covers how SELinux labeling works with Podman and how to configure custom labels for your containers.

---

## Understanding SELinux Labels

SELinux labels follow the format `user:role:type:level`. For containers, the most important component is the type, which determines what a process can access.

```bash
# Check if SELinux is enabled and in enforcing mode

# Enforcing means policies are actively applied
getenforce

# View the SELinux status with detailed information
sestatus

# See the default SELinux label assigned to a Podman container process
podman run --rm docker.io/library/fedora:latest \
  sh -c "ps -eZ | head -5"
```

The default container type is `container_t`, and container files use `container_file_t`.

## Viewing Default Container Labels

Podman automatically applies SELinux labels to containers. You can inspect these defaults.

```bash
# Check the SELinux label of the container process
podman run --rm docker.io/library/fedora:latest \
  cat /proc/self/attr/current

# View the label on container-mounted files
podman run --rm docker.io/library/fedora:latest \
  ls -Z /etc/hostname

# Inspect the full SELinux context of a running container
podman run -d --name label-check docker.io/library/fedora:latest sleep 3600
podman inspect label-check --format '{{.ProcessLabel}}'
podman inspect label-check --format '{{.MountLabel}}'
podman stop label-check && podman rm label-check
```

## Setting a Custom Process Label

Use `--security-opt label=type:` to change the SELinux type applied to the container process.

```bash
# Run a container with a custom policy-defined type
# The SELinux policy must define the alternate type before you use it
podman run --rm \
  --security-opt label=type:my_container.process \
  docker.io/library/fedora:latest \
  cat /proc/self/attr/current

# Run a container with the container_t type explicitly
# This is the default type, shown here for clarity
podman run --rm \
  --security-opt label=type:container_t \
  docker.io/library/fedora:latest \
  cat /proc/self/attr/current
```

## Setting a Custom MCS Level

Multi-Category Security (MCS) levels provide isolation between containers. Each container gets a unique MCS label by default.

```bash
# Run two containers and compare their MCS levels
# Each gets a unique level, preventing cross-container access
podman run --rm docker.io/library/fedora:latest \
  cat /proc/self/attr/current

podman run --rm docker.io/library/fedora:latest \
  cat /proc/self/attr/current

# Set a specific MCS level for a container
# Containers with the same level can share resources
podman run --rm \
  --security-opt label=level:s0:c100,c200 \
  docker.io/library/fedora:latest \
  cat /proc/self/attr/current
```

## Labeling Volume Mounts

When mounting host directories, SELinux labels must be set correctly or the container will be denied access.

```bash
# Create a test directory and file on the host
mkdir -p /tmp/selinux-test
echo "test data" > /tmp/selinux-test/data.txt

# Mount with :z for shared label - multiple containers can access
# The :z flag relabels the directory with container_file_t
podman run --rm \
  -v /tmp/selinux-test:/data:z \
  docker.io/library/fedora:latest \
  cat /data/data.txt

# Mount with :Z for private label - only this container can access
# The :Z flag relabels with a unique MCS label
podman run --rm \
  -v /tmp/selinux-test:/data:Z \
  docker.io/library/fedora:latest \
  cat /data/data.txt

# Check the SELinux label applied to the mounted directory
ls -Zd /tmp/selinux-test
```

## Combining Label Options

You can set both the type and level together for precise control.

```bash
# Set both the SELinux type and MCS level
podman run --rm \
  --security-opt label=type:container_t \
  --security-opt label=level:s0:c50,c150 \
  docker.io/library/fedora:latest \
  cat /proc/self/attr/current

# Set a custom user and role as well
podman run --rm \
  --security-opt label=user:system_u \
  --security-opt label=role:system_r \
  --security-opt label=type:container_t \
  --security-opt label=level:s0:c50,c150 \
  docker.io/library/fedora:latest \
  cat /proc/self/attr/current
```

## Sharing Labels Between Containers

Containers that need to share resources can be given the same MCS level.

```bash
# Create a shared volume directory
mkdir -p /tmp/shared-selinux

# Start two containers with the same MCS level
# Both can access the same labeled resources
podman run -d --name app-a \
  --security-opt label=level:s0:c100,c200 \
  -v /tmp/shared-selinux:/shared:Z \
  docker.io/library/fedora:latest sleep 3600

podman run -d --name app-b \
  --security-opt label=level:s0:c100,c200 \
  -v /tmp/shared-selinux:/shared:Z \
  docker.io/library/fedora:latest sleep 3600

# Write from one container and read from the other
podman exec app-a sh -c "echo 'hello from A' > /shared/message.txt"
podman exec app-b cat /shared/message.txt

# Clean up
podman stop app-a app-b && podman rm app-a app-b
```

## Summary

SELinux labels provide mandatory access control for Podman containers that operates independently of standard Unix permissions. Use `:z` and `:Z` volume mount flags to handle file labeling, set custom types and MCS levels with `--security-opt label=`, and use matching MCS levels for containers that need to share resources. Always check audit logs when troubleshooting access denials and avoid disabling SELinux when label configuration can solve the problem.
