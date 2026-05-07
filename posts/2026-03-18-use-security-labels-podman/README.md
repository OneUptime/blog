# How to Use Security Labels with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, SELinux, Labels

Description: Learn how to apply and manage SELinux security labels in Podman containers for mandatory access control enforcement.

---

> Security labels provide mandatory access control that operates independently of user permissions, adding a defense layer that cannot be bypassed by root inside the container.

Podman integrates with SELinux to enforce mandatory access control (MAC) on containers. Security labels define what resources a container process can access, regardless of its user ID or capabilities. This guide covers how to use, customize, and troubleshoot security labels in Podman.

---

## Understanding SELinux and Container Labels

SELinux assigns a security context (label) to every process and file. Podman automatically labels container processes with the `container_t` type, which restricts what they can access on the host.

```bash
# Check if SELinux is enabled on your system

getenforce
# Expected output: Enforcing (or Permissive)
```

```bash
# View the SELinux label of a running container process
podman run --rm -d --name label-test docker.io/library/alpine:latest sleep 3600
podman inspect label-test --format '{{.ProcessLabel}}'
# Expected output includes container_t and MCS categories, for example: system_u:system_r:container_t:s0:c...,c...
```

## Default Container Security Labels

Podman assigns unique Multi-Category Security (MCS) labels to each container, ensuring containers cannot access each other's files.

```bash
# Launch two containers and compare their labels
podman run --rm -d --name container-a docker.io/library/alpine:latest sleep 3600
podman run --rm -d --name container-b docker.io/library/alpine:latest sleep 3600

# Show their process labels
echo "Container A:"
podman inspect container-a --format '{{.ProcessLabel}}'
echo "Container B:"
podman inspect container-b --format '{{.ProcessLabel}}'
# Each container gets unique MCS categories (c...,c...)
```

## Customizing Security Labels

You can override the default SELinux labels using the `--security-opt` flag.

```bash
# Run a container with a specific SELinux label
podman run --rm -d \
  --security-opt label=type:container_t \
  --name custom-label \
  docker.io/library/alpine:latest sleep 3600
```

```bash
# Assign a specific level (MCS categories) to a container
podman run --rm -d \
  --security-opt label=level:s0:c100,c200 \
  --name level-test \
  docker.io/library/alpine:latest sleep 3600

# Verify the assigned level
podman inspect level-test --format '{{.ProcessLabel}}'
```

## Sharing Labels Between Containers

If you want to share privately relabeled content between containers, give them the same MCS label.

```bash
# Create a named volume
podman volume create shared-data

# Run two containers with the same MCS label so they can share data
podman run --rm -d \
  --security-opt label=level:s0:c50,c60 \
  -v shared-data:/data:Z \
  --name writer \
  docker.io/library/alpine:latest \
  sh -c "echo 'shared content' > /data/file.txt && sleep 3600"

podman run --rm \
  --security-opt label=level:s0:c50,c60 \
  -v shared-data:/data:Z \
  --name reader \
  docker.io/library/alpine:latest \
  cat /data/file.txt
# Expected output: shared content
```

## Disabling SELinux Labeling

In development environments, you may need to disable SELinux label separation for a container.

```bash
# Disable SELinux label separation for a specific container
podman run --rm -d \
  --security-opt label=disable \
  --name no-selinux \
  docker.io/library/alpine:latest sleep 3600

# Inspect the process label
podman inspect no-selinux --format '{{.ProcessLabel}}'
```

## Using Volume Mount Labels

When mounting host directories, Podman can relabel them for SELinux compatibility.

```bash
# Create a host directory
mkdir -p /tmp/podman-selinux-test

# Mount with :Z for private label (single container access)
podman run --rm \
  -v /tmp/podman-selinux-test:/data:Z \
  docker.io/library/alpine:latest \
  sh -c "echo 'private' > /data/test.txt && cat /data/test.txt"

# Mount with :z for shared label (multiple container access)
podman run --rm \
  -v /tmp/podman-selinux-test:/data:z \
  docker.io/library/alpine:latest \
  cat /data/test.txt
```

## Viewing File Security Contexts

```bash
# Check the SELinux context of files on the host
ls -lZ /tmp/podman-selinux-test/
```

```bash
# View SELinux contexts inside a container
podman run --rm \
  -v /tmp/podman-selinux-test:/data:Z \
  registry.access.redhat.com/ubi9/ubi \
  ls -lZ /data/
```

## Troubleshooting SELinux Denials

```bash
# Check for SELinux denials in the audit log
sudo ausearch -m avc -ts recent 2>/dev/null | head -20

# Use sealert for human-readable explanations (if available)
sudo sealert -a /var/log/audit/audit.log 2>/dev/null | head -40
```

## Cleanup

```bash
# Stop and remove test containers
podman stop label-test container-a container-b custom-label level-test writer no-selinux 2>/dev/null
podman rm label-test container-a container-b custom-label level-test writer no-selinux 2>/dev/null
podman volume rm shared-data 2>/dev/null
rm -rf /tmp/podman-selinux-test
```

## Summary

Security labels in Podman leverage SELinux mandatory access control to isolate containers from each other and from the host. By understanding and customizing process labels, MCS categories, and volume mount options, you can enforce strict access boundaries that cannot be overridden even by root processes inside the container. Use the `:Z` and `:z` volume flags to handle SELinux relabeling automatically, and always keep SELinux in enforcing mode for production workloads.
