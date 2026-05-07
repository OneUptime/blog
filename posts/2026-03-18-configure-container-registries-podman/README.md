# How to Configure Container Registries in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Configuration

Description: A comprehensive guide to configuring container registries in Podman, covering system-wide and user-level settings for pulling and pushing images.

---

> Properly configured registries are the foundation of a reliable container workflow in Podman.

Container registries are remote storage locations where container images are hosted and distributed. Podman supports multiple registries out of the box and allows fine-grained control over which registries to use and how to resolve image names. This guide walks you through the essentials of configuring container registries in Podman.

---

## Understanding Registry Configuration Files

Podman reads registry configuration from TOML files. There are two primary locations where these files live.

```bash
# System-wide configuration (applies to all users)

/etc/containers/registries.conf

# User-level override (applies only to the current user)
~/.config/containers/registries.conf
```

You can inspect which configuration Podman is currently using with the following command.

```bash
# Display the effective registries configuration
podman info --format '{{.Registries}}'
```

## Viewing Current Registry Settings

Before making changes, review the current state of your registry configuration.

```bash
# Show all configured registries in detail
podman info | grep -A 20 registries

# List the unqualified search registries
podman info --format '{{index .Registries "search"}}'
```

## Configuring Unqualified Search Registries

When you pull an image without specifying a full registry path (e.g., `podman pull nginx`), Podman uses short-name resolution and may search through a list of registries in order. You configure this in `registries.conf`.

```toml
# /etc/containers/registries.conf

# Define the list of registries to search when an image name
# does not include a registry prefix
unqualified-search-registries = ["docker.io", "quay.io", "ghcr.io"]
```

```bash
# Test the search order by pulling an unqualified image
podman pull nginx
# If no short-name alias or prompt changes the resolution,
# Podman uses docker.io first, then quay.io, then ghcr.io
```

## Adding a Specific Registry

You can add per-registry configuration blocks for detailed control over how Podman interacts with each registry.

```toml
# /etc/containers/registries.conf

# Configure a specific registry with a custom prefix
[[registry]]
prefix = "docker.io"
location = "docker.io"

# Configure another registry
[[registry]]
prefix = "quay.io"
location = "quay.io"
```

## Configuring Registry Mirrors

Mirrors allow you to pull images from an alternate location, which is useful for caching or air-gapped environments.

```toml
# /etc/containers/registries.conf

[[registry]]
prefix = "docker.io"
location = "docker.io"

# Add a local mirror that Podman will try first
[[registry.mirror]]
location = "mirror.local:5000"
```

## Blocking Unwanted Registries

You can prevent Podman from pulling images from specific registries by blocking them.

```toml
# /etc/containers/registries.conf

# Block a registry entirely
[[registry]]
prefix = "untrusted-registry.example.com"
blocked = true
```

```bash
# Verify the registry is blocked by attempting a pull
podman pull untrusted-registry.example.com/someimage:latest
# This will fail with a blocked registry error
```

## Applying and Validating Changes

After editing the configuration file, validate your changes.

```bash
# Validate the TOML syntax of registries.conf
python3 -c "
import toml
with open('/etc/containers/registries.conf') as f:
    config = toml.load(f)
    print('Configuration is valid')
    print(config)
"

# Verify changes are picked up by Podman
podman info --format '{{.Registries}}'

# Test pulling from a configured registry
podman pull docker.io/library/alpine:latest
```

## Resetting to Default Configuration

If you need to start fresh, you can restore the default configuration.

```bash
# Back up the current configuration
sudo cp /etc/containers/registries.conf /etc/containers/registries.conf.bak

# Reinstall the default configuration (Fedora/RHEL)
sudo dnf reinstall containers-common

# Alternatively, create a minimal default configuration
sudo tee /etc/containers/registries.conf <<EOF
unqualified-search-registries = ["docker.io", "quay.io"]
EOF
```

## Summary

Configuring container registries in Podman is done through the `registries.conf` file, which supports system-wide and user-level overrides. You can define search order for unqualified image names, add mirrors for faster pulls, and block untrusted registries. Always validate your TOML configuration after making changes and test with a pull command to confirm everything works as expected.
