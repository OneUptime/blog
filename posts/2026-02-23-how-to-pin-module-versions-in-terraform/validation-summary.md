# Validation Summary: How to Pin Module Versions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Terraform Registry module sources
- Terraform version constraints
- Git module sources and refs
- S3 and GCS module archive sources
- Terraform dependency lock file
- Terraform CLI
- GitHub Actions
- Dependabot
- Renovate

## Sources Consulted
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform modules configuration guide: https://developer.hashicorp.com/terraform/language/modules/configuration
- Terraform version constraints reference: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform dependency lock file reference: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform providers mirror command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- Terraform Registry API documentation: https://developer.hashicorp.com/terraform/registry/api-docs
- Git tag documentation: https://git-scm.com/docs/git-tag
- HashiCorp setup-terraform GitHub tags: https://github.com/hashicorp/setup-terraform/tags
- GitHub Actions checkout GitHub tags: https://github.com/actions/checkout/tags
- Terraform GitHub tags: https://github.com/hashicorp/terraform/tags
- GitHub Dependabot supported ecosystems documentation: https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories
- Renovate Terraform manager documentation: https://docs.renovatebot.com/modules/manager/terraform/
- Referenced OneUptime post, How to Use Version Constraints for Terraform Modules: https://oneuptime.com/blog/post/2026-02-23-how-to-use-version-constraints-for-terraform-modules/view
- Referenced OneUptime post, How to Use the source Argument in Module Blocks: https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-source-argument-in-module-blocks/view

## Issues Found
- The introduction said any unpinned Terraform module runs the latest version at `terraform init`. That is accurate for registry modules, but Git sources without `ref` use the repository default branch. Updated the wording to distinguish registry and Git behavior.
- The description mentioned lock files as a way to pin module versions. Terraform's dependency lock file currently tracks providers, not modules. Removed the lock-file wording from the description.
- The Git section described tags as immutable. Git tags are intended to be stable, but they can be replaced with force operations unless protected by repository policy. Updated the wording to recommend protected tags or commit SHAs for maximum protection.
- The S3/GCS section described versioning as built into the object path. Terraform does not provide module version constraint semantics for these sources; putting versions in object paths is a packaging convention. Updated the wording accordingly.
- The dependency lock file section said `.terraform.lock.hcl` started with Terraform 1.0. Official Terraform documentation says the dependency lock file is a Terraform 0.14 and later feature. Updated the version.
- The registry module version lookup example used `terraform providers mirror`, which mirrors provider plugins and does not list registry module versions. Replaced it with the official Terraform Registry module versions API endpoint.
- The CI/CD section implied that omitting `-upgrade` alone ensures CI uses the same module versions as a developer's previous local init. That is not true for fresh CI checkouts when registry module constraints are loose, because module selections are not recorded in `.terraform.lock.hcl`. Updated the wording to tie predictability to exact module pins and a committed provider lock file.
- The Renovate snippet was marked as JSON but included a JavaScript-style comment, which made the example invalid JSON. Removed the comment.
- The common mistakes section repeated the overbroad claim that every unpinned module grabs the latest version. Updated it to distinguish registry modules from Git default-branch resolution.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output.
- The remaining Terraform HCL examples use valid module block syntax, registry version constraints, Git `ref` query parameters, and archive source prefixes documented by Terraform.
