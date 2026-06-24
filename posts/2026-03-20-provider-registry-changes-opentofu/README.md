# How OpenTofu Provider Registry Differs from Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Provider Registry, Terraform, Migration, Infrastructure as Code

Description: Learn how OpenTofu's provider registry (registry.opentofu.org) differs from Terraform's (registry.terraform.io) - what providers are available, how to handle providers not yet mirrored, and how to...

## Introduction

OpenTofu uses `registry.opentofu.org` as its default provider registry, while Terraform uses `registry.terraform.io`. Most major providers are available in the OpenTofu registry, but there are differences you should understand when migrating.

## What Changed

When you run `tofu init`, OpenTofu resolves providers from `registry.opentofu.org` by default. The OpenTofu registry hosts many of the same major providers you'd use with Terraform, including common HashiCorp-maintained providers such as AWS, AzureRM, and Google.

```hcl
# This works identically in both Terraform and OpenTofu

# OpenTofu resolves from registry.opentofu.org/hashicorp/aws
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}
```

## When a Provider Is Not in the OpenTofu Registry

Some smaller or vendor-specific providers may not yet be available in the OpenTofu registry. Use an explicit source address to install them from the Terraform registry:

```hcl
terraform {
  required_providers {
    # If vendor-provider is not on registry.opentofu.org,
    # specify the Terraform registry explicitly
    vendor-tool = {
      source  = "registry.terraform.io/vendor/vendor-tool"
      version = "~> 1.0"
    }
  }
}
```

OpenTofu supports provider source addresses with explicit hostnames, including `registry.terraform.io`, for providers that aren't available from `registry.opentofu.org`.

## Checking Provider Availability

```bash
# Check if a provider is available in the OpenTofu registry
curl -fsSL "https://registry.opentofu.org/v1/providers/hashicorp/aws/versions" >/dev/null && echo "hashicorp/aws is available"

# Check for a vendor-specific provider
curl -fsSL "https://registry.opentofu.org/v1/providers/datadog/datadog/versions" >/dev/null && echo "datadog/datadog is available"
```

## Network Mirror

For environments that route provider downloads through an internal mirror, set up a network mirror:

```hcl
# ~/.tofurc (or ~/.terraformrc for backward compatibility)
provider_installation {
  network_mirror {
    url     = "https://my-internal-mirror.example.com/providers/"
    include = ["registry.opentofu.org/*/*", "registry.terraform.io/*/*"]
  }

  # Fallback to direct download if not in mirror
  direct {
    exclude = []
  }
}
```

## Filesystem Mirror

```hcl
# ~/.tofurc (or ~/.terraformrc for backward compatibility)
provider_installation {
  filesystem_mirror {
    path    = "/opt/opentofu-providers"
    include = ["registry.opentofu.org/*/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/*/*"]  # Don't try direct if mirror fails
  }
}
```

Populate the filesystem mirror:

```bash
# Download providers to a local directory
tofu providers mirror /opt/opentofu-providers

# Directory structure created (packed layout):
# /opt/opentofu-providers/registry.opentofu.org/hashicorp/aws/terraform-provider-aws_<VERSION>_linux_amd64.zip
```

## Lock File Differences

The `.terraform.lock.hcl` records provider source addresses and package hashes. If OpenTofu installs a provider from `registry.opentofu.org` instead of `registry.terraform.io`, the lock entry may change because the provider source address, downloaded package, and signing metadata can differ between registries:

```hcl
# After tofu init, the lock file records the provider source address OpenTofu selected
provider "registry.opentofu.org/hashicorp/aws" {
  version     = "5.31.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:abc123...",  # Package hash
    "zh:def456...",  # ZIP archive hash
  ]
}
```

```bash
# Reinitialize and review any lock-file changes after switching from terraform to tofu
tofu init
git diff .terraform.lock.hcl
git add .terraform.lock.hcl
git commit -m "Update provider lock file for OpenTofu"
```

## Adding Multiple Platforms to Lock File

```bash
# Lock providers for multiple platforms (for cross-platform CI)
tofu providers lock \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64 \
  registry.opentofu.org/hashicorp/aws \
  registry.opentofu.org/hashicorp/azurerm \
  registry.opentofu.org/hashicorp/google
```

## Conclusion

OpenTofu's provider registry at `registry.opentofu.org` hosts many of the same major providers you would use with Terraform. Most migrations require no `source` changes - `tofu init` resolves shorthand provider addresses such as `hashicorp/aws` from the OpenTofu registry by default. For providers not available there, specify `registry.terraform.io/namespace/name` explicitly. Review `.terraform.lock.hcl` after switching from `terraform` to `tofu`, since the provider source address and recorded package hashes may change when the registry origin changes.
