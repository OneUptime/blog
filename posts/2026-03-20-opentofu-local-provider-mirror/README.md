# Setting Up a Local Provider Mirror in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Provider, Mirror

Description: Learn how to set up a local filesystem provider mirror in OpenTofu for air-gapped environments and faster initialization.

A local filesystem provider mirror stores provider packages on disk, enabling OpenTofu to work without internet access. This is essential for air-gapped environments, improving init performance, and ensuring providers are always available.

## Why Use a Local Mirror?

- **Air-gapped networks** - servers without internet access
- **Faster CI/CD** - avoid downloading providers on every run
- **Security compliance** - control exactly which providers are used
- **Offline development** - work without internet connectivity
- **Bandwidth savings** - download once, use everywhere

## Creating a Filesystem Mirror

```bash
# Create the mirror directory

mkdir -p /opt/terraform-mirror

# Use tofu providers mirror to download providers
tofu providers mirror /opt/terraform-mirror

# This downloads all providers required by the current configuration
# and stores them in the mirror directory structure
```

The mirror directory structure:

```text
/opt/terraform-mirror/
└── registry.opentofu.org/
    └── hashicorp/
        └── aws/
            ├── 5.38.0.json      # Package index
            └── terraform-provider-aws_5.38.0_linux_amd64.zip
```

## Configuring OpenTofu to Use the Mirror

Add a `filesystem_mirror` to your CLI configuration:

```hcl
# ~/.tofurc or ~/.terraformrc
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform-mirror"
    include = ["registry.opentofu.org/*/*"]
  }

  # Fall through to direct install for providers not in mirror
  direct {
    exclude = ["registry.opentofu.org/hashicorp/*"]
  }
}
```

## Mirror-Only Configuration (Air-Gapped)

For completely air-gapped environments:

```hcl
# ~/.tofurc
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform-mirror"
    include = ["registry.opentofu.org/*/*"]
  }
  # No 'direct' block - never connect to the internet
}
```

## Pointing to a Custom CLI Config or Plugin Directory

```bash
# Alternative: point to a custom CLI config file that configures the mirror
export TF_CLI_CONFIG_FILE=/opt/terraform-mirror.tofurc

# Or, for a one-time override, pass the mirror to tofu init via -plugin-dir
tofu init -plugin-dir=/opt/terraform-mirror
```

## Populating the Mirror for Specific Providers

```bash
# Create a temporary workspace to download specific providers
mkdir /tmp/mirror-setup && cd /tmp/mirror-setup

cat > versions.tf << 'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.38.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "5.20.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "3.90.0"
    }
  }
}
EOF

# Download to mirror
tofu providers mirror /opt/terraform-mirror
```

## Mirror with Multiple Platforms

```bash
# Download providers for multiple platforms
tofu providers lock \
  -fs-mirror=/opt/terraform-mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_arm64

# Or use providers mirror with platform flags
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  /opt/terraform-mirror
```

## Verifying the Mirror Contents

```bash
# List mirror contents
find /opt/terraform-mirror -name "*.zip" | sort

# Verify the JSON index files
cat /opt/terraform-mirror/registry.opentofu.org/hashicorp/aws/5.38.0.json

# Test initialization with mirror
cd /my-project
tofu init
# Should show: Using filesystem mirror at /opt/terraform-mirror
```

## Docker CI/CD with Mirror

```dockerfile
# Dockerfile
FROM ubuntu:22.04

# Copy pre-downloaded mirror
COPY terraform-mirror/ /opt/terraform-mirror/

# Copy CLI config
RUN mkdir -p /root
COPY tofurc /root/.tofurc

# Install OpenTofu
RUN apt-get update && apt-get install -y wget && \
    wget -O tofu.deb https://github.com/opentofu/opentofu/releases/download/v1.7.0/tofu_1.7.0_amd64.deb && \
    dpkg -i tofu.deb
```

```hcl
# /root/.tofurc
provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform-mirror"
    include = ["registry.opentofu.org/*/*"]
  }
}
```

## Conclusion

Local filesystem mirrors are invaluable for air-gapped deployments, CI/CD performance, and compliance-controlled environments. Use `tofu providers mirror` to populate the mirror, configure the `filesystem_mirror` block in your CLI config, and optionally block direct internet access for maximum control over provider provenance.
