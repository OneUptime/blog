# How to Install a Specific Version of OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Version Management, Installation, Infrastructure as Code, DevOps

Description: A guide to installing a specific version of OpenTofu on Linux, macOS, and Windows for reproducible environments.

## Introduction

Installing a specific version of OpenTofu is essential for maintaining consistency across development, staging, and production environments. This guide covers how to install any specific version of OpenTofu on all major platforms.

## Finding Available Versions

```bash
# List available releases via GitHub API

curl -s 'https://api.github.com/repos/opentofu/opentofu/releases?per_page=100' | \
  jq -r '.[].tag_name' | sort -V

# Or browse the releases page
# https://github.com/opentofu/opentofu/releases
```

## Linux: Install a Specific Version from Binary

```bash
# Set the desired version
TOFU_VERSION="1.8.5"
ARCH="amd64"  # or arm64 for ARM systems

# Download the specific version
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_${ARCH}.zip"

# Verify the checksum
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS"
sha256sum -c --ignore-missing tofu_${TOFU_VERSION}_SHA256SUMS

# Extract and install
unzip "tofu_${TOFU_VERSION}_linux_${ARCH}.zip"
sudo mv tofu /usr/local/bin/tofu-${TOFU_VERSION}

# Create a symlink to the desired version
sudo ln -sf /usr/local/bin/tofu-${TOFU_VERSION} /usr/local/bin/tofu
```

## macOS: Install a Specific Version from Binary

```bash
# Set the desired version
TOFU_VERSION="1.8.5"
ARCH="arm64"  # use amd64 on Intel Macs

# Download the specific version
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_darwin_${ARCH}.zip"

# Verify the checksum
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_SHA256SUMS"
ZIPFILE="tofu_${TOFU_VERSION}_darwin_${ARCH}.zip"
CHECKSUM=$(shasum -a 256 "${ZIPFILE}" | cut -f 1 -d ' ')
EXPECTED_CHECKSUM=$(grep "${ZIPFILE}" "tofu_${TOFU_VERSION}_SHA256SUMS" | cut -f 1 -d ' ')
if [ "${CHECKSUM}" = "${EXPECTED_CHECKSUM}" ]; then
  echo "OK"
else
  echo "MISMATCH"
fi

# Extract and install
unzip "${ZIPFILE}"
sudo mv tofu /usr/local/bin/tofu-${TOFU_VERSION}

# Create a symlink to the desired version
sudo ln -sf /usr/local/bin/tofu-${TOFU_VERSION} /usr/local/bin/tofu

# Verify
tofu version
```

## Using tofuenv for Version Management

A convenient way to manage multiple versions on Linux and macOS:

```bash
# Install tofuenv
git clone --depth=1 https://github.com/opentofuutils/tofuenv.git ~/.tofuenv
echo 'export PATH="$HOME/.tofuenv/bin:$PATH"' >> ~/.bashrc  # use ~/.zprofile on macOS zsh
source ~/.bashrc  # or: source ~/.zprofile

# Install a specific version
tofuenv install 1.8.5

# Use it
tofuenv use 1.8.5

# Verify
tofu version
```

## Windows: Install Specific Version via Chocolatey

```powershell
# Install a specific version
choco install opentofu --version=1.8.5

# Verify
tofu version
```

## Windows: Install Specific Version via Scoop

```powershell
# Install specific version
scoop install opentofu@1.8.5

# If you have multiple versions installed, switch back to it
scoop reset opentofu@1.8.5
```

## Docker: Use Specific Version Image

```bash
# Use the official Docker image with specific version
docker run --rm ghcr.io/opentofu/opentofu:1.8.5 version

# Mount your working directory
docker run --rm \
  -v $(pwd):/workspace \
  -w /workspace \
  ghcr.io/opentofu/opentofu:1.8.5 \
  init
```

## Enforcing a Version in Configuration

```hcl
# main.tf - Enforce the exact version required
# Choose ONE of the following required_version expressions:

# Require exactly version 1.8.5
terraform {
  required_version = "= 1.8.5"
}

# Or require a minimum version with patch flexibility
terraform {
  required_version = "~> 1.8.0"
}

# Or require within a range
terraform {
  required_version = ">= 1.8.0, < 1.9.0"
}
```

## Verifying the Installed Version

```bash
# Check version
tofu version

# Output shows version and platform:
# OpenTofu v1.8.5
# on linux_amd64
```

## Conclusion

Installing a specific version of OpenTofu ensures reproducible infrastructure deployments across all environments. Using tofuenv, standalone installs, or package managers that support historical versions makes it easier to keep a chosen release available. Use `required_version` constraints in your root modules to prevent unsupported or accidental OpenTofu upgrades from breaking your infrastructure code.
