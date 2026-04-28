# How to Set Up OpenTofu in Air-Gapped Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Air-Gapped, Offline, Security, Enterprise

Description: Learn how to install and run OpenTofu in air-gapped or restricted network environments by pre-downloading providers, modules, and binaries for offline use.

## Introduction

Air-gapped environments have no direct internet access for security or compliance reasons. Running OpenTofu in these environments requires pre-downloading the OpenTofu binary, provider plugins, and modules on a machine with internet access, then transferring them to the isolated network. This guide covers the full workflow.

## Pre-Downloading the OpenTofu Binary

```bash
# On internet-connected machine: download binary for target architecture

# Linux amd64
curl -Lo opentofu_1.7.0_linux_amd64.zip \
  https://github.com/opentofu/opentofu/releases/download/v1.7.0/opentofu_1.7.0_linux_amd64.zip

# Verify checksum
curl -Lo opentofu_1.7.0_SHA256SUMS \
  https://github.com/opentofu/opentofu/releases/download/v1.7.0/opentofu_1.7.0_SHA256SUMS

sha256sum --check --ignore-missing opentofu_1.7.0_SHA256SUMS

# Transfer to air-gapped machine and install
unzip opentofu_1.7.0_linux_amd64.zip
sudo mv tofu /usr/local/bin/
sudo chmod +x /usr/local/bin/tofu
tofu version
```

## Pre-Downloading Providers

```bash
# Method 1: Use tofu providers mirror on internet-connected machine

# Initialize with your configuration to resolve all providers
tofu init

# Mirror all providers to a local directory
tofu providers mirror /path/to/provider-mirror/

# The mirror directory structure matches the OpenTofu provider protocol:
# /path/to/provider-mirror/
#   registry.opentofu.org/
#     hashicorp/
#       aws/
#         index.json
#         5.0.0.json
#         terraform-provider-aws_5.0.0_linux_amd64.zip

# Transfer the entire mirror directory to the air-gapped environment
tar -czf provider-mirror.tar.gz /path/to/provider-mirror/
# Copy via USB, internal file share, etc.
```

## Configuring OpenTofu to Use the Local Mirror

```hcl
# Set via the CLI config file: ~/.terraformrc on Unix (or %APPDATA%/terraform.rc on Windows).
# OpenTofu also accepts ~/.tofurc / %APPDATA%/tofu.rc as native names.

# terraform.rc / .terraformrc
provider_installation {
  filesystem_mirror {
    path    = "/opt/opentofu/provider-mirror"
    include = ["registry.opentofu.org/*/*"]
  }

  # Disable direct installation
  direct {
    exclude = ["registry.opentofu.org/*/*"]
  }
}
```

```bash
# Point OpenTofu to the config file
export TF_CLI_CONFIG_FILE=/etc/opentofu/terraform.rc

# Initialize - will use mirror instead of internet
tofu init
```

## Pre-Downloading Modules

```bash
# On internet-connected machine: create a modules bundle

mkdir -p /tmp/module-bundle

# For each module source, download manually
# For Git-based modules:
git clone https://github.com/terraform-aws-modules/terraform-aws-vpc.git \
  /tmp/module-bundle/terraform-aws-vpc

# For registry modules, use tofu init with a stub config to populate the module cache:
mkdir -p /tmp/download-config
cat > /tmp/download-config/main.tf << 'EOF'
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"
}
EOF

cd /tmp/download-config
tofu init
# Modules are downloaded to .terraform/modules/

# Copy the .terraform/modules directory
cp -r .terraform/modules /tmp/module-bundle/
```

## Using Local Module Sources

```hcl
# In air-gapped environment, reference modules from local paths

module "vpc" {
  # Use local path instead of registry
  source = "/opt/opentofu/modules/terraform-aws-vpc"

  cidr            = "10.0.0.0/16"
  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
}

module "security_groups" {
  # Or relative path
  source = "../../modules/security-groups"
}
```

## Network Mirror Configuration

```hcl
# terraform.rc - use internal HTTP mirror server
provider_installation {
  network_mirror {
    url     = "https://internal-mirror.company.com/opentofu-providers/"
    include = ["registry.opentofu.org/*/*"]
  }
}
```

```bash
# Set up a simple nginx mirror server on the internal network
# The directory structure must follow the provider mirror protocol

# Generate mirror index files (required by the protocol)
tofu providers mirror /var/www/opentofu-providers/

# nginx configuration
server {
  listen 443 ssl;
  server_name internal-mirror.company.com;

  root /var/www/opentofu-providers;

  location / {
    autoindex on;
    add_header Content-Type application/json;
  }
}
```

## Complete Air-Gapped Bundle Script

```bash
#!/bin/bash
# bundle-opentofu.sh - Run on internet-connected machine

set -euo pipefail

TOFU_VERSION="${TOFU_VERSION:-1.7.0}"
BUNDLE_DIR="${BUNDLE_DIR:-/tmp/opentofu-bundle}"
CONFIG_DIR="${CONFIG_DIR:-./}"  # Path to your OpenTofu configs

mkdir -p "$BUNDLE_DIR"/{binary,providers,modules}

# Download OpenTofu binary
echo "Downloading OpenTofu ${TOFU_VERSION}..."
curl -Lo "$BUNDLE_DIR/binary/opentofu_${TOFU_VERSION}_linux_amd64.zip" \
  "https://github.com/opentofu/opentofu/releases/download/v${TOFU_VERSION}/opentofu_${TOFU_VERSION}_linux_amd64.zip"

# Mirror providers
echo "Mirroring providers..."
cd "$CONFIG_DIR"
tofu init
tofu providers mirror "$BUNDLE_DIR/providers/"

# Bundle modules
echo "Copying module cache..."
cp -r .terraform/modules "$BUNDLE_DIR/modules/"

# Create install script
cat > "$BUNDLE_DIR/install.sh" << 'INSTALL'
#!/bin/bash
BUNDLE_DIR="$(dirname "$0")"

# Install OpenTofu
unzip -o "$BUNDLE_DIR/binary/opentofu_"*"_linux_amd64.zip" -d /tmp/tofu-install
sudo mv /tmp/tofu-install/tofu /usr/local/bin/tofu
sudo chmod +x /usr/local/bin/tofu

# Set up provider mirror
sudo mkdir -p /opt/opentofu/providers
sudo cp -r "$BUNDLE_DIR/providers/"* /opt/opentofu/providers/

# Configure mirror
sudo tee /etc/opentofu/terraform.rc << 'RC'
provider_installation {
  filesystem_mirror {
    path    = "/opt/opentofu/providers"
    include = ["registry.opentofu.org/*/*"]
  }
  direct {
    exclude = ["registry.opentofu.org/*/*"]
  }
}
RC

echo "Installation complete. Set TF_CLI_CONFIG_FILE=/etc/opentofu/terraform.rc"
INSTALL
chmod +x "$BUNDLE_DIR/install.sh"

# Create the bundle archive
tar -czf opentofu-bundle.tar.gz -C "$(dirname "$BUNDLE_DIR")" "$(basename "$BUNDLE_DIR")"
echo "Bundle created: opentofu-bundle.tar.gz"
```

## CI/CD in Air-Gapped Environments

```yaml
# .github/workflows/opentofu.yml (internal GitLab CI / Jenkins equivalent)
stages:
  - plan
  - apply

variables:
  TF_CLI_CONFIG_FILE: /etc/opentofu/terraform.rc
  TOFU_VERSION: "1.7.0"

plan:
  stage: plan
  image: internal-registry.company.com/opentofu:${TOFU_VERSION}
  script:
    - tofu init -input=false
    - tofu plan -out=plan.tfplan
  artifacts:
    paths:
      - plan.tfplan

apply:
  stage: apply
  when: manual
  script:
    - tofu init -input=false
    - tofu apply plan.tfplan
```

## Conclusion

Air-gapped OpenTofu deployments require pre-downloading three things: the OpenTofu binary, provider plugins via `tofu providers mirror`, and module sources. The filesystem mirror configuration in `terraform.rc` (or `TF_CLI_CONFIG_FILE`) tells OpenTofu to use the local directory instead of the internet registry. For teams, a shared internal HTTP mirror server eliminates the need to distribute provider archives to every machine individually.
