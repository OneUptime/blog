# Validation Summary: How to Implement Terraform Module Versioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (CLI, HCL, module system, version constraints)
- Semantic Versioning (SemVer)
- Git (tagging, ref syntax for module sources)
- Public Terraform Registry
- Terraform Cloud / Terraform Enterprise (private registry)
- AWS provider modules (terraform-aws-modules/vpc, eks, rds, s3-bucket)
- GitHub Actions (hashicorp/setup-terraform, actions/checkout)
- AWS S3 (alternative module storage)
- `.terraform.lock.hcl` (dependency lock file)

## Sources Consulted
- Terraform CLI `init` command: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform `providers lock` command: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- Module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Module syntax: https://developer.hashicorp.com/terraform/language/modules/syntax
- Version constraints: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Module sources (Git, registry): https://developer.hashicorp.com/terraform/language/modules/sources
- Public registry publishing requirements: https://developer.hashicorp.com/terraform/registry/modules/publish
- Standard module structure: https://developer.hashicorp.com/terraform/language/modules/develop/structure
- Dependency lock file: https://developer.hashicorp.com/terraform/language/files/dependency-lock

## Issues Found

1. **Invalid CLI syntax: `terraform init -upgrade=hashicorp/aws`** — The `-upgrade` flag on `terraform init` is a boolean and does not accept a provider name. Replaced with `terraform providers lock hashicorp/aws`, which is the documented way to scope a lock-file refresh to a single provider.

2. **Broken "Centralized Version Management" example** — Two errors:
   - `module "versions" { source = "../modules/versions.tf" }` is invalid: a module `source` must reference a directory, not a single `.tf` file.
   - `version = local.module_versions.vpc.version` and `source = local.module_versions.vpc.source` violate the requirement that both arguments must be static literals on a `module` block (locals from another module would also not be in scope here).
   
   Rewrote the section to honor Terraform's literal-only constraint: centralize through a documented reference file (`MODULE_VERSIONS.md`) kept in sync with dependency tooling (Renovate/Dependabot), while keeping each `module` block's `source`/`version` literal.

## Review Notes
- The pessimistic constraint operator (`~>`) examples and reference table are accurate (`~> 5.1.2` allows 5.1.x; `~> 5.1` allows 5.x).
- Public registry publishing requirements (GitHub-hosted public repo, `terraform-<PROVIDER>-<NAME>` naming, SemVer release tags, README) match HashiCorp's current documentation.
- The example lock-file constraint string `">= 4.0.0, >= 5.0.0"` looks unusual but is exactly what Terraform records when multiple modules contribute overlapping constraints; left as-is.
- The `deprecation workflow` example uses a `validation` block that forbids any non-null value of `legacy_mode`, which surfaces a clear error if anyone still sets it. This is a reasonable "hard-deprecation" pattern; readers should be aware it is stricter than a soft-deprecation warning.
- Module versions referenced for `terraform-aws-modules/vpc/aws` (5.1.x), `terraform-aws-modules/eks/aws` (19.15.x), etc., were valid published releases at the time of writing. Readers may want to consult the registry for the latest versions before adopting.
