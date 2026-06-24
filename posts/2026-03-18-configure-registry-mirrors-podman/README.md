# How to Configure Registry Mirrors in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Mirror, Caching

Description: Learn how to set up registry mirrors in Podman to improve pull performance, enable offline access, and add redundancy to your container workflow.

---

> Registry mirrors reduce pull times and provide fallback options when the primary registry is slow or unavailable.

Registry mirrors are alternate locations that host copies of container images from a primary registry. Configuring mirrors in Podman allows you to pull images from a local cache or a geographically closer server, improving speed and reliability. For offline use, the mirror must already contain the images you need. This guide explains how to set up and manage registry mirrors.

---

## How Mirrors Work in Podman

When you configure a mirror for a registry, Podman tries the mirror first. If the mirror does not have the image or is unreachable, Podman falls back to the primary registry location.

```toml
# /etc/containers/registries.conf

# The mirror is tried first, then the primary location

[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "mirror.example.com:5000"
```

## Setting Up a Local Mirror

A common use case is running a local registry mirror to cache images from Docker Hub.

```bash
# Start a local registry as a pull-through cache
podman run -d \
  --name registry-mirror \
  -p 5000:5000 \
  -e REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io \
  -v mirror-data:/var/lib/registry \
  docker.io/library/registry:2

# Verify the mirror is running
curl -s http://localhost:5000/v2/_catalog
```

## Configuring the Mirror in registries.conf

Point Podman to your local mirror for Docker Hub images.

```bash
# Back up current configuration
sudo cp /etc/containers/registries.conf /etc/containers/registries.conf.bak

# Edit the configuration
sudo tee /etc/containers/registries.conf <<'EOF'
unqualified-search-registries = ["docker.io"]

[[registry]]
prefix = "docker.io"
location = "docker.io"

# Local pull-through cache mirror
[[registry.mirror]]
location = "localhost:5000"
insecure = true
EOF
```

## Configuring Multiple Mirrors

Podman supports multiple mirrors per registry. They are tried in order.

```toml
# /etc/containers/registries.conf

[[registry]]
prefix = "docker.io"
location = "docker.io"

# First mirror: local cache (fastest)
[[registry.mirror]]
location = "local-cache.internal:5000"
insecure = true

# Second mirror: regional cache
[[registry.mirror]]
location = "regional-mirror.example.com:5000"
insecure = false

# If both mirrors fail, Podman falls back to docker.io
```

## Mirrors for Multiple Registries

You can configure mirrors for different registries independently.

```toml
# /etc/containers/registries.conf

unqualified-search-registries = ["docker.io", "quay.io"]

# Docker Hub with a mirror
[[registry]]
prefix = "docker.io"
location = "docker.io"

[[registry.mirror]]
location = "dockerhub-cache.internal:5000"
insecure = true

# Quay.io with a mirror
[[registry]]
prefix = "quay.io"
location = "quay.io"

[[registry.mirror]]
location = "quay-cache.internal:5000"
insecure = true
```

## Testing Mirror Configuration

Verify that Podman uses the mirror when pulling images.

```bash
# Pull an image with debug logging to see which registry is contacted
podman --log-level=debug pull docker.io/library/alpine:latest 2>&1 | grep -i "mirror\|trying\|pulling"

# Check if the image was cached in the local mirror
curl -s http://localhost:5000/v2/_catalog

# List tags for a cached image
curl -s http://localhost:5000/v2/library/alpine/tags/list
```

## Mirror with TLS Configuration

For production mirrors using TLS, configure certificates.

```bash
# Create the certificate directory for the mirror
sudo mkdir -p /etc/containers/certs.d/mirror.example.com:5000

# Copy the CA certificate
sudo cp /path/to/mirror-ca.crt \
  /etc/containers/certs.d/mirror.example.com:5000/ca.crt
```

```toml
# /etc/containers/registries.conf

[[registry]]
prefix = "docker.io"
location = "docker.io"

# Production mirror with TLS
[[registry.mirror]]
location = "mirror.example.com:5000"
insecure = false
```

## Disabling Fallback to Primary

If you want Podman to only use the local registry and never fall back to the primary registry, configure the local registry as the registry location instead of as a mirror.

```toml
# /etc/containers/registries.conf

# Air-gapped environment: remap docker.io references to the local registry
[[registry]]
prefix = "docker.io"
location = "local-mirror.internal:5000"
```

## Summary

Registry mirrors in Podman provide faster image pulls, offline capability for cached images, and redundancy. You configure them in `registries.conf` as mirror blocks under a registry entry. Podman tries mirrors in order and falls back to the primary location if all mirrors fail. For production, use TLS-enabled mirrors and verify your configuration with debug-level logging.
