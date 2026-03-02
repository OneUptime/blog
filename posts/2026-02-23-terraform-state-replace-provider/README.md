# How to Use terraform state replace-provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Provider, Migration, Infrastructure as Code

Description: Guide to using terraform state replace-provider to update provider references in Terraform state, covering provider migration scenarios, registry changes, and fork transitions.

---

Terraform providers sometimes change names, move registries, or get forked. When that happens, the resources in your state file still reference the old provider address. The `terraform state replace-provider` command updates these references without affecting your actual infrastructure. It is a niche but essential tool for provider migrations.

## What terraform state replace-provider Does

Every resource in your Terraform state is associated with a provider address. That address looks something like:

```
registry.terraform.io/hashicorp/aws
```

When a provider's address changes - perhaps it moved from `hashicorp/aws` to a community fork, or from an in-house registry to the public one - your state file still references the old address. The `replace-provider` command updates all occurrences of one provider address to another.

## Basic Syntax

```bash
terraform state replace-provider [options] FROM_PROVIDER TO_PROVIDER
```

Both provider arguments use the fully qualified format: `registry.terraform.io/namespace/name`.

## Common Scenarios

### Scenario 1: Migrating from Built-in Providers

When Terraform 0.13 introduced the provider registry, built-in providers moved to `registry.terraform.io`. If you are upgrading from Terraform 0.12 or earlier:

```bash
# Migrate from the legacy provider address to the registry address
terraform state replace-provider \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"
```

The `-/aws` format represents the legacy "unqualified" provider that existed before Terraform 0.13's provider namespacing.

### Scenario 2: Switching to a Community Fork

Sometimes the official provider does not meet your needs and a community fork does:

```bash
# Switch from the official provider to a fork
terraform state replace-provider \
  "registry.terraform.io/hashicorp/kubernetes" \
  "registry.terraform.io/my-org/kubernetes"
```

### Scenario 3: Moving to a Private Registry

When transitioning from the public registry to a private one:

```bash
# Migrate from public to private registry
terraform state replace-provider \
  "registry.terraform.io/hashicorp/aws" \
  "private-registry.example.com/hashicorp/aws"
```

### Scenario 4: Provider Rename

Occasionally a provider changes its name or namespace:

```bash
# Provider changed namespace
terraform state replace-provider \
  "registry.terraform.io/old-namespace/provider-name" \
  "registry.terraform.io/new-namespace/provider-name"
```

## Step-by-Step Migration

Let's walk through a complete provider migration.

### Step 1: Check Current Provider References

First, see what providers your state references:

```bash
# List providers referenced in state
terraform state pull | jq -r '.resources[].provider' | sort -u

# Output:
# provider["registry.terraform.io/hashicorp/aws"]
# provider["registry.terraform.io/hashicorp/random"]
# provider["registry.terraform.io/-/null"]
```

### Step 2: Update Your Configuration

Before replacing providers in state, update your Terraform configuration to use the new provider:

```hcl
# Before
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# After (example: switching to a fork)
terraform {
  required_providers {
    aws = {
      source  = "my-org/aws"
      version = "~> 5.0"
    }
  }
}
```

### Step 3: Run the Replace

```bash
# Replace the provider in state
terraform state replace-provider \
  "registry.terraform.io/hashicorp/aws" \
  "registry.terraform.io/my-org/aws"
```

Terraform will show you what will change and ask for confirmation:

```
Terraform will perform the following actions:

  ~ Updating provider:
    - registry.terraform.io/hashicorp/aws
    + registry.terraform.io/my-org/aws

Changing 15 resources:

  aws_instance.web
  aws_instance.worker[0]
  aws_instance.worker[1]
  aws_security_group.web
  aws_security_group.worker
  aws_subnet.public[0]
  aws_subnet.public[1]
  aws_subnet.private[0]
  aws_subnet.private[1]
  aws_vpc.main
  aws_internet_gateway.main
  aws_route_table.public
  aws_route_table.private
  aws_route_table_association.public[0]
  aws_route_table_association.public[1]

Do you want to make these changes?
  Only 'yes' will be accepted to confirm.

  Enter a value: yes
```

### Step 4: Reinitialize

After replacing providers, reinitialize to download the new provider:

```bash
# Reinitialize with the new provider
terraform init

# Verify everything works
terraform plan
```

### Step 5: Verify

```bash
# Confirm the provider was replaced
terraform state pull | jq -r '.resources[].provider' | sort -u

# Should show the new provider address
# provider["registry.terraform.io/my-org/aws"]
```

## Handling Module Resources

The `replace-provider` command updates all resources in the state, including those inside modules. You do not need to run it separately for each module:

```bash
# This replaces the provider for ALL resources, including those in modules
terraform state replace-provider \
  "registry.terraform.io/hashicorp/aws" \
  "registry.terraform.io/my-org/aws"

# Affects:
# aws_vpc.main
# module.networking.aws_subnet.public[0]
# module.networking.aws_subnet.private[0]
# module.app.module.database.aws_db_instance.main
# ... everything
```

## Skipping Confirmation

For automated workflows, skip the interactive confirmation:

```bash
# Auto-approve the replacement
terraform state replace-provider -auto-approve \
  "registry.terraform.io/hashicorp/aws" \
  "registry.terraform.io/my-org/aws"
```

## Backup

Terraform creates a backup before modifying state. Specify a custom backup location:

```bash
# Create a custom backup
terraform state replace-provider \
  -backup=./provider-migration-backup.tfstate \
  "registry.terraform.io/hashicorp/aws" \
  "registry.terraform.io/my-org/aws"
```

To restore if something goes wrong:

```bash
# Restore from backup
terraform state push terraform.tfstate.backup
```

## Multiple Provider Replacements

If you need to replace multiple providers, run the command once for each:

```bash
# Replace the AWS provider
terraform state replace-provider \
  "registry.terraform.io/hashicorp/aws" \
  "registry.terraform.io/my-org/aws"

# Replace the null provider
terraform state replace-provider \
  "registry.terraform.io/-/null" \
  "registry.terraform.io/hashicorp/null"

# Replace the random provider
terraform state replace-provider \
  "registry.terraform.io/-/random" \
  "registry.terraform.io/hashicorp/random"
```

## Upgrading from Terraform 0.12 to 0.13+

The most common use of `replace-provider` is during the Terraform 0.12 to 0.13 upgrade. In 0.12, providers did not have qualified names. In 0.13+, they need full registry addresses:

```bash
# Fix all legacy provider references
terraform state replace-provider \
  "registry.terraform.io/-/aws" \
  "registry.terraform.io/hashicorp/aws"

terraform state replace-provider \
  "registry.terraform.io/-/google" \
  "registry.terraform.io/hashicorp/google"

terraform state replace-provider \
  "registry.terraform.io/-/azurerm" \
  "registry.terraform.io/hashicorp/azurerm"

terraform state replace-provider \
  "registry.terraform.io/-/null" \
  "registry.terraform.io/hashicorp/null"

terraform state replace-provider \
  "registry.terraform.io/-/random" \
  "registry.terraform.io/hashicorp/random"
```

You can also handle this during `terraform init` in 0.13, which prompts you to run the replacement automatically:

```bash
# Terraform 0.13 init detects legacy providers and suggests the fix
terraform init

# Output:
# There are some problems with the provider configuration...
# Terraform can automatically migrate your state by running:
# terraform state replace-provider registry.terraform.io/-/aws registry.terraform.io/hashicorp/aws
```

## How the State Changes

Here is what the raw state JSON looks like before and after:

```json
// Before
{
  "type": "aws_instance",
  "name": "web",
  "provider": "provider[\"registry.terraform.io/hashicorp/aws\"]",
  "instances": [...]
}

// After
{
  "type": "aws_instance",
  "name": "web",
  "provider": "provider[\"registry.terraform.io/my-org/aws\"]",
  "instances": [...]
}
```

Only the `provider` field changes. Everything else - resource type, name, attributes, dependencies - stays the same.

## Troubleshooting

### Provider Not Found in State

```
Error: Invalid target provider address
Provider registry.terraform.io/hashicorp/aws does not exist in the current state.
```

Check what providers are actually in your state:

```bash
terraform state pull | jq -r '.resources[].provider' | sort -u
```

The provider strings in state include the `provider["..."]` wrapper. Strip that when passing to `replace-provider`.

### Init Fails After Replacement

If `terraform init` fails after replacing providers, make sure your configuration's `required_providers` block matches the new provider address:

```hcl
terraform {
  required_providers {
    # This must match the new provider address in state
    aws = {
      source  = "my-org/aws"     # Must match what you replaced to
      version = "~> 5.0"
    }
  }
}
```

### Resources Show as Needing Recreation

If `terraform plan` shows resources being destroyed and recreated after a provider replacement, the new provider might use a different resource schema. This is common when switching to a fork that has diverged from the original. Review the plan carefully before applying.

## Summary

The `terraform state replace-provider` command handles the specific but important task of updating provider references in your state file. You will need it when upgrading between major Terraform versions, switching to provider forks, or migrating between registries. The workflow is straightforward: update your configuration, run the replacement, reinitialize, and verify. Always check that `terraform plan` shows no unexpected changes after the migration. For other state manipulation needs, see [terraform state mv](https://oneuptime.com/blog/post/2026-02-23-terraform-state-mv-command/view) for moving resources and [terraform state rm](https://oneuptime.com/blog/post/2026-02-23-terraform-state-rm-command/view) for removing them.
