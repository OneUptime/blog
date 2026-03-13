# How to Verify Flux CLI Binary Signatures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Supply Chain, Cosign, Binary Verification, CLI

Description: Learn how to verify the authenticity and integrity of Flux CLI binaries using checksums and Cosign signatures before installation.

---

When installing the Flux CLI, verifying the binary signature ensures that the downloaded file is authentic and has not been modified since it was built and released by the Flux team. This guide explains how to verify Flux CLI binary signatures using checksums and Cosign.

## Prerequisites

Before you begin, ensure you have the following:

- A terminal with internet access
- Cosign CLI installed (v2.0 or later)
- sha256sum or shasum utility (available on most Linux and macOS systems)
- curl or wget for downloading files

Install Cosign if needed:

```bash
# macOS
brew install cosign

# Linux
curl -sSL https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64 -o /usr/local/bin/cosign
chmod +x /usr/local/bin/cosign
```

## Step 1: Download the Flux CLI Binary and Checksums

Download the Flux CLI binary along with its checksum file and signature:

```bash
# Set the desired version
FLUX_VERSION=2.2.0

# Download the binary for your platform
curl -sSL -o flux.tar.gz "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_linux_amd64.tar.gz"

# Download the checksums file
curl -sSL -o checksums.txt "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_checksums.txt"

# Download the checksum signature
curl -sSL -o checksums.txt.sig "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_checksums.txt.sig"

# Download the checksum certificate
curl -sSL -o checksums.txt.pem "https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}/flux_${FLUX_VERSION}_checksums.txt.pem"
```

## Step 2: Verify the Checksum File Signature with Cosign

Verify that the checksums file itself was signed by the Flux project:

```bash
cosign verify-blob checksums.txt \
  --signature checksums.txt.sig \
  --certificate checksums.txt.pem \
  --certificate-identity-regexp="https://github.com/fluxcd/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

A successful verification will output:

```text
Verified OK
```

## Step 3: Verify the Binary Checksum

Once you have confirmed the integrity of the checksums file, verify the binary against its checksum:

```bash
# On Linux
sha256sum -c checksums.txt --ignore-missing

# On macOS
shasum -a 256 -c checksums.txt --ignore-missing
```

Expected output:

```bash
flux_2.2.0_linux_amd64.tar.gz: OK
```

## Step 4: Extract and Install the Verified Binary

After successful verification, extract and install the Flux CLI:

```bash
# Extract the binary
tar -xzf flux.tar.gz

# Move to a directory in your PATH
sudo mv flux /usr/local/bin/flux

# Verify the installation
flux version --client
```

## Step 5: Automate Verification in a Script

Create a reusable script that downloads, verifies, and installs the Flux CLI:

```bash
#!/bin/bash
set -euo pipefail

FLUX_VERSION="${1:?Usage: $0 <version>}"
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
esac

BASE_URL="https://github.com/fluxcd/flux2/releases/download/v${FLUX_VERSION}"
BINARY="flux_${FLUX_VERSION}_${OS}_${ARCH}.tar.gz"

echo "Downloading Flux CLI v${FLUX_VERSION} for ${OS}/${ARCH}..."
curl -sSL -o flux.tar.gz "${BASE_URL}/${BINARY}"
curl -sSL -o checksums.txt "${BASE_URL}/flux_${FLUX_VERSION}_checksums.txt"
curl -sSL -o checksums.txt.sig "${BASE_URL}/flux_${FLUX_VERSION}_checksums.txt.sig"
curl -sSL -o checksums.txt.pem "${BASE_URL}/flux_${FLUX_VERSION}_checksums.txt.pem"

echo "Verifying checksum signature..."
cosign verify-blob checksums.txt \
  --signature checksums.txt.sig \
  --certificate checksums.txt.pem \
  --certificate-identity-regexp="https://github.com/fluxcd/.*" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"

echo "Verifying binary checksum..."
sha256sum -c checksums.txt --ignore-missing 2>/dev/null || \
  shasum -a 256 -c checksums.txt --ignore-missing

echo "Installing Flux CLI..."
tar -xzf flux.tar.gz
sudo mv flux /usr/local/bin/flux

echo "Flux CLI v${FLUX_VERSION} installed and verified successfully."
flux version --client

# Clean up
rm -f flux.tar.gz checksums.txt checksums.txt.sig checksums.txt.pem
```

## Verification

After completing the steps above, confirm the following:

1. The Cosign signature verification for the checksums file returns "Verified OK"
2. The SHA256 checksum verification for the binary returns "OK"
3. Running `flux version --client` shows the expected version number

## Troubleshooting

### Error: Checksum verification failed

If the checksum does not match, the download may be corrupted. Re-download the binary:

```bash
rm flux.tar.gz
curl -sSL -o flux.tar.gz "${BASE_URL}/${BINARY}"
sha256sum -c checksums.txt --ignore-missing
```

### Error: No matching signatures

Ensure you are using a release version that includes Cosign signatures. Signatures are available for Flux v2.0.0 and later releases:

```bash
# List available release assets
curl -s "https://api.github.com/repos/fluxcd/flux2/releases/tags/v${FLUX_VERSION}" | jq '.assets[].name'
```

### Error: Certificate identity mismatch

Make sure the certificate identity regexp matches the Flux GitHub organization:

```bash
# Try with a more specific identity
cosign verify-blob checksums.txt \
  --signature checksums.txt.sig \
  --certificate checksums.txt.pem \
  --certificate-identity="https://github.com/fluxcd/flux2/.github/workflows/release.yml@refs/tags/v${FLUX_VERSION}" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

### Platform-specific issues on macOS

On macOS, you may need to use `shasum` instead of `sha256sum`:

```bash
shasum -a 256 -c checksums.txt --ignore-missing
```

If macOS Gatekeeper blocks the binary, remove the quarantine attribute:

```bash
xattr -d com.apple.quarantine /usr/local/bin/flux
```

## Summary

Verifying the Flux CLI binary before installation is an important supply chain security practice. By checking both the Cosign signature on the checksums file and the SHA256 checksum of the binary, you can be confident that the Flux CLI you install is the genuine, unmodified release from the Flux project. Consider integrating this verification into your provisioning and CI/CD workflows to maintain consistent security standards.
