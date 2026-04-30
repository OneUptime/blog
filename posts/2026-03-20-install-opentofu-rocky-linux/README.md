# How to Install OpenTofu on Rocky Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Rocky Linux, RHEL, Installation, Infrastructure as Code, DevOps

Description: A step-by-step guide to installing OpenTofu on Rocky Linux, a community enterprise operating system.

## Introduction

Rocky Linux is a community-driven enterprise Linux distribution designed to be a downstream build of Red Hat Enterprise Linux (RHEL). It's widely used in enterprise environments as a CentOS replacement. This guide covers installing OpenTofu on Rocky Linux 8 and 9.

## Prerequisites

- Rocky Linux 8 or 9
- `sudo` or root access
- Internet connectivity

## Method 1: Install via DNF Repository

### Step 1: Add the OpenTofu Repository

```bash
# Create the repository configuration

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

### Step 2: Import the GPG Keys

```bash
# Import GPG keys for package verification
sudo rpm --import https://get.opentofu.org/opentofu.gpg
sudo rpm --import https://packages.opentofu.org/opentofu/tofu/gpgkey
```

### Step 3: Install OpenTofu

```bash
# Install OpenTofu using dnf
sudo dnf install -y tofu
```

## Method 2: Install from RPM Package

```bash
TOFU_VERSION="1.11.6"

# Download the RPM package
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_amd64.rpm"

# Install using dnf
sudo dnf install -y "./tofu_${TOFU_VERSION}_amd64.rpm"
```

## Method 3: Install from Binary

```bash
TOFU_VERSION="1.11.6"

# Install required tools
sudo dnf install -y curl unzip

# Download and install
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"
unzip "tofu_${TOFU_VERSION}_linux_amd64.zip"
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

## SELinux Configuration

Rocky Linux ships with SELinux enforcing by default:

```bash
# Check SELinux status
sestatus

# If you install manually, set correct context
sudo restorecon -v /usr/local/bin/tofu

# Check if tofu can execute
ls -lZ /usr/local/bin/tofu
```

## Testing Your Installation

```hcl
# ~/tofu-test/main.tf
terraform {
  required_version = ">= 1.6"
}

output "test" {
  value = "OpenTofu is running on Rocky Linux!"
}
```

```bash
mkdir ~/tofu-test && cd ~/tofu-test
tofu init
tofu apply -auto-approve
```

## Setting Up for Production Use

For production Rocky Linux servers managing AWS or other cloud infrastructure:

```hcl
# production/main.tf
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "my-tofu-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "tofu-state-lock"
  }
}

provider "aws" {
  region = var.aws_region
}
```

## Keeping OpenTofu Updated

```bash
# Update using dnf
sudo dnf update tofu

# Verify after update
tofu version
```

## Removing OpenTofu

```bash
# Uninstall
sudo dnf remove tofu

# Remove repository
sudo rm /etc/yum.repos.d/opentofu.repo
sudo dnf clean all
```

## Conclusion

OpenTofu installs reliably on Rocky Linux, making it an excellent choice for enterprise infrastructure automation. The RPM repository method ensures consistent updates and simplifies lifecycle management. Rocky Linux's stability and RHEL compatibility make it an ideal platform for running OpenTofu in production environments.
