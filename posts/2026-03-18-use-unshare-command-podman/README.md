# How to Use the unshare Command with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, User Namespaces, unshare, Security

Description: A hands-on guide to using podman unshare to enter the user namespace of rootless containers for debugging, fixing permissions, and managing volume ownership.

---

> "podman unshare lets you see the world the way your container sees it."

The `podman unshare` command launches a shell or runs a command inside the user namespace that rootless Podman uses for its containers. This is invaluable for understanding UID mappings, fixing volume permission problems, and debugging file ownership issues that only appear inside containers.

---

## What podman unshare Does

When you run `podman unshare`, Podman creates a new user namespace with the same UID/GID mappings used by your containers. Inside this namespace, you are root (UID 0), but on the host you remain your regular user.

```bash
# Enter the rootless Podman user namespace

podman unshare id
# Output: uid=0(root) gid=0(root) groups=0(root)

# Compare with your normal identity
id
# Output: uid=1000(youruser) gid=1000(youruser) ...

# View the UID mapping inside the namespace
podman unshare cat /proc/self/uid_map
# Output shows how UIDs are mapped between host and namespace
```

## Viewing the UID/GID Mappings

Understanding the UID mapping is key to fixing permission issues:

```bash
# Show the full UID mapping
podman unshare cat /proc/self/uid_map
# Typical output:
#          0       1000          1
#          1     100000      65536

# This means:
# Container UID 0 maps to host UID 1000 (your user)
# Container UIDs 1-65536 map to host UIDs 100000-165535

# Show the GID mapping
podman unshare cat /proc/self/gid_map

# Check what subuid ranges are configured for your user
cat /etc/subuid
# Output: youruser:100000:65536

# Check subgid ranges
cat /etc/subgid
# Output: youruser:100000:65536
```

## Fixing Volume Permission Problems

The most common use of `podman unshare` is fixing ownership on bind-mounted directories:

```bash
# Create a directory for your container
mkdir -p ~/app-data

# Check ownership from the host
ls -la ~/app-data
# Output: drwxr-xr-x youruser youruser

# Inside the container, UID 0 (root) owns this, which is fine
# But if the container runs as UID 1000, it cannot write to it

# Fix: Use podman unshare to set ownership to container UID 1000
podman unshare chown 1000:1000 ~/app-data

# Now check from the host -- it shows a high UID
ls -lan ~/app-data
# Output: drwxr-xr-x 100999 100999
# (container UID 1000 maps to host UID 100999)

# Verify from inside a container running as UID 1000
podman run --rm --user 1000:1000 -v ~/app-data:/data:Z alpine touch /data/test.txt
# This now succeeds
```

## Running Commands in the Namespace

You can run any command inside the user namespace, not just a shell:

```bash
# List files with namespace-appropriate ownership
podman unshare ls -la ~/app-data
# Shows ownership as seen by the container

# Create files owned by specific container UIDs
podman unshare sh -c "touch ~/app-data/root-file && chown 0:0 ~/app-data/root-file"
podman unshare sh -c "touch ~/app-data/app-file && chown 33:33 ~/app-data/app-file"

# Verify from the host
ls -lan ~/app-data/
# root-file owned by 1000:1000 (your user, maps to container root)
# app-file owned by 100032:100032 (maps to container UID 33, e.g., www-data)
```

## Debugging Container File Access

When a container reports "permission denied" on a file, use `podman unshare` to investigate:

```bash
# Scenario: A container cannot read a config file
podman run --rm -v ~/config:/etc/app:ro,Z alpine cat /etc/app/settings.conf
# Output: Permission denied

# Debug: Check ownership from the container perspective
podman unshare ls -la ~/config/
# This reveals the ownership as the container sees it

# Debug: Check if the file is readable
podman unshare sh -c "test -r ~/config/settings.conf && echo readable || echo not-readable"

# Fix: Adjust ownership to match what the container needs
podman unshare chown -R 0:0 ~/config/

# Or fix permissions
podman unshare chmod 644 ~/config/settings.conf
```

## Working with Complex Directory Structures

For applications with multiple directories owned by different UIDs:

```bash
# PostgreSQL example: data directory needs UID 999 (postgres user)
mkdir -p ~/pgdata

# Set ownership for the postgres container user
podman unshare chown -R 999:999 ~/pgdata

# Verify
podman unshare ls -la ~/pgdata

# Run PostgreSQL with the correctly owned directory
podman run -d --name postgres \
  -v ~/pgdata:/var/lib/postgresql/data:Z \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# Check the container started successfully
podman logs postgres | tail -5
```

## Safety Considerations

`podman unshare` is safe to use because it operates within your user namespace boundaries:

```bash
# You cannot escalate privileges beyond your subuid range
podman unshare whoami
# Output: root (but only within the namespace)

# You cannot modify files outside your permission scope
podman unshare touch /etc/test-file 2>&1
# Output: Permission denied (you are still an unprivileged user on the host)

# Inspect the user namespace Podman created for this command
podman unshare readlink /proc/self/ns/user
```

## Summary

`podman unshare` is the essential debugging tool for rootless Podman volume and permission issues. It enters the same user namespace your containers use, letting you see file ownership from the container perspective. Use `podman unshare chown` to fix bind mount permissions, `podman unshare ls -la` to diagnose ownership problems, and `podman unshare` for interactive debugging sessions. The command is safe because it operates within your user's subordinate UID/GID ranges and cannot escalate privileges on the host.
