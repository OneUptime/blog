# How to Configure System-Wide Settings in containers.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, System Administration

Description: Learn how to configure system-wide Podman settings in containers.conf that apply to all users on the host machine.

---

> System-wide settings in containers.conf let administrators provide consistent container defaults across every user on the system.

When managing a multi-user environment or a shared development server, you need container settings that apply uniformly. The system-wide `containers.conf` file at `/etc/containers/containers.conf` lets administrators define defaults that are read for all users unless a later configuration file overrides them. This guide covers how to create, modify, and manage these global settings.

---

## Locating the System-Wide Configuration

System-wide settings live in a specific path and require root privileges to edit.

```bash
# Check if a system-wide configuration file already exists

ls -la /etc/containers/containers.conf 2>/dev/null || echo "No system-wide config found"

# View the vendor-supplied defaults (read-only reference)
ls -la /usr/share/containers/containers.conf

# Create the system-wide configuration directory if needed
sudo mkdir -p /etc/containers
```

```bash
# Copy the vendor defaults as a starting point
sudo cp /usr/share/containers/containers.conf /etc/containers/containers.conf

# Set proper ownership and permissions
sudo chown root:root /etc/containers/containers.conf
sudo chmod 644 /etc/containers/containers.conf
```

## Configuring Global Container Defaults

Set defaults that apply to all containers created by any user.

```bash
# Edit the system-wide configuration
sudo tee /etc/containers/containers.conf > /dev/null << 'EOF'
# System-wide Podman configuration
# Applied to all users on this host

[containers]
# Set default timezone to match host
tz = "local"

# Default environment variables for all containers
env = [
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "TERM=xterm-256color"
]

# Default ulimits for all containers
default_ulimits = [
    "nofile=65536:65536",
    "nproc=4096:4096"
]

# Enable container logging
log_driver = "journald"

# Set default stop timeout (seconds)
stop_timeout = 30

[engine]
# Use crun as the default runtime for all users
runtime = "crun"

# Default image pull policy
pull_policy = "missing"

# Enable parallel image layer pulls
image_parallel_copies = 5

[network]
# Use netavark as the network backend
network_backend = "netavark"

# Default subnet for container networks
default_subnet = "10.88.0.0/16"
EOF
```

## Setting Security Defaults

System-wide configurations are useful for setting security defaults.

```bash
# Add security-related settings in a drop-in file
sudo mkdir -p /etc/containers/containers.conf.d/
sudo tee /etc/containers/containers.conf.d/50-security.conf > /dev/null << 'EOF'
[containers]
# Drop all capabilities and add only what is needed
default_capabilities = [
    "CHOWN",
    "DAC_OVERRIDE",
    "FOWNER",
    "FSETID",
    "KILL",
    "NET_BIND_SERVICE",
    "SETFCAP",
    "SETGID",
    "SETPCAP",
    "SETUID",
    "SYS_CHROOT"
]

# Disable privileged containers by default
# Users must explicitly request privileged mode
privileged = false
EOF
```

```bash
# Verify security settings are applied
podman run --rm alpine cat /proc/self/status | grep -i cap
```

## Verifying System-Wide Settings

Confirm that the global configuration is being read correctly.

```bash
# Verify the runtime setting
podman info --format '{{.Host.OCIRuntime.Name}}'

# Verify the log driver
podman info --format '{{.Host.LogDriver}}'

# Verify the network backend
podman info --format '{{.Host.NetworkBackend}}'

# Run a test container to confirm environment variables
podman run --rm alpine env | grep TERM
```

```bash
# Test that settings apply to all users
# Switch to another user and verify
sudo -u testuser podman info --format '{{.Host.OCIRuntime.Name}}'
```

## Managing Configuration Precedence

Understand how system-wide settings interact with user-level overrides.

```bash
# User-level configs take precedence over system-wide
# To see what a specific user is using:
podman --log-level=debug info 2>&1 | grep "Reading"

# Use a system drop-in directory for settings that should override
# earlier system-wide files
sudo mkdir -p /etc/containers/containers.conf.d/

# Create a late system-wide drop-in configuration
sudo tee /etc/containers/containers.conf.d/99-runtime.conf > /dev/null << 'EOF'
[engine]
# Prefer crun runtime for all users
runtime = "crun"
EOF
```

## Summary

System-wide `containers.conf` settings at `/etc/containers/containers.conf` provide administrators with centralized defaults for Podman behavior. By configuring global defaults for security, networking, and runtime options, you ensure consistency across your environment. Remember that user-level configurations can override these defaults, so `containers.conf` is not a policy enforcement mechanism by itself.
