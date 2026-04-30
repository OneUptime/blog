# How to Install OpenTofu on Debian

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Debian, Installation, Infrastructure as Code, DevOps

Description: A complete guide to installing OpenTofu on Debian Linux using the official package repository and alternative methods.

## Introduction

OpenTofu is the open-source, community-driven alternative to Terraform under the Linux Foundation. This guide covers installing OpenTofu on Debian Linux, including Debian 11 (Bullseye) and Debian 12 (Bookworm).

## Prerequisites

- Debian 11 or Debian 12
- `sudo` or root access
- Internet connectivity

## Method 1: Install via the Official APT Repository

### Step 1: Install Required Dependencies

```bash
# Update the package list

sudo apt-get update

# Install required packages
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
```

### Step 2: Add the OpenTofu GPG Key

```bash
# Create keyring directory
sudo install -m 0755 -d /etc/apt/keyrings

# Download and store the OpenTofu GPG key
curl -fsSL https://get.opentofu.org/opentofu.gpg | \
  sudo tee /etc/apt/keyrings/opentofu.gpg > /dev/null

curl -fsSL https://packages.opentofu.org/opentofu/tofu/gpgkey | \
  sudo gpg --no-tty --batch --dearmor -o /etc/apt/keyrings/opentofu-repo.gpg > /dev/null

# Fix permissions
sudo chmod a+r /etc/apt/keyrings/opentofu.gpg /etc/apt/keyrings/opentofu-repo.gpg
```

### Step 3: Add the Repository

```bash
# Add the OpenTofu APT repository
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
sudo apt-get update
sudo apt-get install -y tofu
```

## Method 2: Install from Binary

If you prefer a direct installation without adding a package repository:

```bash
# Set desired version
TOFU_VERSION="1.11.6"

# Download the binary
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"

# Install unzip if needed
sudo apt-get install -y unzip

# Extract the binary
unzip "tofu_${TOFU_VERSION}_linux_amd64.zip"

# Move to a directory in PATH
sudo mv tofu /usr/local/bin/
sudo chmod +x /usr/local/bin/tofu

# Clean up
rm "tofu_${TOFU_VERSION}_linux_amd64.zip"
```

## Method 3: Install via Debian Package

Download and install the .deb package directly:

```bash
TOFU_VERSION="1.11.6"

# Download the .deb package
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_amd64.deb"

# Install using dpkg
sudo dpkg -i "tofu_${TOFU_VERSION}_amd64.deb"

# Fix any dependency issues
sudo apt-get install -f
```

## Verifying the Installation

```bash
# Check the version
tofu version

# Output:
# OpenTofu v1.11.6
# on linux_amd64
```

## Testing with a Simple Configuration

```hcl
# hello.tf
terraform {
  required_version = ">= 1.6"
}

variable "name" {
  type    = string
  default = "Debian User"
}

output "greeting" {
  value = "Hello, ${var.name}! OpenTofu is installed on Debian."
}
```

```bash
# Initialize the working directory
tofu init

# Preview what will happen
tofu plan

# Apply the configuration
tofu apply -auto-approve
```

## Configuring Shell Completion

Enable tab completion for the `tofu` command in Bash:

```bash
# Install shell completion for Bash
tofu -install-autocomplete

# Reload Bash configuration
source ~/.bashrc
```

## Keeping OpenTofu Updated

```bash
# Update via apt
sudo apt-get update && sudo apt-get install -y --only-upgrade tofu

# Check the current version after update
tofu version
```

## Removing OpenTofu

```bash
# Remove the package if installed via the APT repository or .deb package
sudo apt-get remove tofu

# Remove configuration and the repository if you added it
sudo apt-get purge tofu
sudo rm -f /etc/apt/sources.list.d/opentofu.list
sudo rm -f /etc/apt/keyrings/opentofu*.gpg

# If you installed the standalone binary, remove it manually
sudo rm -f /usr/local/bin/tofu
```

## Conclusion

Installing OpenTofu on Debian is straightforward using the official APT repository. The package repository method ensures you receive security updates and new releases automatically through the standard Debian package management system. You are now ready to start managing your infrastructure as code with OpenTofu.
