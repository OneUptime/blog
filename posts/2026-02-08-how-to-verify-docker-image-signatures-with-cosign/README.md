# How to Verify Docker Image Signatures with Cosign

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Security, Cosign, Sigstore, Image Signing, Supply Chain, DevOps, Container Registry

Description: Learn how to sign Docker images with Cosign and verify signatures before deployment to ensure image integrity and provenance.

---

Docker images can be tampered with between build and deployment. Someone could push a modified image to your registry, or a compromised CI system could inject malicious layers. Image signing solves this by cryptographically attesting that an image came from a trusted source and has not been altered. Cosign, part of the Sigstore project, makes this practical with keyless signing, OCI registry integration, and straightforward CLI commands.

## What Is Cosign?

Cosign is a tool for signing, verifying, and storing container image signatures in OCI-compliant registries. Unlike traditional GPG signing, Cosign stores signatures alongside the image in the registry itself. No separate signature server needed.

Cosign supports two signing modes:

- **Key-based signing**: You generate a key pair and manage the private key yourself
- **Keyless signing**: Uses short-lived certificates tied to an OIDC identity (GitHub, Google, etc.) through the Sigstore public good instance

## Installing Cosign

```bash
# Install on macOS
brew install cosign

# Install on Linux (download the binary)
curl -sL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 \
  -o /usr/local/bin/cosign
chmod +x /usr/local/bin/cosign

# Verify the installation
cosign version
```

## Key-Based Signing

### Generate a Key Pair

```bash
# Generate a cosign key pair (you will be prompted for a password)
cosign generate-key-pair

# This creates two files:
# cosign.key  - private key (keep this secret)
# cosign.pub  - public key (distribute this for verification)
```

### Sign an Image

First, build and push your image, then sign it:

```bash
# Build and push your image
docker build -t ghcr.io/your-org/myapp:v1.0.0 .
docker push ghcr.io/your-org/myapp:v1.0.0

# Sign the image with your private key
cosign sign --key cosign.key ghcr.io/your-org/myapp:v1.0.0
```

Cosign stores the signature as a separate OCI artifact in the same registry, tagged with a predictable name based on the image digest.

### Verify the Signature

Anyone with the public key can verify:

```bash
# Verify the image signature
cosign verify --key cosign.pub ghcr.io/your-org/myapp:v1.0.0

# Output on success:
# Verification for ghcr.io/your-org/myapp:v1.0.0 --
# The following checks were performed on each of these signatures:
#   - The cosign claims were validated
#   - The signatures were verified against the specified public key
```

If verification fails (wrong key, tampered image, or missing signature), cosign exits with a non-zero code and an error message.

## Keyless Signing with Sigstore

Keyless signing removes the burden of key management. Instead of a long-lived key pair, Cosign gets a short-lived certificate from Sigstore's certificate authority (Fulcio) based on your OIDC identity.

### How Keyless Signing Works

1. You authenticate with an OIDC provider (GitHub, Google, Microsoft)
2. Fulcio issues a short-lived signing certificate tied to your identity
3. Cosign signs the image with this certificate
4. The signing event is recorded in Rekor, a tamper-proof transparency log
5. The certificate expires, but the Rekor entry proves the signature was valid at signing time

### Sign with Keyless Mode

```bash
# Sign without a key - opens a browser for OIDC authentication
COSIGN_EXPERIMENTAL=1 cosign sign ghcr.io/your-org/myapp:v1.0.0

# In CI/CD, use workload identity (no browser needed)
# GitHub Actions example - uses the OIDC token automatically
cosign sign ghcr.io/your-org/myapp:v1.0.0 \
  --yes \
  --oidc-issuer=https://token.actions.githubusercontent.com
```

### Verify Keyless Signatures

Verification checks both the certificate identity and the OIDC issuer:

```bash
# Verify a keyless signature, specifying who should have signed it
cosign verify \
  --certificate-identity=https://github.com/your-org/myapp/.github/workflows/build.yml@refs/heads/main \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  ghcr.io/your-org/myapp:v1.0.0
```

This verifies that the image was signed by the specific GitHub Actions workflow on the main branch. An image signed by a different workflow or a different branch would fail verification.

## Full CI/CD Pipeline

Here is a complete GitHub Actions workflow that builds, pushes, signs, and verifies an image:

```yaml
# .github/workflows/build-sign.yml
name: Build, Push, and Sign
on:
  push:
    tags: ["v*"]

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
        uses: sigstore/cosign-installer@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
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
          tags: ghcr.io/${{ github.repository }}:${{ github.ref_name }}

      # Sign the image using keyless signing
      - name: Sign the Image
        run: |
          cosign sign --yes \
            ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}

      # Verify immediately after signing as a sanity check
      - name: Verify Signature
        run: |
          cosign verify \
            --certificate-identity=https://github.com/${{ github.repository }}/.github/workflows/build-sign.yml@${{ github.ref }} \
            --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
            ghcr.io/${{ github.repository }}@${{ steps.build.outputs.digest }}
```

## Adding Attestations

Beyond signing, Cosign can attach attestations - structured metadata about how the image was built. SLSA provenance and SBOM (Software Bill of Materials) are common attestations.

### Attach an SBOM

```bash
# Generate an SBOM with Syft
syft ghcr.io/your-org/myapp:v1.0.0 -o spdx-json > sbom.spdx.json

# Attach the SBOM as a signed attestation
cosign attest --predicate sbom.spdx.json \
  --type spdxjson \
  --key cosign.key \
  ghcr.io/your-org/myapp:v1.0.0
```

### Verify Attestations

```bash
# Verify and retrieve the SBOM attestation
cosign verify-attestation \
  --key cosign.pub \
  --type spdxjson \
  ghcr.io/your-org/myapp:v1.0.0 | jq '.payload' | base64 -d | jq .
```

## Enforcing Signatures in Kubernetes

Use Kyverno or Sigstore Policy Controller to enforce signature verification at deployment time:

```yaml
# kyverno-verify-images.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: verify-image-signatures
spec:
  validationFailureAction: Enforce
  webhookTimeoutSeconds: 30
  rules:
    - name: verify-cosign-signature
      match:
        any:
          - resources:
              kinds:
                - Pod
      verifyImages:
        - imageReferences:
            - "ghcr.io/your-org/*"
          attestors:
            - entries:
                - keyless:
                    subject: "https://github.com/your-org/*/.github/workflows/*@refs/heads/main"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: "https://rekor.sigstore.dev"
```

```bash
# Apply the policy
kubectl apply -f kyverno-verify-images.yaml

# Signed image deploys successfully
kubectl run test --image=ghcr.io/your-org/myapp:v1.0.0
# Pod created

# Unsigned image gets rejected
kubectl run test --image=ghcr.io/your-org/unverified:latest
# Error: image verification failed
```

## Verifying Before Docker Pull

You can verify an image before pulling it, saving bandwidth and preventing untrusted images from touching your host:

```bash
# Verify first, then pull only if verification succeeds
cosign verify --key cosign.pub ghcr.io/your-org/myapp:v1.0.0 && \
  docker pull ghcr.io/your-org/myapp:v1.0.0

# Wrap it in a script for convenience
verify_and_pull() {
    local image=$1
    local key=${2:-cosign.pub}

    echo "Verifying signature for $image..."
    if cosign verify --key "$key" "$image" > /dev/null 2>&1; then
        echo "Signature verified. Pulling image..."
        docker pull "$image"
    else
        echo "ERROR: Signature verification failed for $image"
        return 1
    fi
}

# Usage
verify_and_pull ghcr.io/your-org/myapp:v1.0.0
```

## Transparency Log Verification

Cosign records every signing event in Rekor, Sigstore's transparency log. You can query it:

```bash
# Search Rekor for entries related to your image
rekor-cli search --sha $(cosign triangulate ghcr.io/your-org/myapp:v1.0.0 | \
  xargs cosign verify --key cosign.pub 2>&1 | grep -o 'sha256:[a-f0-9]*')

# View a specific log entry
rekor-cli get --uuid <entry-uuid> --format json | jq .
```

## Wrapping Up

Image signing with Cosign closes a critical gap in the container supply chain. Keyless signing makes it practical by removing key management overhead. Start by signing images in your CI/CD pipeline, then enforce verification at deployment time with Kyverno or Sigstore Policy Controller. The combination of signing, attestations, and transparency logs gives you a verifiable chain of custody from build to deployment.
