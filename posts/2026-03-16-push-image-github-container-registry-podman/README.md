# How to Push an Image to GitHub Container Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, GitHub, GHCR, Registry

Description: Learn how to push container images to GitHub Container Registry (ghcr.io) using Podman, including personal access token authentication and GitHub Actions integration.

---

> GitHub Container Registry integrates container images directly with your GitHub repositories, making it a natural choice for GitHub-hosted projects.

GitHub Container Registry (GHCR) provides free container image hosting tightly integrated with GitHub repositories, organizations, and permissions. Podman works seamlessly with GHCR for building and pushing container images. This guide covers authentication, tagging, pushing, and integrating with GitHub Actions.

---

## Prerequisites

You need a GitHub account with a personal access token (PAT) that has the appropriate scopes.

```bash
# Create a Personal Access Token (classic) at:

# https://github.com/settings/tokens
# Required scopes for pushing: write:packages
# Add read:packages for pulling private images or reading metadata
# Add delete:packages only if you need to delete images
```

## Authenticating with GHCR

Log in to ghcr.io using your GitHub credentials.

```bash
# Interactive login with your GitHub username and PAT
podman login ghcr.io -u YOUR_GITHUB_USERNAME
# Enter your Personal Access Token as the password

# Non-interactive login for scripts
echo "$GITHUB_TOKEN" | podman login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Verify authentication
podman login --get-login ghcr.io
```

## Tagging Images for GHCR

GHCR images follow the pattern `ghcr.io/OWNER/IMAGE:TAG`.

```bash
# Tag for a personal account
podman tag myapp:v1.0.0 ghcr.io/myusername/myapp:v1.0.0

# Tag for an organization
podman tag myapp:v1.0.0 ghcr.io/myorg/myapp:v1.0.0

# Add multiple tags
podman tag myapp:v1.0.0 ghcr.io/myorg/myapp:latest
podman tag myapp:v1.0.0 ghcr.io/myorg/myapp:v1.0
podman tag myapp:v1.0.0 ghcr.io/myorg/myapp:v1

# Verify tags
podman images --filter reference='ghcr.io/myorg/myapp' \
  --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}"
```

## Pushing to GHCR

Push your tagged images to GitHub Container Registry.

```bash
# Push a specific version
podman push ghcr.io/myorg/myapp:v1.0.0

# Push the latest tag
podman push ghcr.io/myorg/myapp:latest

# Push all version tags
for TAG in v1.0.0 v1.0 v1 latest; do
  echo "Pushing ghcr.io/myorg/myapp:${TAG}..."
  podman push "ghcr.io/myorg/myapp:${TAG}"
done
```

## Linking Images to a Repository

Connect your container image to a GitHub repository using labels.

```bash
# Add the source label in your Containerfile
cat > Containerfile << 'EOF'
FROM docker.io/library/alpine:3.19

LABEL org.opencontainers.image.source=https://github.com/myorg/myapp
LABEL org.opencontainers.image.description="My application"
LABEL org.opencontainers.image.licenses=MIT

COPY ./app /usr/local/bin/app
CMD ["app"]
EOF

# Build with the label
podman build -t myapp:v1.0.0 .

# Tag and push
podman tag myapp:v1.0.0 ghcr.io/myorg/myapp:v1.0.0
podman push ghcr.io/myorg/myapp:v1.0.0

# The image will now appear in the repository's "Packages" tab
```

## Setting Package Visibility

New packages on GHCR are private by default.

```bash
# Make a personal package public using the GitHub web UI:
# 1. Go to github.com/users/myusername/packages/container/package/myapp
# 2. Click "Package settings"
# 3. Under "Danger Zone", click "Change visibility"
# 4. Select Public and confirm the change

# For organization packages, use the GitHub web UI:
# 1. Go to github.com/orgs/myorg/packages
# 2. Click on the package
# 3. Click "Package settings"
# 4. Change visibility to Public
```

## Verifying the Push

Confirm the image is available on GHCR.

```bash
# Inspect the remote image
skopeo inspect docker://ghcr.io/myorg/myapp:v1.0.0

# Pull to verify
podman pull ghcr.io/myorg/myapp:v1.0.0

# List tags using the GitHub API
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/user/packages/container/myapp/versions" \
  | python3 -c "
import sys, json
for v in json.load(sys.stdin):
    tags = v['metadata']['container']['tags']
    print(f\"  {', '.join(tags) if tags else 'untagged'}\")
"
```

## GitHub Actions Integration

Push images from GitHub Actions using Podman.

```bash
# Example GitHub Actions workflow section (.github/workflows/build.yml)
cat > .github/workflows/build.yml << 'WORKFLOW'
name: Build and Push
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Login to GHCR
        run: echo "${{ secrets.GITHUB_TOKEN }}" | podman login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Build image
        run: podman build -t myapp:${{ github.ref_name }} .

      - name: Tag and push
        run: |
          podman tag myapp:${{ github.ref_name }} ghcr.io/${{ github.repository }}:${{ github.ref_name }}
          podman tag myapp:${{ github.ref_name }} ghcr.io/${{ github.repository }}:latest
          podman push ghcr.io/${{ github.repository }}:${{ github.ref_name }}
          podman push ghcr.io/${{ github.repository }}:latest
WORKFLOW
```

## Complete Local Workflow

Full build-tag-push script for GHCR.

```bash
#!/bin/bash
# Build and push to GitHub Container Registry

set -e

OWNER="${GITHUB_USER:?Set GITHUB_USER}"
IMAGE="myapp"
VERSION="${1:?Usage: $0 <version>}"
REGISTRY="ghcr.io"
FULL="${REGISTRY}/${OWNER}/${IMAGE}"

# Authenticate
echo "$GITHUB_TOKEN" | podman login "$REGISTRY" -u "$OWNER" --password-stdin

# Build
podman build -t "${IMAGE}:${VERSION}" \
  --label "org.opencontainers.image.source=https://github.com/${OWNER}/${IMAGE}" .

# Tag
podman tag "${IMAGE}:${VERSION}" "${FULL}:${VERSION}"
podman tag "${IMAGE}:${VERSION}" "${FULL}:latest"

# Push
podman push "${FULL}:${VERSION}"
podman push "${FULL}:latest"

echo "Pushed to: ${FULL}:${VERSION}"
echo "View at: https://github.com/${OWNER}/${IMAGE}/pkgs/container/${IMAGE}"
```

## Summary

GitHub Container Registry is an excellent choice for teams already using GitHub. Podman pushes to GHCR using the standard `ghcr.io/owner/image:tag` naming convention with personal access token authentication. Link your images to repositories using the OCI source label, and automate pushes through GitHub Actions for a complete CI/CD pipeline. GHCR's integration with GitHub permissions makes access control straightforward for teams of any size.
