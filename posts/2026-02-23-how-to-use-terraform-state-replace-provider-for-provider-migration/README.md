# How to Use terraform state replace-provider for Provider Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Provider, Migration, Infrastructure as Code

Description: Learn how to use the terraform state replace-provider command to migrate resources between provider sources in your Terraform state file.

---

When a Terraform provider changes its registry source address, such as moving from a community namespace to the official HashiCorp namespace, or when splitting a monolithic provider into separate ones, you need to update the provider reference in your state file. The `terraform state replace-provider` command handles this transition. This guide explains when and how to use it effectively.

## When You Need replace-provider

The `terraform state replace-provider` command is needed in specific scenarios. The most common is when a provider moves from one registry namespace to another. For example, when the Datadog provider moved from `terraform-providers/datadog` to `DataDog/datadog`, or when community providers become official HashiCorp providers.

Other scenarios include migrating from a legacy provider source to the modern `registry.terraform.io` format after upgrading from Terraform 0.12 to 0.13+, or when an organization forks a provider and needs to switch resources to their fork.

## Understanding Provider Addresses

Terraform identifies providers by their full source address:

```text
registry.terraform.io/hashicorp/aws
|_____________________| |_______| |__|
       hostname        namespace  type
```

The state file records which provider manages each resource. If you change the provider source in your configuration without updating the state, Terraform cannot match resources to their provider.

## Basic Usage

The command syntax is:

```bash
terraform state replace-provider [options] FROM_PROVIDER TO_PROVIDER
```

Example: Migrating from a legacy provider source:

```bash
# Replace the provider source in state
terraform state replace-provider \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"
```

Terraform will show you what will change and ask for confirmation:

```text
Terraform will perform the following actions:

  ~ Updating provider:
    - registry.terraform.io/-/aws
    + registry.terraform.io/hashicorp/aws

Changing 15 resources:

  aws_instance.web
  aws_vpc.main
  aws_subnet.private[0]
  aws_subnet.private[1]
  ...

Do you approve?
  Only 'yes' will be accepted.

  Enter a value: yes
```

## Migrating from Legacy to Modern Provider Sources

After upgrading from Terraform 0.12, providers may have legacy source addresses:

```bash
# Check current provider addresses in state
terraform providers

# Output might show legacy format:
# - registry.terraform.io/-/aws
# - registry.terraform.io/-/google

# Replace with modern format
terraform state replace-provider \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"

terraform state replace-provider \
  "registry.terraform.io/-/google" \
  "registry.terraform.io/hashicorp/google"
```

## Migrating Between Provider Namespaces

When a provider changes namespaces:

```bash
# Example: Provider moved from community to official
terraform state replace-provider \
  "registry.terraform.io/terraform-providers/datadog" \
  "registry.terraform.io/DataDog/datadog"

# Example: Provider moved to a different organization
terraform state replace-provider \
  "registry.terraform.io/old-org/custom-provider" \
  "registry.terraform.io/new-org/custom-provider"
```

## Using replace-provider with Remote State

The command works with remote backends just like local state:

```bash
# The command automatically reads from and writes to the configured backend
terraform state replace-provider \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"

# For specific state files
terraform state replace-provider \
  -state=path/to/terraform.tfstate \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"
```

## Auto-Approve for Automation

In CI/CD pipelines, use the `-auto-approve` flag:

```bash
terraform state replace-provider \
  -auto-approve \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"
```

## Step-by-Step Migration Process

Here is the complete workflow for a provider migration:

```bash
# Step 1: Back up your state
terraform state pull > state-backup.json

# Step 2: Update the required_providers block in your configuration
```

```hcl
# Update from old source to new source
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"  # Updated source
      version = "~> 5.0"
    }
  }
}
```

```bash
# Step 3: Replace the provider in state
terraform state replace-provider \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"

# Step 4: Initialize with the new provider
terraform init

# Step 5: Verify no changes
terraform plan
# Should show: No changes.
```

## Handling Multiple Provider Replacements

If you have several providers to migrate, handle them one at a time:

```bash
#!/bin/bash
# migrate-providers.sh
# Migrate multiple providers from legacy to modern format

# Back up state first
terraform state pull > state-backup-$(date +%Y%m%d).json

# Define provider mappings
declare -A PROVIDERS=(
  ["registry.terraform.io/-/aws"]="registry.terraform.io/hashicorp/aws"
  ["registry.terraform.io/-/azurerm"]="registry.terraform.io/hashicorp/azurerm"
  ["registry.terraform.io/-/google"]="registry.terraform.io/hashicorp/google"
  ["registry.terraform.io/-/random"]="registry.terraform.io/hashicorp/random"
  ["registry.terraform.io/-/null"]="registry.terraform.io/hashicorp/null"
)

for old_source in "${!PROVIDERS[@]}"; do
  new_source="${PROVIDERS[$old_source]}"

  echo "Migrating: $old_source -> $new_source"

  terraform state replace-provider \
    -auto-approve \
    "$old_source" \
    "$new_source" 2>&1 || echo "  Skipped (provider not in state)"

  echo ""
done

echo "Migration complete. Verifying..."
terraform init
terraform plan
```

## Troubleshooting

### Provider Not Found in State

If the source provider is not found in state, the command reports no changes:

```bash
terraform state replace-provider \
  "registry.terraform.io/-/nonexistent" \
  "registry.terraform.io/hashicorp/aws"

# Output: No matching resources found.
```

This is safe and indicates the provider was not used.

### Configuration Mismatch After Replace

If `terraform plan` shows errors after replacing, ensure your `required_providers` block matches the new source:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"  # Must match the new state source
      version = "~> 5.0"
    }
  }
}
```

### Lock File Conflicts

After replacing providers, update the lock file:

```bash
# Remove the old lock file
rm .terraform.lock.hcl

# Reinitialize to generate a new lock file
terraform init

# Commit the new lock file
git add .terraform.lock.hcl
```

## When NOT to Use replace-provider

This command only changes the provider source address in state. It does not migrate resources between different providers. For example, you cannot use it to move resources from the `aws` provider to the `azurerm` provider.

If you need to change which provider manages a resource (not just its source address), you need to remove the resource from state and re-import it under the new provider:

```bash
# This does NOT work for changing provider types
# terraform state replace-provider hashicorp/aws hashicorp/azurerm  # WRONG

# Instead, remove and reimport
terraform state rm aws_instance.web
terraform import azurerm_linux_virtual_machine.web /subscriptions/.../vm-id
```

## Best Practices

Always back up state before running replace-provider. Update your required_providers block before or immediately after the state change. Run terraform plan after every replacement to verify no unexpected changes. Handle one provider at a time to isolate issues. Use automation scripts for environments with many providers to migrate. Commit the updated lock file after migration.

## Conclusion

The `terraform state replace-provider` command is essential when provider source addresses change. Whether you are upgrading from legacy Terraform formats, migrating between provider namespaces, or switching to official provider sources, this command safely updates the state without affecting your actual infrastructure. Combined with proper backup procedures and verification, it makes provider migrations straightforward.

For related guides, see [How to Handle Provider Deprecation in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-provider-deprecation-in-terraform/view) and [How to Migrate from Community Providers to Official Providers](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-community-providers-to-official-providers/view).
