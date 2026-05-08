# How to Configure subuid and subgid for Rootless Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, subuid, subgid, User Namespaces

Description: Learn how to configure subuid and subgid mappings required for rootless Podman to map container UIDs to host UIDs securely.

---

> The subuid and subgid files define which subordinate user and group IDs your account can use, enabling rootless containers to create isolated user namespace mappings.

Rootless Podman relies on Linux user namespaces to remap UIDs and GIDs inside containers to unprivileged IDs on the host. The `/etc/subuid` and `/etc/subgid` files control which ranges of IDs are allocated to each user, and without proper configuration, rootless containers cannot function.

---

## Understanding subuid and subgid

```bash
# /etc/subuid format: username:start_uid:count

# /etc/subgid format: username:start_gid:count

# Example entry: myuser:100000:65536
# This means myuser can use UIDs 100000 through 165535
# (65536 UIDs total, enough for most containers)
```

## Checking Current Configuration

```bash
# View your current subuid allocation
grep "^$(id -un):" /etc/subuid

# View your current subgid allocation
grep "^$(id -un):" /etc/subgid

# If no output, your user has no allocations and needs configuration
```

## Adding subuid and subgid Entries

```bash
# Method 1: Using usermod (recommended)
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Method 2: Editing the files directly
echo "$USER:100000:65536" | sudo tee -a /etc/subuid
echo "$USER:100000:65536" | sudo tee -a /etc/subgid

# Verify the entries
cat /etc/subuid
cat /etc/subgid
```

## Configuring for Multiple Users

```bash
# Each user needs a unique, non-overlapping range
# User alice: UIDs/GIDs 100000-165535
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 alice

# User bob: UIDs/GIDs 200000-265535
sudo usermod --add-subuids 200000-265535 --add-subgids 200000-265535 bob

# User charlie: UIDs/GIDs 300000-365535
sudo usermod --add-subuids 300000-365535 --add-subgids 300000-365535 charlie

# Verify no ranges overlap
cat /etc/subuid
# alice:100000:65536
# bob:200000:65536
# charlie:300000:65536
```

## Applying Changes

```bash
# After modifying subuid/subgid, apply the changes
podman system migrate

# Verify the mappings are working
podman unshare cat /proc/self/uid_map
# Expected output:
#          0       1000          1
#          1     100000      65536

podman unshare cat /proc/self/gid_map
```

## Increasing the Range

```bash
# Some containers need more than 65536 UIDs
# Increase the allocation for larger requirements

# Remove the existing entry and add a larger one
sudo usermod --del-subuids 100000-165535 --del-subgids 100000-165535 $USER
sudo usermod --add-subuids 100000-231535 --add-subgids 100000-231535 $USER
# This gives 131536 UIDs/GIDs

# Apply the changes
podman system migrate
```

## Verifying Inside a Container

```bash
# Run a container and check the UID mapping
podman run --rm alpine:latest cat /proc/self/uid_map

# Check that processes inside the container show expected UIDs
podman run --rm alpine:latest id
# Output: uid=0(root) gid=0(root)
# Note: UID 0 inside maps to your host UID via user namespaces

# Verify file ownership mapping
podman run --rm alpine:latest ls -la /etc/passwd
```

## Troubleshooting

```bash
# Error: cannot set up uid map
# This usually means subuid is not configured
grep "^$(id -un):" /etc/subuid

# Error: range overlaps with existing allocation
# Check for duplicate entries
cat /etc/subuid | sort

# Error: insufficient range
# Add a non-overlapping extension to the existing subuid/subgid range
sudo usermod --add-subuids 165536-231535 --add-subgids 165536-231535 $USER
podman system migrate
```

## Summary

The `/etc/subuid` and `/etc/subgid` files are essential for rootless Podman, defining which subordinate UID/GID ranges your user account can use for user namespace mapping. Use `usermod` to add non-overlapping ranges of at least 65536 IDs per user, and run `podman system migrate` after any changes. Proper subuid/subgid configuration is the foundation for all rootless container operations in Podman.
