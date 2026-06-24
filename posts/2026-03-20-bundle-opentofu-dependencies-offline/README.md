# How to Bundle OpenTofu with All Dependencies for Offline Use

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Bundles, Offline, Air-Gapped, DevOps

Description: Learn how to create a self-contained bundle of OpenTofu with all its providers and modules for deployment in completely offline or air-gapped environments.

## Introduction

A self-contained OpenTofu bundle packages the binary, all required provider plugins, and the installed modules for a specific configuration into a single transferable archive. Once transferred to an air-gapped environment, teams can run OpenTofu workflows for that bundled configuration without any internet access. This guide walks through creating, validating, and deploying such a bundle.

## Bundle Structure

```text
opentofu-bundle/
├── install.sh                    # Automated installer
├── binary/
│   ├── tofu_1.7.0_linux_amd64.zip
│   └── tofu_1.7.0_SHA256SUMS
├── providers/
│   └── registry.opentofu.org/
│       └── hashicorp/
│           ├── aws/
│           ├── kubernetes/
│           └── helm/
├── configuration/
│   ├── main.tf
│   ├── .terraform.lock.hcl
│   └── .terraform/
│       └── modules/
└── config/
    └── opentofu.tfrc            # CLI configuration
```

## Creating the Bundle Script

```bash
#!/bin/bash
# create-bundle.sh - Run on an internet-connected machine

set -euo pipefail

TOFU_VERSION="${TOFU_VERSION:-1.7.0}"
BUNDLE_NAME="opentofu-bundle-${TOFU_VERSION}-$(date +%Y%m%d)"
BUNDLE_DIR="/tmp/${BUNDLE_NAME}"
CONFIG_SOURCE="${CONFIG_SOURCE:-./infrastructure}"  # Path to a self-contained OpenTofu root module

echo "Creating OpenTofu bundle: $BUNDLE_NAME"

# Create directory structure

mkdir -p "$BUNDLE_DIR"/{binary,providers,configuration,config}

# ----------------------------------------
# 1. Download OpenTofu binary
# ----------------------------------------
echo "Downloading OpenTofu ${TOFU_VERSION}..."

for PLATFORM in linux_amd64 linux_arm64 darwin_amd64 darwin_arm64; do
  curl -Lo "$BUNDLE_DIR/binary/tofu_${TOFU_VERSION}_${PLATFORM}.zip" \
    "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_${PLATFORM}.zip" \
    --fail --silent --show-error
done

curl -Lo "$BUNDLE_DIR/binary/tofu_${TOFU_VERSION}_SHA256SUMS" \
  "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS" \
  --fail --silent --show-error

# ----------------------------------------
# 2. Mirror providers
# ----------------------------------------
echo "Mirroring providers..."

WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

# Copy the full configuration tree so relative module sources and the lock file are preserved
mkdir -p "$WORK_DIR/source"
cp -R "$CONFIG_SOURCE"/. "$WORK_DIR/source/"
rm -rf "$WORK_DIR/source/.terraform"

tofu -chdir="$WORK_DIR/source" init -backend=false

# Record checksums for all bundled platforms in the lock file
tofu -chdir="$WORK_DIR/source" providers lock \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64

# Mirror for all bundled platforms
tofu -chdir="$WORK_DIR/source" providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64 \
  "$BUNDLE_DIR/providers/"

# ----------------------------------------
# 3. Bundle modules
# ----------------------------------------
echo "Bundling configuration and installed modules..."

cp -a "$WORK_DIR/source/." "$BUNDLE_DIR/configuration/"
rm -rf "$BUNDLE_DIR/configuration/.terraform/providers"

# ----------------------------------------
# 4. Create CLI config
# ----------------------------------------
cat > "$BUNDLE_DIR/config/opentofu.tfrc" << 'RC'
provider_installation {
  filesystem_mirror {
    path = "/opt/opentofu/providers"
  }
}
RC

# ----------------------------------------
# 5. Create installer script
# ----------------------------------------
cat > "$BUNDLE_DIR/install.sh" << 'INSTALLER'
#!/bin/bash
set -euo pipefail

BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_PREFIX="${INSTALL_PREFIX:-/opt/opentofu}"
TOFU_BIN="${TOFU_BIN:-/usr/local/bin/tofu}"
CONFIG_DEST="${CONFIG_DEST:-${INSTALL_PREFIX}/configuration}"

echo "Installing OpenTofu from bundle..."

# Detect platform
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac
PLATFORM="${OS}_${ARCH}"

# Install binary
BINARY_ZIP=$(find "$BUNDLE_DIR/binary" -maxdepth 1 -type f -name "*_${PLATFORM}.zip" | head -1)
if [ -z "$BINARY_ZIP" ]; then
  echo "No binary found for platform $PLATFORM"
  exit 1
fi

echo "Installing binary for $PLATFORM..."
TMPDIR=$(mktemp -d)
unzip -q "$BINARY_ZIP" -d "$TMPDIR"
sudo install -m 755 "$TMPDIR/tofu" "$TOFU_BIN"
rm -rf "$TMPDIR"

# Install providers
echo "Installing providers..."
sudo mkdir -p "${INSTALL_PREFIX}/providers"
sudo cp -a "$BUNDLE_DIR/providers/." "${INSTALL_PREFIX}/providers/"

# Install prepared configuration
if [ -d "$BUNDLE_DIR/configuration" ]; then
  echo "Installing prepared configuration..."
  sudo mkdir -p "$CONFIG_DEST"
  sudo cp -a "$BUNDLE_DIR/configuration/." "$CONFIG_DEST/"
fi

# Install CLI config
sudo mkdir -p /etc/opentofu
sudo cp "$BUNDLE_DIR/config/opentofu.tfrc" /etc/opentofu/opentofu.tfrc

echo ""
echo "Installation complete!"
echo "Run: export TF_CLI_CONFIG_FILE=/etc/opentofu/opentofu.tfrc"
echo "Verify: cd ${CONFIG_DEST} && tofu init -backend=false -get=false"
INSTALLER

chmod +x "$BUNDLE_DIR/install.sh"

# ----------------------------------------
# 6. Create the archive
# ----------------------------------------
echo "Creating archive..."
cd /tmp
tar -czf "${BUNDLE_NAME}.tar.gz" "$BUNDLE_NAME/"

ARCHIVE_SIZE=$(du -sh "/tmp/${BUNDLE_NAME}.tar.gz" | cut -f1)
echo ""
echo "Bundle created: /tmp/${BUNDLE_NAME}.tar.gz (${ARCHIVE_SIZE})"
echo "Transfer to air-gapped environment and run: tar -xzf ${BUNDLE_NAME}.tar.gz && ./${BUNDLE_NAME}/install.sh"
```

## Installing the Bundle

```bash
# On the air-gapped machine:

# Transfer the bundle (USB drive, internal file share, etc.)
# Then extract and install
tar -xzf opentofu-bundle-1.7.0-20240101.tar.gz

cd opentofu-bundle-1.7.0-20240101
sudo ./install.sh

# Configure environment
echo 'export TF_CLI_CONFIG_FILE=/etc/opentofu/opentofu.tfrc' >> ~/.bashrc
source ~/.bashrc

# Verify
cd /opt/opentofu/configuration
tofu version
tofu init -backend=false -get=false
```

## Validating the Bundle

```bash
#!/bin/bash
# validate-bundle.sh - Run after installation

echo "=== OpenTofu Bundle Validation ==="

# Check binary
echo -n "OpenTofu binary: "
tofu version && echo "OK" || echo "FAIL"

# Check CLI config
echo -n "CLI config: "
CLI_CONFIG="${TF_CLI_CONFIG_FILE:-/etc/opentofu/opentofu.tfrc}"
[ -f "$CLI_CONFIG" ] && echo "OK ($CLI_CONFIG)" || echo "FAIL"

# Check providers in mirror
echo "Providers in mirror:"
find /opt/opentofu/providers -name "*.zip" | while read -r zip; do
  provider=$(echo "$zip" | sed 's|.*/registry.opentofu.org/||' | sed 's|/terraform-provider.*||')
  version=$(echo "$zip" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
  echo "  - $provider v$version"
done

# Check bundled modules
echo -n "Bundled modules: "
[ -f /opt/opentofu/configuration/.terraform/modules/modules.json ] && echo "OK" || echo "FAIL"

# Test init without internet
echo ""
echo "Testing tofu init (offline)..."
cd /opt/opentofu/configuration
tofu init -backend=false -get=false && echo "PASS: Bundled configuration initializes offline" || echo "FAIL: Offline initialization failed"
```

## Conclusion

A bundled OpenTofu deployment packages the binary, a provider mirror (via `tofu providers mirror`), and a prepared working directory whose `.terraform/modules` cache is already populated. The install script detects the platform, installs the binary, copies providers to the filesystem mirror directory, installs the prepared configuration, and writes the CLI config to redirect provider downloads. After installation, set `TF_CLI_CONFIG_FILE` in the shell environment for each user or automation account that will run `tofu`.
