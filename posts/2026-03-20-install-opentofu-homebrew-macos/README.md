# How to Install OpenTofu Using Homebrew on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, macOS, Homebrew, Installation, Infrastructure as Code, DevOps

Description: A guide to installing and managing OpenTofu on macOS using the Homebrew package manager.

## Introduction

Homebrew is the most popular package manager for macOS, making it the easiest and most recommended way to install OpenTofu on a Mac. This guide walks you through installing OpenTofu using Homebrew and getting started quickly.

## Prerequisites

- A Homebrew-supported version of macOS (currently macOS 14 Sonoma or later)
- Homebrew installed (see https://brew.sh)
- Xcode Command Line Tools

## Installing Homebrew (if needed)

```bash
# Install Homebrew

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add Homebrew to PATH (for Apple Silicon Macs)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

## Installing OpenTofu via Homebrew

### Install from Homebrew Core

```bash
# Refresh Homebrew metadata
brew update

# Install OpenTofu
brew install opentofu
```

## Verifying the Installation

```bash
# Check the installed version
tofu version

# Output:
# OpenTofu v1.11.6
# on darwin_arm64

# Check binary location
which tofu
# /opt/homebrew/bin/tofu (Apple Silicon)
# /usr/local/bin/tofu (Intel)
```

## Setting Up Shell Completion

### For Zsh (default on macOS)

```bash
# Install shell completion
tofu -install-autocomplete

# Restart your shell for completion to take effect
```

### For Bash

```bash
# If using Bash
tofu -install-autocomplete

# Restart your shell for completion to take effect
```

## Quick Start on macOS

```hcl
# ~/projects/tofu-test/main.tf
terraform {
  required_version = ">= 1.6"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

resource "local_file" "greeting" {
  content  = "Hello from OpenTofu on macOS!"
  filename = "${path.module}/greeting.txt"
}

output "file_path" {
  value = local_file.greeting.filename
}
```

```bash
mkdir ~/projects/tofu-test && cd ~/projects/tofu-test
# Create main.tf
tofu init
tofu apply -auto-approve
cat greeting.txt
```

## Managing Multiple Versions with Homebrew

```bash
# Replace the standalone opentofu formula with tofuenv
brew uninstall opentofu
brew install tofuenv

# Install and use a specific OpenTofu version
tofuenv install 1.11.6
tofuenv use 1.11.6
```

## Updating OpenTofu

```bash
# Update Homebrew and upgrade OpenTofu
brew update && brew upgrade opentofu

# Check new version
tofu version
```

## Uninstalling OpenTofu

```bash
# Remove OpenTofu
brew uninstall opentofu

# Clean up
brew cleanup
```

## Tips for macOS Development

```bash
# Create a project directory structure
mkdir -p ~/Projects/infrastructure/{modules,environments}
cd ~/Projects/infrastructure

# Initialize a new project
cat > main.tf <<'EOF'
terraform {
  required_version = ">= 1.6"
}

output "hello" {
  value = "OpenTofu on macOS is working!"
}
EOF

tofu init && tofu apply -auto-approve
```

## Conclusion

Installing OpenTofu via Homebrew on macOS provides the smoothest experience for Mac developers. Homebrew handles dependency management, binary installation, and updates automatically. With OpenTofu installed, you're ready to start writing infrastructure as code directly from your Mac.
