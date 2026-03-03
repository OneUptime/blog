# How to Use the terraform providers Command

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, CLI, Infrastructure as Code, DevOps

Description: Learn how to use the terraform providers command to inspect, list, and debug provider dependencies in your Terraform configurations for better infrastructure management.

---

When you work with Terraform long enough, you end up with configurations that pull in multiple providers. Some you declared explicitly, others snuck in as dependencies of modules you imported. The `terraform providers` command gives you a clear view of every provider your configuration depends on and where those dependencies come from.

This guide walks through the different subcommands under `terraform providers`, what output to expect, and how to use this information in real workflows.

## What the terraform providers Command Does

The `terraform providers` command inspects your Terraform configuration and state to display information about the providers in use. It does not make changes to your infrastructure or your state file. Think of it as a read-only diagnostic tool.

There are three main subcommands:

- `terraform providers` (the base command) - shows the provider dependency tree
- `terraform providers schema` - outputs the full schema for all providers
- `terraform providers lock` - manages the dependency lock file
- `terraform providers mirror` - downloads provider packages to a local directory

We will cover each one in this post, though `terraform providers lock` gets its own deeper treatment in a [separate article](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-providers-lock-for-cross-platform-teams/view).

## Viewing the Provider Dependency Tree

Running `terraform providers` with no subcommand shows you a tree of provider requirements, organized by where each requirement originates.

```bash
# Run from your Terraform project root
terraform providers
```

Here is what typical output looks like:

```text
Providers required by configuration:
.
|-- provider[registry.terraform.io/hashicorp/aws] >= 5.0.0
|-- provider[registry.terraform.io/hashicorp/random] >= 3.0.0
|-- module.vpc
    |-- provider[registry.terraform.io/hashicorp/aws] >= 4.0.0

Providers required by state:
    provider[registry.terraform.io/hashicorp/aws]
    provider[registry.terraform.io/hashicorp/random]
```

The output breaks down into two sections. The first shows providers required by your `.tf` files and any modules they reference. The second shows providers that your state file references, which matters because even if you remove a provider from your configuration, Terraform still needs it to manage resources that already exist in state.

### Reading the Tree

Each entry shows the provider source address and any version constraints. The tree format tells you exactly which module introduced each dependency:

```text
# Root configuration requires AWS >= 5.0.0
# The vpc module also requires AWS but with a looser >= 4.0.0 constraint
# Terraform resolves both constraints together to find a compatible version
```

This is especially useful when you run into version conflicts. If Terraform cannot find a provider version that satisfies all constraints, looking at the tree tells you which module is the source of the conflicting requirement.

## Inspecting Provider Schemas

The `terraform providers schema` subcommand dumps the complete schema definition for every provider in your configuration. This includes all resource types, data sources, and their attributes.

```bash
# Output the schema as JSON
terraform providers schema -json
```

The JSON output is large, so you will almost always want to pipe it through `jq` to extract what you need:

```bash
# Get the list of all resource types from the AWS provider
terraform providers schema -json | jq '.provider_schemas["registry.terraform.io/hashicorp/aws"].resource_schemas | keys[]'

# Get the schema for a specific resource type
terraform providers schema -json | jq '.provider_schemas["registry.terraform.io/hashicorp/aws"].resource_schemas["aws_instance"]'

# List all attributes of aws_s3_bucket
terraform providers schema -json | jq '.provider_schemas["registry.terraform.io/hashicorp/aws"].resource_schemas["aws_s3_bucket"].block.attributes | keys[]'
```

### Practical Uses for Provider Schema

There are several situations where inspecting the schema helps:

1. **Checking available attributes** - When the documentation is unclear or you want to see the raw attribute definitions, the schema gives you the ground truth.

2. **Building automation** - If you are generating Terraform configurations programmatically, the schema tells you every valid attribute, its type, and whether it is required or optional.

3. **Auditing resource types** - You can list every resource type a provider supports to check if a specific resource exists before writing configuration for it.

```bash
# Check if a specific resource type exists
terraform providers schema -json | jq '.provider_schemas["registry.terraform.io/hashicorp/aws"].resource_schemas | has("aws_ecs_cluster")'
# Returns: true
```

## Mirroring Providers Locally

The `terraform providers mirror` command downloads all required provider packages to a local directory. This is useful for air-gapped environments or when you want to run a local provider mirror.

```bash
# Mirror all providers to a local directory
terraform providers mirror /path/to/mirror

# Mirror for specific platforms
terraform providers mirror -platform=linux_amd64 -platform=darwin_arm64 /path/to/mirror
```

After mirroring, you configure Terraform to use the local directory as a filesystem mirror in your CLI configuration:

```hcl
# ~/.terraformrc or terraform.rc
provider_installation {
  filesystem_mirror {
    path    = "/path/to/mirror"
    include = ["registry.terraform.io/*/*"]
  }
}
```

### When to Use Provider Mirroring

Mirroring makes sense in a few scenarios:

- **Air-gapped environments** where machines cannot reach the Terraform registry
- **CI/CD pipelines** where you want to avoid registry rate limits and ensure reproducible builds
- **Compliance requirements** that mandate all external dependencies go through an internal review process

```bash
# Example: mirror providers for a CI pipeline
# Run this once to populate the cache
terraform providers mirror -platform=linux_amd64 ./terraform-provider-cache

# In your CI config, point Terraform at the local cache
export TF_CLI_CONFIG_FILE=".terraformrc"
```

## Debugging Common Provider Issues

The `terraform providers` command is your first stop when troubleshooting provider-related problems. Here are some common scenarios.

### Version Constraint Conflicts

When `terraform init` fails with a version constraint error, run `terraform providers` to see all the constraints in play:

```bash
terraform providers
# Look for the same provider appearing multiple times with different version constraints
# Example output showing a conflict:
# |-- provider[registry.terraform.io/hashicorp/aws] >= 5.0.0, < 6.0.0
# |-- module.legacy_vpc
#     |-- provider[registry.terraform.io/hashicorp/aws] ~> 4.67.0
```

In this case, the root module wants AWS provider 5.x but the legacy VPC module pins to 4.67.x. You need to either update the module or relax your root constraint.

### Providers in State but Not in Configuration

If you removed a provider block from your configuration but still have resources from that provider in your state, Terraform will report an error during plan. The `terraform providers` output shows providers required by state separately:

```bash
terraform providers
# Providers required by state:
#     provider[registry.terraform.io/hashicorp/null]
#
# If null provider is in state but not configuration,
# you need to either add it back or remove the resources from state
terraform state list | grep null_resource
terraform state rm null_resource.example
```

### Checking Provider Lock File Consistency

After running `terraform init`, compare the lock file with the providers command output to verify everything is consistent:

```bash
# View what is locked
cat .terraform.lock.hcl

# Compare with what is required
terraform providers
```

## Using terraform providers in CI/CD Pipelines

In automated pipelines, the providers command helps with validation and compliance checks:

```bash
#!/bin/bash
# Script to validate provider usage in CI

# Check that no unauthorized providers are in use
ALLOWED_PROVIDERS="hashicorp/aws hashicorp/random hashicorp/null"

terraform providers -json 2>/dev/null | jq -r '.providers[].namespace + "/" + .providers[].type' | while read provider; do
  if ! echo "$ALLOWED_PROVIDERS" | grep -q "$provider"; then
    echo "ERROR: Unauthorized provider detected: $provider"
    exit 1
  fi
done

echo "All providers are authorized"
```

## Summary

The `terraform providers` family of commands gives you visibility into your configuration's provider dependencies. Use the base command to see the dependency tree, the `schema` subcommand to inspect resource definitions, the `mirror` subcommand to create local copies, and the `lock` subcommand to manage cross-platform compatibility. These tools are especially valuable as your Terraform configurations grow and you start working with multiple modules and providers.

For more on managing provider locks across teams, check out [How to Use terraform providers lock for Cross-Platform Teams](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-providers-lock-for-cross-platform-teams/view).
