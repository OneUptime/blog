# How to Debug User Namespace Issues in Rootless Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, User Namespaces, Debugging, Security

Description: A comprehensive troubleshooting guide for diagnosing and fixing user namespace problems in rootless Podman, including subuid/subgid configuration, mapping errors, and namespace exhaustion.

---

> "User namespace issues are the gatekeepers of rootless Podman -- fix them and everything else falls into place."

User namespaces are the foundation of rootless Podman. They allow unprivileged users to run containers by mapping container UIDs to a range of host UIDs owned by the user. When this mapping breaks, containers fail to start, files become inaccessible, and error messages can be cryptic. This guide covers every common user namespace issue and how to fix it.

---

## Understanding User Namespaces

A user namespace provides UID and GID isolation. Rootless Podman maps container UIDs to subordinate UIDs assigned to your user:

```bash
# View your subordinate UID range

cat /etc/subuid
# Example output: youruser:100000:65536
# Meaning: your user can map 65536 UIDs starting from 100000

# View your subordinate GID range
cat /etc/subgid
# Example output: youruser:100000:65536

# See the active mapping Podman uses
podman unshare cat /proc/self/uid_map
# Typical output:
#          0       1000          1    <- container root = your host UID
#          1     100000      65536    <- container 1-65536 = host 100000-165535
```

## Error: "cannot find UID/GID mappings"

This is the most common user namespace error. It means your user lacks subuid/subgid entries:

```bash
# Check if entries exist for your user
grep "^$USER:" /etc/subuid
grep "^$USER:" /etc/subgid

# If no entries are found, add them
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Verify the entries were added
cat /etc/subuid
cat /etc/subgid

# After adding entries, you may need to migrate Podman storage
podman system migrate

# Test that containers can start
podman run --rm alpine echo "User namespace is working"
```

## Error: "newuidmap: write to uid_map failed"

This error occurs when the newuidmap binary is missing or lacks the necessary permissions:

```bash
# Check if newuidmap is installed
which newuidmap
which newgidmap

# Check the permissions on newuidmap
ls -la $(which newuidmap)
# It should have the setuid bit: -rwsr-xr-x

# If missing, install shadow-utils
sudo apt-get install uidmap      # Debian/Ubuntu
sudo dnf install shadow-utils    # Fedora/RHEL

# Verify setuid bits are set
ls -la /usr/bin/newuidmap /usr/bin/newgidmap
# Both should show: -rwsr-xr-x

# If the setuid bit is missing, set it
sudo chmod u+s /usr/bin/newuidmap /usr/bin/newgidmap

# Test again
podman run --rm alpine id
```

## Error: "operation not permitted" During Namespace Creation

The kernel may have user namespaces disabled or restricted:

```bash
# Check if user namespaces are enabled
cat /proc/sys/user/max_user_namespaces
# Should be greater than 0 (common default: 15000)

# If it is 0, enable user namespaces
sudo sysctl -w user.max_user_namespaces=15000

# Make it permanent
echo "user.max_user_namespaces=15000" | sudo tee /etc/sysctl.d/99-userns.conf
sudo sysctl --system

# On Debian/Ubuntu, also check this kernel parameter
cat /proc/sys/kernel/unprivileged_userns_clone
# Should be 1 (enabled)

# If it is 0, enable it
sudo sysctl -w kernel.unprivileged_userns_clone=1
echo "kernel.unprivileged_userns_clone=1" | sudo tee /etc/sysctl.d/99-userns-clone.conf
```

## Error: "ERRO[0000] cannot re-exec process"

This error often relates to namespace setup failures:

```bash
# Check for detailed error output
podman --log-level=debug run --rm alpine echo test 2>&1 | head -50

# Common cause: conflicting storage from a previous configuration
# Reset Podman storage
podman system reset --force

# Recreate the storage with correct settings
podman run --rm alpine echo "Storage reset successful"

# Another cause: lock numbering changed
podman system renumber
```

## Diagnosing UID Mapping Conflicts

When multiple tools or configurations modify UID mappings, conflicts can arise:

```bash
# Check for overlapping subuid ranges
cat /etc/subuid
# Ensure no two users share the same range

# Check the actual namespace mappings Podman creates
podman unshare cat /proc/self/uid_map
podman unshare cat /proc/self/gid_map

# Verify the mapping count matches your subuid allocation
podman info --format '{{.Host.IDMappings.UIDMap}}'
podman info --format '{{.Host.IDMappings.GIDMap}}'

# If mappings look wrong, check the storage.conf
cat ~/.config/containers/storage.conf 2>/dev/null
grep -A5 "remap" /etc/containers/storage.conf
```

## Resetting After Major Changes

If you have made changes to subuid/subgid or namespace configuration, a full reset may be needed:

```bash
# Stop all containers
podman stop --all

# Reset Podman storage completely
podman system reset --force

# Migrate to apply new UID mappings
podman system migrate

# Test the fresh configuration
podman run --rm alpine sh -c "id && cat /proc/self/uid_map"
```

## Summary

User namespace issues in rootless Podman come down to three areas: subuid/subgid configuration in `/etc/subuid` and `/etc/subgid`, the presence and permissions of `newuidmap`/`newgidmap` binaries, and kernel parameters like `max_user_namespaces`. Start debugging with `podman unshare id` to test basic namespace creation, check `podman info` for ID mapping details, and use `podman --log-level=debug` for detailed error output. After any configuration changes, run `podman system migrate` to apply the new settings to existing storage.
