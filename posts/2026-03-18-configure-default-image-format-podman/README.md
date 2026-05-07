# How to Configure Default Image Format in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, OCI, Docker, Image Format

Description: Learn how to configure the default image format in Podman to choose between OCI and Docker image formats for builds and pushes.

---

> Choosing between OCI and Docker image formats affects compatibility with registries and container runtimes, making the default format setting a key configuration decision.

Podman supports two container image formats: OCI (Open Container Initiative) and Docker. While both are widely supported, there are compatibility differences that matter when pushing to specific registries or working with particular tools. This guide explains how to set the default image format and when to use each option.

---

## Understanding Image Formats

Podman can build and store images in OCI or Docker format.

```bash
# Check the format setting in user configuration

grep -E '^[[:space:]]*image_default_format' ~/.config/containers/containers.conf 2>/dev/null || \
  echo "No user-level image_default_format setting found"

# Two image formats:
# OCI    - Open Container Initiative format (industry standard)
# v2s2   - Docker v2 schema 2 format (legacy but widely supported)

# Check the format of an existing image
podman pull alpine:latest
podman image inspect alpine:latest --format '{{.ManifestType}}'
```

## Setting the Default Image Format

Configure the default format in containers.conf.

```bash
# Create or update user configuration
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# Default image format for podman build
# Options: oci, v2s2, v2s1
# OCI is the standard format; v2s2 is Docker v2 schema 2
image_default_format = "oci"
EOF

# Verify the setting
podman info > /dev/null 2>&1 && echo "Config applied"
```

## Using OCI Format

Configure OCI as the default for standards-compliant images.

```bash
# Set OCI as the default format
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# OCI format is the industry standard
# Supported by all modern registries and runtimes
image_default_format = "oci"
EOF

# Build an image in OCI format
mkdir -p /tmp/oci-test
cat > /tmp/oci-test/Containerfile << 'DOCKERFILE'
FROM alpine:latest
# Simple test image
RUN echo "OCI format image" > /format.txt
CMD ["cat", "/format.txt"]
DOCKERFILE

podman build -t oci-test /tmp/oci-test/

# Verify the image format
podman image inspect oci-test --format '{{.ManifestType}}'

# Clean up
podman rmi oci-test 2>/dev/null
rm -rf /tmp/oci-test
```

## Using Docker Format

Configure Docker format for compatibility with Docker-centric tools.

```bash
# Set Docker as the default format
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# Docker v2 format for compatibility with
# older registries and Docker-specific tools
image_default_format = "v2s2"
EOF

# Build an image in Docker format
mkdir -p /tmp/docker-test
cat > /tmp/docker-test/Containerfile << 'DOCKERFILE'
FROM alpine:latest
# Simple test image in Docker format
RUN echo "Docker format image" > /format.txt
CMD ["cat", "/format.txt"]
DOCKERFILE

podman build -t docker-test /tmp/docker-test/

# Verify the image format
podman image inspect docker-test --format '{{.ManifestType}}'

# Clean up
podman rmi docker-test 2>/dev/null
rm -rf /tmp/docker-test
```

## Overriding Format Per Build

Override the default format for individual build commands.

```bash
# Set OCI as default
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
image_default_format = "oci"
EOF

# Override to Docker format for a specific build
mkdir -p /tmp/format-test
cat > /tmp/format-test/Containerfile << 'DOCKERFILE'
FROM alpine:latest
RUN echo "Format test" > /test.txt
CMD ["cat", "/test.txt"]
DOCKERFILE

# Build with explicit Docker format
podman build --format docker -t docker-override /tmp/format-test/

# Build with explicit OCI format
podman build --format oci -t oci-override /tmp/format-test/

# Compare formats
echo "Docker format:"
podman image inspect docker-override --format '{{.ManifestType}}' 2>/dev/null

echo "OCI format:"
podman image inspect oci-override --format '{{.ManifestType}}' 2>/dev/null

# Clean up
podman rmi docker-override oci-override 2>/dev/null
rm -rf /tmp/format-test
```

## Format Compatibility with Registries

Understand which registries support which formats.

```bash
# Most modern registries support both formats:
# - Docker Hub: OCI and Docker
# - Quay.io: OCI and Docker
# - GitHub Container Registry: OCI and Docker
# - Amazon ECR: OCI and Docker
# - Google Container Registry: OCI and Docker

# Some older or private registries may only support Docker format
# Test by pushing to your registry
# podman push my-image:latest registry.example.com/my-image:latest

# If push fails with format errors, try the other format
# podman push --format v2s2 my-image:latest registry.example.com/my-image:latest
# podman push --format oci my-image:latest registry.example.com/my-image:latest
```

## Converting Between Formats

Convert existing images between OCI and Docker formats.

```bash
# Build in one format and push in another
mkdir -p /tmp/convert-test
cat > /tmp/convert-test/Containerfile << 'DOCKERFILE'
FROM alpine:latest
RUN echo "Conversion test" > /test.txt
CMD ["cat", "/test.txt"]
DOCKERFILE

# Build in OCI format
podman build --format oci -t convert-test /tmp/convert-test/

# Save as Docker format using skopeo (if available)
# skopeo copy containers-storage:convert-test docker-archive:/tmp/docker-image.tar

# Push in Docker v2 schema 2 format even if built as OCI
# podman push --format v2s2 convert-test registry.example.com/convert-test:latest

# Inspect the manifest to see current format
podman image inspect convert-test --format '{{.ManifestType}}'

# Clean up
podman rmi convert-test 2>/dev/null
rm -rf /tmp/convert-test
```

## Choosing the Right Format

Select the best format for your workflow.

```bash
# Use OCI format when:
# - Building for modern container platforms (Kubernetes, Podman)
# - Pushing to registries that support OCI
# - Following industry standards
# - Building multi-architecture images

# Use Docker format when:
# - Working with older Docker-based tooling
# - Pushing to registries that only support Docker format
# - Sharing images with Docker users
# - Need Docker v2 schema 2 manifests

# Recommended default for most users:
cat > ~/.config/containers/containers.conf << 'EOF'
[engine]
# OCI is the standard; override per-build when needed
image_default_format = "oci"
EOF

# Verify
podman info > /dev/null 2>&1 && echo "Format configured"
podman run --rm alpine echo "Image format setup complete"
```

## Summary

The default image format in Podman controls whether builds produce OCI or Docker format images. Set `image_default_format` in the `[engine]` section of `containers.conf` to define your default, and override per build with `--format`. OCI format is the industry standard and recommended for most use cases, while Docker format provides compatibility with older tools and registries. Use `podman image inspect` with the `ManifestType` field to verify the format of any image.
