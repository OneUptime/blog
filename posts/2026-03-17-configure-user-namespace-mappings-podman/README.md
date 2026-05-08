# How to Configure User Namespace Mappings for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, User Namespaces, UID Mapping

Description: Learn how to configure user namespace mappings in Podman to control how container UIDs and GIDs are mapped to host IDs.

---

> User namespace mappings determine how UIDs and GIDs inside a container translate to IDs on the host, forming the security foundation of rootless containers.

User namespaces allow a process to have a different set of UIDs and GIDs than what appears on the host. In rootless Podman, this means UID 0 (root) inside the container maps to your regular unprivileged user on the host, preventing container escapes from gaining root access.

---

## Understanding the Default Mapping

```bash
# View the default UID mapping

podman unshare cat /proc/self/uid_map
# Output:
#          0       1000          1    <- container root maps to host UID 1000
#          1     100000      65536    <- container UIDs 1-65536 map to host UIDs 100000-165535

# View the default GID mapping
podman unshare cat /proc/self/gid_map

# What this means:
# Container UID 0 (root) -> Host UID 1000 (your user)
# Container UID 1        -> Host UID 100000
# Container UID 1000     -> Host UID 100999
# Container UID 65536    -> Host UID 165535
```

## Viewing Mappings for a Running Container

```bash
# Start a container
podman run -d --name test-map alpine:latest sleep 300

# View the UID mapping from the container's perspective
podman exec test-map cat /proc/1/uid_map

# View the mapping from the host
podman top test-map huser,user,pid

# Clean up
podman rm -f test-map
```

## How Mappings Affect File Ownership

```bash
# Create a file as root inside the container
podman run --rm -v /tmp/ns-test:/data alpine:latest touch /data/container-file

# Check ownership on the host
ls -la /tmp/ns-test/container-file
# Shows the mapped host UID (e.g., your user UID or a subuid)

# Clean up
rm -rf /tmp/ns-test
```

## Configuring Custom Namespace Size

The namespace size is determined by your subuid/subgid allocations:

```bash
# Default: 65536 UIDs (sufficient for most containers)
grep "$USER" /etc/subuid
# username:100000:65536

# For containers needing more UIDs, increase the range
sudo usermod --del-subuids 100000-165535 $USER
sudo usermod --add-subuids 100000-231535 $USER
sudo usermod --del-subgids 100000-165535 $USER
sudo usermod --add-subgids 100000-231535 $USER
# Now provides 131536 UIDs and GIDs

# Apply changes
podman system migrate
```

## Namespace Mapping with Volumes

```bash
# Files created inside the container appear with mapped UIDs on the host
podman run --rm -v ./data:/data alpine:latest sh -c "touch /data/test && ls -la /data/test"

# To fix ownership for host access, use podman unshare
podman unshare chown 0:0 ./data/test
# This sets the file to be owned by container root (your host user)
```

## Inspecting Container Namespace Configuration

```bash
# View the configured user namespace mode of a container
podman inspect --format='{{.HostConfig.UsernsMode}}' my-container

# View the UID and GID mappings used by a running container
podman exec my-container cat /proc/self/uid_map
podman exec my-container cat /proc/self/gid_map
```

## Security Implications

```bash
# Demonstrate that container root has no host privileges
podman run --rm alpine:latest id
# uid=0(root) gid=0(root) <- appears as root inside

# But on the host, the process runs as your user
podman run -d --name sec-test alpine:latest sleep 60
podman top sec-test huser,user,pid
# Shows the mapped host user, not host root

podman rm -f sec-test
```

## Summary

User namespace mappings are the core security mechanism of rootless Podman, translating container UIDs/GIDs to unprivileged host IDs. The default mapping uses your subuid/subgid allocations to map container root to your user and other container UIDs to high-numbered host UIDs. Understanding these mappings is essential for managing file permissions between the container and host, and for appreciating the security boundary that rootless containers provide.
