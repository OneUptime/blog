# How to Sign Images in CI with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CI/CD, Security, Image Signing, Sigstore

Description: Learn how to sign container images in CI/CD pipelines using Podman with Sigstore cosign and GPG for supply chain security.

---

> Signing container images in CI ensures that only verified, trusted images are deployed, closing a critical gap in your software supply chain.

Container image signing is a key practice for supply chain security. It provides cryptographic proof that an image was built by a trusted CI system and has not been tampered with. Podman integrates well with signing tools like cosign (from Sigstore) and traditional GPG signatures. This guide covers practical patterns for signing images in your CI/CD pipeline.

---

## Understanding Image Signing

Image signing creates a cryptographic signature that can be verified before deployment. This ensures that the image you deploy is the exact image that was built in CI, with no modifications.

```bash
#!/bin/bash
# Overview of the image signing workflow

# 1. Build the image in CI
# 2. Push the image to a registry
# 3. Sign the image, preferably by digest
# 4. Verification happens at deployment time using the expected public key or identity

# The two main approaches:
# - cosign (Sigstore): Modern, keyless signing or key-based signing
# - GPG: Traditional key-based signing with Podman's built-in support
```

## Signing Images with Cosign

Cosign from the Sigstore project is the modern standard for container image signing.

```bash
#!/bin/bash
# Install cosign for image signing
# Cosign is the recommended tool for container image signing

# Install cosign
curl -sSfL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 \
  -o /usr/local/bin/cosign
chmod +x /usr/local/bin/cosign

# Verify cosign is installed
cosign version
```

```bash
#!/bin/bash
# Sign an image with cosign using a key pair

REGISTRY="docker.io/myorg"
IMAGE="${REGISTRY}/myapp"
TAG="${COMMIT_SHA}"

# Build and push the image with Podman
podman build -t "${IMAGE}:${TAG}" .
podman push --digestfile image.digest "${IMAGE}:${TAG}"
DIGEST=$(cat image.digest)

# Generate a key pair (do this once, store the private key securely)
# cosign generate-key-pair
# This creates cosign.key (private) and cosign.pub (public)

# Sign the image using the private key
# The COSIGN_PASSWORD environment variable holds the key password
cosign sign --yes --key cosign.key "${IMAGE}@${DIGEST}"

echo "Image signed successfully: ${IMAGE}@${DIGEST}"

# Verify the signature using the public key
cosign verify --key cosign.pub "${IMAGE}@${DIGEST}"
```

## Keyless Signing with Cosign and OIDC

Use keyless signing in CI for simpler key management. This uses OIDC tokens from CI providers.

```bash
#!/bin/bash
# Keyless signing with cosign in CI
# Uses the CI provider's OIDC identity instead of a static key

REGISTRY="docker.io/myorg"
IMAGE="${REGISTRY}/myapp"
TAG="${COMMIT_SHA}"

# Build and push the image
podman build -t "${IMAGE}:${TAG}" .
podman push --digestfile image.digest "${IMAGE}:${TAG}"
DIGEST=$(cat image.digest)

# Keyless sign using the CI provider's OIDC token
# This works automatically in GitHub Actions; configure an OIDC token
# for other CI systems.
cosign sign --yes "${IMAGE}@${DIGEST}"

# The signature is stored in the registry alongside the image
# Verification uses the Sigstore transparency log
cosign verify \
  --certificate-identity "https://github.com/myorg/myapp/.github/workflows/sign.yml@refs/heads/main" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  "${IMAGE}@${DIGEST}"
```

## GitHub Actions with Cosign Signing

Complete workflow for building, pushing, and signing images in GitHub Actions.

```yaml
# .github/workflows/sign.yml
name: Build, Push, and Sign

on:
  push:
    branches: [main]

jobs:
  build-sign:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
      id-token: write  # Required for keyless signing

    steps:
      - uses: actions/checkout@v4

      # Install cosign
      - name: Install cosign
        uses: sigstore/cosign-installer@v4.1.0

      # Log in to GHCR
      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            podman login ghcr.io -u ${{ github.actor }} --password-stdin

      # Build the image
      - name: Build image
        run: |
          podman build \
            -t ghcr.io/${{ github.repository }}:${{ github.sha }} \
            .

      # Push the image
      - name: Push image
        run: |
          podman push \
            --digestfile image.digest \
            ghcr.io/${{ github.repository }}:${{ github.sha }}

      # Sign the image with keyless signing (uses GitHub OIDC)
      - name: Sign image
        run: |
          DIGEST=$(cat image.digest)
          cosign sign --yes \
            ghcr.io/${{ github.repository }}@${DIGEST}

      # Verify the signature
      - name: Verify signature
        run: |
          DIGEST=$(cat image.digest)
          cosign verify \
            --certificate-oidc-issuer https://token.actions.githubusercontent.com \
            --certificate-identity "https://github.com/${{ github.repository }}/.github/workflows/sign.yml@refs/heads/main" \
            ghcr.io/${{ github.repository }}@${DIGEST}
```

## Signing with GPG Keys

Podman has built-in support for GPG-based image signing.

```bash
#!/bin/bash
# Configure Podman for GPG-based image signing

# Generate a GPG key for signing (do this once)
gpg --batch --gen-key << GPGEOF
%no-protection
Key-Type: RSA
Key-Length: 4096
Name-Real: CI Image Signer
Name-Email: ci-signer@example.com
Expire-Date: 1y
%commit
GPGEOF

# Get the key fingerprint
GPG_FINGERPRINT=$(gpg --list-keys --with-colons ci-signer@example.com | \
  grep '^fpr' | head -1 | cut -d: -f10)
echo "GPG Key Fingerprint: ${GPG_FINGERPRINT}"

# Export the public key used by deployment targets for verification
mkdir -p /etc/pki/containers
gpg --armor --export ci-signer@example.com > /etc/pki/containers/signer.pub

# Create the verification policy used when pulling images
mkdir -p /etc/containers
cat > /etc/containers/policy.json << 'EOF'
{
  "default": [{ "type": "insecureAcceptAnything" }],
  "transports": {
    "docker": {
      "registry.example.com": [{
        "type": "signedBy",
        "keyType": "GPGKeys",
        "keyPath": "/etc/pki/containers/signer.pub"
      }]
    }
  }
}
EOF

# Configure the signature storage location
mkdir -p /etc/containers/registries.d
cat > /etc/containers/registries.d/default.yaml << EOF
default-docker:
  lookaside: https://sigstore.example.com/signatures
  lookaside-staging: file:///var/lib/containers/sigstore
docker:
  registry.example.com:
    lookaside: https://sigstore.example.com/signatures
    lookaside-staging: file:///var/lib/containers/sigstore
EOF

# Sign while pushing the image to the registry
podman push --sign-by "${GPG_FINGERPRINT}" \
  registry.example.com/myorg/myapp:${COMMIT_SHA}
```

## Verifying Signatures Before Deployment

Set up signature verification on your deployment targets.

```bash
#!/bin/bash
# Verify image signatures before deployment
# This should run on the deployment target or in the deploy pipeline

IMAGE="docker.io/myorg/myapp:v1.0.0"

# Verify with cosign and a public key
cosign verify --key cosign.pub "${IMAGE}"
VERIFY_EXIT=$?

if [ $VERIFY_EXIT -ne 0 ]; then
  echo "ERROR: Image signature verification failed!"
  echo "Refusing to deploy unsigned or tampered image."
  exit 1
fi

echo "Signature verified successfully. Proceeding with deployment."

# Pull and deploy the verified image
podman pull "${IMAGE}"
podman run -d --name myapp "${IMAGE}"
```

## Summary

Signing container images in CI is essential for supply chain security. Cosign from the Sigstore project offers both key-based and keyless signing, with keyless being ideal for CI environments that support OIDC (like GitHub Actions and GitLab CI). GPG signing is also supported natively by Podman for environments that prefer traditional key management. Always verify signatures before deployment to ensure that only trusted, untampered images run in production. Store signing keys securely in your CI system's secret management, and use the transparency log for auditability.
