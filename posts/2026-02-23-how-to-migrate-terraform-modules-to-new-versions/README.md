# How to Migrate Terraform Modules to New Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Version Management, Migration, Infrastructure as Code

Description: Learn how to safely upgrade Terraform modules to new versions including handling breaking changes, variable updates, and state transitions.

---

Terraform modules evolve over time with new features, bug fixes, and sometimes breaking changes. Upgrading modules in your configurations requires understanding what changed, updating your module calls accordingly, and verifying that the upgrade does not disrupt existing infrastructure. This guide covers strategies for module version migration.

## Understanding Module Versioning

Modules from the Terraform Registry follow semantic versioning:

```hcl
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.19.0"  # Specific version

  # Or use constraints
  # version = "~> 3.0"   # Any 3.x version
  # version = ">= 3.0, < 5.0"  # Range
}
```

For Git-sourced modules, use tags or branches:

```hcl
module "vpc" {
  source = "git::https://github.com/org/terraform-vpc.git?ref=v3.0.0"
}
```

## Step 1: Review the Changelog

Before upgrading, review what changed:

```bash
# Check the module changelog on GitHub or the registry
# For registry modules:
# https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest?tab=changelog

# For Git modules, check releases
git log v3.0.0..v4.0.0 --oneline
```

Key things to look for include removed or renamed variables, changed output names, resource renames or splits, new required variables, and changed default values.

## Step 2: Update the Module Version

Update the version constraint in your configuration:

```hcl
# Before
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.19.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
}

# After - update version and handle any breaking changes
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "production-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  # New required variable in v5
  enable_nat_gateway = true
}
```

## Step 3: Initialize and Check

```bash
# Download the new module version
terraform init -upgrade

# Run plan to see what changes
terraform plan -out=module-upgrade.tfplan
```

## Step 4: Handle Resource Moves

If the module renamed internal resources, you may see destroy and create operations. Use moved blocks to handle these:

```hcl
# If the module provides moved blocks, they are applied automatically
# If not, you may need to handle state moves manually

# Check if the plan shows destroy/create pairs for the same resource
# If so, use terraform state mv to fix the addresses

# Example: Module renamed an internal resource
terraform state mv \
  'module.vpc.aws_vpc.this[0]' \
  'module.vpc.aws_vpc.main[0]'
```

## Step 5: Handle Changed Variables

Module upgrades often rename, remove, or add variables:

```hcl
# Variable was renamed
# Before (v3)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "3.19.0"

  enable_dns_support   = true
  enable_dns_hostnames = true
}

# After (v5) - variable names may have changed
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  enable_dns_support   = true
  enable_dns_hostnames = true
  # Check if variable names changed in the new version
}
```

## Step 6: Handle Changed Outputs

If module outputs changed, update all references:

```hcl
# Before - using old output name
resource "aws_instance" "web" {
  subnet_id = module.vpc.private_subnet_ids[0]  # Old output name
}

# After - using new output name
resource "aws_instance" "web" {
  subnet_id = module.vpc.private_subnets[0]  # New output name
}
```

Find all references to module outputs:

```bash
# Search for all references to the module
grep -rn "module.vpc" *.tf
```

## Incremental Module Upgrades

For major version jumps, upgrade incrementally:

```hcl
# Step 1: Upgrade to the latest patch of current major version
version = "3.19.0"  # Latest 3.x

# Step 2: Upgrade to next major version
version = "4.0.0"

# Step 3: Upgrade to latest patch of that major version
version = "4.16.0"  # Latest 4.x

# Step 4: Upgrade to next major version
version = "5.0.0"
```

## Testing Module Upgrades

Use a separate workspace or state to test:

```bash
# Create a test workspace
terraform workspace new module-upgrade-test

# Run plan with the new module version
terraform plan

# If the plan looks clean, switch back to default
terraform workspace select default

# Apply the upgrade
terraform plan
terraform apply

# Clean up test workspace
terraform workspace delete module-upgrade-test
```

## Handling Private Module Upgrades

For private modules maintained by your organization:

```hcl
# Private module from a registry
module "app" {
  source  = "app.terraform.io/my-org/app-module/aws"
  version = "2.0.0"
}

# Private module from Git
module "app" {
  source = "git::https://github.com/my-org/terraform-app-module.git?ref=v2.0.0"
}
```

When upgrading private modules, coordinate with the module maintainers to understand breaking changes and migration paths.

## Automating Module Upgrades

Use Dependabot or Renovate to detect available module updates:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "terraform"
    directory: "/"
    schedule:
      interval: "weekly"
    reviewers:
      - "platform-team"
```

This creates pull requests for module updates that your team can review and test.

## Best Practices

Pin module versions to specific versions rather than using loose constraints. Read changelogs and upgrade guides before every upgrade. Test module upgrades in a non-production environment first. Upgrade one module at a time to isolate issues. Use `terraform plan` to verify no destructive changes occur. Keep a record of module version changes in your commit history. Coordinate with module maintainers for major upgrades.

## Conclusion

Module version upgrades are a normal part of Terraform maintenance. The key is understanding what changed, updating your configuration accordingly, and verifying with `terraform plan` before applying. By following an incremental upgrade strategy and testing thoroughly, you can safely adopt new module versions and benefit from improvements without risking your infrastructure.

For related guides, see [How to Handle Breaking Changes During Terraform Upgrades](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-breaking-changes-during-terraform-upgrades/view) and [How to Migrate Between Terraform Provider Versions](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-between-terraform-provider-versions/view).
