# How to Configure Default Volumes in containers.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Volumes, Storage

Description: Learn how to configure default volume mounts in containers.conf so specific directories are automatically mounted in every Podman container.

---

> Default volumes in containers.conf automatically mount directories into every container, eliminating repetitive volume flags and ensuring consistent data access.

When you frequently need the same directories mounted across containers, specifying `-v` flags on every command becomes tedious. The `containers.conf` file allows you to define default volumes that are automatically mounted in every container. This guide shows how to configure, manage, and troubleshoot default volume settings.

---

## Setting Default Volumes

Define volumes that are automatically mounted in all containers.

```bash
# Create user-level configuration

mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
# Default volumes mounted in every container
# Format: "host_path:container_path:options"
volumes = [
    "/etc/localtime:/etc/localtime:ro"
]
EOF

# These volumes will be mounted in every container automatically
podman run --rm alpine ls -la /etc/localtime
```

## Mounting Common Directories

Configure mounts for frequently used directories.

```bash
# Set up shared data directories on the host
mkdir -p ~/shared-data
mkdir -p ~/container-logs

# Configure default volumes for development
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
volumes = [
    # Sync timezone with host (read-only)
    "/etc/localtime:/etc/localtime:ro",

    # Shared data directory accessible by all containers
    # Replace with your actual home directory path
    # "$HOME/shared-data:/shared-data:rw"
]
EOF

# Verify the mounts are applied
podman run --rm alpine ls /etc/localtime
```

## Understanding Volume Options

Each volume definition supports several mount options.

```bash
# Volume format: "source:destination:options"
# Options include:
#   ro     - Read-only mount
#   rw     - Read-write mount (default)
#   z      - Shared SELinux label
#   Z      - Private SELinux label
#   U      - Chown the source to match the container UID/GID mapping

# Example with multiple options
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
volumes = [
    # Read-only timezone sync
    "/etc/localtime:/etc/localtime:ro",

    # Read-only host information
    "/etc/hostname:/etc/host_hostname:ro"
]
EOF

# Verify read-only mount prevents writes
podman run --rm alpine sh -c 'cat /etc/localtime > /dev/null && echo "Read successful"'
podman run --rm alpine sh -c 'echo test > /etc/localtime 2>&1' || echo "Write correctly blocked (read-only)"
```

## Configuring Volumes for Development Workflows

Set up development-friendly volume defaults.

```bash
# Create development directories
mkdir -p ~/dev/projects
mkdir -p ~/dev/configs

# Configure volumes for development
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
volumes = [
    # Timezone synchronization
    "/etc/localtime:/etc/localtime:ro"
]

# Note: For development project mounts, it is better to use
# explicit -v flags per container rather than global defaults
# to avoid security issues with mounting project code into
# every container including untrusted ones
EOF
```

```bash
# For project-specific mounts, use podman run -v instead
podman run --rm -v ~/dev/projects:/workspace:Z alpine ls /workspace

# Or use podman-compose with volume definitions
# This is safer than global volume defaults
```

## Combining Default and Runtime Volumes

Default volumes work alongside runtime volume flags.

```bash
# Set minimal default volumes
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
volumes = [
    "/etc/localtime:/etc/localtime:ro"
]
EOF

# Create the host path before using it as a bind mount
mkdir -p /tmp/test-data

# Runtime volumes are ADDED to default volumes (not replacing them)
podman run --rm -v /tmp/test-data:/data alpine sh -c '
    echo "=== Default mount ==="
    ls /etc/localtime
    echo "=== Runtime mount ==="
    test -d /data && echo "/data mount present"
'

# List all mounts in a running container
podman run --rm -v /tmp/test-data:/data alpine mount | grep -E "localtime|data"
```

## Troubleshooting Volume Issues

Debug common problems with default volume configurations.

```bash
# Check if default volumes are being applied
podman run --rm alpine mount

# Debug volume mount issues with verbose output
podman --log-level=debug run --rm alpine ls / 2>&1 | grep -i "volume\|mount" | head -10

# Common issues:
# 1. Source path does not exist on host
ls -la /etc/localtime 2>/dev/null || echo "Source path missing"

# 2. SELinux label conflicts (on SELinux systems)
# Use :z or :Z options to relabel
# :z = shared label (multiple containers can access)
# :Z = private label (only one container can access)

# 3. Permission issues with rootless Podman
# Use :U option to chown the source to match the container UID/GID mapping
mkdir -p /tmp/test
podman run --rm -v /tmp/test:/data:U alpine ls -la /data

# Verify your configuration file syntax
podman info > /dev/null 2>&1 && echo "Config syntax OK" || echo "Config has errors"
```

## Summary

Default volumes in `containers.conf` automatically mount specified directories into every container, saving time on repetitive volume flags. Use them for system files like timezone data and hostname, but avoid mounting sensitive directories globally. Runtime `-v` flags add to (rather than replace) default volumes, giving you flexibility. Keep default volumes minimal and read-only where possible, using explicit runtime mounts for project-specific data.
