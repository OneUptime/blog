# How to Install OpenTofu on openSUSE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, openSUSE, Installation, Infrastructure as Code, DevOps

Description: A guide to installing OpenTofu on openSUSE Leap and Tumbleweed using zypper and other methods.

## Introduction

openSUSE is a powerful Linux distribution available in two flavors: Leap (stable, point releases) and Tumbleweed (rolling release). This guide covers installing OpenTofu on both variants.

## Prerequisites

- openSUSE Leap 15.x or Tumbleweed
- `sudo` or root access
- Internet connection

## Method 1: Install via Zypper Repository

### Step 1: Add the OpenTofu Repository

```bash
# Add the OpenTofu RPM repository

sudo zypper addrepo \
  --gpgcheck-strict \
  --refresh \
  "https://packages.opentofu.org/opentofu/tofu/rpm_any/rpm_any/$(uname -m)" \
  opentofu

# Or manually create the repository file
cat <<EOF | sudo tee /etc/zypp/repos.d/opentofu.repo
[opentofu]
name=opentofu
baseurl=https://packages.opentofu.org/opentofu/tofu/rpm_any/rpm_any/\$basearch
repo_gpgcheck=1
gpgcheck=1
gpgkey=https://get.opentofu.org/opentofu.gpg
       https://packages.opentofu.org/opentofu/tofu/gpgkey
enabled=1
autorefresh=1
EOF
```

### Step 2: Import the GPG Keys

```bash
# Import the OpenTofu GPG key
sudo rpm --import https://get.opentofu.org/opentofu.gpg
sudo rpm --import https://packages.opentofu.org/opentofu/tofu/gpgkey
```

### Step 3: Install OpenTofu

```bash
# Refresh repos and install
sudo zypper refresh
sudo zypper install -y tofu
```

## Method 2: Install from RPM Package

```bash
TOFU_VERSION="1.11.6"

# Download the RPM
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_amd64.rpm"

# Install using zypper
sudo zypper install --allow-unsigned-rpm "tofu_${TOFU_VERSION}_amd64.rpm"

# Or using rpm directly
sudo rpm -i "tofu_${TOFU_VERSION}_amd64.rpm"
```

## Method 3: Install from Binary

```bash
TOFU_VERSION="1.11.6"

# Install unzip if needed
sudo zypper install -y unzip

# Download and extract
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"
unzip "tofu_${TOFU_VERSION}_linux_amd64.zip"

# Install to system PATH
sudo mv tofu /usr/local/bin/
sudo chmod +x /usr/local/bin/tofu
```

## Verifying the Installation

```bash
# Verify version
tofu version

# Locate the binary
which tofu
```

## Shell Completion Setup

```bash
# Enable bash completion
tofu -install-autocomplete

# For zsh users on openSUSE
echo 'autoload -U compinit && compinit' >> ~/.zshrc
tofu -install-autocomplete
source ~/.zshrc
```

## Testing OpenTofu on openSUSE

```hcl
# test.tf
terraform {
  required_version = ">= 1.6"
}

variable "distro" {
  type    = string
  default = "openSUSE"
}

output "message" {
  value = "OpenTofu is successfully installed on ${var.distro}!"
}
```

```bash
mkdir ~/tofu-test && cd ~/tofu-test
# Create test.tf with content above
tofu init
tofu apply -auto-approve
```

## Updating OpenTofu

```bash
# Update via zypper
sudo zypper refresh && sudo zypper update tofu

# Check the updated version
tofu version
```

## Removing OpenTofu

```bash
# Remove using zypper
sudo zypper remove tofu

# Remove the repository
sudo zypper removerepo opentofu
```

## Conclusion

OpenTofu installs seamlessly on openSUSE using the zypper package manager with the official RPM repository. Whether you prefer Leap's stability or Tumbleweed's rolling updates, OpenTofu provides a reliable infrastructure-as-code tool for managing your infrastructure on openSUSE.
