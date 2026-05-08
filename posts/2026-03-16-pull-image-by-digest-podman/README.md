# How to Pull an Image by Digest with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Security

Description: Learn how to pull container images by their SHA256 digest with Podman to guarantee immutable, reproducible image deployments.

---

> Pulling images by digest guarantees you get the exact same image every time, regardless of tag changes.

Container image tags are mutable. A tag like `latest` or even `v1.0` can be overwritten to point to a different image at any time. Pulling by digest eliminates this risk by referencing the image's unique cryptographic hash. This guide shows you how to find and use image digests with Podman.

---

## What Is an Image Digest

An image digest is a SHA256 hash of the image manifest. It uniquely identifies a specific image and cannot be changed without altering the image itself.

```bash
# A digest looks like this:

# sha256:a3ed95caeb02236b4eb4c6e1... (64 hex characters)

# The full reference format is:
# registry/namespace/image@sha256:<hash>
```

## Finding an Image Digest

There are several ways to find the digest of an image.

```bash
# Method 1: Pull the image first and check the digest
podman pull nginx:1.25
podman inspect nginx:1.25 --format '{{.Digest}}'

# Method 2: Use skopeo to inspect without pulling
skopeo inspect docker://docker.io/library/nginx:1.25 | grep -i digest

# Method 3: Check digests of locally stored images
podman images --digests

# Method 4: Use podman manifest inspect for multi-arch images
podman manifest inspect docker.io/library/nginx:1.25 | grep digest
```

## Pulling an Image by Digest

Once you have the digest, use it in place of the tag.

```bash
# Pull nginx by its digest
podman pull docker.io/library/nginx@sha256:a484819eb60211f5299034ac80f6a681b06f89e65866ce91f356ed7c72af059c

# Pull alpine by digest
podman pull docker.io/library/alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b

# Pull from Quay.io by digest
podman pull quay.io/prometheus/prometheus@sha256:c0b857aead0d5793aa566adb8f49a9983d6f6031652098759d521a330cfa050f
```

## Verifying the Digest After Pull

Always verify that the pulled image matches the expected digest.

```bash
# Pull by digest
podman pull docker.io/library/nginx@sha256:a484819eb60211f5299034ac80f6a681b06f89e65866ce91f356ed7c72af059c

# Verify the digest matches
podman inspect docker.io/library/nginx@sha256:a484819eb60211f5299034ac80f6a681b06f89e65866ce91f356ed7c72af059c \
  --format '{{range .RepoDigests}}{{println .}}{{end}}' | \
  grep 'docker.io/library/nginx@sha256:a484819eb60211f5299034ac80f6a681b06f89e65866ce91f356ed7c72af059c'
```

## Comparing Tag and Digest Pulls

Understanding the difference between tag-based and digest-based pulls.

```bash
# Tag-based pull: mutable, can change over time
podman pull nginx:1.25
# This might give you a different image tomorrow if the tag is updated

# Digest-based pull: immutable, always the same image
podman pull docker.io/library/nginx@sha256:a484819eb60211f5299034ac80f6a681b06f89e65866ce91f356ed7c72af059c
# This will always give you the exact same image

# You can also combine tag and digest for readability
podman pull docker.io/library/nginx:1.25@sha256:a484819eb60211f5299034ac80f6a681b06f89e65866ce91f356ed7c72af059c
```

## Using Digests in Containerfiles

Pin your base images to digests in Containerfiles for reproducible builds.

```bash
# Create a Containerfile with a digest-pinned base image
cat > Containerfile << 'EOF'
FROM docker.io/library/nginx@sha256:a484819eb60211f5299034ac80f6a681b06f89e65866ce91f356ed7c72af059c

COPY ./html /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Build the image
podman build -t my-nginx:v1 .
```

## Scripting Digest-Based Pulls

Automate digest retrieval and pinning in your CI/CD pipelines.

```bash
#!/bin/bash
# Script to get the digest of an image and pull by digest

IMAGE="docker.io/library/nginx"
TAG="1.25"

# Get the digest using skopeo
DIGEST=$(skopeo inspect "docker://${IMAGE}:${TAG}" \
  --format '{{.Digest}}' 2>/dev/null)

if [ -z "$DIGEST" ]; then
  echo "Error: Could not retrieve digest for ${IMAGE}:${TAG}"
  exit 1
fi

echo "Pulling ${IMAGE}@${DIGEST}"
podman pull "${IMAGE}@${DIGEST}"

# Save the digest for future reference
echo "${IMAGE}@${DIGEST}" >> pinned-images.txt
echo "Digest saved to pinned-images.txt"
```

## Listing Images with Their Digests

View digests for all your local images.

```bash
# Show all images with digests
podman images --digests

# Show digest for a specific image
podman images --digests --filter reference=nginx

# Format output to show only name and digest
podman images --digests --format "{{.Repository}}:{{.Tag}} {{.Digest}}"
```

## Summary

Pulling images by digest with Podman is the most reliable way to ensure you are running exactly the image you expect. Use digests in production Containerfiles, CI/CD pipelines, and deployment manifests to achieve truly reproducible builds. While tags are convenient for development, digests provide the immutability guarantees that production workloads require.
