# How to Configure containers.conf for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, containers.conf

Description: Learn how to configure the containers.conf file to customize Podman behavior for container runtime, engine, and network settings.

---

> containers.conf is the central configuration file that controls how Podman creates and manages containers across your system.

Podman uses `containers.conf` as its primary configuration file to define default behaviors for container creation, execution, and networking. Understanding this file is essential for anyone who wants to fine-tune their container environment beyond the defaults. This guide walks you through the structure, locations, and key settings of `containers.conf`.

---

## Understanding the File Hierarchy

Podman reads `containers.conf` from multiple locations, with later files overriding earlier ones.

```bash
# Check configuration loading with debug output

podman --log-level=debug info 2>&1 | grep -i containers.conf

# The search order (lowest to highest priority):
# 1. /usr/share/containers/containers.conf   (vendor/package defaults)
# 2. /etc/containers/containers.conf          (system-wide admin overrides)
# 3. /etc/containers/containers.conf.d/*.conf (system-wide drop-ins)
# 4. /etc/containers/containers.rootless.conf and rootless drop-ins
# 5. $XDG_CONFIG_HOME/containers/containers.conf
#    (or ~/.config/containers/containers.conf when XDG_CONFIG_HOME is unset)
# 6. $XDG_CONFIG_HOME/containers/containers.conf.d/*.conf
#    (or ~/.config/containers/containers.conf.d/*.conf when XDG_CONFIG_HOME is unset)
```

```bash
# View detailed active Podman system information
podman info --format json | python3 -m json.tool
```

## Exploring the File Structure

The `containers.conf` file uses TOML format and is divided into several sections.

```bash
# Create a user-level configuration file
mkdir -p ~/.config/containers

# Generate a skeleton containers.conf with comments
cat > ~/.config/containers/containers.conf << 'EOF'
# Podman containers.conf - User-level configuration

# [containers] - Settings for container creation
[containers]

# Default environment variables applied to every container
# env = ["PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"]

# Default timezone inside containers
# tz = "local"

# [engine] - Settings for the container engine
[engine]

# Container runtime to use (crun or runc)
# runtime = "crun"

# [network] - Network-related defaults
[network]

# Default network backend (netavark or cni)
# network_backend = "netavark"
EOF
```

## Key Sections Explained

Each section controls a different aspect of Podman behavior.

```bash
# Inspect active settings related to common containers.conf sections
# The [containers] section controls container creation defaults
podman info --format '{{.Host.LogDriver}}'

# The [engine] section controls the Podman engine itself
podman info --format '{{.Host.OCIRuntime.Name}}'

# The [network] section controls networking defaults
podman info --format '{{.Host.NetworkBackend}}'
```

```bash
# A practical example: set crun as the default runtime
mkdir -p ~/.config/containers/containers.conf.d

cat > ~/.config/containers/containers.conf.d/99-runtime.conf << 'EOF'

[engine]
# Use crun for better performance and lower memory usage
runtime = "crun"

# Set the number of parallel image pulls
image_parallel_copies = 5
EOF
```

## Validating Your Configuration

Always verify your configuration changes are applied correctly.

```bash
# Check for syntax errors by running podman info
podman info > /dev/null 2>&1 && echo "Configuration is valid" || echo "Configuration has errors"

# View the effective runtime setting
podman info --format '{{.Host.OCIRuntime.Name}}'

# Run a test container to verify settings
podman run --rm alpine echo "Configuration working"

# If something goes wrong, check with debug logging
podman --log-level=debug info 2>&1 | head -50
```

## Backing Up and Restoring Configuration

Keep your configuration safe and reproducible.

```bash
# Back up current user configuration
cp ~/.config/containers/containers.conf ~/.config/containers/containers.conf.backup

# Restore from backup if needed
cp ~/.config/containers/containers.conf.backup ~/.config/containers/containers.conf

# Compare your config against system defaults
diff /usr/share/containers/containers.conf ~/.config/containers/containers.conf
```

## Summary

The `containers.conf` file is Podman's primary configuration mechanism, using a layered TOML format with vendor, system, rootless, and user-level files. By understanding the file hierarchy and key sections - containers, engine, and network - you can customize Podman to fit your exact workflow. Always validate changes with `podman info` and keep backups of working configurations.
