# How to Install OpenTofu on Linux macOS and Windows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Installation, DevOps

Description: Complete installation guide for OpenTofu on Linux, macOS, and Windows covering package managers, manual installation, version management, and verification steps.

---

OpenTofu is the open-source fork of Terraform, maintained by the Linux Foundation. If you are looking to switch from Terraform or start fresh with an open-source infrastructure-as-code tool, the first step is getting it installed. This guide covers installation on all three major operating systems with multiple methods for each.

## Quick Overview

OpenTofu provides the `tofu` command, which is a drop-in replacement for the `terraform` command. The installation process varies by platform, but the end result is the same: a single binary you can run from your terminal.

## Installing on Linux

### Method 1: Package Manager (Recommended)

For Debian/Ubuntu-based distributions:

```bash
# Install required packages for the repository
sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg

# Add the OpenTofu GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://get.opentofu.org/opentofu.gpg | sudo tee /etc/apt/keyrings/opentofu.gpg >/dev/null
sudo chmod a+r /etc/apt/keyrings/opentofu.gpg

# Add the OpenTofu repository
echo \
  "deb [signed-by=/etc/apt/keyrings/opentofu.gpg] https://packages.opentofu.org/opentofu/tofu/any/ any main" | \
  sudo tee /etc/apt/sources.list.d/opentofu.list > /dev/null

# Install OpenTofu
sudo apt-get update
sudo apt-get install -y tofu
```

For RHEL/CentOS/Fedora:

```bash
# Add the OpenTofu repository
cat > /etc/yum.repos.d/opentofu.repo << 'EOF'
[opentofu]
name=opentofu
baseurl=https://packages.opentofu.org/opentofu/tofu/rpm_any/rpm_any/$basearch
repo_gpgcheck=0
gpgcheck=1
enabled=1
gpgkey=https://get.opentofu.org/opentofu.gpg
       https://packages.opentofu.org/opentofu/tofu/gpgkey
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
EOF

# Install OpenTofu
sudo yum install -y tofu
```

### Method 2: Standalone Installer Script

The OpenTofu team provides an installer script that works on most Linux distributions:

```bash
# Download and run the installer
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh

# Inspect the script before running it (always a good idea)
less install-opentofu.sh

# Run the installer
chmod +x install-opentofu.sh
./install-opentofu.sh --install-method standalone

# Clean up
rm install-opentofu.sh
```

### Method 3: Manual Download

If you prefer to download the binary directly:

```bash
# Set the version you want
OPENTOFU_VERSION="1.8.0"

# Download the binary
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${OPENTOFU_VERSION}/tofu_${OPENTOFU_VERSION}_linux_amd64.zip"

# Verify the checksum
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${OPENTOFU_VERSION}/tofu_${OPENTOFU_VERSION}_SHA256SUMS"
sha256sum --check --ignore-missing "tofu_${OPENTOFU_VERSION}_SHA256SUMS"

# Extract and install
unzip "tofu_${OPENTOFU_VERSION}_linux_amd64.zip" -d /tmp/tofu
sudo mv /tmp/tofu/tofu /usr/local/bin/tofu
sudo chmod +x /usr/local/bin/tofu

# Clean up
rm -rf /tmp/tofu "tofu_${OPENTOFU_VERSION}_linux_amd64.zip" "tofu_${OPENTOFU_VERSION}_SHA256SUMS"
```

For ARM-based Linux systems (like Raspberry Pi or AWS Graviton), replace `amd64` with `arm64`:

```bash
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${OPENTOFU_VERSION}/tofu_${OPENTOFU_VERSION}_linux_arm64.zip"
```

## Installing on macOS

### Method 1: Homebrew (Recommended)

The easiest way to install on macOS:

```bash
# Install OpenTofu via Homebrew
brew install opentofu

# Verify the installation
tofu --version
```

Homebrew handles the tap setup automatically. It works on both Intel and Apple Silicon Macs.

### Method 2: MacPorts

If you use MacPorts instead of Homebrew:

```bash
# Install via MacPorts
sudo port install opentofu

# Verify
tofu --version
```

### Method 3: Standalone Installer

The same installer script from the Linux section works on macOS:

```bash
# Download and run the installer
curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
chmod +x install-opentofu.sh
./install-opentofu.sh --install-method standalone
rm install-opentofu.sh
```

### Method 4: Manual Download

```bash
OPENTOFU_VERSION="1.8.0"

# For Apple Silicon (M1/M2/M3)
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${OPENTOFU_VERSION}/tofu_${OPENTOFU_VERSION}_darwin_arm64.zip"

# For Intel Macs
# curl -LO "https://github.com/opentofu/opentofu/releases/download/v${OPENTOFU_VERSION}/tofu_${OPENTOFU_VERSION}_darwin_amd64.zip"

# Extract and install
unzip "tofu_${OPENTOFU_VERSION}_darwin_arm64.zip" -d /tmp/tofu
sudo mv /tmp/tofu/tofu /usr/local/bin/tofu
sudo chmod +x /usr/local/bin/tofu
```

## Installing on Windows

### Method 1: Chocolatey

If you use Chocolatey as your package manager:

```powershell
# Install OpenTofu
choco install opentofu

# Verify installation
tofu --version
```

### Method 2: Scoop

Scoop is another popular package manager for Windows:

```powershell
# Install OpenTofu
scoop install opentofu

# Verify
tofu --version
```

### Method 3: winget

Using the Windows Package Manager:

```powershell
# Install OpenTofu
winget install OpenTofu.tofu

# Verify
tofu --version
```

### Method 4: Manual Download

```powershell
# Download the zip file
$version = "1.8.0"
Invoke-WebRequest -Uri "https://github.com/opentofu/opentofu/releases/download/v$version/tofu_${version}_windows_amd64.zip" -OutFile "tofu.zip"

# Extract
Expand-Archive -Path "tofu.zip" -DestinationPath "C:\OpenTofu"

# Add to PATH
$env:PATH += ";C:\OpenTofu"

# To make the PATH change permanent, add it to system environment variables
[System.Environment]::SetEnvironmentVariable("Path", $env:PATH + ";C:\OpenTofu", [System.EnvironmentVariableTarget]::User)

# Verify
tofu --version
```

## Verifying the Installation

Regardless of your platform or installation method, verify that OpenTofu is working correctly:

```bash
# Check the version
tofu --version

# Expected output (version may vary):
# OpenTofu v1.8.0
# on linux_amd64  (or darwin_arm64, windows_amd64, etc.)

# Run a basic test
mkdir /tmp/tofu-test && cd /tmp/tofu-test

# Create a minimal configuration
cat > main.tf << 'EOF'
terraform {
  required_providers {
    null = {
      source = "hashicorp/null"
    }
  }
}

resource "null_resource" "test" {}
EOF

# Initialize and plan
tofu init
tofu plan

# Clean up
cd .. && rm -rf /tmp/tofu-test
```

## Managing Multiple Versions

If you work with multiple projects that require different OpenTofu versions, use a version manager.

### Using tofuenv

`tofuenv` is a version manager specifically for OpenTofu, similar to `tfenv` for Terraform:

```bash
# Install tofuenv
git clone https://github.com/tofuutils/tofuenv.git ~/.tofuenv
echo 'export PATH="$HOME/.tofuenv/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# List available versions
tofuenv list-remote

# Install a specific version
tofuenv install 1.8.0
tofuenv install 1.7.3

# Switch between versions
tofuenv use 1.8.0
tofu --version  # Shows 1.8.0

tofuenv use 1.7.3
tofu --version  # Shows 1.7.3

# Pin a version for a project
echo "1.8.0" > .opentofu-version
```

### Using asdf

If you already use `asdf` for managing tool versions:

```bash
# Add the OpenTofu plugin
asdf plugin add opentofu

# Install a version
asdf install opentofu 1.8.0

# Set the global version
asdf global opentofu 1.8.0

# Or set a project-local version
asdf local opentofu 1.8.0
```

## Docker Installation

For CI/CD environments or containerized workflows:

```bash
# Pull the official OpenTofu image
docker pull ghcr.io/opentofu/opentofu:latest

# Run a command
docker run --rm -v $(pwd):/workspace -w /workspace \
  ghcr.io/opentofu/opentofu:latest \
  init

# Use a specific version
docker run --rm -v $(pwd):/workspace -w /workspace \
  ghcr.io/opentofu/opentofu:1.8.0 \
  plan
```

## Configuring Shell Completion

Set up tab completion to make working with `tofu` faster:

```bash
# Bash
tofu -install-autocomplete

# Or manually for Bash
echo 'complete -C /usr/local/bin/tofu tofu' >> ~/.bashrc

# For Zsh
echo 'autoload -U +X bashcompinit && bashcompinit' >> ~/.zshrc
echo 'complete -C /usr/local/bin/tofu tofu' >> ~/.zshrc

# Reload your shell
source ~/.bashrc  # or source ~/.zshrc
```

## Troubleshooting Common Issues

**"tofu: command not found"** - The binary is not in your PATH. Check where it was installed and add that directory to your PATH environment variable.

**Permission denied errors** - On Linux/macOS, make sure the binary is executable: `chmod +x /usr/local/bin/tofu`.

**GPG key errors during package installation** - The signing key may have rotated. Re-download the latest key from the OpenTofu website.

**Version mismatch with state files** - If you are coming from Terraform, check our guide on [How to Use OpenTofu with Existing Terraform State](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-with-existing-terraform-state/view) before running any commands against existing infrastructure.

With OpenTofu installed, you are ready to start managing infrastructure. The commands are nearly identical to Terraform, so if you have Terraform experience, you will feel right at home.
