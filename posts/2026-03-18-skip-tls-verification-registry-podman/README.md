# How to Skip TLS Verification for a Registry in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, TLS, Security, Development

Description: Learn how to skip TLS verification in Podman for development registries, including per-command and persistent configuration methods.

---

> Skipping TLS verification is a development convenience that should never reach production environments.

During development, you may encounter registries with expired, self-signed, or otherwise invalid TLS certificates. Podman provides options to skip TLS verification either on a per-command basis or through persistent configuration. This guide explains both approaches and emphasizes the security implications.

---

## When to Skip TLS Verification

There are limited scenarios where skipping TLS is acceptable.

```bash
# Acceptable scenarios:

# - Local development registries on localhost
# - Temporary testing against staging registries
# - Initial setup before proper certificates are in place
# - CI/CD pipelines with internal registries

# NEVER skip TLS verification for:
# - Production registries
# - Public registries (Docker Hub, Quay.io, etc.)
# - Registries accessible over the public internet
```

## Per-Command TLS Skip

The `--tls-verify=false` flag disables TLS verification for a single command.

```bash
# Pull an image without TLS verification
podman pull --tls-verify=false dev-registry.local:5000/myapp:latest

# Push an image without TLS verification
podman push --tls-verify=false dev-registry.local:5000/myapp:latest

# Login without TLS verification
podman login --tls-verify=false dev-registry.local:5000

# Build and push without TLS verification
podman build -t dev-registry.local:5000/myapp:latest .
podman push --tls-verify=false dev-registry.local:5000/myapp:latest
```

## Persistent Configuration in registries.conf

Mark a registry as insecure in the configuration file to avoid repeating the flag.

```bash
# Back up the existing configuration
sudo cp /etc/containers/registries.conf /etc/containers/registries.conf.bak

# Add insecure registry configuration
sudo tee -a /etc/containers/registries.conf <<'EOF'

# Development registry - skip TLS verification
[[registry]]
prefix = "dev-registry.local:5000"
location = "dev-registry.local:5000"
insecure = true
EOF
```

```bash
# Now pulls work without the --tls-verify flag
podman pull dev-registry.local:5000/myapp:latest

# Pushes also work without the flag
podman push dev-registry.local:5000/myapp:latest
```

## User-Level Configuration

Configure insecure registries for rootless Podman without root access.

```bash
# Create user-level configuration
mkdir -p ~/.config/containers

cat > ~/.config/containers/registries.conf <<'EOF'
unqualified-search-registries = ["docker.io"]

# Development registries with TLS verification disabled
[[registry]]
prefix = "localhost:5000"
location = "localhost:5000"
insecure = true

[[registry]]
prefix = "dev-registry.local:5000"
location = "dev-registry.local:5000"
insecure = true
EOF
```

## Skipping TLS for Mirrors Only

You can skip TLS for a mirror while keeping it enabled for the primary registry.

```toml
# /etc/containers/registries.conf

[[registry]]
prefix = "registry.example.com"
location = "registry.example.com"
insecure = false

# Local mirror without TLS
[[registry.mirror]]
location = "local-cache:5000"
insecure = true
```

## Using with Skopeo and Buildah

The TLS skip also works with other container tools.

```bash
# Skip TLS with skopeo (image inspection and copying)
skopeo inspect --tls-verify=false \
  docker://dev-registry.local:5000/myapp:latest

# Copy an image between registries, skipping TLS on the source
skopeo copy --src-tls-verify=false \
  docker://dev-registry.local:5000/myapp:latest \
  docker://production-registry.com/myapp:latest

# Skip TLS with buildah
buildah push --tls-verify=false \
  myapp:latest docker://dev-registry.local:5000/myapp:latest
```

## Environment Variable Approach

Some CI/CD systems use environment variables to control TLS behavior.

```bash
# Set the container registries configuration via environment
export CONTAINERS_REGISTRIES_CONF=/tmp/dev-registries.conf

# Create a temporary config that marks registries as insecure
cat > /tmp/dev-registries.conf <<'EOF'
unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "dev-registry.local:5000"
location = "dev-registry.local:5000"
insecure = true
EOF

# Podman will now use this configuration
podman pull dev-registry.local:5000/myapp:latest
```

## CI/CD Pipeline Example

A complete example for CI/CD environments.

```bash
#!/bin/bash
# ci-build-push.sh - Build and push with TLS skip for dev registry

set -euo pipefail

DEV_REGISTRY="dev-registry.local:5000"
IMAGE_NAME="myapp"
IMAGE_TAG="${CI_COMMIT_SHA:-latest}"

# Build the image
echo "Building ${IMAGE_NAME}:${IMAGE_TAG}..."
podman build -t "${DEV_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}" .

# Push to development registry (TLS verification skipped)
echo "Pushing to development registry..."
podman push --tls-verify=false \
  "${DEV_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Image pushed: ${DEV_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
```

## Verifying TLS Status

Check whether TLS verification is being skipped.

```bash
# Use debug logging to see TLS verification status
podman --log-level=debug pull dev-registry.local:5000/myapp:latest 2>&1 | \
  grep -i "tls\|insecure\|verify"

# Check the effective configuration
podman info --format '{{.Registries}}'

# Test if a registry has valid TLS
openssl s_client -connect dev-registry.local:5000 -servername dev-registry.local </dev/null 2>&1 | \
  grep -i "verify"
```

## Migrating Away from Insecure Registries

When ready to add proper TLS, follow these steps.

```bash
# Generate or obtain a proper certificate for the registry
# Then add it to Podman's certificate directory
sudo mkdir -p /etc/containers/certs.d/dev-registry.local:5000
sudo cp /path/to/new-ca.crt /etc/containers/certs.d/dev-registry.local:5000/ca.crt

# Update registries.conf to remove insecure flag
sudo sed -i 's/insecure = true/insecure = false/' /etc/containers/registries.conf

# Test with TLS verification enabled
podman pull dev-registry.local:5000/myapp:latest
```

## Summary

Podman provides two ways to skip TLS verification: the `--tls-verify=false` flag for per-command use and the `insecure = true` setting in `registries.conf` for persistent configuration. The per-command flag is safer because it does not persist and makes the security exception explicit. Always plan to migrate to proper TLS certificates and remove insecure settings before moving to production. Use debug logging to verify how Podman handles TLS for your registries.
