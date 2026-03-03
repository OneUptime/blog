# How to Verify Terraform Binary Integrity with SHA256 Checksums

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, SHA256, Checksums, Verification, DevOps, Supply Chain Security

Description: Learn how to verify the integrity and authenticity of Terraform binary downloads using SHA256 checksums and GPG signature verification.

---

When you download software from the internet, you should verify that what you received is exactly what the publisher intended to send. Supply chain attacks - where attackers tamper with downloads or compromise distribution servers - are a real threat. Terraform downloads include SHA256 checksums and GPG signatures specifically to let you verify integrity and authenticity before installing.

This guide walks through the full verification process step by step.

## Why Verify?

There are two things you want to confirm:

1. **Integrity** - The file you downloaded has not been corrupted or tampered with during transit (SHA256 checksum verification)
2. **Authenticity** - The checksums themselves were actually published by HashiCorp, not by an attacker (GPG signature verification)

Checking just the SHA256 hash confirms integrity. Checking the GPG signature on the checksum file confirms authenticity. Together, they give you strong assurance that you are installing a genuine Terraform binary.

## Step 1 - Download Terraform and Checksum Files

When downloading Terraform manually, you need three files:

```bash
# Set the version
TERRAFORM_VERSION="1.7.5"

# Download the Terraform binary zip
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"

# Download the SHA256 checksums file
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS"

# Download the GPG signature of the checksums file
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS.sig"
```

The `SHA256SUMS` file contains checksums for all platforms (Linux, macOS, Windows, ARM, etc.) in a single file. The `.sig` file is a detached GPG signature of the checksums file.

## Step 2 - Verify the SHA256 Checksum

### On Linux

```bash
# Verify the checksum of the downloaded zip
# This checks only the line matching your downloaded file
sha256sum -c terraform_${TERRAFORM_VERSION}_SHA256SUMS --ignore-missing
```

Expected output:

```text
terraform_1.7.5_linux_amd64.zip: OK
```

If you see `FAILED`, the file is corrupted or tampered with. Do not install it.

The `--ignore-missing` flag tells `sha256sum` to skip checksums for files you did not download (like the Windows and macOS builds).

### On macOS

macOS uses `shasum` instead of `sha256sum`:

```bash
# Verify checksum on macOS
shasum -a 256 -c terraform_${TERRAFORM_VERSION}_SHA256SUMS --ignore-missing
```

### Manual Verification

If the automated check does not work on your system, you can compare the checksums manually:

```bash
# Calculate the SHA256 hash of your downloaded file
sha256sum terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Display the expected hash from the checksums file
grep "linux_amd64" terraform_${TERRAFORM_VERSION}_SHA256SUMS
```

Compare the two hashes visually. They must match exactly.

## Step 3 - Verify the GPG Signature

Verifying the SHA256 checksum proves the file was not corrupted, but how do you know the checksums file itself is legitimate? That is what GPG signature verification does.

### Import HashiCorp's GPG Key

HashiCorp publishes their GPG public key. You need to import it once:

```bash
# Download and import HashiCorp's GPG public key
curl -sL https://www.hashicorp.com/security/hashicorp-security.asc | gpg --import
```

You can verify the key fingerprint:

```bash
# List the imported key and check its fingerprint
gpg --list-keys --fingerprint security@hashicorp.com
```

The key fingerprint should match what HashiCorp publishes on their security page. At the time of writing, the primary signing key fingerprint is:

```text
C874 011F 0AB4 0511 0D02 1055 3436 5D94 72D7 468F
```

Always cross-reference this with HashiCorp's official security page at https://www.hashicorp.com/security.

### Verify the Signature

```bash
# Verify the GPG signature on the checksums file
gpg --verify terraform_${TERRAFORM_VERSION}_SHA256SUMS.sig terraform_${TERRAFORM_VERSION}_SHA256SUMS
```

Expected output (the important line):

```text
gpg: Good signature from "HashiCorp Security (hashicorp.com/security) <security@hashicorp.com>"
```

You might also see a warning about the key not being certified with a trusted signature. This is normal unless you have explicitly signed HashiCorp's key with your own GPG key:

```text
gpg: WARNING: This key is not certified with a trusted signature!
gpg:          There is no indication that the signature belongs to the owner.
```

As long as you see `Good signature` and the fingerprint matches, you are fine. The warning is about GPG's web of trust, not about the signature being invalid.

If you see `BAD signature`, do not use the checksums file. Something is wrong.

## Complete Verification Script

Here is a script that performs the full verification process:

```bash
#!/bin/bash
# verify-terraform.sh - Download and verify Terraform binary
# Usage: ./verify-terraform.sh 1.7.5 linux amd64

set -euo pipefail

VERSION="${1:?Usage: $0 VERSION OS ARCH}"
OS="${2:?Usage: $0 VERSION OS ARCH}"
ARCH="${3:?Usage: $0 VERSION OS ARCH}"

BASEURL="https://releases.hashicorp.com/terraform/${VERSION}"
ZIPFILE="terraform_${VERSION}_${OS}_${ARCH}.zip"
SUMSFILE="terraform_${VERSION}_SHA256SUMS"
SIGFILE="${SUMSFILE}.sig"

echo "Downloading Terraform ${VERSION} for ${OS}/${ARCH}..."
curl -sLO "${BASEURL}/${ZIPFILE}"
curl -sLO "${BASEURL}/${SUMSFILE}"
curl -sLO "${BASEURL}/${SIGFILE}"

echo ""
echo "Importing HashiCorp GPG key..."
curl -sL https://www.hashicorp.com/security/hashicorp-security.asc | gpg --import 2>/dev/null

echo ""
echo "Verifying GPG signature..."
if gpg --verify "${SIGFILE}" "${SUMSFILE}" 2>&1 | grep -q "Good signature"; then
    echo "GPG signature: VALID"
else
    echo "GPG signature: INVALID - aborting!"
    rm -f "${ZIPFILE}" "${SUMSFILE}" "${SIGFILE}"
    exit 1
fi

echo ""
echo "Verifying SHA256 checksum..."
if sha256sum -c "${SUMSFILE}" --ignore-missing 2>/dev/null || shasum -a 256 -c "${SUMSFILE}" --ignore-missing 2>/dev/null; then
    echo "SHA256 checksum: VALID"
else
    echo "SHA256 checksum: INVALID - aborting!"
    rm -f "${ZIPFILE}" "${SUMSFILE}" "${SIGFILE}"
    exit 1
fi

echo ""
echo "Verification successful. Extracting..."
unzip -o "${ZIPFILE}"

echo ""
echo "Cleaning up verification files..."
rm -f "${SUMSFILE}" "${SIGFILE}"

echo ""
echo "Terraform ${VERSION} is ready:"
./terraform -version
```

Use it like:

```bash
# Make the script executable
chmod +x verify-terraform.sh

# Download and verify Terraform for Linux AMD64
./verify-terraform.sh 1.7.5 linux amd64

# For macOS ARM64
./verify-terraform.sh 1.7.5 darwin arm64
```

## Automating Verification in CI/CD

In CI/CD pipelines, automated verification protects against supply chain attacks:

```yaml
# GitHub Actions example
- name: Install Terraform with verification
  run: |
    VERSION="1.7.5"
    curl -sLO "https://releases.hashicorp.com/terraform/${VERSION}/terraform_${VERSION}_linux_amd64.zip"
    curl -sLO "https://releases.hashicorp.com/terraform/${VERSION}/terraform_${VERSION}_SHA256SUMS"

    # Verify checksum
    sha256sum -c "terraform_${VERSION}_SHA256SUMS" --ignore-missing

    # Extract and install
    unzip "terraform_${VERSION}_linux_amd64.zip"
    sudo mv terraform /usr/local/bin/
    terraform -version
```

For even stronger verification in CI/CD, include the GPG check too:

```yaml
- name: Install and verify Terraform
  run: |
    VERSION="1.7.5"

    # Download files
    curl -sLO "https://releases.hashicorp.com/terraform/${VERSION}/terraform_${VERSION}_linux_amd64.zip"
    curl -sLO "https://releases.hashicorp.com/terraform/${VERSION}/terraform_${VERSION}_SHA256SUMS"
    curl -sLO "https://releases.hashicorp.com/terraform/${VERSION}/terraform_${VERSION}_SHA256SUMS.sig"

    # Import GPG key and verify signature
    curl -sL https://www.hashicorp.com/security/hashicorp-security.asc | gpg --import
    gpg --verify "terraform_${VERSION}_SHA256SUMS.sig" "terraform_${VERSION}_SHA256SUMS"

    # Verify checksum
    sha256sum -c "terraform_${VERSION}_SHA256SUMS" --ignore-missing

    # Install
    unzip "terraform_${VERSION}_linux_amd64.zip"
    sudo mv terraform /usr/local/bin/
```

## Package Manager Verification

If you install Terraform via a package manager (Homebrew, APT, DNF), the package manager handles verification for you:

- **Homebrew** verifies SHA256 checksums of downloaded bottles
- **APT** (Debian/Ubuntu) verifies GPG signatures on the repository and package checksums
- **DNF** (RHEL/CentOS) verifies RPM GPG signatures

This is another good reason to use package managers when possible. But when you download binaries manually, always verify.

## What to Do If Verification Fails

If either the checksum or GPG verification fails:

1. **Do not install the binary**
2. Delete the downloaded files
3. Try downloading again (it might have been a network issue causing corruption)
4. If it fails again, try downloading from a different network
5. Check HashiCorp's status page for any reported incidents
6. Report the issue to HashiCorp's security team at security@hashicorp.com

A single checksum failure might be a flaky download. Repeated failures are suspicious and worth investigating.

## Conclusion

Verifying Terraform binary integrity takes less than a minute and significantly reduces your exposure to supply chain attacks. The SHA256 checksum catches corruption and tampering, while the GPG signature confirms the checksums came from HashiCorp. Make it a habit, especially in production environments and CI/CD pipelines where the consequences of running a tampered binary could be severe.
