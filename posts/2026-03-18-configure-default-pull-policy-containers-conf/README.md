# How to Configure Default Pull Policy in containers.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Image Management

Description: Learn how to configure the default image pull policy in containers.conf to control when Podman downloads container images.

---

> The pull policy setting determines whether Podman fetches images from a registry or uses locally cached versions, directly affecting build speed and consistency.

Every time you run a container, Podman decides whether to pull the image from a registry or use a local copy. The pull policy controls this behavior and has a significant impact on workflow speed, network usage, and image freshness. This guide explains each pull policy option and how to configure it in `containers.conf`.

---

## Understanding Pull Policies

Podman supports three default pull policy options in `containers.conf`. The `podman run` and `podman create` `--pull` flag also supports `newer` as a per-command option.

```bash
# Check the current default pull policy

podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
print('Current pull policy:', info.get('host', {}).get('pullPolicy', 'not set'))
"

# The containers.conf pull_policy options:
# always  - Always pull the image from the registry
# missing - Only pull if the image is not in local storage (default)
# never   - Never pull; fail if image is not local
#
# The --pull flag also supports:
# newer   - Pull if the registry has a newer version
```

## Setting the Pull Policy

Configure the default pull policy in your containers.conf file.

```bash
# Create or update user-level configuration
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# Default pull policy for all podman run and podman create commands
# Options: always, missing, never
pull_policy = "missing"
EOF
```

```bash
# Verify the setting is applied
podman info 2>/dev/null | grep -i pull
```

## Using "missing" Policy

The `missing` policy only pulls images that are not already cached locally.

```bash
# Set pull policy to "missing"
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# Only pull if the image does not exist locally
# This is the fastest option for repeated runs
pull_policy = "missing"
EOF

# First run pulls the image
podman pull alpine:latest

# Subsequent runs use the cached image without network access
podman run --rm alpine echo "Using cached image"

# Check when the image was last pulled
podman image inspect alpine:latest --format '{{.Created}}'
```

## Using "always" Policy

The `always` policy ensures you always have the latest image.

```bash
# Set pull policy to "always"
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# Always pull the latest version from the registry
# Best for CI/CD where you need the freshest images
pull_policy = "always"
EOF

# Every run now checks the registry first
podman run --rm alpine echo "Always pulling latest"

# This ensures you get security patches immediately
# but increases network usage and startup time
```

## Using "newer" Per Command

The `newer` policy provides a balance between freshness and speed when used with the `--pull` flag.

```bash
# This checks the registry but only downloads if changed.
# An image is considered newer when the remote digest differs.
podman run --pull=newer --rm alpine echo "Checking for newer version"

# Ideal for development environments where you want
# fresh images without always downloading unchanged layers
```

## Using "never" Policy

The `never` policy works entirely offline with pre-pulled images.

```bash
# Set pull policy to "never"
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# Never pull from registry - use only local images
# Fails if the image is not already cached
pull_policy = "never"
EOF

# Pre-pull images you need
podman pull alpine:latest
podman pull nginx:latest

# Runs will only use locally available images
podman run --rm alpine echo "Using local image only"

# This will FAIL if the image is not local
podman run --rm nonexistent:latest echo "This will fail" 2>&1 || echo "Expected failure: image not found locally"
```

## Overriding the Policy Per Command

You can override the default policy on individual commands.

```bash
# Set a conservative default
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
pull_policy = "missing"
EOF

# Override per command using the --pull flag
podman run --pull=always --rm alpine echo "Forced pull"
podman run --pull=never --rm alpine echo "No pull allowed"
podman run --pull=newer --rm alpine echo "Pull only if newer"

# The --pull flag always overrides containers.conf
# This lets you set a sensible default and override when needed
```

## Choosing the Right Policy

Select the best policy based on your environment.

```bash
# For development (fast iteration, less network)
# pull_policy = "missing"

# For CI/CD (always get latest security patches)
# pull_policy = "always"

# For staging (balance freshness and speed)
# pull_policy = "missing"
# Use --pull=newer when you want an explicit registry freshness check

# For air-gapped environments (no network access)
# pull_policy = "never"

# Verify your current policy works as expected
podman run --rm alpine echo "Pull policy test successful"
```

## Summary

The pull policy in `containers.conf` controls when Podman fetches images from registries. Choose `missing` for fast local development, `always` for CI/CD pipelines that need the latest images, or `never` for air-gapped environments. You can always override the default per command using the `--pull` flag, including `--pull=newer` when you want a registry freshness check, making it safe to set a conservative default in your configuration.
