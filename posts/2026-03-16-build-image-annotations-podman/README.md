# How to Build an Image with Annotations with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Build, Annotation, OCI

Description: Learn how to add OCI annotations to container images with Podman for enhanced metadata, registry integration, and image management.

---

> Annotations provide OCI-standard metadata at the manifest level, complementing labels for richer image documentation.

While labels are stored in the image configuration, annotations are stored in the OCI manifest and image index. Annotations are the OCI-standard way to attach metadata to images and are supported by registries and tooling that understand the OCI image specification. Podman supports adding annotations during builds when writing images in OCI format. This guide covers the differences from labels and practical annotation patterns.

---

## Annotations vs Labels

Annotations and labels serve similar purposes but are stored differently and have different scopes.

- **Labels** are stored in the image configuration (config blob). They are available through image and container inspection via `podman inspect`.
- **Annotations** are stored in the OCI manifest or image index. They are available when querying a registry, before pulling the image.

```bash
# Labels: image configuration metadata visible through inspect commands

# Annotations: manifest metadata visible at the registry level
```

## Adding Annotations During Build

Use the `--annotation` flag with `podman build`.

```bash
# Add annotations during build
podman build \
  --annotation "org.opencontainers.image.description=My production web server" \
  --annotation "org.opencontainers.image.version=1.0.0" \
  --annotation "org.opencontainers.image.authors=Dev Team" \
  -t myapp:v1.0.0 .
```

## OCI Standard Annotation Keys

The OCI image specification defines standard annotation keys.

```bash
podman build \
  --annotation "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --annotation "org.opencontainers.image.authors=Dev Team <dev@example.com>" \
  --annotation "org.opencontainers.image.url=https://example.com" \
  --annotation "org.opencontainers.image.documentation=https://docs.example.com" \
  --annotation "org.opencontainers.image.source=https://github.com/myorg/myapp" \
  --annotation "org.opencontainers.image.version=1.0.0" \
  --annotation "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
  --annotation "org.opencontainers.image.vendor=My Organization" \
  --annotation "org.opencontainers.image.title=My Application" \
  --annotation "org.opencontainers.image.description=A production-ready web application" \
  --annotation "org.opencontainers.image.licenses=Apache-2.0" \
  -t myapp:v1.0.0 .
```

## Inspecting Annotations

View annotations on a built image.

```bash
# Inspect image manifest annotations
podman inspect myapp:v1.0.0 --format '{{json .Annotations}}' | python3 -m json.tool

# View the manifest directly
podman manifest inspect myapp:v1.0.0 2>/dev/null || \
  skopeo inspect --raw containers-storage:localhost/myapp:v1.0.0 | python3 -m json.tool
```

## Annotations on Manifest Lists

Annotations are especially useful on multi-architecture manifest lists.

```bash
# Create a manifest list with annotations on the image index itself
podman manifest create \
  --annotation "org.opencontainers.image.version=1.0.0" \
  myapp:multi

# Build for each platform
podman build --platform linux/amd64 -t myapp:amd64 .
podman build --platform linux/arm64 -t myapp:arm64 .

# Add images to manifest with annotations
podman manifest add \
  --annotation "org.opencontainers.image.title=My App (amd64)" \
  myapp:multi myapp:amd64

podman manifest add \
  --annotation "org.opencontainers.image.title=My App (arm64)" \
  myapp:multi myapp:arm64

# Inspect the annotated manifest
podman manifest inspect myapp:multi
```

## Custom Annotations

Define your own annotation keys using a reverse domain name prefix.

```bash
podman build \
  --annotation "com.example.build.pipeline-id=12345" \
  --annotation "com.example.build.trigger=push" \
  --annotation "com.example.build.branch=main" \
  --annotation "com.example.security.scan-status=passed" \
  --annotation "com.example.security.scan-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --annotation "com.example.compliance.approved-by=security-team" \
  -t myapp:v1.0.0 .
```

## Combining Annotations and Labels

Use both annotations and labels for comprehensive metadata.

```bash
cat > Containerfile << 'EOF'
FROM docker.io/library/python:3.12-slim

# Labels for runtime metadata
LABEL maintainer="dev@example.com"
LABEL app.version="1.0.0"

WORKDIR /app
COPY . .
CMD ["python", "app.py"]
EOF

# Annotations for registry/manifest metadata
podman build \
  --annotation "org.opencontainers.image.version=1.0.0" \
  --annotation "org.opencontainers.image.source=https://github.com/myorg/myapp" \
  --annotation "org.opencontainers.image.revision=$(git rev-parse HEAD)" \
  -t myapp:v1.0.0 .
```

## Registry-Level Annotation Queries

Some registries allow querying annotations without pulling images.

```bash
# Query image metadata from a registry using skopeo
skopeo inspect docker://registry.example.com/myapp:v1.0.0 | python3 -m json.tool

# Query just the annotations
skopeo inspect --raw docker://registry.example.com/myapp:v1.0.0 | \
  python3 -c "import sys,json; m=json.load(sys.stdin); print(json.dumps(m.get('annotations',{}), indent=2))"
```

## Automated Annotation Script

Apply standard annotations automatically in every build.

```bash
#!/bin/bash
# annotated-build.sh

set -e

IMAGE="${1:?Usage: $0 IMAGE [TAG]}"
TAG="${2:-latest}"

podman build \
  --annotation "org.opencontainers.image.created=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --annotation "org.opencontainers.image.revision=$(git rev-parse HEAD 2>/dev/null || echo unknown)" \
  --annotation "org.opencontainers.image.version=${TAG}" \
  --annotation "org.opencontainers.image.title=${IMAGE}" \
  --annotation "org.opencontainers.image.source=$(git remote get-url origin 2>/dev/null || echo local)" \
  -t "${IMAGE}:${TAG}" \
  .

echo "Built ${IMAGE}:${TAG} with annotations"
```

## Supply Chain Annotations

Use annotations for software supply chain tracking.

```bash
podman build \
  --annotation "org.opencontainers.image.base.name=docker.io/library/python:3.12-slim" \
  --annotation "org.opencontainers.image.base.digest=sha256:abc123..." \
  --annotation "com.example.sbom.format=spdx" \
  --annotation "com.example.sbom.url=https://sbom.example.com/myapp/v1.0.0" \
  --annotation "com.example.signature.url=https://sigs.example.com/myapp/v1.0.0.sig" \
  -t myapp:v1.0.0 .
```

## Summary

Annotations extend image metadata beyond what labels provide by storing information in the OCI manifest, making it queryable at the registry level without pulling the full image. Use OCI standard annotation keys for interoperability, custom annotations with your domain prefix for organization-specific metadata, and combine both annotations and labels for comprehensive image documentation. Automate annotation application in your build scripts to maintain consistent metadata across all your container images.
