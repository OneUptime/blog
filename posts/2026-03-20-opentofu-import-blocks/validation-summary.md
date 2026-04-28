# Validation Summary: How to Use Import Blocks for Declarative Import in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform import blocks (HCL `import { to = ..., id = "..." }`)
- AWS provider resources (`aws_s3_bucket`, `aws_iam_role`, `aws_vpc`) used as examples
- Module-scoped resource addressing
- CI/CD-style plan/apply workflow

## Sources Consulted
- OpenTofu Import documentation: https://opentofu.org/docs/language/import/
- HashiCorp Terraform Import block reference (equivalent semantics): https://developer.hashicorp.com/terraform/language/import
- OpenTofu CLI `tofu plan` / `tofu apply` / `tofu import` reference

## Issues Found
- **Plan output example used incorrect change symbols.** The "Plan Shows Import Intent" section showed `~ resource "aws_s3_bucket" "existing"` with `+ id = "my-existing-bucket"`. In OpenTofu's plan output, a pure import (no drift) is rendered with the `# <addr> will be imported` comment header followed by the resource block — without the `~` (update-in-place) or `+` (add) markers, since nothing is being modified or created. The follow-up sentence reinforced the error by claiming "The `~` with 'will be imported' shows an import operation" — `~` actually means update-in-place.
  - **Fix:** Replaced the `~ resource ...` / `+ id = ...` lines with the standard import-only rendering (resource block with concrete attribute values and no change symbols). Updated the explanatory sentence to attribute the import indicator to the `# ... will be imported` comment line and the "1 to import" summary count.

## Review Notes
- The `import` block syntax (`to`, `id`), multi-resource usage, and module-target addressing (`module.networking.aws_vpc.main`) are all correct for current OpenTofu (1.6+) and equivalent Terraform 1.5+.
- The post recommends removing the import block after applying. This is a common best-practice pattern; OpenTofu does not require it (re-applying a no-op import block is harmless), but removing keeps the configuration clean and is reasonable guidance.
- The "Handling Attribute Mismatches" section is accurate — drift between the resource's actual state and the configuration surfaces as in-place updates after import, which the user must reconcile.
- No version-specific caveats beyond requiring OpenTofu ≥ 1.6 (or Terraform ≥ 1.5) for `import` block support, which is implicit in any current usage.
