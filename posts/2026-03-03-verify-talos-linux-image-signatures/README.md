# How to Verify Talos Linux Image Signatures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Image Verification, Security, Supply Chain, Container Security

Description: Learn how to verify Talos Linux image signatures to ensure the integrity and authenticity of your operating system images before deployment.

---

Supply chain attacks are a growing threat in the infrastructure world. When you download a Talos Linux image, you need to be confident it has not been tampered with. Image signature verification gives you that confidence by cryptographically proving that the image was built by the Talos team and has not been modified since.

Talos Linux signs its release images using cosign (from the Sigstore project), and this guide shows you how to verify those signatures before deploying images to your cluster.

## Why Image Verification Matters

Every time you install or upgrade a Talos Linux node, you are running code that has complete control over the underlying hardware. If that code has been modified by an attacker - whether through a compromised download mirror, a man-in-the-middle attack, or a supply chain compromise - your entire cluster is at risk.

Image verification protects against:

- **Tampered downloads**: Someone modifies the image on a mirror or CDN
- **Build system compromise**: An attacker injects code during the build process
- **Network attacks**: Man-in-the-middle modification of images during download
- **Storage compromise**: Images are modified after being downloaded to local storage

## Understanding Talos Image Signing

Talos Linux uses cosign from the Sigstore project to sign container images and release artifacts. The signing process works like this:

1. The Talos CI/CD pipeline builds the release images
2. Each image is signed with a private key controlled by Sidero Labs
3. The signature is stored alongside the image in the container registry
4. Users verify the signature using the corresponding public key

Talos also uses Sigstore's keyless signing with the Rekor transparency log, which provides an additional layer of accountability.

## Installing Verification Tools

You need cosign to verify Talos image signatures.

```bash
# Install cosign on macOS
brew install cosign

# Install cosign on Linux
wget https://github.com/sigstore/cosign/releases/download/v2.4.0/cosign-linux-amd64
chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign

# Verify cosign is installed
cosign version
```

You will also want to have the standard SHA256 verification tools available:

```bash
# These are usually pre-installed on Linux/macOS
sha256sum --version  # Linux
shasum --version     # macOS
```

## Verifying Container Images

Talos Linux container images (used for installation and upgrades) are published to `ghcr.io/siderolabs/`.

### Verify the Installer Image

```bash
# Verify the Talos installer image signature
cosign verify \
  --certificate-identity-regexp "https://github.com/siderolabs/talos" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ghcr.io/siderolabs/installer:v1.9.0

# If verification succeeds, you will see the signature details
# If it fails, cosign will exit with a non-zero code
```

### Verify the Talos Image

```bash
# Verify the main Talos image
cosign verify \
  --certificate-identity-regexp "https://github.com/siderolabs/talos" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ghcr.io/siderolabs/talos:v1.9.0
```

### Verify with a Specific Public Key

If you prefer to verify against the Talos public key directly:

```bash
# Download the Talos cosign public key
wget https://github.com/siderolabs/talos/raw/main/cosign.pub

# Verify using the public key
cosign verify \
  --key cosign.pub \
  ghcr.io/siderolabs/installer:v1.9.0
```

## Verifying ISO and Raw Images

For bare metal installations, you typically download ISO or raw disk images. These are verified using SHA256 checksums that are themselves signed.

### Download and Verify Checksums

```bash
# Download the image and checksum files
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-amd64.iso
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/sha256sum.txt
wget https://github.com/siderolabs/talos/releases/download/v1.9.0/sha256sum.txt.sig

# Verify the checksum file signature
cosign verify-blob \
  --certificate-identity-regexp "https://github.com/siderolabs/talos" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --signature sha256sum.txt.sig \
  sha256sum.txt

# Verify the image against the checksum
sha256sum -c sha256sum.txt --ignore-missing
# Or on macOS:
shasum -a 256 -c sha256sum.txt --ignore-missing
```

### Manual Checksum Verification

```bash
# Calculate the SHA256 hash of the downloaded image
sha256sum metal-amd64.iso

# Compare with the expected hash from the checksum file
grep "metal-amd64.iso" sha256sum.txt

# They should match exactly
```

## Verifying Image Factory Images

The Talos Image Factory (factory.talos.dev) builds custom images with your specific configuration. These images are also signed.

```bash
# Verify an Image Factory image
cosign verify \
  --certificate-identity-regexp "https://github.com/siderolabs" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  factory.talos.dev/installer/SCHEMATIC_ID:v1.9.0
```

## Integrating Verification into Your Workflow

### Pre-Upgrade Verification Script

Create a script that verifies images before applying upgrades.

```bash
#!/bin/bash
# verify-and-upgrade.sh
# Verifies the Talos image signature before upgrading a node

set -euo pipefail

IMAGE=$1
NODE=$2

if [ -z "$IMAGE" ] || [ -z "$NODE" ]; then
  echo "Usage: verify-and-upgrade.sh <image> <node-ip>"
  exit 1
fi

echo "Verifying image signature: $IMAGE"

# Verify the image signature
if cosign verify \
  --certificate-identity-regexp "https://github.com/siderolabs" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "$IMAGE" > /dev/null 2>&1; then
  echo "Image signature verified successfully"
else
  echo "ERROR: Image signature verification failed!"
  echo "Do NOT use this image. It may have been tampered with."
  exit 1
fi

# Proceed with upgrade
echo "Upgrading node $NODE with verified image..."
talosctl -n "$NODE" upgrade --image "$IMAGE"
```

### CI/CD Pipeline Verification

Add verification to your CI/CD pipeline before any deployment.

```yaml
# GitHub Actions example
- name: Verify Talos Image
  run: |
    cosign verify \
      --certificate-identity-regexp "https://github.com/siderolabs/talos" \
      --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
      ghcr.io/siderolabs/installer:v1.9.0

- name: Upgrade Cluster
  if: success()
  run: |
    talosctl -n ${{ env.NODE_IP }} upgrade \
      --image ghcr.io/siderolabs/installer:v1.9.0
```

## Verifying SBOM (Software Bill of Materials)

Talos Linux also publishes SBOMs for its images, allowing you to inspect the full list of components included.

```bash
# Download the SBOM for a Talos image
cosign download sbom ghcr.io/siderolabs/talos:v1.9.0 > talos-sbom.json

# Inspect the SBOM
cat talos-sbom.json | jq '.components | length'
cat talos-sbom.json | jq '.components[].name'
```

This helps you audit exactly what software is included in the image and check for known vulnerabilities.

## Checking the Rekor Transparency Log

Sigstore's Rekor transparency log provides a public, tamper-proof record of all signing events.

```bash
# Search for Talos signing events in Rekor
rekor-cli search --email "talos@siderolabs.com"

# Get details about a specific signing event
rekor-cli get --uuid <log-entry-uuid>

# Verify that a signing event exists in the log
cosign verify \
  --certificate-identity-regexp "https://github.com/siderolabs" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  --rekor-url https://rekor.sigstore.dev \
  ghcr.io/siderolabs/installer:v1.9.0
```

## Handling Verification Failures

If verification fails, do not use the image. Here is how to troubleshoot:

```bash
# Common causes of verification failure:

# 1. Wrong image reference
# Make sure you are using the exact tag or digest
cosign verify \
  --key cosign.pub \
  ghcr.io/siderolabs/installer:v1.9.0@sha256:abc123...

# 2. Outdated cosign version
cosign version
# Update if needed

# 3. Network issues preventing access to Rekor
# Try with the public key directly
cosign verify --key cosign.pub ghcr.io/siderolabs/installer:v1.9.0

# 4. Image from an untrusted source
# Only use images from official sources:
# - ghcr.io/siderolabs/
# - factory.talos.dev/
```

## Best Practices

1. **Always verify before deploying**: Make image verification a mandatory step in your deployment process, not an optional check.
2. **Pin images by digest**: Use SHA256 digests instead of tags for production deployments, since tags can be moved but digests are immutable.
3. **Automate verification**: Build verification into your CI/CD pipeline so it happens automatically.
4. **Keep cosign updated**: New versions include security fixes and support for evolving signature formats.
5. **Monitor the Rekor log**: Periodically check that signing events for your images appear in the transparency log.

```bash
# Pin an image by digest for maximum security
talosctl -n 10.0.1.10 upgrade \
  --image ghcr.io/siderolabs/installer@sha256:abc123def456...
```

## Conclusion

Verifying Talos Linux image signatures is a straightforward but important security practice. By using cosign to check signatures before deployment, you can be confident that the images running on your nodes are authentic and unmodified. Make verification a standard part of your installation and upgrade workflow, and you will significantly reduce your exposure to supply chain attacks. The few seconds it takes to verify an image are well worth the protection it provides.
