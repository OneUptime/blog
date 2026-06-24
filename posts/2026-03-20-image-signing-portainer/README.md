# How to Set Up Image Signing and Verification in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Security, Image Signing, Cosign, Supply Chain Security

Description: Sign Docker images with Cosign and configure Portainer to only run verified, signed images as part of a supply chain security strategy.

## Introduction

Container image signing ensures that the images you deploy are exactly what was built and hasn't been tampered with in transit. This is supply chain security for containers. Cosign (from the Sigstore project) is the modern standard for signing container images, providing keyless signing via OIDC or traditional key-based signing. This guide covers signing images with Cosign and verifying signatures before deploying through Portainer.

## Step 1: Install Cosign

```bash
# Install Cosign on your build machine

curl -O -L https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
sudo chmod +x /usr/local/bin/cosign

# Verify installation
cosign version

# Generate a signing key pair
cosign generate-key-pair
# Creates: cosign.key (private key), cosign.pub (public key)
# Keep cosign.key secret! cosign.pub is for verification.
```

## Step 2: Sign an Image After Building

```bash
# Build and push your image first
docker build -t registry.example.com/myapp/api:1.0.0 .
docker push registry.example.com/myapp/api:1.0.0

# Sign the image with your private key
cosign sign \
  --key cosign.key \
  registry.example.com/myapp/api:1.0.0

# The signature is stored in the registry as an OCI artifact
# alongside the image itself

# Sign with additional annotations (metadata)
cosign sign \
  --key cosign.key \
  --annotations "git-commit=$(git rev-parse HEAD)" \
  --annotations "build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --annotations "signed-by=ci-pipeline" \
  registry.example.com/myapp/api:1.0.0
```

## Step 3: Verify Image Signatures

```bash
# Verify before pulling and running
cosign verify \
  --key cosign.pub \
  registry.example.com/myapp/api:1.0.0

# Successful verification output:
# Verification for registry.example.com/myapp/api:1.0.0 --
# The following checks were performed on each of these signatures:
#   - The cosign claims were validated
#   - The signatures were verified against the specified public key

# Verify and check annotations
cosign verify \
  --key cosign.pub \
  --annotations "signed-by=ci-pipeline" \
  registry.example.com/myapp/api:1.0.0

# Get signing metadata
cosign triangulate registry.example.com/myapp/api:1.0.0
# Shows the signature reference in the registry
```

## Step 4: Keyless Signing with GitHub Actions

```yaml
# .github/workflows/build-sign.yml
name: Build and Sign

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write
  id-token: write  # Required for keyless signing

jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Cosign
        uses: sigstore/cosign-installer@v4

      - name: Log in to Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and Push
        id: build
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Sign Image (Keyless - uses GitHub OIDC)
        env:
          IMAGE: ghcr.io/${{ github.repository }}:${{ github.sha }}
          DIGEST: ${{ steps.build.outputs.digest }}
        run: |
          cosign sign \
            --yes \
            "${IMAGE}@${DIGEST}"
          # Keyless: the signature is stored in the registry and logged to Rekor
```

## Step 5: Enforce Signature Verification Before Deployment

```bash
#!/bin/bash
# verify-and-deploy.sh - Verify signature before triggering Portainer deployment
# Requires a Portainer Business Edition stack webhook.

IMAGE=$1
IMAGE_TAG=${IMAGE##*:}
COSIGN_PUBLIC_KEY=/etc/cosign/cosign.pub
PORTAINER_WEBHOOK="https://portainer.example.com/api/stacks/webhooks/YOUR_WEBHOOK_ID"

echo "Verifying signature for: $IMAGE"

# For keyless GitHub Actions signatures, verify with --certificate-identity
# or --certificate-identity-regexp together with
# --certificate-oidc-issuer https://token.actions.githubusercontent.com
if ! cosign verify \
  --key "$COSIGN_PUBLIC_KEY" \
  "$IMAGE" > /dev/null 2>&1; then
  echo "BLOCKED: Image signature verification failed for $IMAGE"
  echo "This image is unsigned or was not signed with the expected key."
  exit 1
fi

echo "Signature verified. Proceeding with deployment."

# Redeploy the stack with the verified image tag
curl -fsS -X POST "${PORTAINER_WEBHOOK}?tag=${IMAGE_TAG}" > /dev/null
echo "Deployment triggered."
```

## Step 6: Container Signature Policy with Connaisseur

Connaisseur enforces image verification as a Kubernetes admission webhook. Use it when Portainer is managing a Kubernetes environment and you want signature policy enforced at cluster admission time. It does not apply to Portainer-managed Docker or Compose stacks, so for those environments keep the external verification gate shown above.

## Step 7: Verify All Running Container Images

```bash
#!/bin/bash
# Audit script - verify signatures on all running containers

COSIGN_KEY=/etc/cosign/cosign.pub
FAILURES=0

echo "Auditing running containers for valid signatures..."

while IFS= read -r image; do
  echo -n "Checking $image... "
  if cosign verify --key "$COSIGN_KEY" "$image" > /dev/null 2>&1; then
    echo "VALID"
  else
    echo "UNSIGNED or INVALID"
    FAILURES=$((FAILURES + 1))
  fi
done < <(docker ps --format "{{.Image}}" | sort -u)

if [ "$FAILURES" -gt 0 ]; then
  echo "WARNING: $FAILURES images failed signature verification"
  exit 1
fi
echo "All images verified successfully."
```

## Conclusion

Image signing creates a cryptographic chain of custody from build to deployment. Every signed image proves it came from your CI/CD pipeline and hasn't been modified. Cosign's keyless mode using OIDC tokens (GitHub Actions, GitLab CI) eliminates key management overhead while maintaining cryptographic guarantees. Combining signature verification with a Portainer deployment webhook creates an external deployment gate, and when you need admission-time enforcement in Kubernetes, you can apply that policy with Connaisseur.
