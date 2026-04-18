# How to Verify Your OpenTofu Installation with Checksums

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Security, Checksum, Verification, Infrastructure as Code, DevOps

Description: A guide to verifying OpenTofu binary integrity using SHA256 checksums and GPG signature verification.

## Introduction

Verifying the integrity of downloaded binaries is a critical security practice. OpenTofu provides SHA256 checksums and GPG signatures for all release artifacts. This guide covers how to verify your OpenTofu installation to ensure it hasn't been tampered with.

## Why Verification Matters

- Ensures the binary was not corrupted during download
- Protects against supply chain attacks
- Confirms the binary was built and signed by the OpenTofu team
- Required for compliance in security-conscious environments

## Step 1: Download the Release Files

```bash
TOFU_VERSION="1.9.0"
ARCH="linux_amd64"

# Download the binary

curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_${ARCH}.zip"

# Download the checksums file
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS"

# Download the cosign signature file
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS.sig"

# Download the cosign signing certificate
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS.pem"

# Download the GPG signature file
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS.gpgsig"
```

## Step 2: Verify SHA256 Checksum

```bash
# Verify the checksum of the downloaded zip
sha256sum -c --ignore-missing "tofu_${TOFU_VERSION}_SHA256SUMS"

# Expected output:
# tofu_1.9.0_linux_amd64.zip: OK

# Or manually check
sha256sum "tofu_${TOFU_VERSION}_${ARCH}.zip"
grep "${ARCH}.zip" "tofu_${TOFU_VERSION}_SHA256SUMS"
# The hash values should match
```

## Step 3: Verify the GPG Signature

The OpenTofu team also signs the checksums file with a GPG key. The GPG signature is the `.gpgsig` file (not `.sig`, which is a cosign signature).

```bash
# Download the OpenTofu GPG public key
curl -fsSL -O https://get.opentofu.org/opentofu.asc

# Verify the key fingerprint matches the expected value:
# E3E6E43D84CB852EADB0051D0C0AF313E5FD9F80
gpg --show-keys --with-fingerprint opentofu.asc

# Import the OpenTofu public key
gpg --import opentofu.asc

# Verify the signature
gpg --verify "tofu_${TOFU_VERSION}_SHA256SUMS.gpgsig" "tofu_${TOFU_VERSION}_SHA256SUMS"

# Expected output:
# gpg: Signature made...
# gpg: Good signature from "OpenTofu (..."
```

## Step 4: Verify Using cosign (Advanced)

```bash
# Install cosign
curl -LO "https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64"
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
sudo chmod +x /usr/local/bin/cosign

# Derive the major.minor portion of the version (e.g., 1.9 from 1.9.0)
TOFU_MAJORMINOR="$(echo "${TOFU_VERSION}" | cut -d. -f1,2)"

# Verify using sigstore. Note: the certificate-identity uses the release
# branch ref (refs/heads/v<MAJOR.MINOR>), not a tag ref.
cosign verify-blob \
  --certificate "tofu_${TOFU_VERSION}_SHA256SUMS.pem" \
  --signature "tofu_${TOFU_VERSION}_SHA256SUMS.sig" \
  --certificate-identity "https://github.com/opentofu/opentofu/.github/workflows/release.yml@refs/heads/v${TOFU_MAJORMINOR}" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  "tofu_${TOFU_VERSION}_SHA256SUMS"
```

## Scripted Verification

Automate the entire verification process:

```bash
#!/bin/bash
# verify-tofu.sh - Download and verify OpenTofu

set -euo pipefail

TOFU_VERSION="${1:-1.9.0}"
ARCH="linux_amd64"
BASE_URL="https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}"

echo "Downloading OpenTofu v${TOFU_VERSION}..."

# Download files
for file in \
  "tofu_${TOFU_VERSION}_${ARCH}.zip" \
  "tofu_${TOFU_VERSION}_SHA256SUMS" \
  "tofu_${TOFU_VERSION}_SHA256SUMS.gpgsig"; do
  curl -fsSL -O "${BASE_URL}/${file}"
done

# Download the OpenTofu GPG public key
curl -fsSL -O https://get.opentofu.org/opentofu.asc

echo "Verifying SHA256 checksum..."
sha256sum -c --ignore-missing "tofu_${TOFU_VERSION}_SHA256SUMS"
echo "Checksum verification: PASSED"

echo "Verifying GPG signature..."
gpg --import opentofu.asc 2>/dev/null
gpg --verify "tofu_${TOFU_VERSION}_SHA256SUMS.gpgsig" "tofu_${TOFU_VERSION}_SHA256SUMS"
echo "GPG signature verification: PASSED"

echo "Extracting binary..."
unzip "tofu_${TOFU_VERSION}_${ARCH}.zip"
echo "Installation ready. Binary: ./tofu"
```

```bash
# Run the verification script
chmod +x verify-tofu.sh
./verify-tofu.sh 1.9.0
```

## Verifying on macOS

```bash
# On macOS, use shasum instead of sha256sum
shasum -a 256 -c --ignore-missing "tofu_${TOFU_VERSION}_SHA256SUMS"
```

## Conclusion

Verifying OpenTofu downloads using checksums and GPG signatures is a fundamental security practice. This is especially important in automated CI/CD pipelines where compromised binaries could affect your entire infrastructure. Always verify before installing, and consider automating verification as part of your deployment scripts.
