# How to Download Collections for Offline Installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Galaxy, Offline, Air-Gapped, Collections

Description: How to download Ansible collections for offline installation in air-gapped environments including dependency resolution and transfer workflows.

---

Air-gapped environments, restricted networks, and security-hardened production zones all share one thing in common: no internet access. If your Ansible control node cannot reach Galaxy, you need a way to pre-download collections and transfer them manually. Ansible provides the `ansible-galaxy collection download` command specifically for this purpose, and this post covers the complete workflow from download to installation.

## The Download Command

The `ansible-galaxy collection download` command fetches collection tarballs without installing them:

```bash
# Download a single collection
ansible-galaxy collection download community.general

# Download a specific version
ansible-galaxy collection download community.general:8.1.0

# Download to a specific directory
ansible-galaxy collection download community.general:8.1.0 -p ./offline-packages/
```

This creates a directory with the collection tarball and a `requirements.yml` file:

```
offline-packages/
    community-general-8.1.0.tar.gz
    requirements.yml
```

The generated `requirements.yml` contains the exact version that was downloaded, making it easy to install on the target system.

## Downloading Multiple Collections

Download everything from your requirements file at once:

```bash
# Download all collections from requirements.yml
ansible-galaxy collection download -r requirements.yml -p ./offline-packages/
```

Given this input:

```yaml
# requirements.yml
---
collections:
  - name: community.general
    version: "8.1.0"
  - name: amazon.aws
    version: "7.2.0"
  - name: ansible.posix
    version: "1.5.4"
```

The download directory will contain:

```
offline-packages/
    community-general-8.1.0.tar.gz
    amazon-aws-7.2.0.tar.gz
    ansible-posix-1.5.4.tar.gz
    ansible-utils-3.1.0.tar.gz        # transitive dependency
    requirements.yml                    # auto-generated with all versions
```

Note that transitive dependencies are automatically included. If `amazon.aws` depends on `ansible.utils`, that dependency is downloaded as well.

## The Complete Offline Workflow

Here is the end-to-end process:

### Step 1: Download on a Connected Machine

```bash
#!/bin/bash
# step1-download.sh - Run on a machine with internet access
set -e

PACKAGE_DIR="./ansible-offline-$(date +%Y%m%d)"
mkdir -p "$PACKAGE_DIR"

echo "Downloading collections..."
ansible-galaxy collection download -r requirements.yml -p "$PACKAGE_DIR/"

echo "Downloading roles..."
# Roles don't have a download command, so we install and package them
TEMP_ROLES=$(mktemp -d)
ansible-galaxy install -r requirements.yml -p "$TEMP_ROLES/"

# Package each role as a tarball
mkdir -p "$PACKAGE_DIR/roles"
for role_dir in "$TEMP_ROLES"/*/; do
    role_name=$(basename "$role_dir")
    tar czf "$PACKAGE_DIR/roles/${role_name}.tar.gz" -C "$TEMP_ROLES" "$role_name"
done
rm -rf "$TEMP_ROLES"

# Generate checksums for verification
cd "$PACKAGE_DIR"
sha256sum *.tar.gz roles/*.tar.gz > checksums.sha256 2>/dev/null || true
cd -

# Create a manifest
echo "Package contents:" > "$PACKAGE_DIR/MANIFEST.txt"
echo "Created: $(date -u)" >> "$PACKAGE_DIR/MANIFEST.txt"
echo "" >> "$PACKAGE_DIR/MANIFEST.txt"
echo "Collections:" >> "$PACKAGE_DIR/MANIFEST.txt"
ls -lh "$PACKAGE_DIR"/*.tar.gz 2>/dev/null >> "$PACKAGE_DIR/MANIFEST.txt" || true
echo "" >> "$PACKAGE_DIR/MANIFEST.txt"
echo "Roles:" >> "$PACKAGE_DIR/MANIFEST.txt"
ls -lh "$PACKAGE_DIR/roles/"*.tar.gz 2>/dev/null >> "$PACKAGE_DIR/MANIFEST.txt" || true

echo ""
echo "Package ready: ${PACKAGE_DIR}/"
echo "Transfer this directory to the air-gapped environment."
cat "$PACKAGE_DIR/MANIFEST.txt"
```

### Step 2: Transfer to the Air-Gapped Environment

Transfer the package directory using whatever method your security policy allows:

```bash
# Option 1: USB drive
cp -r ansible-offline-20260221/ /media/usb/

# Option 2: SCP to a bastion host
scp -r ansible-offline-20260221/ bastion:/tmp/

# Option 3: Create a single archive for easier transfer
tar czf ansible-offline-20260221.tar.gz ansible-offline-20260221/
```

### Step 3: Install on the Air-Gapped Machine

```bash
#!/bin/bash
# step3-install.sh - Run on the air-gapped machine
set -e

PACKAGE_DIR="${1:?Usage: $0 <package-directory>}"
COLLECTIONS_PATH="./collections"
ROLES_PATH="./roles"

# Verify integrity
echo "Verifying checksums..."
cd "$PACKAGE_DIR"
sha256sum -c checksums.sha256
cd -

# Install collections from the downloaded tarballs
echo "Installing collections..."
ansible-galaxy collection install \
    -r "$PACKAGE_DIR/requirements.yml" \
    -p "$COLLECTIONS_PATH"

# Install roles from tarballs
echo "Installing roles..."
for role_tarball in "$PACKAGE_DIR/roles"/*.tar.gz; do
    if [ -f "$role_tarball" ]; then
        ansible-galaxy install "$role_tarball" -p "$ROLES_PATH"
    fi
done

echo ""
echo "Installation complete."
echo "Collections:"
ansible-galaxy collection list -p "$COLLECTIONS_PATH"
echo ""
echo "Roles:"
ansible-galaxy list -p "$ROLES_PATH"
```

## Downloading from Specific Servers

If you need to download from Automation Hub or a private server:

```bash
# Download from a specific Galaxy server
ansible-galaxy collection download community.general:8.1.0 \
    --server https://cloud.redhat.com/api/automation-hub/content/published/ \
    --token your_token \
    -p ./offline-packages/
```

Or configure the server in `ansible.cfg` and reference it:

```ini
# ansible.cfg on the connected machine
[galaxy]
server_list = automation_hub

[galaxy_server.automation_hub]
url = https://cloud.redhat.com/api/automation-hub/content/published/
auth_url = https://sso.redhat.com/auth/realms/redhat-external/protocol/openid-connect/token
token = your_offline_token
```

```bash
# Downloads will use the configured Automation Hub
ansible-galaxy collection download -r requirements.yml -p ./offline-packages/
```

## Handling Dependency Resolution

The `download` command resolves dependencies automatically. But you should verify that all dependencies were captured:

```python
#!/usr/bin/env python3
# verify-offline-deps.py - Verify all dependencies are downloaded
import yaml
import json
import tarfile
import os
import sys

def get_collection_deps(tarball_path):
    """Extract dependencies from a collection tarball."""
    with tarfile.open(tarball_path) as tar:
        for member in tar.getmembers():
            if member.name.endswith("MANIFEST.json"):
                f = tar.extractfile(member)
                manifest = json.loads(f.read())
                return manifest.get("collection_info", {}).get("dependencies", {})
    return {}

def main():
    package_dir = sys.argv[1] if len(sys.argv) > 1 else "./offline-packages"

    # Find all downloaded tarballs
    tarballs = {}
    for filename in os.listdir(package_dir):
        if filename.endswith(".tar.gz") and filename != "requirements.yml":
            filepath = os.path.join(package_dir, filename)
            # Parse namespace-name-version.tar.gz
            parts = filename.replace(".tar.gz", "").split("-")
            if len(parts) >= 3:
                name = f"{parts[0]}.{parts[1]}"
                version = "-".join(parts[2:])
                tarballs[name] = {"version": version, "path": filepath}

    print(f"Downloaded collections: {len(tarballs)}")
    for name, info in sorted(tarballs.items()):
        print(f"  {name}: {info['version']}")

    # Check dependencies
    print("\nChecking dependencies...")
    missing = []
    for name, info in tarballs.items():
        deps = get_collection_deps(info["path"])
        for dep_name, dep_version in deps.items():
            if dep_name not in tarballs:
                missing.append(f"{name} requires {dep_name} ({dep_version})")

    if missing:
        print("\nMISSING DEPENDENCIES:")
        for m in missing:
            print(f"  {m}")
        sys.exit(1)
    else:
        print("All dependencies satisfied.")

if __name__ == "__main__":
    main()
```

## Setting Up a Local Repository

For environments that need repeated offline installations, set up a local file-based repository:

```bash
#!/bin/bash
# setup-local-repo.sh - Create a local collection repository
set -e

REPO_DIR="/opt/ansible-repo"
mkdir -p "$REPO_DIR/collections"

# Copy downloaded tarballs to the repo
cp ./offline-packages/*.tar.gz "$REPO_DIR/collections/"

# Create a requirements file that references local files
echo "---" > "$REPO_DIR/requirements.yml"
echo "collections:" >> "$REPO_DIR/requirements.yml"

for tarball in "$REPO_DIR/collections"/*.tar.gz; do
    filename=$(basename "$tarball")
    name_part=$(echo "$filename" | sed 's/-[0-9].*//')
    namespace=$(echo "$name_part" | cut -d'-' -f1)
    collection=$(echo "$name_part" | cut -d'-' -f2)

    echo "  - name: ${namespace}.${collection}" >> "$REPO_DIR/requirements.yml"
    echo "    source: file://${tarball}" >> "$REPO_DIR/requirements.yml"
done

echo "Local repository created at ${REPO_DIR}/"
echo "Install with: ansible-galaxy collection install -r ${REPO_DIR}/requirements.yml"
```

## Automating Periodic Downloads

For organizations that regularly update air-gapped environments, schedule downloads:

```yaml
# .github/workflows/download-collections.yml
---
name: Download Collections for Offline Use

on:
  schedule:
    - cron: "0 6 * * 1"  # Every Monday at 6 AM
  workflow_dispatch:

jobs:
  download:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Ansible
        run: pip install ansible-core

      - name: Download collections
        run: |
          mkdir -p offline-packages
          ansible-galaxy collection download -r requirements.yml -p ./offline-packages/

      - name: Generate checksums
        run: |
          cd offline-packages
          sha256sum *.tar.gz > checksums.sha256

      - name: Upload as artifact
        uses: actions/upload-artifact@v4
        with:
          name: ansible-offline-${{ github.run_number }}
          path: offline-packages/
          retention-days: 30
```

## Updating Offline Installations

When you need to update collections in an air-gapped environment:

```bash
# Download only updated collections on the connected machine
ansible-galaxy collection download community.general:8.2.0 -p ./update-package/

# Transfer and install with --force to overwrite
ansible-galaxy collection install \
    -r ./update-package/requirements.yml \
    -p ./collections/ \
    --force
```

## Summary

Downloading collections for offline installation uses the `ansible-galaxy collection download` command, which fetches tarballs and resolves dependencies automatically. The complete workflow involves downloading on a connected machine, verifying checksums, transferring to the air-gapped environment, and installing from the local tarballs. Automate the download process with scheduled CI jobs, verify dependency completeness with a validation script, and set up a local file-based repository for environments that need repeated installations. This approach keeps air-gapped environments up to date with the exact same collection versions used in development and testing.
