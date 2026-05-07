# How to Configure User-Level Settings in containers.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Rootless

Description: Learn how to configure user-level containers.conf settings to personalize Podman behavior without requiring root privileges.

---

> User-level containers.conf lets individual developers customize their Podman experience without affecting other users on the system.

Podman's rootless architecture means every user can have their own container configuration. The user-level `containers.conf` file at `~/.config/containers/containers.conf` overrides system-wide defaults and gives developers full control over their personal container environment. This guide shows you how to set up and manage user-level settings.

---

## Creating the User-Level Configuration

Set up your personal configuration file from scratch.

```bash
# Create the user configuration directory

mkdir -p ~/.config/containers

# Check if a user-level config already exists
ls -la ~/.config/containers/containers.conf 2>/dev/null || echo "No user config found"

# Create a new user-level configuration file
cat > ~/.config/containers/containers.conf << 'EOF'
# User-level Podman configuration
# Overrides system-wide settings in /etc/containers/containers.conf

[containers]
# Set timezone to match the host system
tz = "local"

# Default DNS servers for containers
dns_servers = ["8.8.8.8", "8.8.4.4"]

# Add custom environment variables to all containers
env = [
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "EDITOR=vim",
    "LANG=en_US.UTF-8"
]

[engine]
# Number of parallel image layer downloads
image_parallel_copies = 3
EOF
```

## Customizing Container Defaults

Tailor the default container behavior to your workflow.

```bash
# Add more user-level container defaults in a drop-in file
mkdir -p ~/.config/containers/containers.conf.d
cat > ~/.config/containers/containers.conf.d/99-user-container-defaults.conf << 'EOF'

[containers]
# Default cgroup settings for containers
# cgroup_conf = ["memory.high=2147483648"]

# Default process limit (0 = unlimited)
# pids_limit = 1024

# Default init process
init = false

# Default SHM size
shm_size = "65536k"
EOF
```

```bash
# Verify your settings are applied
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
print('Runtime:', info.get('host', {}).get('ociRuntime', {}).get('name', 'unknown'))
print('Log Driver:', info.get('host', {}).get('logDriver', 'unknown'))
"
```

## Configuring Engine Preferences

Set up engine-specific preferences for your user account.

```bash
# Update engine settings in your user config
cat > ~/.config/containers/containers.conf << 'EOF'
[containers]
tz = "local"
env = [
    "PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
    "EDITOR=vim"
]

[engine]
# Use crun for rootless containers (better performance)
runtime = "crun"

# Set the default image pull policy
# Options: always, missing, never
pull_policy = "missing"

# Configure event logging
events_logger = "file"

# Set the temporary directory for image copy operations
# image_copy_tmp_dir = "/tmp/podman-image-copies"

# Number of parallel copies for image pulls
image_parallel_copies = 5

[network]
# Use netavark for networking
network_backend = "netavark"
EOF
```

## Using XDG Configuration Paths

Podman respects XDG base directory specifications.

```bash
# Podman uses XDG_CONFIG_HOME for user config location
echo "XDG_CONFIG_HOME is: ${XDG_CONFIG_HOME:-$HOME/.config}"

# You can change the config location via XDG_CONFIG_HOME
# export XDG_CONFIG_HOME=/custom/path
# Then place containers.conf at $XDG_CONFIG_HOME/containers/containers.conf

# List all Podman-related user configuration files
find "${XDG_CONFIG_HOME:-$HOME/.config}/containers" -type f 2>/dev/null

# Check effective configuration
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
print('Runtime:', info.get('host', {}).get('ociRuntime', {}).get('name', 'unknown'))
print('Log Driver:', info.get('host', {}).get('logDriver', 'unknown'))
"
```

## Testing User-Level Overrides

Verify that your user settings properly override system defaults.

```bash
# Compare your settings against system defaults
echo "=== System-wide config ==="
cat /etc/containers/containers.conf 2>/dev/null | grep -v "^#" | grep -v "^$" | head -20

echo ""
echo "=== User-level config ==="
cat ~/.config/containers/containers.conf | grep -v "^#" | grep -v "^$"

# Run a container to test environment variables
podman run --rm docker.io/library/alpine:latest env | sort

# Verify the runtime being used
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
print(info.get('host', {}).get('ociRuntime', {}).get('name', 'unknown'))
"

# Check debug output for configuration loading order
podman --log-level=debug info 2>&1 | grep -i "config\|reading" | head -10
```

## Summary

User-level `containers.conf` at `~/.config/containers/containers.conf` gives individual users the power to customize Podman without root access or affecting other users. By setting container defaults, engine preferences, and network options at the user level, developers can create a personalized container workflow. These settings override system-wide defaults while respecting the XDG base directory specification.
