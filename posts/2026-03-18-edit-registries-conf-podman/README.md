# How to Edit registries.conf for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Configuration, TOML

Description: Learn how to edit the registries.conf file to control how Podman discovers, authenticates, and connects to container registries.

---

> The registries.conf file is the primary configuration file for how Podman resolves image registry names, mirrors, and registry security settings.

The `registries.conf` file is a TOML-formatted configuration file that dictates how Podman resolves image names, connects to registries, and handles mirrors and registry security settings. Editing this file correctly is essential for any non-trivial Podman deployment. This guide covers the file structure, common edits, and best practices.

---

## Locating the Configuration File

Podman checks multiple locations for the registries configuration.

```bash
# System-wide configuration (requires root to edit)

ls -la /etc/containers/registries.conf

# User-level configuration (overrides system-wide for current user)
ls -la ~/.config/containers/registries.conf

# If the user-level file does not exist, create the directory
mkdir -p ~/.config/containers
```

```bash
# Check the configured registries Podman reports
podman info --format '{{.Registries}}'
```

## Understanding the TOML Structure

The `registries.conf` file uses TOML syntax. Here is a common structure of the file with the sections you are most likely to edit.

```toml
# /etc/containers/registries.conf

# Global settings: list of registries for unqualified image names
unqualified-search-registries = ["docker.io", "quay.io"]

# Per-registry configuration block
[[registry]]
prefix = "docker.io"
location = "docker.io"
insecure = false
blocked = false

# Mirror for this registry (optional, can have multiple)
[[registry.mirror]]
location = "mirror.example.com:5000"
insecure = true

# Another registry block
[[registry]]
prefix = "private.registry.io"
location = "private.registry.io"
insecure = false
```

## Editing with a Text Editor

The simplest way to edit the file is with a text editor.

```bash
# Edit the system-wide file with sudo
sudo nano /etc/containers/registries.conf

# Or use vim
sudo vim /etc/containers/registries.conf

# For user-level changes (no sudo needed)
nano ~/.config/containers/registries.conf
```

## Making Common Edits

Here are the most common modifications you will make to registries.conf.

```bash
# Add a new registry to the unqualified search list
# Open the file and modify the line:
# Before:
# unqualified-search-registries = ["docker.io"]
# After:
# unqualified-search-registries = ["docker.io", "quay.io", "ghcr.io"]

# Use sed to update the exact one-registry example above
sudo sed -i 's/unqualified-search-registries = \["docker.io"\]/unqualified-search-registries = ["docker.io", "quay.io"]/' /etc/containers/registries.conf
```

```bash
# Append a new registry block to the end of the file
sudo tee -a /etc/containers/registries.conf <<'EOF'

[[registry]]
prefix = "myregistry.example.com"
location = "myregistry.example.com"
insecure = false
EOF
```

## Validating the Configuration

After any edit, always validate the TOML syntax.

```bash
# Install a TOML validator if not already available
pip3 install toml

# Validate the file
python3 -c "
import toml, sys
try:
    with open('/etc/containers/registries.conf') as f:
        data = toml.load(f)
    print('Valid TOML. Parsed contents:')
    for key, val in data.items():
        print(f'  {key}: {val}')
except toml.TomlDecodeError as e:
    print(f'Invalid TOML: {e}', file=sys.stderr)
    sys.exit(1)
"
```

## Creating a User-Level Override

You can override system settings without modifying the system file.

```bash
# Create a user-level registries.conf
cat > ~/.config/containers/registries.conf <<'EOF'
# User-level registry configuration
# Podman uses this file instead of /etc/containers/registries.conf for this user

unqualified-search-registries = ["ghcr.io", "docker.io"]

[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "local-cache.internal:5000"
EOF
```

```bash
# Verify Podman picks up the user-level config
podman info --format '{{.Registries}}'
```

## Backing Up Before Editing

Always create a backup before making changes.

```bash
# Create a timestamped backup
sudo cp /etc/containers/registries.conf \
  /etc/containers/registries.conf.bak.$(date +%Y%m%d%H%M%S)

# List backups to confirm
ls -la /etc/containers/registries.conf*
```

## Debugging Configuration Issues

When things go wrong, use these commands to troubleshoot.

```bash
# Check Podman's view of all registries
podman info 2>&1 | grep -i -A 30 "registries"

# Attempt a pull with debug logging to see registry resolution
podman --log-level=debug pull alpine:latest 2>&1 | head -50

# Verify the file is readable and has correct permissions
stat /etc/containers/registries.conf
```

## Summary

The `registries.conf` file is a TOML configuration file that controls Podman's registry resolution behavior. It supports system-wide and user-level configuration, per-registry configuration blocks with mirrors and security settings, and an ordered search list for unqualified image names. Always back up before editing, validate the TOML syntax after changes, and use `podman info` to confirm your configuration is active.
