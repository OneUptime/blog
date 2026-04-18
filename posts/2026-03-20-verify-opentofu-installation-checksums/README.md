# How to Verify Your OpenTofu Installation with Checksums - Installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Security, Checksum, Installation, GPG, Infrastructure as Code

Description: Learn how to verify the integrity of your OpenTofu binary by checking SHA256 checksums and GPG signatures before installation.

---

Verifying your OpenTofu installation ensures the binary you downloaded hasn't been tampered with during transit. OpenTofu provides SHA256 checksums and GPG-signed checksum files with every release. This guide walks through verification before installation - a security best practice, especially for CI/CD environments.

---

## What OpenTofu Provides for Verification

Each OpenTofu release includes:
- `tofu_<version>_<os>_<arch>.zip` - the binary archive
- `tofu_<version>_SHA256SUMS` - SHA256 checksum file
- `tofu_<version>_SHA256SUMS.gpgsig` - GPG signature of the checksum file
- `tofu_<version>_SHA256SUMS.sig` - cosign signature of the checksum file
- `tofu_<version>_SHA256SUMS.pem` - cosign certificate

---

## Step 1: Download the Binary and Checksums

```bash
TOFU_VERSION="1.9.0"
OS="linux_amd64"  # change to your OS/arch: linux_arm64, darwin_amd64, windows_amd64

# Download the binary archive

curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_${OS}.zip"

# Download the checksum file
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS"

# Download the GPG signature (for cryptographic verification)
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS.gpgsig"
```

---

## Step 2: Verify the SHA256 Checksum

```bash
# Check the SHA256 checksum of the downloaded zip
# --check: verify against the checksums file
# --ignore-missing: skip checksums for files we didn't download
sha256sum --check --ignore-missing tofu_${TOFU_VERSION}_SHA256SUMS

# Expected output:
# tofu_1.9.0_linux_amd64.zip: OK

# macOS alternative (uses shasum instead of sha256sum)
shasum -a 256 --check --ignore-missing tofu_${TOFU_VERSION}_SHA256SUMS
```

---

## Step 3: Verify the GPG Signature

GPG verification confirms the checksum file was signed by the OpenTofu project's key.

```bash
# Import the OpenTofu GPG public key
curl -s https://get.opentofu.org/opentofu.gpg | gpg --import

# Verify the signature on the checksums file
gpg --verify tofu_${TOFU_VERSION}_SHA256SUMS.gpgsig tofu_${TOFU_VERSION}_SHA256SUMS

# Expected output:
# gpg: Good signature from "OpenTofu <core@opentofu.org>"
```

---

## Step 4: Verify with Cosign (Alternative)

OpenTofu also supports verification via Sigstore cosign.

```bash
# Install cosign
curl -LO https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
sudo install cosign-linux-amd64 /usr/local/bin/cosign

# Download the cosign certificate and signature
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS.pem"
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS.sig"

# Derive the MAJOR.MINOR branch used by the release workflow (e.g. 1.9)
TOFU_MAJORMINOR="$(echo "${TOFU_VERSION}" | cut -d. -f1,2)"

# Verify using cosign (keyless verification requires identity and OIDC issuer)
cosign verify-blob \
  --certificate tofu_${TOFU_VERSION}_SHA256SUMS.pem \
  --signature tofu_${TOFU_VERSION}_SHA256SUMS.sig \
  --certificate-identity "https://github.com/opentofu/opentofu/.github/workflows/release.yml@refs/heads/v${TOFU_MAJORMINOR}" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  tofu_${TOFU_VERSION}_SHA256SUMS
```

---

## Step 5: Install After Verification

Only install after verification succeeds.

```bash
# Extract the verified binary
unzip tofu_${TOFU_VERSION}_${OS}.zip

# Move to a system-wide location
sudo install -m 755 tofu /usr/local/bin/tofu

# Confirm installation
tofu version
# Expected: OpenTofu v1.9.0

# Clean up downloaded files
rm tofu_${TOFU_VERSION}_${OS}.zip tofu_${TOFU_VERSION}_SHA256SUMS*
```

---

## Automate Verification in CI/CD

```bash
#!/bin/bash
# install-opentofu-verified.sh - verified OpenTofu installation for CI/CD

set -euo pipefail

TOFU_VERSION="${TOFU_VERSION:-1.9.0}"
OS="${OS:-linux_amd64}"
BASE_URL="https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}"

curl -LfO "$BASE_URL/tofu_${TOFU_VERSION}_${OS}.zip"
curl -LfO "$BASE_URL/tofu_${TOFU_VERSION}_SHA256SUMS"

# Verify checksum
sha256sum --check --ignore-missing "tofu_${TOFU_VERSION}_SHA256SUMS"

# Install
unzip "tofu_${TOFU_VERSION}_${OS}.zip"
sudo install -m 755 tofu /usr/local/bin/tofu

echo "OpenTofu ${TOFU_VERSION} installed and verified."
tofu version
```

---

## Summary

Verifying OpenTofu with checksums and GPG signatures takes 2 minutes and ensures your binary is authentic and unmodified. The process: download the binary and `SHA256SUMS` file, run `sha256sum --check`, then optionally verify the GPG signature. Automate this process in CI/CD pipelines where OpenTofu is installed programmatically.
