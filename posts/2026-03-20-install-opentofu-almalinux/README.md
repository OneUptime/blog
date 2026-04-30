# How to Install OpenTofu on AlmaLinux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AlmaLinux, RHEL, Installation, Infrastructure as Code, DevOps

Description: A complete guide to installing OpenTofu on AlmaLinux 8 and 9, a popular RHEL-compatible enterprise Linux distribution.

## Introduction

AlmaLinux is a free, open-source, community-driven RHEL fork created as a CentOS replacement. It is widely used in enterprise environments and is fully binary compatible with RHEL. This guide covers installing OpenTofu on AlmaLinux 8 and 9.

## Prerequisites

- AlmaLinux 8 or 9
- `sudo` or root access
- Active internet connection

## Method 1: Install via DNF Repository

### Step 1: Add the OpenTofu Repository

```bash
# Add the OpenTofu repository configuration

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

### Step 2: Import GPG Keys

```bash
# Import the signing keys
sudo rpm --import https://get.opentofu.org/opentofu.gpg
sudo rpm --import https://packages.opentofu.org/opentofu/tofu/gpgkey
```

### Step 3: Install

```bash
# Install OpenTofu
sudo dnf install -y tofu
```

## Method 2: Install from RPM

```bash
TOFU_VERSION="1.11.6"

# Download
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_amd64.rpm"

# Install
sudo dnf localinstall -y "tofu_${TOFU_VERSION}_amd64.rpm"
```

## Method 3: Binary Installation

```bash
TOFU_VERSION="1.11.6"

# Ensure tools are available
sudo dnf install -y curl unzip

# Download and install
curl -LO "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/tofu_${TOFU_VERSION}_linux_amd64.zip"
unzip "tofu_${TOFU_VERSION}_linux_amd64.zip"
sudo install -o root -g root -m 0755 tofu /usr/local/bin/tofu
```

## Verifying the Installation

```bash
# Check version
tofu version

# Expected output
# OpenTofu v1.11.6
# on linux_amd64
```

## Shell Completion

```bash
# Install bash completion
tofu -install-autocomplete
source ~/.bashrc
```

## Using OpenTofu with RHEL-based Clouds

AlmaLinux is commonly used to manage enterprise infrastructure. Here's a typical setup:

```hcl
# infra/main.tf
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "my-company-tofu-state"
    key    = "almalinux-infra/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

# Example: Launch an AlmaLinux EC2 instance
data "aws_ami" "almalinux" {
  most_recent = true
  owners      = ["679593333241"]  # AlmaLinux AMI owner

  filter {
    name   = "name"
    values = ["AlmaLinux OS 9*"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.almalinux.id
  instance_type = "t3.micro"

  tags = {
    Name      = "almalinux-web"
    ManagedBy = "OpenTofu"
  }
}
```

## Updating OpenTofu

```bash
# Update via dnf
sudo dnf update tofu

# Verify
tofu version
```

## Removing OpenTofu

```bash
# Remove the package
sudo dnf remove tofu

# Remove the repository
sudo rm /etc/yum.repos.d/opentofu.repo
sudo dnf clean all
```

## Conclusion

AlmaLinux provides a stable, enterprise-grade platform for running OpenTofu. Its RHEL compatibility ensures that infrastructure code written on AlmaLinux will work seamlessly in RHEL-based production environments. With the official RPM repository, keeping OpenTofu updated is straightforward and reliable.
