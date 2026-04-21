# How to Plan a Terraform to OpenTofu Migration Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Migration, Infrastructure as Code, Strategy

Description: Learn how to plan a systematic Terraform to OpenTofu migration - assessing your current state, choosing a migration approach, handling state file compatibility, and sequencing team adoption.

## Introduction

Migrating from Terraform to OpenTofu is straightforward for most workloads because OpenTofu aims to maintain Terraform configuration compatibility and can read supported Terraform state files during migration. The challenge is organizational: coordinating the switch across teams, CI/CD pipelines, modules, and remote backends. A structured migration strategy minimizes risk and keeps infrastructure management uninterrupted.

## Migration Approaches

Three strategies suit different organizational contexts:

**Big Bang** - Replace all Terraform references with OpenTofu at once during a maintenance window. Suitable for small teams with few configurations.

**Parallel Run** - Run Terraform and OpenTofu side-by-side on separate configurations, progressively migrating modules. Lower-risk but slower.

**Rolling Migration** - Migrate one workspace or team at a time, establishing a verified pattern before scaling. Recommended for medium-to-large organizations.

## Pre-Migration Assessment

```hcl
# Audit your current setup before migrating

# 1. Identify all Terraform version requirements
# Check .terraform-version or required_version in configurations

# 2. List provider requirements and selected versions
# terraform providers
# terraform version  # after init, shows installed provider selections

# 3. Check for Terraform-exclusive features
# - Terraform Cloud/Enterprise workspaces
# - Sentinel policies (migrate to OPA)
# - Cloud-specific remote execution

# 4. Inventory all state backends
# Local, S3, Azure Blob, GCS - all compatible with OpenTofu

# 5. Check for legacy syntax
# Old interpolation-only expressions such as "${var.name}"
```

## State File Compatibility

```bash
# OpenTofu reads supported Terraform state files directly during migration
# Terraform state file version 4 is common across current Terraform/OpenTofu 1.x migrations

# Verify your raw state file format
terraform state pull | python3 -c "
import json,sys
state=json.load(sys.stdin)
print('State format version:', state.get('version'))
print('Terraform version:', state.get('terraform_version'))
"

# After migrating, OpenTofu updates state metadata on next apply if needed
# Keep the pre-migration backup for rollback, especially after OpenTofu writes state
```

## Provider Lock File Migration

```bash
# Start from a committed Terraform lock file so rollback can restore it
git status --short .terraform.lock.hcl

# Re-initialize with OpenTofu - creates or updates .terraform.lock.hcl
tofu init

# Lock providers for multiple platforms
tofu providers lock \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64
```

## Migration Checklist

```markdown
## Pre-Migration
- [ ] Inventory all Terraform configurations and their state backends
- [ ] Check the source Terraform version and follow the matching OpenTofu migration guide
- [ ] Audit for Terraform Cloud/Enterprise-specific features
- [ ] Identify Sentinel policies to migrate to OPA
- [ ] Communicate timeline to all infrastructure teams

## Migration Steps (per configuration)
- [ ] Install OpenTofu (via package manager, Homebrew, or standalone binary)
- [ ] Test `tofu init` and `tofu plan` - compare output with `terraform plan`
- [ ] Run `tofu init`; use `tofu providers lock` to pre-populate platform checksums
- [ ] Update CI/CD pipeline to use `tofu` binary
- [ ] Update documentation and runbooks

## Post-Migration
- [ ] Remove Terraform binary from developer workstations
- [ ] Update `.tool-versions` or other tool version files
- [ ] Archive Terraform state backups
- [ ] Validate all automated plans produce clean output
```

## Rollback Plan

```bash
# Rollback is safest from the backups taken before migration
# If issues arise, switch back to Terraform binary:

# 1. Restore Terraform lock file from git
git checkout HEAD -- .terraform.lock.hcl

# 2. If OpenTofu applied changes or updated state, restore the matching
# pre-migration state backup according to your backend procedures

# 3. Re-initialize with Terraform
terraform init

# 4. Verify plan matches expected state
terraform plan

# State written after OpenTofu-only features may not be usable by Terraform
# Validate rollback with Terraform plan/apply before resuming normal changes
```

## Conclusion

Migrating from Terraform to OpenTofu requires process changes more than technical ones - the HCL syntax, state format, and provider APIs are compatible for supported migrations, but version-specific migration notes matter. The key steps are: replace the binary, let `tofu init` create or update the lock file from registry.opentofu.org, update CI/CD tooling, and migrate any Terraform Cloud/Sentinel workflows to open alternatives. Use a rolling migration to validate the pattern in one team before scaling across the organization.
