# How to Publish Execution Environments to a Container Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Execution Environments, Container Registry, Docker, Podman

Description: Push your Ansible Execution Environment images to container registries like Docker Hub, Quay.io, and private registries for team-wide use.

---

Once you have built an Ansible Execution Environment, the next step is to publish it so your team, CI/CD pipelines, and AWX/Tower can pull and use it. Publishing means pushing the container image to a registry, whether that is a public one like Docker Hub or Quay.io, or a private registry running in your infrastructure. This post covers the full process from tagging to pushing, including authentication, multi-architecture builds, and versioning strategies.

## Choosing a Registry

You have several options for hosting your EE images:

- **Quay.io** - Red Hat's container registry, commonly used for Ansible-related images
- **Docker Hub** - The most widely known public registry
- **GitHub Container Registry (ghcr.io)** - Integrated with GitHub Actions
- **Amazon ECR** - AWS's container registry
- **Azure Container Registry** - Azure's registry offering
- **Harbor** - Popular open-source private registry
- **Nexus/Artifactory** - Enterprise artifact managers with container support

The choice depends on your infrastructure. For teams already using AWS, ECR makes sense. For GitHub-based workflows, ghcr.io is convenient. For Ansible-focused teams, Quay.io is the natural choice.

## Authenticating with the Registry

Before pushing, authenticate with your chosen registry.

For Quay.io:

```bash
# Login to Quay.io
podman login quay.io
# Enter your username and password when prompted

# Or use a robot account token (better for automation)
podman login quay.io --username="myorg+cibot" --password="TOKEN_HERE"
```

For Docker Hub:

```bash
# Login to Docker Hub
podman login docker.io
```

For GitHub Container Registry:

```bash
# Login to ghcr.io using a personal access token
echo $GITHUB_TOKEN | podman login ghcr.io --username myuser --password-stdin
```

For Amazon ECR:

```bash
# Login to ECR (requires AWS CLI configured)
aws ecr get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com
```

For a private registry:

```bash
# Login to a private registry
podman login registry.internal.example.com
```

## Tagging Your Image

Proper tagging is essential for version management. Tag your EE with both a version number and "latest":

```bash
# Build with a specific tag
ansible-builder build --tag my-ee:2.1.0

# Add the registry prefix
podman tag my-ee:2.1.0 quay.io/myorg/ansible-ee:2.1.0
podman tag my-ee:2.1.0 quay.io/myorg/ansible-ee:latest

# Also tag with the short version for convenience
podman tag my-ee:2.1.0 quay.io/myorg/ansible-ee:2.1
podman tag my-ee:2.1.0 quay.io/myorg/ansible-ee:2
```

Or build directly with the full registry path:

```bash
# Build with the full registry tag from the start
ansible-builder build --tag quay.io/myorg/ansible-ee:2.1.0
```

## Pushing to the Registry

Once tagged, push the image:

```bash
# Push all tags for the image
podman push quay.io/myorg/ansible-ee:2.1.0
podman push quay.io/myorg/ansible-ee:latest
podman push quay.io/myorg/ansible-ee:2.1
podman push quay.io/myorg/ansible-ee:2
```

Verify the push succeeded:

```bash
# Check that the image is in the registry
podman search quay.io/myorg/ansible-ee

# Pull it back to verify
podman pull quay.io/myorg/ansible-ee:2.1.0
```

## Versioning Strategy

A good versioning strategy makes it easy to update EEs without breaking existing workflows.

I use semantic versioning combined with a build metadata tag:

```bash
# Version format: MAJOR.MINOR.PATCH
# MAJOR: Ansible core version change, major collection updates
# MINOR: New collections added, minor version bumps
# PATCH: Bug fixes, security patches

# Tag with full version
podman tag my-ee:latest quay.io/myorg/ansible-ee:2.1.3

# Tag with minor version (points to latest patch)
podman tag my-ee:latest quay.io/myorg/ansible-ee:2.1

# Tag with major version (points to latest minor)
podman tag my-ee:latest quay.io/myorg/ansible-ee:2

# Tag with latest
podman tag my-ee:latest quay.io/myorg/ansible-ee:latest

# Tag with build date for traceability
podman tag my-ee:latest quay.io/myorg/ansible-ee:2.1.3-20240215
```

## Automating with a Build Script

Here is a bash script that builds, tags, and pushes an EE:

```bash
#!/bin/bash
# build-and-push.sh - Build and publish an Execution Environment

set -euo pipefail

# Configuration
REGISTRY="quay.io"
ORG="myorg"
IMAGE_NAME="ansible-ee"
VERSION="${1:?Usage: $0 VERSION}"
BUILD_DATE=$(date +%Y%m%d)

FULL_IMAGE="${REGISTRY}/${ORG}/${IMAGE_NAME}"

echo "Building Execution Environment ${FULL_IMAGE}:${VERSION}"

# Build the image
ansible-builder build \
  --tag "${FULL_IMAGE}:${VERSION}" \
  --verbosity 2

# Apply additional tags
MAJOR=$(echo "${VERSION}" | cut -d. -f1)
MINOR=$(echo "${VERSION}" | cut -d. -f1-2)

podman tag "${FULL_IMAGE}:${VERSION}" "${FULL_IMAGE}:${MINOR}"
podman tag "${FULL_IMAGE}:${VERSION}" "${FULL_IMAGE}:${MAJOR}"
podman tag "${FULL_IMAGE}:${VERSION}" "${FULL_IMAGE}:latest"
podman tag "${FULL_IMAGE}:${VERSION}" "${FULL_IMAGE}:${VERSION}-${BUILD_DATE}"

# Push all tags
for TAG in "${VERSION}" "${MINOR}" "${MAJOR}" "latest" "${VERSION}-${BUILD_DATE}"; do
  echo "Pushing ${FULL_IMAGE}:${TAG}"
  podman push "${FULL_IMAGE}:${TAG}"
done

echo "All tags pushed successfully"

# Verify by listing remote tags
echo "Verifying remote tags..."
skopeo list-tags "docker://${FULL_IMAGE}" | head -20
```

Make it executable and run it:

```bash
chmod +x build-and-push.sh
./build-and-push.sh 2.1.0
```

## CI/CD Pipeline Integration

Automate the build and publish process in your CI/CD pipeline. Here is a GitHub Actions workflow:

```yaml
# .github/workflows/build-ee.yml
name: Build and Publish Execution Environment

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version tag'
        required: true

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install ansible-builder
        run: pip install ansible-builder

      - name: Determine version
        id: version
        run: |
          if [ "${{ github.event_name }}" = "push" ]; then
            echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT
          else
            echo "version=${{ github.event.inputs.version }}" >> $GITHUB_OUTPUT
          fi

      - name: Login to Quay.io
        run: |
          echo "${{ secrets.QUAY_PASSWORD }}" | \
            podman login quay.io --username "${{ secrets.QUAY_USERNAME }}" --password-stdin

      - name: Build Execution Environment
        run: |
          ansible-builder build \
            --tag quay.io/myorg/ansible-ee:${{ steps.version.outputs.version }} \
            --verbosity 2

      - name: Tag and push
        run: |
          VERSION="${{ steps.version.outputs.version }}"
          IMAGE="quay.io/myorg/ansible-ee"

          podman tag "${IMAGE}:${VERSION}" "${IMAGE}:latest"
          podman push "${IMAGE}:${VERSION}"
          podman push "${IMAGE}:latest"
```

## Using skopeo for Registry Operations

skopeo is a useful tool for inspecting and managing container images without pulling them:

```bash
# Install skopeo
sudo dnf install -y skopeo

# Inspect a remote image
skopeo inspect docker://quay.io/myorg/ansible-ee:latest

# List tags in a repository
skopeo list-tags docker://quay.io/myorg/ansible-ee

# Copy an image between registries without pulling locally
skopeo copy \
  docker://quay.io/myorg/ansible-ee:2.1.0 \
  docker://registry.internal.example.com/ansible/ee:2.1.0

# Delete an image from a registry
skopeo delete docker://quay.io/myorg/ansible-ee:old-version
```

## Image Signing

For production environments, sign your images to verify their integrity:

```bash
# Sign an image using cosign
cosign sign --key cosign.key quay.io/myorg/ansible-ee:2.1.0

# Verify the signature
cosign verify --key cosign.pub quay.io/myorg/ansible-ee:2.1.0
```

## Adding Labels and Metadata

Include useful metadata in your EE images:

```yaml
# execution-environment.yml - With labels
---
version: 3

images:
  base_image:
    name: quay.io/ansible/ansible-runner:latest

additional_build_steps:
  append_final:
    - LABEL org.opencontainers.image.title="Production Ansible EE"
    - LABEL org.opencontainers.image.description="Execution Environment for production deployments"
    - LABEL org.opencontainers.image.version="2.1.0"
    - LABEL org.opencontainers.image.vendor="MyOrg"
    - LABEL org.opencontainers.image.source="https://github.com/myorg/ansible-ee"
    - LABEL org.opencontainers.image.created="2024-02-15T10:00:00Z"

dependencies:
  galaxy: requirements.yml
  python: requirements.txt
  system: bindep.txt
```

These labels show up when you inspect the image and help with tracking and auditing.

## Wrapping Up

Publishing your Execution Environments to a container registry is what turns a local build into a shared team resource. Pick a registry that fits your infrastructure, establish a versioning strategy from day one, and automate the build-tag-push cycle in your CI/CD pipeline. Use semantic versioning so consumers can pin to a major or minor version and get updates without manual intervention. And always verify that the pushed image works by pulling it back and running a test playbook.
