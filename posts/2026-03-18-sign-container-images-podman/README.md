# How to Sign Container Images with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Image Signing, GPG

Description: Learn how to sign container images with Podman using GPG keys to establish trust and verify image authenticity.

---

> Signing your container images creates a verifiable chain of trust from your build pipeline to your production environment.

Signing container images ensures that the images running in production are the exact same images that were built and approved. Podman has built-in support for signing images during push operations using GPG keys. This guide walks through the entire process of generating keys, configuring signing, and pushing signed images.

---

## Why Sign Container Images

Without image signing, there is no way to verify that an image in a registry is the same one that was built by your CI pipeline. An attacker who gains access to your registry could replace images with malicious versions. Signed images provide cryptographic proof of authenticity and integrity.

## Generating a GPG Signing Key

First, create a GPG key pair dedicated to container image signing.

```bash
# Generate a GPG key for container signing

gpg --batch --gen-key << 'EOF'
%no-protection
Key-Type: RSA
Key-Length: 4096
Name-Real: Container Image Signer
Name-Email: container-signer@example.com
Expire-Date: 1y
%commit
EOF
```

```bash
# Verify the key was created
gpg --list-keys container-signer@example.com
```

```bash
# Export the public key for distribution to verifiers
gpg --export --armor container-signer@example.com > container-signer-public.gpg

# Export the public key in binary format for policy configuration
gpg --export container-signer@example.com > /tmp/container-signer.gpg
```

## Configuring the Signature Storage Location

Podman stores image signatures locally and can push them to a signature server.

```bash
# Create the local signature storage directory
sudo mkdir -p /var/lib/containers/sigstore

# Configure the signature storage for your registry
sudo mkdir -p /etc/containers/registries.d

sudo tee /etc/containers/registries.d/myregistry.yaml > /dev/null << 'EOF'
docker:
  registry.example.com:
    # Where Podman writes signatures during push
    sigstore-staging: file:///var/lib/containers/sigstore
    # Where Podman reads signatures during pull
    sigstore: https://sigstore.example.com/signatures
EOF
```

## Signing an Image During Push

Podman signs images as part of the push operation.

```bash
# Build a container image
cat > /tmp/Containerfile << 'EOF'
FROM docker.io/library/alpine:latest
RUN apk add --no-cache curl
CMD ["sh"]
EOF

podman build -t registry.example.com/myapp:v1.0 -f /tmp/Containerfile /tmp
```

```bash
# Push and sign the image with your GPG key
podman push --sign-by container-signer@example.com \
  registry.example.com/myapp:v1.0
```

```bash
# Verify the signature was stored locally
ls -la /var/lib/containers/sigstore/
```

## Signing Images for a Local Registry

You can test signing with a local registry.

```bash
# Start a local registry
podman run --rm -d -p 5000:5000 --name local-registry docker.io/library/registry:2

# Tag an image for the local registry
podman tag docker.io/library/alpine:latest localhost:5000/alpine:signed

# Configure signature storage for localhost
sudo tee /etc/containers/registries.d/localhost.yaml > /dev/null << 'EOF'
docker:
  localhost:5000:
    sigstore-staging: file:///var/lib/containers/sigstore
    sigstore: file:///var/lib/containers/sigstore
EOF
```

```bash
# Push with signature (use --tls-verify=false for local registry)
podman push --tls-verify=false \
  --sign-by container-signer@example.com \
  localhost:5000/alpine:signed
```

```bash
# Check that the signature file was created
find /var/lib/containers/sigstore -type f -name "signature-*"
```

## Inspecting Signing Configuration

```bash
# View the configured image trust policy
podman image trust show

# Use skopeo to inspect the image manifest
skopeo inspect --raw docker://localhost:5000/alpine:signed 2>/dev/null
```

## Signing Existing Images

You can sign images that are already in a registry using skopeo.

```bash
# Install skopeo if not already available
# sudo dnf install -y skopeo   # Fedora/RHEL
# sudo apt-get install -y skopeo  # Debian/Ubuntu

# Copy an image and sign it in the process
skopeo copy \
  --sign-by container-signer@example.com \
  docker://docker.io/library/nginx:alpine \
  docker://localhost:5000/nginx:signed \
  --dest-tls-verify=false
```

## Automating Signing in CI/CD

```bash
#!/bin/bash
# ci-sign-and-push.sh - Build, sign, and push in a CI pipeline

IMAGE="registry.example.com/myapp"
TAG="${CI_COMMIT_SHA:-latest}"
SIGNER="container-signer@example.com"

# Build the image
podman build -t "${IMAGE}:${TAG}" .

# Sign and push
podman push --sign-by "${SIGNER}" "${IMAGE}:${TAG}"

# Also tag and push as latest
podman tag "${IMAGE}:${TAG}" "${IMAGE}:latest"
podman push --sign-by "${SIGNER}" "${IMAGE}:latest"

echo "Signed and pushed ${IMAGE}:${TAG}"
```

## Distributing Your Public Key

```bash
# Copy the public key to a web-accessible location or share via other means
cp container-signer-public.gpg /var/www/html/keys/

# Or install it system-wide on verification hosts
sudo mkdir -p /etc/pki/containers
sudo cp /tmp/container-signer.gpg /etc/pki/containers/

# Configure verification hosts to require signatures from this key
sudo podman image trust set \
  --signature-policy /etc/containers/policy.json \
  --type signedBy \
  --pubkeysfile /etc/pki/containers/container-signer.gpg \
  registry.example.com
```

## Cleanup

```bash
podman stop local-registry 2>/dev/null
podman rm local-registry 2>/dev/null
rm -f /tmp/Containerfile container-signer-public.gpg
```

## Summary

Signing container images with Podman establishes cryptographic trust in your container supply chain. By generating dedicated GPG keys, configuring signature storage, and signing images during push operations, you ensure that every image can be verified by environments configured to require those signatures. Integrate signing into your CI/CD pipeline to make it automatic and consistent, and distribute your public keys to all environments that need to verify your images.
