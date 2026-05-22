# Validation Summary: How to Use terraform providers lock for Cross-Platform Teams

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform provider dependency lock file
- Terraform provider mirrors
- Git hooks
- GitHub Actions CI/CD

## Sources Consulted
- HashiCorp Developer: terraform providers lock command reference - https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- HashiCorp Developer: Dependency Lock File (.terraform.lock.hcl) - https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Local CLI check attempted with `terraform providers lock -help`, but Terraform is not installed in this environment.

## Issues Found
- The post stated that `terraform init` only records hashes for the platform it runs on. HashiCorp documentation says that, for origin registries with signed checksums, Terraform usually records signed `zh:` checksums for all official packages and adds `h1:` checksums opportunistically for platforms as it learns them. I updated the explanation to distinguish origin registries from filesystem and network mirrors.
- The lock file example described `h1:` as a platform-specific hash for `linux_amd64`. HashiCorp documents `h1:` as a package contents hash and `zh:` as a zip archive hash. I updated the comments in the example.
- The pre-commit hook loop did not actually verify platform coverage because it only checked whether any `h1:` hash existed in the lock file. I replaced it with a hook that runs `terraform providers lock` for the required platforms and fails if the lock file changes.

## Review Notes
- The command examples for `terraform providers lock`, repeated `-platform=OS_ARCH` arguments, `-fs-mirror`, `-net-mirror`, and `terraform init -upgrade` match the HashiCorp documentation.
- The CI example uses Terraform 1.9.0. This is not the latest Terraform release as of this review date, but the commands shown are still valid for the documented workflow.
