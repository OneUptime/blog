# How to Override Default Container Engine Settings in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Engine Settings

Description: Learn how to override Podman's default container engine settings including runtime, image handling, and event logging.

---

> Overriding Podman's engine defaults lets you optimize performance, change runtimes, and control how containers are managed on your system.

The `[engine]` section of `containers.conf` controls Podman's core behavior - from which OCI runtime it uses to how it handles images and events. By overriding these defaults, you can tune Podman for development speed, production stability, or resource-constrained environments. This guide covers the most important engine settings and how to change them.

---

## Understanding Engine Defaults

Start by examining the current engine configuration.

```bash
# View current engine settings

podman info --format '{{.Host.OCIRuntime.Name}}'
podman info --format '{{.Host.EventLogger}}'

# See all host-level information including engine details
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
host = info.get('host', {})
print('OCI Runtime:', host.get('ociRuntime', {}).get('name'))
print('CGroup Manager:', host.get('cgroupManager'))
print('Event Logger:', host.get('eventLogger'))
print('Security:', host.get('security', {}).get('rootless'))
"
```

## Changing the OCI Runtime

Switch between container runtimes for different use cases.

```bash
# Check which runtimes are available on your system
which crun 2>/dev/null && echo "crun is available"
which runc 2>/dev/null && echo "runc is available"

# Check runtime versions
crun --version 2>/dev/null
runc --version 2>/dev/null
```

```bash
# Override the default runtime in user config
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# Switch to crun for better rootless performance
# crun is written in C and uses less memory than runc
runtime = "crun"

# You can also define custom runtime paths
[engine.runtimes]
# Define custom runtime locations if not in PATH
# crun = ["/usr/local/bin/crun"]
# runc = ["/usr/local/bin/runc"]
EOF

# Verify the runtime change
podman info --format '{{.Host.OCIRuntime.Name}}'
```

## Configuring Image Handling

Control how Podman handles image pulls and storage.

```bash
# Update engine settings for image handling
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
runtime = "crun"

# Pull policy: always, missing, never
# "missing" only pulls if the image is not in local storage
pull_policy = "missing"

# Number of parallel layer downloads during pull
image_parallel_copies = 5

# Default image format for builds
# Options: oci, v2s2, v2s1
image_default_format = "oci"

# Default transport for image operations
# image_default_transport = "docker://"
EOF
```

```bash
# Test the pull policy setting
# With "missing", this only downloads if not cached
podman pull alpine

# With "always", this would re-download every time
# podman pull --pull=always alpine
```

## Configuring Event Logging

Choose how Podman logs container events.

```bash
# Configure the event logging system
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
runtime = "crun"
pull_policy = "missing"
image_parallel_copies = 5
image_default_format = "oci"

# Event logger options: file, journald, none
# "file" works for rootless users without journald access
events_logger = "file"

# Maximum size of the events log file (in bytes)
# events_logfile_max_size = "1000000"
EOF
```

```bash
# Verify the events logger setting
podman info --format '{{.Host.EventLogger}}'

# View recent events
podman events --since 1h --stream=false 2>/dev/null | tail -5
```

## Configuring CGroup Management

Set the cgroup manager for resource control.

```bash
# Add cgroup manager configuration
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
runtime = "crun"
pull_policy = "missing"
image_parallel_copies = 5
image_default_format = "oci"
events_logger = "file"

# CGroup manager: systemd or cgroupfs
# "systemd" is recommended for systems with systemd
cgroup_manager = "systemd"
EOF
```

```bash
# Verify cgroup manager
podman info --format '{{.Host.CgroupManager}}'

# Test resource limits with the configured cgroup manager
podman run --rm --memory=256m alpine free -m
```

## Setting Miscellaneous Engine Options

Fine-tune additional engine behaviors.

```bash
# Complete engine configuration example
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# OCI runtime
runtime = "crun"

# Image handling
pull_policy = "missing"
image_parallel_copies = 5

# Event logging
events_logger = "file"

# CGroup management
cgroup_manager = "systemd"

# Temporary directory for container operations
# tmp_dir = "/tmp/podman"

# Stop timeout for containers (seconds)
stop_timeout = 10

# Lock type: file or shm
# lock_type = "file"

# Number of locks (must be power of 2)
# num_locks = 2048

# Static directory for persistent container data
# static_dir = "/home/user/.local/share/containers/storage/libpod"

# Volume directory
# volume_path = "/home/user/.local/share/containers/storage/volumes"
EOF

# Verify the full configuration
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
host = info.get('host', {})
print('Runtime:', host.get('ociRuntime', {}).get('name'))
print('CGroup Manager:', host.get('cgroupManager'))
print('Event Logger:', host.get('eventLogger'))
"
```

## Summary

Podman's engine settings control the core behavior of the container runtime, from which OCI runtime is used to how images are pulled and events are logged. By overriding these defaults in `containers.conf`, you can optimize Podman for your specific use case - whether that means faster rootless containers with crun, controlled image pulling, or file-based event logging. Always verify changes with `podman info` after modifying engine settings.
