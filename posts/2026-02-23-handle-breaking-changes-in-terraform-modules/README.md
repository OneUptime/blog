# How to Handle Breaking Changes in Terraform Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Versioning, Breaking Changes, IaC

Description: Learn strategies for introducing and managing breaking changes in Terraform modules, including deprecation patterns, migration guides, and backwards-compatible transitions.

---

Breaking changes in Terraform modules are different from breaking changes in application libraries. When a library breaks its API, you get a compile error. When a Terraform module breaks, resources might get destroyed and recreated, configuration might be lost, or your production database might get replaced. The stakes are higher, so the process needs to be more careful.

This guide covers how to identify, introduce, and communicate breaking changes in Terraform modules.

## What Counts as a Breaking Change

In Terraform module context, a breaking change is anything that:

- Renames or removes an input variable
- Changes a variable's type
- Removes or renames an output
- Changes resource addresses (causing destroy/recreate)
- Changes default values in a way that alters behavior
- Adds a required variable without a default
- Changes a provider version constraint that drops compatibility

Not all of these are obvious. Changing a default value from `true` to `false` for an encryption setting is technically backwards-compatible from Terraform's perspective, but it could disable encryption for existing deployments when they next apply.

## Semantic Versioning for Modules

Follow semantic versioning strictly:

- **Major version** (v2.0.0): Breaking changes. Callers must update their code.
- **Minor version** (v1.1.0): New features, backwards compatible.
- **Patch version** (v1.0.1): Bug fixes, backwards compatible.

Tag your releases in Git:

```bash
git tag -a v2.0.0 -m "Major release: rename variables for consistency"
git push origin v2.0.0
```

Callers pin to a version:

```hcl
module "vpc" {
  source  = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.3.0"
  # ...
}
```

## Strategy 1: Deprecate Before Removing

Instead of removing a variable in a single release, deprecate it first:

```hcl
# v1.2.0 - Deprecate the old variable
variable "instance_type" {
  description = "DEPRECATED: Use compute_type instead. Will be removed in v2.0.0."
  type        = string
  default     = null
}

variable "compute_type" {
  description = "EC2 instance type for the application servers"
  type        = string
  default     = "t3.medium"
}

locals {
  # Use the new variable, fall back to the deprecated one
  effective_compute_type = coalesce(var.compute_type, var.instance_type, "t3.medium")
}
```

Add a validation that warns users:

```hcl
variable "instance_type" {
  description = "DEPRECATED: Use compute_type instead"
  type        = string
  default     = null

  validation {
    condition     = var.instance_type == null
    error_message = "The 'instance_type' variable is deprecated. Please use 'compute_type' instead."
  }
}
```

This gives users a clear warning and time to migrate before the variable is removed entirely.

## Strategy 2: Use moved Blocks for Resource Renames

When you need to rename resources inside your module, always include `moved` blocks:

```hcl
# v2.0.0 of the module
resource "aws_instance" "application" {
  # Previously named aws_instance.web
  # ...
}

moved {
  from = aws_instance.web
  to   = aws_instance.application
}
```

This prevents destroy/recreate cycles for anyone upgrading. See [how to use the moved block when refactoring modules](https://oneuptime.com/blog/post/2026-02-23-terraform-moved-block-refactoring-modules/view) for more details.

## Strategy 3: Migration Modules

For complex breaking changes, create a migration module that users run once:

```
modules/vpc/
  v2-migration/
    main.tf     # Contains moved blocks and state adjustments
    README.md   # Step-by-step migration instructions
```

```hcl
# modules/vpc/v2-migration/main.tf
# Run this module once to migrate state from v1 to v2

moved {
  from = module.vpc.aws_vpc.main
  to   = module.vpc.aws_vpc.this
}

moved {
  from = module.vpc.aws_subnet.public
  to   = module.vpc.aws_subnet.public_subnets
}

# ... all necessary moved blocks
```

## Strategy 4: Parallel Module Versions

For very large changes, maintain two module versions side by side:

```
modules/
  vpc-v1/      # Legacy, bug fixes only
  vpc-v2/      # New version with breaking changes
```

This lets teams migrate at their own pace. Set a deadline for v1 deprecation and announce it early.

## Writing a Migration Guide

Every major version needs a migration guide. Here is a template:

```markdown
# Migrating from v1 to v2

## Breaking Changes

### Variable Renames
| v1 Name | v2 Name |
|---------|---------|
| instance_type | compute_type |
| enable_logging | (removed - always enabled) |

### Removed Variables
- `enable_logging` - Logging is now always enabled
- `legacy_naming` - The old naming scheme is no longer supported

### New Required Variables
- `environment` - Must be one of: dev, staging, production

### Resource Address Changes
The following resources have been renamed and include moved blocks:
- `aws_instance.web` -> `aws_instance.application`
- `aws_security_group.web` -> `aws_security_group.application`

## Migration Steps

1. Update your module source to v2.0.0
2. Rename `instance_type` to `compute_type` in your module call
3. Remove `enable_logging` from your module call
4. Add `environment = "production"` (or appropriate value)
5. Run `terraform plan` - verify no resources are being destroyed
6. Run `terraform apply`
```

## Handling Default Value Changes

Changing defaults is subtle. Consider this change:

```hcl
# v1.0.0
variable "multi_az" {
  default = false
}

# v2.0.0 - changing default to true
variable "multi_az" {
  default = true
}
```

If a user never explicitly set `multi_az`, upgrading to v2 would enable multi-AZ, which might double their database costs. The safe approach is to not change the default, and instead add a note in documentation encouraging users to set it explicitly.

If you must change a default, do it in a major version and call it out clearly in the changelog.

## Changelog Format

Maintain a CHANGELOG.md in your module repository:

```markdown
# Changelog

## [2.0.0] - 2026-02-23

### Breaking Changes
- Renamed `instance_type` variable to `compute_type`
- Removed `enable_logging` variable (logging is now always enabled)
- Added required `environment` variable
- Minimum Terraform version bumped to 1.5

### Added
- Auto-scaling support via `enable_autoscaling` variable
- CloudWatch dashboard creation via `enable_dashboard` variable

### Migration
See [Migration Guide](./docs/migration-v1-to-v2.md)

## [1.3.0] - 2026-01-15

### Added
- Support for custom tags via `tags` variable

### Deprecated
- `instance_type` variable (use `compute_type` instead)
```

## Testing Breaking Changes

Before releasing a major version, test the migration path:

1. Deploy infrastructure using the old module version
2. Update to the new version with migration steps
3. Run `terraform plan` and verify no destructive changes
4. Apply and verify everything works

Automate this in CI:

```bash
# Deploy with v1
cd test/migration
terraform init -upgrade
terraform apply -auto-approve -var="module_version=v1.3.0"

# Upgrade to v2
sed -i 's/ref=v1.3.0/ref=v2.0.0/' main.tf
# Apply migration changes to the test config
terraform init -upgrade
terraform plan -detailed-exitcode
# Exit code 0 = no changes (ideal)
# Exit code 2 = changes present (check for destroys)
```

## Communication Timeline

For a major version with breaking changes:

1. **4 weeks before**: Announce the upcoming breaking changes in your internal channels
2. **2 weeks before**: Release a minor version with deprecation warnings
3. **Release day**: Publish the new major version with migration guide
4. **2 weeks after**: Check adoption and help teams that are stuck
5. **8 weeks after**: Mark the old version as unsupported

Breaking changes are unavoidable as modules evolve. The key is to make migration as painless as possible and give people clear instructions and enough time.
