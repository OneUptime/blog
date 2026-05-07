# How to Use containers.conf.d Drop-In Configuration Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Drop-In Files, Modular Configuration

Description: Learn how to use containers.conf.d drop-in directories to organize Podman configuration into modular, purpose-specific files.

---

> Drop-in configuration files in containers.conf.d let you organize Podman settings into modular files that are merged automatically, making configuration manageable and version-controllable.

Instead of maintaining a single monolithic `containers.conf`, Podman supports drop-in directories where individual `.conf` files are loaded and merged in alphabetical order. This modular approach simplifies configuration management, enables purpose-specific settings, and makes it easy to enable or disable features without editing a main file.

---

## Understanding Drop-In Directories

Podman reads drop-in files from specific directories.

```bash
# Drop-in directory locations (processed in order):

# 1. /etc/containers/containers.conf.d/              (system-wide drop-ins)
# 2. /etc/containers/containers.rootless.conf.d/     (rootless system drop-ins)
# 3. /etc/containers/containers.rootless.conf.d/$UID/ (per-user rootless system drop-ins)
# 4. ~/.config/containers/containers.conf.d/         (user-level drop-ins)

# Check if drop-in directories exist
ls -la /etc/containers/containers.conf.d/ 2>/dev/null
ls -la /etc/containers/containers.rootless.conf.d/ 2>/dev/null
ls -la ~/.config/containers/containers.conf.d/ 2>/dev/null

# Files are loaded in alphabetical order within each directory
# Later files override settings from earlier files
# Use numeric prefixes for ordering: 01-base.conf, 02-network.conf
```

## Creating User-Level Drop-In Files

Set up modular configuration for your user account.

```bash
# Create the user-level drop-in directory
mkdir -p ~/.config/containers/containers.conf.d

# Create a base configuration drop-in
cat > ~/.config/containers/containers.conf.d/01-base.conf << 'EOF'
# Base container settings
[containers]
tz = "local"
env = [
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "TERM=xterm-256color"
]
EOF

# Create a network configuration drop-in
cat > ~/.config/containers/containers.conf.d/02-network.conf << 'EOF'
# Network settings
[network]
network_backend = "netavark"
dns_servers = ["8.8.8.8", "8.8.4.4"]
EOF

# Create an engine configuration drop-in
cat > ~/.config/containers/containers.conf.d/03-engine.conf << 'EOF'
# Engine settings
[engine]
runtime = "crun"
pull_policy = "missing"
image_parallel_copies = 5
EOF

# List all drop-in files
ls -la ~/.config/containers/containers.conf.d/
```

## Creating System-Wide Drop-In Files

Administrators can deploy system-wide modular configurations.

```bash
# Create system-wide drop-in directory
sudo mkdir -p /etc/containers/containers.conf.d

# Create a security policy drop-in
sudo tee /etc/containers/containers.conf.d/01-security.conf > /dev/null << 'EOF'
# Security policy for all users
[containers]
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
EOF

# Create a logging policy drop-in
sudo tee /etc/containers/containers.conf.d/02-logging.conf > /dev/null << 'EOF'
# Logging policy for all users
[containers]
log_driver = "k8s-file"
log_size_max = 10485760
EOF

# Create a resource limits drop-in
sudo tee /etc/containers/containers.conf.d/03-limits.conf > /dev/null << 'EOF'
# Resource limits for all users
[containers]
default_ulimits = [
    "nofile=65536:65536",
    "nproc=4096:8192"
]
EOF
```

## Organizing Configuration by Purpose

Structure drop-in files for clarity and maintainability.

```bash
# Recommended naming convention:
# XX-purpose.conf where XX is a two-digit priority number

# Example directory structure:
# ~/.config/containers/containers.conf.d/
#   01-base.conf         # Basic container defaults
#   02-engine.conf       # Engine and runtime settings
#   03-network.conf      # Network configuration
#   04-security.conf     # Security policies
#   05-proxy.conf        # Proxy settings (if needed)
#   10-development.conf  # Development-specific overrides

# Create a development-specific drop-in
cat > ~/.config/containers/containers.conf.d/10-development.conf << 'EOF'
# Development environment overrides
[containers]
env = [
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "TERM=xterm-256color",
    "NODE_ENV=development"
]

[engine]
# Faster pulls during development
image_parallel_copies = 10
EOF
```

## Enabling and Disabling Configurations

Toggle configurations without deleting files.

```bash
# Disable a drop-in by renaming it (remove .conf extension)
mv ~/.config/containers/containers.conf.d/05-proxy.conf \
   ~/.config/containers/containers.conf.d/05-proxy.conf.disabled 2>/dev/null

# Re-enable by restoring the .conf extension
# mv ~/.config/containers/containers.conf.d/05-proxy.conf.disabled \
#    ~/.config/containers/containers.conf.d/05-proxy.conf

# Only files ending in .conf are loaded
# This makes it easy to toggle features on and off

# Create a proxy config that can be easily toggled
cat > ~/.config/containers/containers.conf.d/05-proxy.conf.disabled << 'EOF'
# Proxy settings (rename to .conf to enable)
[containers]
http_proxy = true
env = [
    "HTTP_PROXY=http://proxy.example.com:8080",
    "HTTPS_PROXY=http://proxy.example.com:8080",
    "NO_PROXY=localhost,127.0.0.1"
]
EOF

# List active and disabled configurations
echo "=== Active configs ==="
ls ~/.config/containers/containers.conf.d/*.conf 2>/dev/null

echo ""
echo "=== Disabled configs ==="
ls ~/.config/containers/containers.conf.d/*.disabled 2>/dev/null
```

## Verifying Drop-In Configuration

Confirm that drop-in files are being loaded and merged correctly.

```bash
# Check configuration loading in debug output
podman --log-level=debug info 2>&1 | grep -E "Merged|Reading configuration|containers.conf"

# Verify specific settings from drop-in files
podman info --format '{{.Host.OCIRuntime.Name}}'
podman info --format '{{.Host.NetworkBackend}}'

# Debug configuration loading
podman --log-level=debug info 2>&1 | grep -i "reading\|config\|drop" | head -15

# Test with a container
podman run --rm alpine env | grep -E "TERM|NODE_ENV"
```

## Merge Order and Precedence

Understand how drop-in files are merged.

```bash
# Merge order (lowest to highest priority):
# 1. /usr/share/containers/containers.conf                 (vendor defaults)
# 2. /etc/containers/containers.conf                       (system admin config)
# 3. /etc/containers/containers.conf.d/*                   (system admin drop-ins)
# 4. /etc/containers/containers.rootless.conf              (rootless system config)
# 5. /etc/containers/containers.rootless.conf.d/*          (rootless system drop-ins)
# 6. /etc/containers/containers.rootless.conf.d/$UID/*     (per-user rootless system drop-ins)
# 7. ~/.config/containers/containers.conf                  (user config)
# 8. ~/.config/containers/containers.conf.d/*              (user drop-ins)

# Within each directory, files are loaded alphabetically
# Use numeric prefixes to control order

# Example: System admin can provide defaults that users may override
# with their own user-level containers.conf or drop-ins

# Verify the effective configuration
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
host = info.get('host', {})
print('Runtime:', host.get('ociRuntime', {}).get('name'))
print('Network:', host.get('networkBackend'))
print('Log Driver:', host.get('logDriver'))
"
```

## Summary

Drop-in configuration files in `containers.conf.d` directories provide a modular approach to Podman configuration. Organize settings by purpose with numbered prefixes for ordering, and disable configurations by simply renaming files. Drop-in files follow the same TOML format as `containers.conf` and are merged in alphabetical order within each directory level. This approach is ideal for version control, team collaboration, and managing multiple environments.
