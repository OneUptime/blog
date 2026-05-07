# How to Use Skopeo to Verify Image Signatures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Skopeo, Security, Image Signing, GPG

Description: Learn how to use Skopeo to sign container images and verify their signatures to ensure image integrity and provenance.

---

> Image signature verification ensures that the container images you deploy are authentic and have not been tampered with since they were built.

In production environments, running unsigned or unverified container images is a security risk. An attacker who compromises a registry could replace images with malicious versions. Skopeo supports signing images during copy operations and verifying those signatures before deployment. Combined with Podman's signature verification policies, this creates a secure supply chain for container images. This guide covers how to set up and use image signing and verification.

---

## Prerequisites

You need GPG keys and Skopeo installed for image signing.

```bash
# Install Skopeo and GPG

sudo dnf install -y skopeo gnupg2   # Fedora/RHEL
sudo apt-get install -y skopeo gpg  # Ubuntu/Debian

# Generate a GPG key pair if you do not have one
gpg --full-generate-key
# Select RSA, 4096 bits, and provide your name and email

# List your GPG keys to find the key ID
gpg --list-keys --keyid-format long
```

## Signing Images During Copy

Skopeo can sign images as part of the copy operation using your GPG key.

```bash
# Copy and sign an image with your GPG key
skopeo copy \
  --sign-by "your-email@example.com" \
  docker://docker.io/library/nginx:1.25 \
  docker://registry.example.com/nginx:1.25

# The signature is written to the configured lookaside storage
# Without a registry-specific config, the default is /var/lib/containers/sigstore
# for root or $HOME/.local/share/containers/sigstore for an unprivileged user
```

## Configuring Signature Storage

Simple-signing signatures can be stored in lookaside storage. Configure the storage location in the registries configuration.

```bash
# Create the registries configuration directory
sudo mkdir -p /etc/containers/registries.d/

# Configure lookaside signature storage for your registry
sudo tee /etc/containers/registries.d/registry.example.com.yaml << 'EOF'
docker:
  registry.example.com:
    # Read signatures from a web server
    lookaside: https://signatures.example.com
    # Write new signatures to a local staging location
    lookaside-staging: file:///var/lib/containers/sigstore
EOF
```

```bash
# For local file-based signature storage, create the directory
sudo mkdir -p /var/lib/containers/sigstore

# Copy and sign an image - the signature goes to lookaside-staging
skopeo copy \
  --sign-by "your-email@example.com" \
  docker://docker.io/library/alpine:3.19 \
  docker://registry.example.com/alpine:3.19
```

## Configuring Signature Verification Policy

Podman and Skopeo use a policy file to determine which images require signatures and which keys are trusted.

```bash
# View the current policy
cat /etc/containers/policy.json

# Create a policy that requires signatures for your private registry
sudo tee /etc/containers/policy.json << 'EOF'
{
  "default": [
    { "type": "insecureAcceptAnything" }
  ],
  "transports": {
    "docker": {
      "registry.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/trusted-key.gpg"
        }
      ]
    }
  }
}
EOF
```

```bash
sudo mkdir -p /etc/pki/containers/

# Export your public GPG keyring for the verification policy
gpg --export "your-email@example.com" | \
  sudo tee /etc/pki/containers/trusted-key.gpg > /dev/null
```

## Verifying Images with Skopeo

Once the policy is configured, Skopeo automatically verifies signatures when copying images.

```bash
# This copy will fail if the image is not signed by a trusted key
skopeo copy \
  docker://registry.example.com/myapp:v1.0 \
  containers-storage:myapp:v1.0
```

## Standalone Signature Verification

You can verify signatures manually using the `skopeo standalone-verify` command.

```bash
# Get the image manifest
skopeo inspect --raw docker://registry.example.com/myapp:v1.0 > manifest.json

# Optionally compute the manifest digest from the downloaded manifest
skopeo manifest-digest manifest.json

# Download the signature file
# (location depends on your lookaside configuration)

# Verify the signature against the manifest
skopeo standalone-verify \
  --public-key-file /etc/pki/containers/trusted-key.gpg \
  manifest.json \
  registry.example.com/myapp:v1.0 \
  any \
  /path/to/signature-file
```

## Signing Workflow in CI/CD

Integrate image signing into your CI/CD pipeline.

```bash
#!/bin/bash
# sign-and-push.sh - Build, sign, and push an image in CI/CD

IMAGE_NAME="registry.example.com/myapp"
TAG="${CI_COMMIT_TAG:-latest}"
GPG_KEY="ci-signer@example.com"

# Build the image with Podman
podman build -t "${IMAGE_NAME}:${TAG}" .

# Copy from local storage to registry with a signature
skopeo copy \
  --sign-by "${GPG_KEY}" \
  "containers-storage:${IMAGE_NAME}:${TAG}" \
  "docker://${IMAGE_NAME}:${TAG}"

echo "Image signed and pushed: ${IMAGE_NAME}:${TAG}"

# Verify the pushed image can be validated by policy
VERIFY_DIR=$(mktemp -d)
skopeo copy \
  "docker://${IMAGE_NAME}:${TAG}" \
  "dir:${VERIFY_DIR}" && \
  echo "Signature verification passed."
```

## Rejecting Unsigned Images

Configure a strict policy that rejects any unsigned images.

```bash
# Strict policy - reject all unsigned images from all registries
sudo tee /etc/containers/policy.json << 'EOF'
{
  "default": [
    { "type": "reject" }
  ],
  "transports": {
    "docker": {
      "registry.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/trusted-key.gpg"
        }
      ],
      "docker.io/library": [
        { "type": "insecureAcceptAnything" }
      ]
    },
    "containers-storage": {
      "": [
        { "type": "insecureAcceptAnything" }
      ]
    }
  }
}
EOF

# Now only signed images from registry.example.com will be accepted
# Docker Hub official images are allowed without signatures
# All other sources are rejected
```

## Summary

Image signing and verification with Skopeo provides a critical security layer for container workflows. By signing images during the copy process and configuring verification policies, you ensure that only trusted, unmodified images reach your production systems. Skopeo integrates with GPG for cryptographic signing, supports configurable lookaside signature storage, and works with Podman's policy system to enforce verification automatically. Incorporating image signing into your CI/CD pipeline establishes a secure supply chain from build to deployment.
