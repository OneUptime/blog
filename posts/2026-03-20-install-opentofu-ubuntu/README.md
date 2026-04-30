# How to Install OpenTofu on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Ubuntu, Installation, Infrastructure as Code, DevOps

Description: A step-by-step guide to installing OpenTofu on Ubuntu using the official package repository.

## Introduction

OpenTofu is the open-source fork of Terraform maintained by the Linux Foundation. It provides the same infrastructure-as-code capabilities as Terraform while being community-driven and free from proprietary licensing restrictions. This guide walks you through installing OpenTofu on Ubuntu Linux.

## Prerequisites

- Ubuntu 20.04 LTS or later
- `sudo` privileges
- Internet access

## Method 1: Install via the Official Debian/Ubuntu Package Repository

This is the recommended method for Ubuntu systems.

### Step 1: Install Required Dependencies

```bash
# Update package list and install required packages

sudo apt-get update
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
```

### Step 2: Add the OpenTofu GPG Key

```bash
# Create the keyring directory if it doesn't exist
sudo install -m 0755 -d /etc/apt/keyrings

# Download and add the OpenTofu GPG key
curl -fsSL https://get.opentofu.org/opentofu.gpg | \
  sudo tee /etc/apt/keyrings/opentofu.gpg > /dev/null

curl -fsSL https://packages.opentofu.org/opentofu/tofu/gpgkey | \
  sudo gpg --no-tty --batch --dearmor -o /etc/apt/keyrings/opentofu-repo.gpg > /dev/null

# Set correct permissions
sudo chmod a+r /etc/apt/keyrings/opentofu.gpg /etc/apt/keyrings/opentofu-repo.gpg
```

### Step 3: Add the OpenTofu Repository

```bash
# Add the repository to sources list
echo \
  "deb [signed-by=/etc/apt/keyrings/opentofu.gpg,/etc/apt/keyrings/opentofu-repo.gpg] \
  https://packages.opentofu.org/opentofu/tofu/any/ any main
deb-src [signed-by=/etc/apt/keyrings/opentofu.gpg,/etc/apt/keyrings/opentofu-repo.gpg] \
  https://packages.opentofu.org/opentofu/tofu/any/ any main" | \
  sudo tee /etc/apt/sources.list.d/opentofu.list > /dev/null

sudo chmod a+r /etc/apt/sources.list.d/opentofu.list
```

### Step 4: Install OpenTofu

```bash
# Update package list and install OpenTofu
sudo apt-get update
sudo apt-get install -y tofu
```

## Method 2: Install via Snap

Ubuntu users can also use Snap to install OpenTofu:

```bash
# Install OpenTofu via Snap
sudo snap install --classic opentofu
```

## Method 3: Install via Binary Download

For users who prefer manual installation or need a specific version:

```bash
# Install required tools if needed
sudo apt-get update
sudo apt-get install -y unzip wget

# Download a specific version (replace with the version you want)
TOFU_VERSION="1.11.6"
wget "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"

# Extract and install
unzip "tofu_${TOFU_VERSION}_linux_amd64.zip"
sudo mv tofu /usr/local/bin/
sudo chmod +x /usr/local/bin/tofu
```

## Verifying the Installation

After installation, verify OpenTofu is installed correctly:

```bash
# Check the installed version
tofu version

# Expected output will look similar to:
# OpenTofu v1.11.6
# on linux_amd64
```

## Running a Quick Test

Create a simple test configuration to make sure everything works:

```hcl
# test.tf - A minimal OpenTofu configuration to test your installation
terraform {
  required_version = ">= 1.6"
}

output "hello" {
  value = "OpenTofu is working on Ubuntu!"
}
```

```bash
# Initialize and apply
tofu init
tofu apply -auto-approve

# You should see:
# Outputs:
# hello = "OpenTofu is working on Ubuntu!"
```

## Keeping OpenTofu Up to Date

When a new version is released, update with:

```bash
# Using apt (if installed via package repository)
sudo apt-get update && sudo apt-get install --only-upgrade tofu

# Using snap
sudo snap refresh opentofu
```

## Uninstalling OpenTofu

```bash
# If installed via apt
sudo apt-get remove tofu
sudo apt-get purge tofu  # to also remove configuration files

# If installed via snap
sudo snap remove opentofu

# If installed manually
sudo rm /usr/local/bin/tofu
```

## Conclusion

You have successfully installed OpenTofu on Ubuntu. The apt package repository method is recommended for most users as it simplifies future updates and ensures you have the latest stable release. With OpenTofu installed, you can now start defining and managing your infrastructure as code using HCL configurations.
