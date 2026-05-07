# How to Use Podman with Cosign for Image Signing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Cosign, Image Signing, Supply Chain Security, Container Security

Description: Learn how to use Cosign with Podman to sign and verify container images, ensuring image integrity and authenticity throughout your supply chain.

---

> Signing your Podman container images with Cosign establishes a chain of trust from build to deployment, ensuring that only verified, untampered images run in your production environment.

Container supply chain security depends on knowing that the images you deploy are exactly the images that were built and approved. Without image signing, an attacker who compromises your registry could replace legitimate images with malicious ones. Cosign, developed by the Sigstore project, provides a simple and secure way to sign container images using short-lived certificates or traditional key pairs. Integrating Cosign with your Podman workflow ensures that every image is cryptographically verified before deployment.

---

## Installing Cosign

Install Cosign on your system:

```bash
# On Fedora/RHEL-compatible systems (official RPM)
LATEST_VERSION=$(curl https://api.github.com/repos/sigstore/cosign/releases/latest | grep tag_name | cut -d : -f2 | tr -d 'v", ')
curl -O -L "https://github.com/sigstore/cosign/releases/latest/download/cosign-${LATEST_VERSION}-1.x86_64.rpm"
sudo rpm -ivh cosign-${LATEST_VERSION}-1.x86_64.rpm

# On macOS
brew install cosign

# Using Go
go install github.com/sigstore/cosign/v3/cmd/cosign@latest

# Verify installation
cosign version
```

## Key-Based Signing

The simplest approach uses a key pair:

```bash
# Generate a key pair
cosign generate-key-pair

# This creates:
# - cosign.key (private key, password-protected)
# - cosign.pub (public key, for verification)
```

## Signing Podman Images

Build, push, and sign an image:

```bash
# Build the image
podman build -t registry.example.com/myapp:v1.0.0 .

# Push to registry
podman push --digestfile image-digest.txt registry.example.com/myapp:v1.0.0

# Sign the immutable digest that was pushed
IMAGE_DIGEST="registry.example.com/myapp@$(cat image-digest.txt)"
cosign sign --key cosign.key "$IMAGE_DIGEST"
```

The signature is stored alongside the image in the registry as an OCI artifact.

## Verifying Image Signatures

Verify that an image has a valid signature before pulling or deploying:

```bash
IMAGE_DIGEST="registry.example.com/myapp@sha256:<digest>"

# Verify with the public key
cosign verify --key cosign.pub "$IMAGE_DIGEST"

# Verify and display signature details
cosign verify --key cosign.pub "$IMAGE_DIGEST" | jq .
```

## Keyless Signing with Sigstore

Cosign supports keyless signing using the Sigstore public infrastructure. This eliminates the need to manage long-lived signing keys:

```bash
IMAGE_DIGEST="registry.example.com/myapp@sha256:<digest>"

# Sign using keyless mode (OIDC authentication)
cosign sign "$IMAGE_DIGEST"

# This opens a browser for OIDC authentication
# The signing event is recorded in the Rekor transparency log

# Verify keyless signature
cosign verify \
  --certificate-identity=user@example.com \
  --certificate-oidc-issuer=https://accounts.google.com \
  "$IMAGE_DIGEST"
```

## Adding Attestations

Attach build metadata and scan results as signed attestations:

```bash
IMAGE_DIGEST="registry.example.com/myapp@sha256:<digest>"

# Sign with custom annotations
cosign sign --key cosign.key \
  -a "build-id=12345" \
  -a "git-commit=$(git rev-parse HEAD)" \
  -a "builder=ci-pipeline" \
  "$IMAGE_DIGEST"

# Attach a vulnerability scan as an attestation
trivy image --format cosign-vuln --output vuln-report.json "$IMAGE_DIGEST"
cosign attest --key cosign.key \
  --predicate vuln-report.json \
  --type vuln \
  "$IMAGE_DIGEST"

# Attach an SBOM as an attestation
syft "$IMAGE_DIGEST" -o spdx-json > sbom.json
cosign attest --key cosign.key \
  --predicate sbom.json \
  --type spdxjson \
  "$IMAGE_DIGEST"
```

## Build Pipeline with Signing

Create a complete build, scan, and sign pipeline:

```bash
#!/bin/bash
# build-sign-push.sh

set -euo pipefail

IMAGE="registry.example.com/myapp"
VERSION="${1:-$(git describe --tags --always)}"
FULL_IMAGE="${IMAGE}:${VERSION}"
COSIGN_KEY="cosign.key"
DIGEST_FILE="$(mktemp)"

echo "=== Building ${FULL_IMAGE} ==="
podman build -t "$FULL_IMAGE" .

echo "=== Scanning for vulnerabilities ==="
trivy image --exit-code 1 --severity CRITICAL "$FULL_IMAGE"

echo "=== Pushing to registry ==="
podman push --digestfile "$DIGEST_FILE" "$FULL_IMAGE"

IMAGE_DIGEST="${IMAGE}@$(cat "$DIGEST_FILE")"

echo "=== Signing image ==="
cosign sign --yes --key "$COSIGN_KEY" \
  -a "git-commit=$(git rev-parse HEAD)" \
  -a "git-branch=$(git rev-parse --abbrev-ref HEAD)" \
  -a "build-date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  "$IMAGE_DIGEST"

echo "=== Attaching SBOM ==="
syft "$IMAGE_DIGEST" -o spdx-json > /tmp/sbom.json
cosign attest --key "$COSIGN_KEY" \
  --predicate /tmp/sbom.json \
  --type spdxjson \
  "$IMAGE_DIGEST"

echo "=== Verifying signature ==="
cosign verify --key cosign.pub "$IMAGE_DIGEST"

echo "=== Done ==="
echo "Image ${IMAGE_DIGEST} is built, scanned, signed, and pushed"
```

## Verification Before Deployment

Create a deployment script that verifies signatures:

```bash
#!/bin/bash
# verified-deploy.sh

set -euo pipefail

IMAGE="$1" # Pass a digest reference, not a mutable tag
PUBLIC_KEY="cosign.pub"

echo "Verifying image signature for $IMAGE..."

if cosign verify --key "$PUBLIC_KEY" "$IMAGE" > /dev/null 2>&1; then
    echo "Signature verified successfully"

    # Check attestations
    echo "Checking vulnerability attestation..."
    if cosign verify-attestation --key "$PUBLIC_KEY" --type vuln "$IMAGE" > /dev/null 2>&1; then
        echo "Vulnerability attestation verified"
    else
        echo "WARNING: Vulnerability attestation missing or failed verification"
    fi

    echo "Deploying $IMAGE..."
    podman pull "$IMAGE"
    podman run -d --name myapp --restart always "$IMAGE"
    echo "Deployment complete"
else
    echo "ERROR: Signature verification failed for $IMAGE"
    echo "This image may have been tampered with. Aborting deployment."
    exit 1
fi
```

## CI/CD Integration

Integrate signing into a CI pipeline:

```yaml
# .github/workflows/build-sign.yml
name: Build, Scan, and Sign
on:
  push:
    tags: ['v*']

jobs:
  build-and-sign:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Install Podman
        run: |
          sudo apt-get update
          sudo apt-get install -y podman

      - name: Install Cosign
        uses: sigstore/cosign-installer@v4.1.0

      - name: Build and push image
        run: |
          podman build -t registry.example.com/myapp:${{ github.ref_name }} .
          podman push --digestfile digest.txt registry.example.com/myapp:${{ github.ref_name }}
          echo "IMAGE_DIGEST=registry.example.com/myapp@$(cat digest.txt)" >> "$GITHUB_ENV"

      - name: Sign image (keyless)
        run: |
          cosign sign --yes "$IMAGE_DIGEST"

      - name: Verify signature
        run: |
          cosign verify \
            --certificate-identity="https://github.com/${{ github.repository }}/.github/workflows/build-sign.yml@refs/tags/${{ github.ref_name }}" \
            --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
            "$IMAGE_DIGEST"
```

## Configuring Podman for Signature Verification

Configure Podman to require signatures for specific registries:

```json
// /etc/containers/policy.json
{
    "default": [
        {
            "type": "insecureAcceptAnything"
        }
    ],
    "transports": {
        "docker": {
            "registry.example.com": [
                {
                    "type": "sigstoreSigned",
                    "keyPath": "/etc/pki/containers/cosign.pub",
                    "signedIdentity": {
                        "type": "matchRepository"
                    }
                }
            ]
        }
    }
}
```

```yaml
# /etc/containers/registries.d/registry.example.com.yaml
docker:
  registry.example.com:
    use-sigstore-attachments: true
```

With this policy and registry configuration, Podman will refuse to pull images from `registry.example.com` unless they have a valid Cosign signature.

## Transparency Logs

Cosign records signatures in the Rekor transparency log, providing an auditable record:

```bash
# Search the transparency log for signatures
rekor-cli search --email user@example.com

# Get signature details from the log
rekor-cli get --uuid <log-entry-uuid>

# Verify an entry in the transparency log
cosign verify --key cosign.pub \
  --rekor-url https://rekor.sigstore.dev \
  registry.example.com/myapp@sha256:<digest>
```

## Conclusion

Cosign and Podman together provide a practical path to container supply chain security. Image signing ensures that the images you deploy are the ones you built, and verification prevents tampered images from running in your environment. Keyless signing through Sigstore eliminates the operational burden of managing signing keys, while attestations let you attach security scan results and SBOMs to your images. Combined with Podman's native policy support for signature verification, you can enforce signing requirements at the container runtime level, creating a defense-in-depth approach to container supply chain security.
