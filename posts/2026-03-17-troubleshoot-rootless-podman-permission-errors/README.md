# How to Troubleshoot Rootless Podman Permission Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Troubleshooting, Permission

Description: Learn how to diagnose and fix common permission errors when running rootless Podman containers.

---

> Permission errors are the most common issue with rootless Podman, usually caused by UID mapping mismatches between the container and host filesystem.

Rootless Podman uses user namespaces to remap UIDs, which can cause unexpected permission errors when accessing volumes, ports, or system resources. This guide covers the most frequent permission problems and their solutions.

---

## Error: Permission Denied on Bind Mounts

```bash
# Problem: non-root container user cannot read or write files in a bind mount

podman run --rm --user "$(id -u):$(id -g)" -v ./data:/app/data alpine:latest ls /app/data
# ls: can't open '/app/data': Permission denied

# Diagnosis: check the ownership on the host
ls -la ./data

# Fix 1: Use keep-id and run as your UID inside the container
podman run --rm --user "$(id -u):$(id -g)" --userns=keep-id -v ./data:/app/data alpine:latest ls /app/data

# Fix 2: Use podman unshare to set ownership for the container UID
podman unshare chown -R "$(id -u):$(id -g)" ./data
podman run --rm --user "$(id -u):$(id -g)" -v ./data:/app/data alpine:latest ls /app/data

# Fix 3: Relax directory permissions
chmod -R a+rX ./data
```

## Error: Cannot Bind to Privileged Ports

```bash
# Problem: rootless containers cannot bind to ports below 1024
podman run -d -p 80:80 nginx:latest
# Error: rootlessport cannot expose privileged port 80

# Fix 1: Use a non-privileged port on the host
podman run -d -p 8080:80 nginx:latest

# Fix 2: Allow unprivileged port binding (requires root to configure)
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
# Make permanent:
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee /etc/sysctl.d/podman-ports.conf
```

## Error: Could Not Get Runtime (newuidmap)

```bash
# Problem: newuidmap or newgidmap not found or not setuid
# Error: could not get runtime: exec: "newuidmap": executable file not found

# Fix: install uidmap package
# Debian/Ubuntu
sudo apt-get install uidmap

# Fedora/RHEL
sudo dnf install shadow-utils

# Verify the tools exist and have proper permissions
ls -la /usr/bin/newuidmap /usr/bin/newgidmap
# They should be setuid (s bit set)
```

## Error: No subuid/subgid Ranges

```bash
# Problem: user has no subuid/subgid allocations
# Error: cannot set up uid map: No subuid ranges found

# Check current allocations
grep "$USER" /etc/subuid
grep "$USER" /etc/subgid

# Fix: add subuid/subgid entries
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Apply changes
podman system migrate
```

## Error: Storage Layer Permission Issues

```bash
# Problem: permission errors in the storage layer
# Error: creating overlay mount: permission denied

# Fix 1: Reset storage
podman system reset

# Fix 2: Check that the storage directory has correct ownership
ls -la ~/.local/share/containers/

# Fix 3: Use the fuse-overlayfs driver
mkdir -p ~/.config/containers
cat > ~/.config/containers/storage.conf << 'EOF'
[storage]
driver = "overlay"

[storage.options.overlay]
mount_program = "/usr/bin/fuse-overlayfs"
EOF

# Install fuse-overlayfs if needed
# sudo apt-get install fuse-overlayfs  # Debian/Ubuntu
# sudo dnf install fuse-overlayfs     # Fedora/RHEL
```

## Error: Volume Ownership Mismatch

```bash
# Problem: named volume files are owned by wrong UID
podman volume create mydata
podman run --rm -v mydata:/data alpine:latest ls -la /data
# Files show unexpected ownership

# Fix: initialize the volume with ownership mapped to your host UID
podman run --rm --userns=keep-id -v mydata:/data alpine:latest chown -R "$(id -u):$(id -g)" /data

# Then run the container as that UID
podman run --rm --user "$(id -u):$(id -g)" --userns=keep-id -v mydata:/data alpine:latest ls -la /data
```

## Error: EACCES When Writing to /proc or /sys

```bash
# Problem: container tries to write to read-only kernel interfaces
# This is expected behavior in rootless mode

# Fix: if the container needs /proc or /sys write access,
# consider running with rootful Podman or adjusting the container
# to not require these writes
```

## Comprehensive Debugging Steps

```bash
# Step 1: Check if running rootless
podman info --format '{{.Host.Security.Rootless}}'

# Step 2: Verify user namespace mappings
podman unshare cat /proc/self/uid_map

# Step 3: Check subuid/subgid
grep "$USER" /etc/subuid /etc/subgid

# Step 4: Test basic container functionality
podman run --rm alpine:latest echo "Basic test passed"

# Step 5: Check SELinux labels
getenforce 2>/dev/null || echo "SELinux not available"
# If SELinux is enforcing, try with :z or :Z on volumes
podman run --rm -v ./data:/app/data:z alpine:latest ls /app/data
```

## Summary

Permission errors in rootless Podman typically stem from UID mapping mismatches, missing subuid/subgid configuration, privileged port restrictions, or storage driver issues. Use `--userns=keep-id` with `--user` for development bind mounts, `podman unshare` for fixing volume ownership, and ensure your system has proper subuid/subgid allocations and the newuidmap/newgidmap tools installed. When SELinux is active, use the `:z` or `:Z` volume options to set appropriate labels.
