# How to Push an Image to a Private Registry with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image, Registry, Private Registry

Description: Learn how to push container images to private registries using Podman, including self-hosted registries, TLS configuration, and authentication setup.

---

> Private registries give you full control over image storage, access, and distribution within your organization's network.

Private container registries are essential for enterprise environments where images contain proprietary code, must comply with data residency requirements, or need to be available in air-gapped networks. Podman supports pushing to any OCI-compliant private registry. This guide covers setting up, configuring, and pushing images to private registries.

---

## Setting Up a Local Private Registry

Start a simple private registry for testing.

```bash
# Run a local registry container

podman run -d --name registry \
  -p 5000:5000 \
  -v registry-data:/var/lib/registry \
  docker.io/library/registry:3

# Verify the registry is running
curl -s http://localhost:5000/v2/ | python3 -m json.tool
# Output: {}

# Check the registry catalog
curl -s http://localhost:5000/v2/_catalog | python3 -m json.tool
```

## Configuring Podman for Insecure Registries

Private registries often use HTTP or self-signed certificates during development.

```bash
# Method 1: Use --tls-verify=false on each command
podman push --tls-verify=false localhost:5000/myapp:v1.0.0

# Method 2: Configure the registry as insecure in registries.conf
# For system-wide configuration
sudo tee -a /etc/containers/registries.conf << 'EOF'

[[registry]]
location = "myregistry.local:5000"
insecure = true
EOF

# For user-level configuration (rootless Podman)
mkdir -p ~/.config/containers
cat >> ~/.config/containers/registries.conf << 'EOF'

[[registry]]
location = "myregistry.local:5000"
insecure = true
EOF
```

## Configuring TLS for Private Registries

For production registries with proper TLS certificates.

```bash
# If your registry uses a self-signed CA certificate
# Copy the CA certificate to the trusted location
sudo mkdir -p /etc/containers/certs.d/myregistry.example.com:5000
sudo cp ca.crt /etc/containers/certs.d/myregistry.example.com:5000/

# For rootless Podman
mkdir -p ~/.config/containers/certs.d/myregistry.example.com:5000
cp ca.crt ~/.config/containers/certs.d/myregistry.example.com:5000/

# Now Podman will trust the registry's certificate
podman push myregistry.example.com:5000/myapp:v1.0.0
```

## Authenticating with a Private Registry

Most private registries require authentication.

```bash
# Login interactively
podman login myregistry.example.com:5000

# Login with credentials
podman login myregistry.example.com:5000 \
  -u admin -p secretpassword

# Login using stdin
echo "$REGISTRY_PASSWORD" | podman login myregistry.example.com:5000 \
  -u admin --password-stdin

# Verify login
podman login --get-login myregistry.example.com:5000
```

## Tagging and Pushing to a Private Registry

Tag your image with the private registry address and push.

```bash
# Tag for the private registry
podman tag myapp:v1.0.0 myregistry.example.com:5000/myapp:v1.0.0
podman tag myapp:v1.0.0 myregistry.example.com:5000/myapp:latest

# Push to the private registry
podman push myregistry.example.com:5000/myapp:v1.0.0
podman push myregistry.example.com:5000/myapp:latest

# For an insecure registry
podman push --tls-verify=false myregistry.local:5000/myapp:v1.0.0
```

## Pushing to a Registry with Namespaces

Organize images in namespaces within your private registry.

```bash
# Use namespaces to organize by team or project
podman tag myapp:v1.0.0 myregistry.example.com:5000/team-backend/myapp:v1.0.0
podman tag myapp:v1.0.0 myregistry.example.com:5000/team-frontend/webapp:v1.0.0

# Push to the namespaced path
podman push myregistry.example.com:5000/team-backend/myapp:v1.0.0
podman push myregistry.example.com:5000/team-frontend/webapp:v1.0.0
```

## Pushing to Harbor

Harbor is a popular enterprise private registry.

```bash
# Login to Harbor
podman login harbor.example.com

# Tag for an existing Harbor project
podman tag myapp:v1.0.0 harbor.example.com/myproject/myapp:v1.0.0

# Push to Harbor
podman push harbor.example.com/myproject/myapp:v1.0.0

# Harbor provides vulnerability scanning, replication, and RBAC
```

## Pushing to AWS ECR (Private)

Push to Amazon's private Elastic Container Registry.

```bash
# Get ECR login credentials
aws ecr get-login-password --region us-east-1 | \
  podman login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Create a repository if it doesn't exist
aws ecr create-repository --repository-name myapp --region us-east-1

# Tag and push
podman tag myapp:v1.0.0 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0
podman push 123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:v1.0.0
```

## Verifying Pushed Images

Confirm images are available in your private registry.

```bash
# List repositories in the registry
curl -s https://myregistry.example.com:5000/v2/_catalog | python3 -m json.tool

# List tags for a specific image
curl -s https://myregistry.example.com:5000/v2/myapp/tags/list | python3 -m json.tool

# Inspect the remote image with skopeo
skopeo inspect docker://myregistry.example.com:5000/myapp:v1.0.0

# Pull to verify
podman pull myregistry.example.com:5000/myapp:v1.0.0
```

## Complete Private Registry Workflow

A full build-tag-push script for private registries.

```bash
#!/bin/bash
# Build and push to a private registry

set -e

REGISTRY="${REGISTRY_URL:?Set REGISTRY_URL (e.g., myregistry.example.com:5000)}"
NAMESPACE="${REGISTRY_NAMESPACE:-library}"
IMAGE="myapp"
VERSION="${1:?Usage: $0 <version>}"
FULL="${REGISTRY}/${NAMESPACE}/${IMAGE}"

# Authenticate
if [ -n "$REGISTRY_USER" ] && [ -n "$REGISTRY_PASSWORD" ]; then
  echo "$REGISTRY_PASSWORD" | podman login "$REGISTRY" \
    -u "$REGISTRY_USER" --password-stdin
fi

# Build
echo "Building ${IMAGE}:${VERSION}..."
podman build -t "${IMAGE}:${VERSION}" .

# Tag
echo "Tagging for ${REGISTRY}..."
podman tag "${IMAGE}:${VERSION}" "${FULL}:${VERSION}"
podman tag "${IMAGE}:${VERSION}" "${FULL}:latest"

# Push
echo "Pushing to ${REGISTRY}..."
podman push "${FULL}:${VERSION}"
podman push "${FULL}:latest"

# Verify
echo "Verifying..."
curl -s "https://${REGISTRY}/v2/${NAMESPACE}/${IMAGE}/tags/list" 2>/dev/null \
  | python3 -m json.tool || echo "Verification via API not available"

echo "Done. Pull with: podman pull ${FULL}:${VERSION}"
```

## Summary

Pushing to private registries with Podman requires configuring TLS trust or insecure access, authenticating, and using the registry address in your image tags. Whether you run a simple Docker registry, Harbor, AWS ECR, or another solution, Podman's OCI compliance ensures compatibility. Private registries provide the control and security that enterprise container workflows demand, and Podman makes integrating with them straightforward.
