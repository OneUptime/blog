# How to Use Quay.io with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, Quay.io, Red Hat

Description: Learn how to use Quay.io container registry with Podman for pulling, pushing, and managing container images.

---

> Quay.io is a natural fit for Podman users, both being part of the Red Hat container ecosystem.

Quay.io is a container registry operated by Red Hat that provides image hosting, vulnerability scanning, and team-based access control. Since both Podman and Quay.io are part of the Red Hat ecosystem, they work together seamlessly. This guide covers how to configure, authenticate, and use Quay.io with Podman.

---

## Adding Quay.io to Search Registries

Ensure Quay.io is available as a search registry in Podman if you use unqualified image names.

```bash
# Check if quay.io is already in the search list

podman info --format '{{index .Registries "search"}}'

# Add quay.io to the search registries if missing
sudo mkdir -p /etc/containers/registries.conf.d
sudo tee /etc/containers/registries.conf.d/99-search-registries.conf <<'EOF'
unqualified-search-registries = ["docker.io", "quay.io"]
EOF
```

## Pulling Images from Quay.io

Pull public images from Quay.io.

```bash
# Pull with the fully qualified name
podman pull quay.io/podman/stable:latest

# Pull popular images from Quay.io
podman pull quay.io/prometheus/prometheus:latest
podman pull quay.io/coreos/etcd:v3.6.11

# Pull a specific tag
podman pull quay.io/podman/stable:v3.11.3

# List the pulled image
podman images | grep quay.io
```

## Authenticating to Quay.io

Log in to access private repositories on Quay.io.

```bash
# Interactive login
podman login quay.io
# Enter your Quay.io username and password

# Non-interactive login with a robot account token
echo "$QUAY_TOKEN" | podman login quay.io \
  --username "myorg+robot_account" \
  --password-stdin

# Verify login status
podman login --get-login quay.io
```

## Creating and Using Robot Accounts

Quay.io robot accounts provide automated access without using personal credentials.

```bash
# Robot accounts are created in the Quay.io web interface:
# 1. Go to your organization settings
# 2. Navigate to Robot Accounts
# 3. Create a new robot account
# 4. Grant it permissions on specific repositories

# Login using the robot account
podman login quay.io \
  --username "myorg+ci_builder" \
  --password-stdin <<< "$QUAY_ROBOT_TOKEN"

# The robot account credentials can be used in CI/CD
echo "Robot account logged in successfully"
```

## Pushing Images to Quay.io

Tag and push your images to Quay.io.

```bash
# Build a local image
podman build -t myapp:latest .

# Tag the image for Quay.io
podman tag myapp:latest quay.io/myorg/myapp:latest
podman tag myapp:latest quay.io/myorg/myapp:v1.0

# Push the image
podman push quay.io/myorg/myapp:latest
podman push quay.io/myorg/myapp:v1.0

# Verify the push by listing remote tags
skopeo list-tags docker://quay.io/myorg/myapp
```

## Inspecting Images on Quay.io

Use skopeo to inspect images without pulling them.

```bash
# Inspect a public image on Quay.io
skopeo inspect docker://quay.io/podman/stable:latest

# Get the image digest
skopeo inspect docker://quay.io/podman/stable:latest \
  --format '{{.Digest}}'

# List all available tags
skopeo list-tags docker://quay.io/podman/stable

# Check image size and layers
skopeo inspect docker://quay.io/podman/stable:latest | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Layers: {len(d[\"Layers\"])}')"
```

## Working with Quay.io Namespaces

Quay.io supports personal and organization namespaces.

```bash
# Pull from a personal namespace
podman pull quay.io/myusername/myimage:latest

# Pull from an organization namespace
podman pull quay.io/myorg/shared-tools:latest

# Push to your personal namespace
podman tag myimage:latest quay.io/myusername/myimage:v2.0
podman push quay.io/myusername/myimage:v2.0

# Push to an organization namespace (requires permissions)
podman tag myimage:latest quay.io/myorg/myimage:v2.0
podman push quay.io/myorg/myimage:v2.0
```

## Using Quay.io's Encrypted Passwords

Quay.io provides encrypted passwords for CLI authentication.

```bash
# Generate an encrypted password from the Quay.io web UI:
# 1. Go to Account Settings
# 2. Click "Generate Encrypted Password"
# 3. Use the encrypted password for CLI login

# Login with the encrypted password
podman login quay.io \
  --username myuser \
  --password-stdin <<< "$QUAY_ENCRYPTED_PASSWORD"
```

## CI/CD Pipeline with Quay.io

A complete pipeline for building and pushing to Quay.io.

```bash
#!/bin/bash
# ci-quay-push.sh - Build and push images to Quay.io

set -euo pipefail

REGISTRY="quay.io"
ORG="myorg"
IMAGE="myapp"
TAG="${CI_COMMIT_TAG:-$(date +%Y%m%d)-${CI_COMMIT_SHA:0:8}}"

# Authenticate with robot account
echo "${QUAY_ROBOT_TOKEN}" | podman login "${REGISTRY}" \
  --username "${ORG}+ci_builder" \
  --password-stdin

# Build and tag
podman build -t "${REGISTRY}/${ORG}/${IMAGE}:${TAG}" .
podman tag "${REGISTRY}/${ORG}/${IMAGE}:${TAG}" \
  "${REGISTRY}/${ORG}/${IMAGE}:latest"

# Push
podman push "${REGISTRY}/${ORG}/${IMAGE}:${TAG}"
podman push "${REGISTRY}/${ORG}/${IMAGE}:latest"

# Logout
podman logout "${REGISTRY}"
echo "Published: ${REGISTRY}/${ORG}/${IMAGE}:${TAG}"
```

## Summary

Quay.io integrates naturally with Podman as both are part of the Red Hat container ecosystem. You can pull public images without authentication, and use robot accounts for secure automated access to private repositories. Quay.io offers vulnerability scanning, team-based permissions, and encrypted passwords for CLI use. If you use unqualified image names, add quay.io to your unqualified search registries, and use skopeo for remote image inspection without pulling.
