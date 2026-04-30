# How to Install OpenTofu on CentOS Stream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CentOS, Installation, Infrastructure as Code, DevOps

Description: A complete guide to installing OpenTofu on CentOS Stream using the official RPM repository.

## Introduction

CentOS Stream is the upstream development platform for Red Hat Enterprise Linux (RHEL). This guide covers installing OpenTofu on CentOS Stream 9 and 10, which are popular choices for enterprise environments.

## Prerequisites

- CentOS Stream 9 or 10
- `sudo` or root access
- Active internet connection

## Method 1: Install via the Official RPM Repository

### Step 1: Add the OpenTofu YUM Repository

```bash
# Create the repository configuration file

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
EOF
```

### Step 2: Import the GPG Key

```bash
# Import the GPG key for package verification
sudo rpm --import https://get.opentofu.org/opentofu.gpg
sudo rpm --import https://packages.opentofu.org/opentofu/tofu/gpgkey
```

### Step 3: Install OpenTofu

```bash
# Install using dnf (CentOS Stream 9 and 10)
sudo dnf install -y tofu

# Or using yum (if available on your system)
sudo yum install -y tofu
```

## Method 2: Install via RPM Package

```bash
TOFU_VERSION="1.11.6"

# Download the RPM
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_amd64.rpm"

# Install the package
sudo dnf install -y "./tofu_${TOFU_VERSION}_amd64.rpm"
```

## Method 3: Manual Binary Installation

```bash
TOFU_VERSION="1.11.6"
ARCH="amd64"

# Download and install
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_${ARCH}.zip"

# Install unzip if needed
sudo dnf install -y unzip

# Extract and move to PATH
unzip "tofu_${TOFU_VERSION}_linux_${ARCH}.zip"
sudo mv tofu /usr/local/bin/
sudo chmod +x /usr/local/bin/tofu
```

## Verifying the Installation

```bash
# Verify the installation
tofu version

# Check binary location
which tofu
```

## Configuring SELinux (if needed)

On CentOS Stream with SELinux enabled, you may need to set the correct context:

```bash
# Check if SELinux is enforcing
getenforce

# If needed, set the correct SELinux context
sudo restorecon -v /usr/local/bin/tofu
```

## Quick Test Configuration

```hcl
# test.tf
terraform {
  required_version = ">= 1.6"
}

locals {
  message = "OpenTofu is running on CentOS Stream!"
}

output "test_output" {
  value = local.message
}
```

```bash
# Test the installation
tofu init
tofu plan
tofu apply -auto-approve
```

## Firewall Considerations

If your CentOS Stream server needs outbound access for provider downloads:

```bash
# Check firewall status
sudo firewall-cmd --state

# OpenTofu needs outbound HTTPS access (port 443)
# Ensure outbound connections are allowed in your firewall rules
```

## Updating OpenTofu

```bash
# Update to the latest version
sudo dnf update tofu

# Verify the update
tofu version
```

## Removing OpenTofu

```bash
# Uninstall OpenTofu
sudo dnf remove tofu

# Remove the repository configuration
sudo rm /etc/yum.repos.d/opentofu.repo
```

## Conclusion

OpenTofu can be easily installed on CentOS Stream using the official RPM repository. This provides a managed installation that receives updates through the standard package management workflow. With OpenTofu installed, your CentOS Stream server is ready to manage infrastructure as code.
