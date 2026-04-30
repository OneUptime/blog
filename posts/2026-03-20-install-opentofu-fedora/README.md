# How to Install OpenTofu on Fedora

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Fedora, Installation, Infrastructure as Code, DevOps

Description: A step-by-step guide to installing OpenTofu on Fedora Linux using the official RPM repository and other methods.

## Introduction

Fedora is a community-driven Linux distribution sponsored by Red Hat, known for incorporating cutting-edge software. This guide walks you through installing OpenTofu on Fedora using the official RPM repository.

## Prerequisites

- A supported Fedora release
- `sudo` privileges
- Internet access

## Method 1: Install via the Official YUM/DNF Repository

### Step 1: Add the OpenTofu Repository

```bash
# Create the OpenTofu repository file
cat <<EOF | sudo tee /etc/yum.repos.d/opentofu.repo
[opentofu]
name=opentofu
baseurl=https://packages.opentofu.org/opentofu/tofu/rpm_any/rpm_any/\$basearch
repo_gpgcheck=0
gpgcheck=1
enabled=1
gpgkey=https://get.opentofu.org/opentofu.gpg
       https://packages.opentofu.org/opentofu/tofu/gpgkey
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
[opentofu-source]
name=opentofu-source
baseurl=https://packages.opentofu.org/opentofu/tofu/rpm_any/rpm_any/SRPMS
repo_gpgcheck=0
gpgcheck=1
enabled=1
gpgkey=https://get.opentofu.org/opentofu.gpg
       https://packages.opentofu.org/opentofu/tofu/gpgkey
sslverify=1
sslcacert=/etc/pki/tls/certs/ca-bundle.crt
metadata_expire=300
EOF
```

### Step 2: Install OpenTofu

```bash
# Install OpenTofu using dnf
sudo dnf install -y tofu
```

## Method 2: Install from RPM Package

Download and install the RPM package directly:

```bash
TOFU_VERSION="1.11.6"

# Download the RPM package
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_amd64.rpm"

# Install using rpm
sudo rpm -i "tofu_${TOFU_VERSION}_amd64.rpm"

# Or using dnf for better dependency management
sudo dnf install "tofu_${TOFU_VERSION}_amd64.rpm"
```

## Method 3: Install from Binary

```bash
TOFU_VERSION="1.11.6"

# Download and extract
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"
unzip "tofu_${TOFU_VERSION}_linux_amd64.zip"

# Install to system path
sudo mv tofu /usr/local/bin/
sudo chmod +x /usr/local/bin/tofu
```

## Verifying the Installation

```bash
# Check installed version
tofu version

# Output:
# OpenTofu v1.11.6
# on linux_amd64
```

## Setting Up Shell Autocompletion

```bash
# Install autocomplete for your current shell
tofu -install-autocomplete

# Restart your shell, or re-read the profile script that OpenTofu updated.
```

## Quick Start Example

```hcl
# main.tf - Testing OpenTofu on Fedora
terraform {
  required_version = ">= 1.6"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.0"
    }
  }
}

resource "local_file" "hello" {
  content  = "Hello from OpenTofu on Fedora!"
  filename = "${path.module}/hello.txt"
}

output "file_path" {
  value = local_file.hello.filename
}
```

```bash
# Initialize and apply
tofu init
tofu apply -auto-approve

# Verify the file was created
cat hello.txt
```

## Updating OpenTofu

```bash
# Update using dnf
sudo dnf update tofu

# Verify the new version
tofu version
```

## Removing OpenTofu

```bash
# Remove using dnf
sudo dnf remove tofu

# Also remove the repository
sudo rm /etc/yum.repos.d/opentofu.repo
```

## Conclusion

Installing OpenTofu on Fedora is simple using the official RPM repository. The package manager approach makes it easy to keep OpenTofu updated and manage its lifecycle. You are now ready to use OpenTofu to define and provision infrastructure on Fedora Linux.
