# How to Use tofu providers to List Required Providers - Tofu List

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the tofu providers command to list required providers, view their schemas, create mirror directories, and manage provider dependencies.

## Introduction

The `tofu providers` command provides information about the providers required by your configuration. It includes subcommands for displaying provider schemas, creating local mirrors, and locking provider versions.

## Basic Usage: List Required Providers

```bash
# List all providers required by the configuration

tofu providers

# Output:
# Providers required by configuration:
# .
# └── provider[registry.opentofu.org/hashicorp/aws] ~> 5.0
#
# Providers required by state:
# provider[registry.opentofu.org/hashicorp/aws]
```

## tofu providers schema

Display the schema for all providers (resource and data source definitions):

```bash
# Show all provider schemas (large output)
tofu providers schema -json

# Get schema for a specific resource type
tofu providers schema -json | \
  jq '.provider_schemas["registry.opentofu.org/hashicorp/aws"].resource_schemas["aws_instance"]'

# List all resource types for a provider
tofu providers schema -json | \
  jq '.provider_schemas["registry.opentofu.org/hashicorp/aws"].resource_schemas | keys'

# Get required attributes for a resource
tofu providers schema -json | jq '
  .provider_schemas["registry.opentofu.org/hashicorp/aws"]
  .resource_schemas["aws_instance"].block.attributes |
  to_entries[] |
  select(.value.required == true) |
  .key'
```

## tofu providers mirror

Create a local mirror of provider binaries for air-gapped environments:

```bash
# Mirror providers for multiple platforms
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64 \
  /path/to/mirror/directory

# Use the mirror during init
tofu init -plugin-dir=/path/to/mirror/directory
```

## tofu providers lock

Update the `.terraform.lock.hcl` file with checksums for multiple platforms:

```bash
# Add checksums for a new platform
tofu providers lock -platform=linux_amd64 -platform=darwin_arm64

# Re-lock all providers
tofu providers lock
```

## Viewing Installed Providers

```bash
# List providers with versions and checksums from lock file
cat .terraform.lock.hcl

# Example:
# provider "registry.opentofu.org/hashicorp/aws" {
#   version     = "5.40.0"
#   constraints = "~> 5.0"
#   hashes = [
#     "h1:...",
#     "zh:...",
#   ]
# }
```

## Checking Provider Configuration

```bash
# Verify providers are properly configured
tofu validate  # Validates provider schema compliance

# See which version is installed
ls .terraform/providers/registry.opentofu.org/hashicorp/aws/
# 5.40.0/
```

## Multiple Provider Configurations

```hcl
# Using multiple configurations of the same provider
provider "aws" {
  region = "us-east-1"
  alias  = "us_east"
}

provider "aws" {
  region = "eu-west-1"
  alias  = "eu_west"
}
```

```bash
# The provider requirement appears once in providers output; aliases are not listed separately
tofu providers
# provider[registry.opentofu.org/hashicorp/aws]
```

## Conclusion

The `tofu providers` command group is essential for managing provider dependencies. Use `tofu providers` to verify what providers your configuration requires, `tofu providers schema -json` to introspect resource definitions programmatically, and `tofu providers mirror` to create offline provider caches for air-gapped environments. Keep your `.terraform.lock.hcl` committed to version control for reproducible builds.
