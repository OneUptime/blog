# Validation Summary: How to Use Monorepo vs Polyrepo for Terraform Modules

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform modules
- Terraform module source addresses
- Terraform Cloud / HCP Terraform private registry
- Git-based Terraform module versioning
- GitHub Actions CI/CD
- git-filter-repo

## Sources Consulted
- Terraform module configuration and source documentation: https://developer.hashicorp.com/terraform/language/modules/configuration
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- GitHub Actions checkout documentation: https://github.com/actions/checkout
- GitHub Actions workflow commands and output parameters: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- git-filter-repo documentation: https://github.com/newren/git-filter-repo/blob/main/Documentation/git-filter-repo.txt
- Referenced OneUptime private Terraform module registries post: https://oneuptime.com/blog/post/2026-02-23-manage-private-terraform-module-registries/view

## Issues Found
- The monorepo GitHub Actions example used `git diff --name-only origin/main...HEAD` after a default `actions/checkout@v4` checkout. The checkout action fetches only one commit by default, so the base branch history may not be available for that comparison. Added `fetch-depth: 0` to the checkout step.
- The same workflow generated JSON with `jq -s .`, which emits pretty-printed multiline JSON by default. Since the example writes the output with `echo "modules=$changed" >> $GITHUB_OUTPUT`, this should be a single-line value. Changed it to `jq -cs .` so the matrix output is compact JSON.

## Review Notes
The Terraform Git source examples, registry source examples, Git tag usage, module versioning explanation, and `git filter-repo --subdirectory-filter` migration command are technically consistent with the referenced documentation. The guidance about monorepo versus polyrepo trade-offs is advisory rather than version-specific.
