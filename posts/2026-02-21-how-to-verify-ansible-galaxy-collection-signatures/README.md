# How to Verify Ansible Galaxy Collection Signatures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Security, GPG, Signatures

Description: How to verify Ansible Galaxy collection signatures using GPG to ensure collections have not been tampered with during download.

---

When you install a collection from Ansible Galaxy, how do you know the content has not been tampered with? Maybe the Galaxy server was compromised, or someone performed a man-in-the-middle attack during download. Collection signature verification solves this problem by using GPG signatures to cryptographically prove that the collection you downloaded is exactly what the publisher intended.

This feature was introduced in Ansible 2.13 and is supported by both Galaxy and Automation Hub.

## How Collection Signing Works

The signing flow works like this:

1. A collection publisher builds their collection into a tarball
2. They (or the Galaxy server) sign the collection with a GPG private key
3. The signature is stored alongside the collection on the server
4. When you install the collection, `ansible-galaxy` downloads both the collection and its signature
5. Your local GPG verifies the signature against the publisher's public key

If the signature does not match, the collection is rejected.

## Prerequisites

You need GPG installed on your system:

```bash
# Install GPG on Ubuntu/Debian
sudo apt-get install gnupg

# Install GPG on RHEL/CentOS
sudo dnf install gnupg2

# Install GPG on macOS
brew install gnupg

# Verify GPG is available
gpg --version
```

## Importing the Signing Key

First, obtain and import the public key used to sign collections. For Red Hat's Automation Hub, the key is published at their documentation site:

```bash
# Import a public key from a keyserver
gpg --keyserver keyserver.ubuntu.com --recv-keys ABCDEF1234567890

# Or import from a file
gpg --import publisher-public-key.asc

# Or import from a URL
curl -s https://example.com/ansible-signing-key.asc | gpg --import
```

After importing, verify the key:

```bash
# List imported keys
gpg --list-keys

# Verify the key fingerprint matches what you expect
gpg --fingerprint ABCDEF1234567890
```

## Configuring Signature Verification

### In ansible.cfg

Configure Galaxy to require and verify signatures:

```ini
# ansible.cfg - enable collection signature verification
[galaxy]
# Require signatures for collections from specific servers
gpg_keyring = ~/.ansible/galaxy-keyring.gpg

[galaxy_server.automation_hub]
url = https://cloud.redhat.com/api/automation-hub/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your_token_here

[galaxy_server.galaxy]
url = https://galaxy.ansible.com/
```

### Creating a Dedicated Keyring

Rather than using your personal GPG keyring, create a dedicated one for Galaxy:

```bash
# Create a dedicated keyring for Ansible Galaxy
mkdir -p ~/.ansible
gpg --no-default-keyring --keyring ~/.ansible/galaxy-keyring.gpg --import publisher-public-key.asc

# Verify the key was added to the dedicated keyring
gpg --no-default-keyring --keyring ~/.ansible/galaxy-keyring.gpg --list-keys
```

## Verifying During Installation

Use the `--keyring` flag to verify signatures during collection installation:

```bash
# Install with signature verification
ansible-galaxy collection install community.general \
    --keyring ~/.ansible/galaxy-keyring.gpg
```

If the signature is valid, installation proceeds normally. If the signature is invalid or missing, you will see an error:

```
ERROR! Signature verification failed for collection community.general
```

## Using --signature for Manual Verification

You can provide a signature URL directly:

```bash
# Install with an explicit signature URL
ansible-galaxy collection install community.general:8.1.0 \
    --signature https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/artifacts/community-general-8.1.0.tar.gz.asc \
    --keyring ~/.ansible/galaxy-keyring.gpg
```

## Verifying Already-Installed Collections

To verify collections that are already installed:

```bash
# Verify an installed collection
ansible-galaxy collection verify community.general \
    --keyring ~/.ansible/galaxy-keyring.gpg
```

This checks the installed files against the MANIFEST.json and verifies the signature. If any files have been modified after installation, verification fails.

You can verify all installed collections:

```bash
#!/bin/bash
# verify-all-collections.sh - Verify signatures of all installed collections
set -e

KEYRING="${1:-$HOME/.ansible/galaxy-keyring.gpg}"
FAILURES=0

echo "Verifying collection signatures..."
echo "Keyring: ${KEYRING}"
echo ""

# Get list of installed collections
ansible-galaxy collection list --format yaml 2>/dev/null | python3 -c "
import yaml, sys
data = yaml.safe_load(sys.stdin)
if data:
    for path, colls in data.items():
        for name in sorted(colls.keys()):
            print(name)
" | while read -r collection; do
    echo -n "Verifying ${collection}... "
    if ansible-galaxy collection verify "$collection" --keyring "$KEYRING" 2>/dev/null; then
        echo "OK"
    else
        echo "FAILED"
        FAILURES=$((FAILURES + 1))
    fi
done

if [ "$FAILURES" -gt 0 ]; then
    echo ""
    echo "WARNING: ${FAILURES} collection(s) failed verification"
    exit 1
else
    echo ""
    echo "All collections verified successfully"
fi
```

## Verifying File Integrity Without Signatures

Even without GPG signatures, you can verify that installed collection files match their manifest:

```bash
# Verify file integrity against MANIFEST.json
ansible-galaxy collection verify community.general
```

This checks the checksums in `FILES.json` against the actual files on disk. It catches any post-installation modifications but does not prove the collection came from a trusted source (that is what GPG signatures are for).

## Setting Up Signature Verification in requirements.yml

You can specify signature requirements per collection:

```yaml
# requirements.yml - with signature sources
---
collections:
  - name: community.general
    version: "8.1.0"
    signatures:
      - https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/artifacts/community-general-8.1.0.tar.gz.asc
```

Install with the keyring:

```bash
# Install with signature verification from requirements
ansible-galaxy collection install -r requirements.yml \
    --keyring ~/.ansible/galaxy-keyring.gpg
```

## Signing Your Own Collections

If you publish collections and want to sign them, set up GPG signing:

```bash
# Generate a GPG key for signing (if you do not have one)
gpg --full-generate-key
# Choose RSA, 4096 bits, reasonable expiry

# List your keys to find the key ID
gpg --list-secret-keys --keyid-format long
```

Export the public key for distribution:

```bash
# Export your public key
gpg --armor --export YOUR_KEY_ID > my-signing-key.asc

# Share this file with your users so they can verify your collections
```

When publishing to a private Galaxy server (Galaxy NG), you can configure server-side signing. The server signs collections upon upload approval:

```yaml
# Galaxy NG signing configuration
# This is configured on the server side, not the client
signing_service: ansible-default
```

## CI/CD Integration

Add signature verification to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml - verify collection signatures in CI
---
name: Deploy

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible
        run: pip install ansible-core

      - name: Import signing keys
        run: |
          mkdir -p ~/.ansible
          # Import the key from a repository secret
          echo "${{ secrets.GALAXY_SIGNING_KEY }}" | \
            gpg --no-default-keyring \
                --keyring ~/.ansible/galaxy-keyring.gpg \
                --import

      - name: Install and verify collections
        run: |
          ansible-galaxy collection install \
            -r requirements.yml \
            -p ./collections/ \
            --keyring ~/.ansible/galaxy-keyring.gpg

      - name: Verify installed collections
        run: |
          ansible-galaxy collection verify \
            -r requirements.yml \
            -p ./collections/ \
            --keyring ~/.ansible/galaxy-keyring.gpg

      - name: Deploy
        run: ansible-playbook -i inventory playbook.yml
```

## Handling Unsigned Collections

Not all collections on Galaxy are signed. When verification fails because a signature is missing (as opposed to invalid), you have options:

```bash
# Allow unsigned collections while still verifying signed ones
ansible-galaxy collection install community.general \
    --keyring ~/.ansible/galaxy-keyring.gpg \
    --required-valid-signature-count 0
```

The `--required-valid-signature-count` flag controls how many valid signatures are needed. Setting it to 0 means "verify signatures if present, but do not fail if missing."

For stricter environments:

```bash
# Require at least one valid signature
ansible-galaxy collection install community.general \
    --keyring ~/.ansible/galaxy-keyring.gpg \
    --required-valid-signature-count 1
```

## Summary

Collection signature verification adds a cryptographic trust layer to Ansible Galaxy. Import the publisher's GPG public key into a dedicated keyring, configure `ansible.cfg` to use that keyring, and pass `--keyring` to `ansible-galaxy collection install` and `verify` commands. This ensures that collections have not been tampered with between the publisher and your environment. For organizations with strict security requirements, make signature verification a mandatory step in your CI/CD pipeline and reject collections that fail verification.
