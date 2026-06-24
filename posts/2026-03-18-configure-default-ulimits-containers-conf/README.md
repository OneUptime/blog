# How to Configure Default Ulimits in containers.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Resource Limit, Ulimit

Description: Learn how to configure default ulimits in containers.conf to set resource limits like file descriptors and process counts for all Podman containers.

---

> Default ulimits in containers.conf ensure every container starts with appropriate resource limits, helping prevent containers from exhausting system resources.

Container resource limits (ulimits) control how many file descriptors and other per-process resources a container can use. Setting sensible defaults in `containers.conf` protects your host system while ensuring containers have enough resources to function. This guide covers configuring ulimits for various workloads.

---

## Understanding Ulimits

Ulimits define soft and hard resource limits for containers.

```bash
# View current default ulimits in Podman

podman run --rm alpine sh -c 'ulimit -a'

# Key ulimit types:
# nofile  - Maximum open file descriptors
# nproc   - Maximum number of processes available to a user
# memlock - Maximum locked memory (bytes)
# core    - Maximum core file size
# stack   - Maximum stack size
# as      - Maximum address space
```

## Setting Default Ulimits

Configure default ulimits in containers.conf.

```bash
# Create or update user-level configuration
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
# Default ulimits for all containers
# Format: "type=soft:hard"
# soft = default limit, hard = maximum limit
default_ulimits = [
    "nofile=65536:65536",
    "core=0:0"
]
EOF

# Verify the ulimits are applied
podman run --rm alpine sh -c 'ulimit -n && ulimit -c'
```

## Configuring File Descriptor Limits

Set appropriate limits for applications that open many files.

```bash
# Configure high file descriptor limits for database workloads
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
default_ulimits = [
    # High file descriptor limit for databases and web servers
    # Soft limit: 65536, Hard limit: 65536
    "nofile=65536:65536",
    "core=0:0"
]
EOF

# Test with a container that needs many file descriptors
podman run --rm alpine sh -c '
    echo "Open files soft limit: $(ulimit -Sn)"
    echo "Open files hard limit: $(ulimit -Hn)"
'

# Podman currently uses 1048576 for nofile when nofile is unset,
# unless overridden in containers.conf or capped by the rootless user's hard limit
```

## Configuring Process Limits

Control the maximum number of processes per container with the pids cgroup limit.

```bash
# Set a pids limit to prevent fork bombs
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
pids_limit = 4096
default_ulimits = [
    "nofile=65536:65536",
    # Limit core dump size (0 = disabled)
    "core=0:0"
]
EOF

# Verify the configured pids limit and related ulimits
podman run --rm alpine cat /sys/fs/cgroup/pids.max

podman run --rm alpine sh -c '
    echo "Core dump size: $(ulimit -c)"
'
```

## Configuring Memory Limits

Set memory-related ulimits for memory-intensive workloads.

```bash
# Configure memory-related ulimits
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
default_ulimits = [
    "nofile=65536:65536",
    # Maximum locked memory in bytes (64MB)
    "memlock=67108864:67108864",
    # Maximum stack size in bytes (8MB)
    "stack=8388608:8388608"
]
EOF

# Verify memory limits
podman run --rm alpine sh -c '
    echo "Locked memory: $(ulimit -l) KB"
    echo "Stack size: $(ulimit -s) KB"
'
```

## Workload-Specific Ulimit Profiles

Different workloads require different ulimit configurations.

```bash
# Web server / API workload profile
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
# Balanced profile for web applications
pids_limit = 4096
default_ulimits = [
    "nofile=65536:65536",
    "core=0:0"
]
EOF

# For database workloads, you might want even higher limits
# Override per container at runtime:
podman run --rm --ulimit nofile=131072:131072 alpine sh -c 'ulimit -n'

# For batch processing jobs with strict limits:
podman run --rm --pids-limit 256 --ulimit nofile=1024:2048 alpine sh -c '
    echo "Files: $(ulimit -n)"
    echo "PIDs limit: $(cat /sys/fs/cgroup/pids.max)"
'
```

## Overriding Ulimits at Runtime

Override default ulimits for specific containers.

```bash
# Set conservative defaults in config
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
pids_limit = 512
default_ulimits = [
    "nofile=1024:4096"
]
EOF

# Override for a database container that needs more resources
podman run --rm \
    --ulimit nofile=65536:65536 \
    --pids-limit 4096 \
    alpine sh -c '
        echo "File descriptors: $(ulimit -n)"
        echo "PIDs limit: $(cat /sys/fs/cgroup/pids.max)"
    '

# Override for a minimal container with strict limits
podman run --rm \
    --ulimit nofile=256:256 \
    --pids-limit 64 \
    alpine sh -c '
        echo "File descriptors: $(ulimit -n)"
        echo "PIDs limit: $(cat /sys/fs/cgroup/pids.max)"
    '
```

## Troubleshooting Ulimit Issues

Debug common problems with ulimit configurations.

```bash
# Check if ulimits are being applied from config
podman run --rm alpine sh -c 'ulimit -a' 2>&1

# Verify the host system limits
ulimit -a

# If container ulimits are lower than expected, check host limits
echo "Host nofile limit: $(ulimit -n)"

# Debug with verbose Podman output
podman --log-level=debug run --rm alpine sh -c 'ulimit -n' 2>&1 | grep -i ulimit | head -5

# Verify configuration syntax
podman info > /dev/null 2>&1 && echo "Config valid" || echo "Config error"
```

## Summary

Default ulimits in `containers.conf` set resource boundaries for all containers, protecting the host from resource exhaustion while ensuring containers have enough resources. Configure `nofile` for file-heavy workloads, `pids_limit` to limit processes per container, and `memlock` for memory-intensive applications. Use the `--ulimit` flag to override ulimits for specific containers, and `--pids-limit` to override the container pids limit. In rootless mode, make sure requested ulimits fit within the current user's hard limits.
