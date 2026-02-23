# How to Migrate from Community Providers to Official Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Providers, Community, Migration, Infrastructure as Code

Description: Learn how to migrate Terraform resources from community-maintained providers to official HashiCorp or vendor-maintained providers safely and efficiently.

---

Community Terraform providers have played a vital role in extending Terraform's reach to services without official provider support. However, when an official provider becomes available, migrating to it brings better support, more frequent updates, and tighter integration. This guide covers how to migrate from community providers to their official counterparts without disrupting your infrastructure.

## Why Migrate to Official Providers

Official providers maintained by HashiCorp or the service vendor receive regular updates, security patches, and have guaranteed support. Community providers may have slower update cycles, inconsistent maintenance, or risk abandonment. Official providers also tend to have better documentation, more comprehensive resource coverage, and follow Terraform provider development best practices.

## Identifying Migration Candidates

Check which providers in your configuration are community-maintained:

```bash
# List all providers in your configuration
terraform providers

# Check the source of each provider
grep -A3 "required_providers" *.tf

# Example output showing a community provider
# old_provider = {
#   source  = "community-org/service-name"
#   version = "~> 1.0"
# }
```

Compare against available official providers on the Terraform Registry.

## Understanding the Migration Path

The migration involves three main steps: updating the provider source, replacing the provider in state, and adjusting any resource or data source type names that may have changed.

### Step 1: Update required_providers

```hcl
# Before: Community provider
terraform {
  required_providers {
    datadog = {
      source  = "terraform-providers/datadog"
      version = "~> 2.0"
    }
  }
}

# After: Official provider
terraform {
  required_providers {
    datadog = {
      source  = "DataDog/datadog"
      version = "~> 3.0"
    }
  }
}
```

### Step 2: Replace Provider in State

```bash
# Replace the provider source in state
terraform state replace-provider \
  "registry.terraform.io/terraform-providers/datadog" \
  "registry.terraform.io/DataDog/datadog"
```

### Step 3: Initialize with New Provider

```bash
# Download the new provider
terraform init -upgrade

# Verify the plan
terraform plan
```

## Complete Migration Example: Cloudflare Provider

Here is a full example migrating the Cloudflare provider:

```hcl
# Before: Legacy community source
terraform {
  required_providers {
    cloudflare = {
      source  = "terraform-providers/cloudflare"
      version = "~> 2.0"
    }
  }
}

# After: Official Cloudflare source
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}
```

```bash
# Step 1: Back up state
terraform state pull > state-backup.json

# Step 2: Replace provider in state
terraform state replace-provider \
  "registry.terraform.io/terraform-providers/cloudflare" \
  "registry.terraform.io/cloudflare/cloudflare"

# Step 3: Initialize
terraform init -upgrade

# Step 4: Handle any resource type changes
# Some resource types may have changed between versions

# Step 5: Verify
terraform plan
```

## Handling Resource Type Changes

Official providers may rename resources compared to community versions:

```hcl
# Community provider resource name
resource "community_service_widget" "main" {
  name = "my-widget"
}

# Official provider may use a different name
resource "official_service_widget" "main" {
  name = "my-widget"
}
```

Use moved blocks and state operations to handle renames:

```hcl
# If resource types changed
moved {
  from = community_service_widget.main
  to   = official_service_widget.main
}
```

Or use state mv for more complex scenarios:

```bash
terraform state mv \
  community_service_widget.main \
  official_service_widget.main
```

## Handling Attribute Differences

Official providers may have different attribute names or structures:

```hcl
# Community provider attributes
resource "community_service_record" "dns" {
  zone   = "example.com"
  name   = "www"
  type   = "A"
  value  = "1.2.3.4"
  ttl    = 300
}

# Official provider may rename or restructure attributes
resource "official_service_record" "dns" {
  zone_id = data.official_service_zone.main.id
  name    = "www"
  type    = "A"
  content = "1.2.3.4"  # 'value' renamed to 'content'
  ttl     = 300
}
```

## Testing the Migration

Before migrating production, test thoroughly:

```bash
# Create a test workspace
terraform workspace new migration-test

# Or use a separate state file
terraform init -backend-config="key=test/terraform.tfstate"

# Run the migration steps
terraform state replace-provider ...
terraform init -upgrade
terraform plan

# Verify no destructive changes
terraform plan -detailed-exitcode
# Exit code 0 = no changes (success)
# Exit code 2 = changes detected (review needed)
```

## Automating the Migration

For multiple configurations using the same community provider:

```bash
#!/bin/bash
# migrate-provider.sh
# Migrate a community provider to its official version across multiple configs

OLD_SOURCE="registry.terraform.io/terraform-providers/cloudflare"
NEW_SOURCE="registry.terraform.io/cloudflare/cloudflare"

# Find all Terraform configurations
CONFIG_DIRS=$(find . -name "*.tf" -exec dirname {} \; | sort -u)

for dir in $CONFIG_DIRS; do
  echo "Processing: $dir"
  cd "$dir"

  # Check if this config uses the old provider
  if terraform providers 2>/dev/null | grep -q "$OLD_SOURCE"; then
    echo "  Found old provider, migrating..."

    # Back up state
    terraform state pull > state-backup.json 2>/dev/null

    # Replace provider
    terraform state replace-provider -auto-approve "$OLD_SOURCE" "$NEW_SOURCE"

    # Update configuration files
    sed -i '' "s|terraform-providers/cloudflare|cloudflare/cloudflare|g" *.tf

    # Initialize with new provider
    terraform init -upgrade

    echo "  Migration complete"
  else
    echo "  Old provider not found, skipping"
  fi

  cd - > /dev/null
done
```

## Handling Version Jumps

Community and official providers may be at very different version numbers:

```hcl
# Community provider at v2.x
# Official provider starts at v4.x

# You may need to handle multiple breaking changes
# Review the changelogs for all versions between
```

Follow the incremental upgrade approach described in the provider version migration guide. If the version gap is large, consider doing the provider source migration and version upgrade as separate steps.

## Best Practices

Always back up state before replacing providers. Migrate the provider source and version in separate steps if possible. Test in non-production environments first. Review the official provider documentation for any resource type or attribute changes. Update the lock file after migration. Coordinate with team members to ensure everyone pulls the updated configuration.

## Conclusion

Migrating from community to official Terraform providers improves your infrastructure management with better support, more features, and regular updates. The `terraform state replace-provider` command makes the core migration straightforward. The main work is handling any resource type or attribute differences between the community and official versions. By testing thoroughly and following a systematic approach, you can complete the migration safely.

For related guides, see [How to Use terraform state replace-provider for Provider Migration](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-state-replace-provider-for-provider-migration/view) and [How to Handle Provider Deprecation in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-provider-deprecation-in-terraform/view).
