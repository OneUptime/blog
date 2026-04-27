# How to Use tofu providers to List Required Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, CLI, Provider

Description: Learn how to use tofu providers commands to list required providers, show schemas, lock checksums, and create provider mirrors.

## Introduction

The `tofu providers` command group provides tools for working with providers - listing which are required, viewing their schemas, managing lock file checksums, and creating mirrors for air-gapped environments.

## tofu providers (list)

```bash
# List all required providers and their sources

tofu providers

# Output:
# Providers required by configuration:
# .
# ├── provider[registry.opentofu.org/hashicorp/aws] ~> 5.0
# ├── provider[registry.opentofu.org/hashicorp/random] >= 3.0.0
# └── module.networking
#     └── provider[registry.opentofu.org/hashicorp/aws] ~> 5.0
```

## Show Provider Tree Including Modules

The output shows which modules require which providers, helping you understand provider dependencies in complex configurations with many modules.

## tofu providers schema

```bash
# Show full schema for all required providers
tofu providers schema

# JSON output for tooling
tofu providers schema -json

# Show schema for a specific resource
tofu providers schema -json | jq \
  '.provider_schemas["registry.opentofu.org/hashicorp/aws"].resource_schemas.aws_s3_bucket'
```

## tofu providers lock

```bash
# Update lock file with checksums for the current platform
tofu providers lock

# Add checksums for additional platforms (for cross-platform teams)
tofu providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64

# Commit .terraform.lock.hcl after running this
```

## tofu providers mirror

```bash
# Download all providers to a local directory for air-gapped use
tofu providers mirror /opt/tofu-mirror/

# Structure:
# /opt/tofu-mirror/
# └── registry.opentofu.org/
#     └── hashicorp/
#         └── aws/
#             └── 5.31.0/
#                 └── terraform-provider-aws_5.31.0_linux_amd64.zip
```

Configure the mirror in `.tofurc`:

```hcl
provider_installation {
  filesystem_mirror {
    path = "/opt/tofu-mirror"
  }
  direct {
    exclude = ["registry.opentofu.org/*/*"]
  }
}
```

## Listing Installed Providers

```bash
# See what's installed in .terraform/providers
ls .terraform/providers/registry.opentofu.org/hashicorp/

# Or check the lock file
cat .terraform.lock.hcl
```

## Provider Schema for Attribute Discovery

```bash
# Find all attributes of a resource type
tofu providers schema -json | jq '
  .provider_schemas["registry.opentofu.org/hashicorp/aws"]
  .resource_schemas.aws_instance
  .block.attributes
  | keys[]
'

# Check if an attribute is required
tofu providers schema -json | jq '
  .provider_schemas["registry.opentofu.org/hashicorp/aws"]
  .resource_schemas.aws_instance
  .block.attributes.instance_type
'
```

## Checking Provider Versions

```bash
# What version of each provider is installed?
tofu version

# Or read the dependency lock file for selected versions
cat .terraform.lock.hcl
```

## Conclusion

The `tofu providers` command group gives visibility into what providers a configuration requires and tools for managing provider artifacts. Use `tofu providers` to see the dependency tree, `tofu providers schema -json` for attribute discovery and tooling, `tofu providers lock` to generate cross-platform checksums, and `tofu providers mirror` to download provider binaries for air-gapped environments.
