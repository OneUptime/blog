# Validation Summary: How to Store OpenTofu Configurations in Version Control

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- OpenTofu / Terraform
- Git (version control)
- `.terraform.lock.hcl` (provider dependency lock file)
- `terraform.tfstate` and workspace state files
- Override files (`override.tf`, `*_override.tf`)
- pre-commit framework with `pre-commit-terraform` hooks (`terraform_fmt`, `terraform_validate`, `terraform_docs`, `terraform_tflint`)
- Conventional Commits message format
- GPG-signed Git commits
- `.gitignore` patterns for Terraform/OpenTofu projects

## Sources Consulted
- OpenTofu documentation — Files & Override Files: https://opentofu.org/docs/language/files/override/
- OpenTofu documentation — Dependency Lock File: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu documentation — Workspaces: https://opentofu.org/docs/cli/workspaces/
- HashiCorp support article — `.terraform/terraform.tfstate` semantics: https://support.hashicorp.com/hc/en-us/articles/28746296947475
- pre-commit-terraform repository and hook IDs: https://github.com/antonbabenko/pre-commit-terraform
- Git documentation — `commit.gpgsign` and `user.signingkey` configuration
- Conventional Commits specification: https://www.conventionalcommits.org/

## Issues Found
- **Incorrect workspace state filename in "What NOT to Commit" list.** The post listed `.terraform.tfstate` (a hidden file at project root) as "Workspace state". This is not a standard OpenTofu/Terraform file. For the local backend, per-workspace state files live under `terraform.tfstate.d/<workspace>/terraform.tfstate`, and the directory `terraform.tfstate.d/` is the canonical workspace state location. Replaced `.terraform.tfstate → Workspace state` with `terraform.tfstate.d/ → Workspace state directory (local backend)` so the entry refers to a real path that users will actually encounter.

## Review Notes
- The `terraform.tfvars` entry under "ALWAYS COMMIT" is qualified as "Non-sensitive variable values", but the standard `.gitignore` shown later excludes all `*.tfvars` (with `!example.tfvars` re-included). This is intentional defensive defaulting — readers who genuinely have a non-sensitive `terraform.tfvars` would need to add `!terraform.tfvars` to their `.gitignore`. The post's wording is consistent if read carefully, so no change was made.
- The `!.terraform.lock.hcl` un-ignore line in the `.gitignore` is technically redundant because the lock file lives at the project root (not inside `.terraform/`), and nothing else in the snippet would exclude it. It is harmless and serves as documentation of intent, so it was left as-is.
- The `pre-commit-terraform` version `v1.83.6` is older (latest as of January 2026 is in the v1.10x range), but it is a valid real release and all referenced hook IDs (`terraform_fmt`, `terraform_validate`, `terraform_docs`, `terraform_tflint`) are correct and still supported. Readers may want to bump to a newer revision, but the example as written is functional.
- "Creates a signed commit that cannot be forged" is slightly stronger than reality (a signed commit attests to control of the signing key, not absolute unforgeability), but it is acceptable shorthand for an introductory guide and not a technical error.
