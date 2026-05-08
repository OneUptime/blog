# How to Push an Image to Quay.io with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Quay.io, Registry

Description: Learn how to push container images to Quay.io using Podman, including authentication with robot accounts, tagging, and repository management.

---

> Quay.io is Red Hat's container registry that offers advanced security scanning, access controls, and seamless integration with Podman.

Quay.io is a popular container registry that provides image vulnerability scanning, fine-grained access controls, and support for multiple authentication methods. As a Red Hat product, it integrates naturally with Podman. This guide covers everything you need to push images to Quay.io with Podman.

---

## Prerequisites

You need a Quay.io account and a local image to push.

```bash
# Create a Quay.io account at https://quay.io if you don't have one

# Have an image ready

podman build -t myapp:v1.0.0 .
```

## Authenticating with Quay.io

Log in to Quay.io before pushing.

```bash
# Interactive login
podman login quay.io
# Enter your Quay.io username and password

# Verify login
podman login --get-login quay.io
```

## Using Robot Accounts

Robot accounts are recommended for CI/CD and automated workflows.

```bash
# Create a robot account in Quay.io web UI:
# 1. Go to your organization or user settings
# 2. Navigate to Robot Accounts
# 3. Create a new robot account
# 4. Grant it write access to your repositories

# Login with robot account credentials
podman login quay.io \
  -u "myorg+myrobot" \
  -p "ROBOT_ACCOUNT_TOKEN"

# Or use stdin for scripts
echo "$QUAY_ROBOT_TOKEN" | podman login quay.io \
  -u "myorg+myrobot" --password-stdin
```

## Using Encrypted Passwords

Quay.io supports encrypted passwords for CLI access.

```bash
# Generate an encrypted password in Quay.io:
# 1. Go to Account Settings
# 2. Click "Generate Encrypted Password"
# 3. Use the encrypted password for CLI login

podman login quay.io -u myusername
# Enter the encrypted password when prompted
```

## Tagging Images for Quay.io

Tag your images with the Quay.io registry prefix.

```bash
# Tag for a personal repository
podman tag myapp:v1.0.0 quay.io/myusername/myapp:v1.0.0

# Tag for an organization repository
podman tag myapp:v1.0.0 quay.io/myorg/myapp:v1.0.0

# Add multiple tags
podman tag myapp:v1.0.0 quay.io/myorg/myapp:latest
podman tag myapp:v1.0.0 quay.io/myorg/myapp:v1.0
podman tag myapp:v1.0.0 quay.io/myorg/myapp:v1

# Verify tags
podman images --filter reference='quay.io/myorg/myapp' \
  --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}"
```

## Pushing to Quay.io

Push your tagged image to Quay.io.

```bash
# Push a specific version
podman push quay.io/myorg/myapp:v1.0.0

# Push the latest tag
podman push quay.io/myorg/myapp:latest

# Push all tags
for TAG in v1.0.0 v1.0 v1 latest; do
  echo "Pushing quay.io/myorg/myapp:${TAG}..."
  podman push "quay.io/myorg/myapp:${TAG}"
done
```

## Repository Visibility

Quay.io creates private repositories by default when you push a new image.

```bash
# Push creates a private repository automatically
podman push quay.io/myusername/myapp:v1.0.0

# To make the repository public:
# 1. Go to quay.io/repository/myusername/myapp
# 2. Click Settings
# 3. Change repository visibility to Public

# You can also set visibility using the Quay API
curl -X POST "https://quay.io/api/v1/repository/myusername/myapp/changevisibility" \
  -H "Authorization: Bearer $QUAY_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"visibility": "public"}'
```

## Verifying the Push

Confirm the image was pushed successfully.

```bash
# Inspect the remote image
skopeo inspect docker://quay.io/myorg/myapp:v1.0.0

# List available tags
podman search --list-tags quay.io/myorg/myapp

# Pull the image to verify
podman pull quay.io/myorg/myapp:v1.0.0

# Check the Quay.io web UI for security scan results
echo "Check: https://quay.io/repository/myorg/myapp?tab=tags"
```

## Complete CI/CD Workflow

Automate building and pushing to Quay.io.

```bash
#!/bin/bash
# CI/CD script for building and pushing to Quay.io

set -e

REGISTRY="quay.io"
ORG="${QUAY_ORG:?Set QUAY_ORG}"
IMAGE="myapp"
VERSION="${1:?Usage: $0 <version>}"
GIT_SHA=$(git rev-parse --short HEAD)

echo "=== Authenticating with Quay.io ==="
echo "$QUAY_ROBOT_TOKEN" | podman login "$REGISTRY" \
  -u "${ORG}+ci_robot" --password-stdin

echo "=== Building ==="
podman build -t "${IMAGE}:${VERSION}" \
  --label "org.opencontainers.image.revision=${GIT_SHA}" .

echo "=== Tagging ==="
FULL="${REGISTRY}/${ORG}/${IMAGE}"
podman tag "${IMAGE}:${VERSION}" "${FULL}:${VERSION}"
podman tag "${IMAGE}:${VERSION}" "${FULL}:${GIT_SHA}"
podman tag "${IMAGE}:${VERSION}" "${FULL}:latest"

echo "=== Pushing ==="
podman push "${FULL}:${VERSION}"
podman push "${FULL}:${GIT_SHA}"
podman push "${FULL}:latest"

echo "=== Complete ==="
echo "Image: ${FULL}:${VERSION}"
echo "View at: https://${REGISTRY}/repository/${ORG}/${IMAGE}?tab=tags"
```

## Working with Quay.io Security Scanning

Quay.io automatically scans pushed images for vulnerabilities.

```bash
# After pushing, check scan results via API
curl -s "https://quay.io/api/v1/repository/myorg/myapp/manifest/sha256:${DIGEST}/security?vulnerabilities=true" \
  -H "Authorization: Bearer $QUAY_API_TOKEN" \
  | python3 -m json.tool

# Or view in the web UI under the Tags tab
echo "Security scan: https://quay.io/repository/myorg/myapp?tab=tags"
```

## Summary

Pushing images to Quay.io with Podman follows the standard tag-and-push workflow with the `quay.io` registry prefix. Use robot accounts for CI/CD automation, take advantage of Quay.io's built-in security scanning, and manage repository visibility through the web UI or API. Quay.io's strong integration with the Red Hat ecosystem makes it an excellent choice for teams using Podman as their container engine.
