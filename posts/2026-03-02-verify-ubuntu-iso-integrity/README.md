# How to Verify the Integrity of an Ubuntu ISO Before Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, ISO, Verification

Description: A step-by-step guide to verifying Ubuntu ISO integrity using SHA256 checksums and GPG signature verification before installing or writing to physical media.

---

Downloading a large ISO over the internet and assuming it arrived intact is an optimistic stance. Disk errors, network corruption, and in rare cases malicious tampering can all produce a modified ISO that either fails to install correctly or, in the worst case, installs compromised software. Verifying the ISO before use takes a few minutes and eliminates all of these risks.

## What Verification Actually Checks

There are two separate things to verify:

1. **Checksum verification**: Confirms the downloaded file matches a known hash. This detects corruption during download.
2. **GPG signature verification**: Confirms the checksum file itself was signed by Canonical's signing key. This detects tampering - if someone replaced the ISO with a malicious version and updated the checksum to match, GPG verification would still fail because they cannot forge Canonical's signature.

Doing only the checksum step is better than nothing but does not fully protect against targeted attacks. Doing both is the complete approach.

## Downloading the Required Files

From the Ubuntu download page (ubuntu.com/download/server), download:
- The ISO file (e.g., `ubuntu-24.04-live-server-amd64.iso`)
- The SHA256SUMS file
- The SHA256SUMS.gpg file (the GPG signature of the SHA256SUMS file)

These are typically listed alongside the download link. You can also fetch them directly:

```bash
# Download the release files for Ubuntu 24.04 LTS
cd ~/Downloads

# Download the ISO
wget https://releases.ubuntu.com/24.04/ubuntu-24.04-live-server-amd64.iso

# Download the checksums and GPG signature
wget https://releases.ubuntu.com/24.04/SHA256SUMS
wget https://releases.ubuntu.com/24.04/SHA256SUMS.gpg
```

## Step 1: Verify the GPG Signature

This step verifies that SHA256SUMS was actually signed by Canonical and has not been modified.

### Import Canonical's Signing Key

Ubuntu release ISOs are signed with a key from Canonical's Ubuntu CD Image signing key:

```bash
# Import the Ubuntu CD Images key from Ubuntu's keyserver
gpg --keyid-format long --keyserver hkp://keyserver.ubuntu.com --recv-keys 0x843938DF228D22F7B3742BC0D94AA3F0EFE21092

# Verify the import
gpg --keyid-format long --list-keys 0x843938DF228D22F7B3742BC0D94AA3F0EFE21092
```

The output should show a key owned by "Ubuntu CD Image Automatic Signing Key (2012)" or similar.

### Verify the Signature

```bash
gpg --keyid-format long --verify SHA256SUMS.gpg SHA256SUMS
```

Look for this in the output:

```text
gpg: Good signature from "Ubuntu CD Image Automatic Signing Key (2012) <cdimage@ubuntu.com>" [unknown]
```

The `[unknown]` trust level is normal - it just means you have not explicitly set a trust level for this key. "Good signature" is what matters.

If you see "BAD signature," stop. The SHA256SUMS file has been tampered with, and you should not trust any checksums from it.

## Step 2: Verify the ISO Checksum

Once you have confirmed the SHA256SUMS file is authentic, use it to verify the ISO:

```bash
# Calculate the SHA256 hash of the downloaded ISO and compare to SHA256SUMS
sha256sum --check SHA256SUMS --ignore-missing
```

The `--ignore-missing` flag tells sha256sum not to fail if other ISOs listed in SHA256SUMS are not present (you may only have downloaded one ISO).

Expected output:

```text
ubuntu-24.04-live-server-amd64.iso: OK
```

If it says `FAILED`, the ISO is corrupt or tampered with. Download it again from a different mirror.

### Manual Comparison

If you prefer to compare manually:

```bash
# Calculate the hash
sha256sum ubuntu-24.04-live-server-amd64.iso

# View the expected hash from the file
grep ubuntu-24.04-live-server-amd64.iso SHA256SUMS
```

Compare the two outputs character by character. They must match exactly.

## Verifying on Windows

Windows does not have `sha256sum` built in (unless you are using WSL), but PowerShell has equivalent functionality:

```powershell
# Compute SHA256 hash of the ISO
Get-FileHash "ubuntu-24.04-live-server-amd64.iso" -Algorithm SHA256

# Compare the hash value with the one in SHA256SUMS
# Open SHA256SUMS in a text editor and compare manually
```

For GPG verification on Windows, install GPG4Win (gpg4win.org) and use the Kleopatra GUI or the gpg command in a terminal.

## Verifying on macOS

macOS includes `shasum` (not `sha256sum`):

```bash
# Compute SHA256 on macOS
shasum -a 256 ubuntu-24.04-live-server-amd64.iso

# Compare with expected value from SHA256SUMS
grep ubuntu-24.04-live-server-amd64.iso SHA256SUMS
```

For GPG on macOS, install GPG Suite (gpgtools.org) or use Homebrew:

```bash
brew install gnupg
```

## Automating the Verification

For environments where you download ISOs regularly, a script simplifies the process:

```bash
#!/bin/bash
# verify-ubuntu-iso.sh

set -e

ISO_FILE="$1"
RELEASE_URL="${2:-https://releases.ubuntu.com/24.04}"

if [ -z "$ISO_FILE" ]; then
    echo "Usage: $0 <iso-file> [release-url]"
    exit 1
fi

if [ ! -f "$ISO_FILE" ]; then
    echo "ISO file not found: $ISO_FILE"
    exit 1
fi

# Download verification files
echo "Downloading SHA256SUMS and signature..."
wget -q -O SHA256SUMS "${RELEASE_URL}/SHA256SUMS"
wget -q -O SHA256SUMS.gpg "${RELEASE_URL}/SHA256SUMS.gpg"

# Import Canonical's key if not present
echo "Importing Ubuntu signing key..."
gpg --keyid-format long --keyserver hkp://keyserver.ubuntu.com \
    --recv-keys 0x843938DF228D22F7B3742BC0D94AA3F0EFE21092 2>/dev/null

# Verify GPG signature
echo "Verifying GPG signature..."
if gpg --keyid-format long --verify SHA256SUMS.gpg SHA256SUMS 2>&1 | grep -q "Good signature"; then
    echo "GPG signature: VALID"
else
    echo "GPG signature: INVALID - DO NOT USE THIS ISO"
    exit 1
fi

# Verify checksum
echo "Verifying SHA256 checksum..."
if sha256sum --check SHA256SUMS --ignore-missing 2>/dev/null | grep -q "OK"; then
    echo "Checksum: VALID"
    echo ""
    echo "ISO verified successfully."
else
    echo "Checksum: FAILED - ISO is corrupt or tampered"
    exit 1
fi
```

```bash
chmod +x verify-ubuntu-iso.sh
./verify-ubuntu-iso.sh ubuntu-24.04-live-server-amd64.iso
```

## Verifying After Writing to USB

After writing the ISO to a USB drive, you can also verify the write was successful:

```bash
# Read back from the USB drive and compare hash
# Replace /dev/sdX with your USB device
# The count argument matches the ISO size in blocks
ISO_BLOCKS=$(stat -c %s ubuntu-24.04-live-server-amd64.iso)
ISO_BYTES=$(ls -l ubuntu-24.04-live-server-amd64.iso | awk '{print $5}')
ISO_MB=$((ISO_BYTES / 1024 / 1024))

# Read back and hash (this reads only as much as the ISO size)
sudo dd if=/dev/sdX bs=1M count=$ISO_MB status=progress | sha256sum
```

Compare the output hash to the value in SHA256SUMS. A match means the USB was written correctly.

## Checking Key Fingerprints

If you receive a Canonical signing key from any source, verify its fingerprint matches what Canonical publishes:

```bash
gpg --fingerprint 0x843938DF228D22F7B3742BC0D94AA3F0EFE21092
```

The fingerprint should match what is published on Canonical's website. Never trust a key solely because it claims to be from Canonical.

## When Verification Fails

If GPG verification fails:
- The SHA256SUMS file is corrupt or has been tampered with
- Do not use the checksum values from this file
- Download from a different Ubuntu mirror or a different network

If SHA256 verification fails:
- The ISO download was incomplete or corrupt
- Re-download from ubuntu.com or a different mirror
- Check available disk space before downloading again
- Try a download manager that supports resume for large files

Verification adds perhaps five minutes to your workflow and ensures you are installing exactly what Canonical released. It is a worthwhile habit, especially for servers handling sensitive workloads.
