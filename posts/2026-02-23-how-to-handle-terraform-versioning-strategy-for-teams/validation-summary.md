# Validation Summary: How to Handle Terraform Versioning Strategy for Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform CLI
- Terraform version constraints
- Terraform providers and modules
- Terraform dependency lock file
- GitHub Actions
- Dependabot
- Renovate
- tfenv and asdf version files

## Sources Consulted
- Terraform version constraint documentation: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform module source and version documentation: https://developer.hashicorp.com/terraform/language/modules/syntax
- Terraform module source examples for Git refs: https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform init command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform v1.x compatibility promises: https://developer.hashicorp.com/terraform/language/v1-compatibility-promises
- HashiCorp setup-terraform action README and action metadata: https://github.com/hashicorp/setup-terraform
- GitHub Dependabot options reference: https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference
- Renovate Terraform manager documentation: https://docs.renovatebot.com/modules/manager/terraform/
- Renovate configuration options: https://docs.renovatebot.com/configuration-options/
- Renovate datasource documentation: https://docs.renovatebot.com/modules/datasource/

## Issues Found
- The introduction said version differences lead to incompatible state files. Terraform v1.x generally preserves compatibility, though newer versions can introduce features or state formats older versions may not understand. Changed the wording to focus on unsupported language features, provider schema differences, and different plan outputs.
- The pessimistic constraint explanation said bug fixes and security patches are received automatically. Terraform provider selections are constrained by `.terraform.lock.hcl`, so updates happen during explicit upgrade workflows or dependency-manager PRs. Changed the wording to "during planned updates."
- The GitHub Actions example used `terraform_version_file`, which is not a supported input for `hashicorp/setup-terraform`. Updated the workflow to read `.terraform-version` into a step output and pass it through the supported `terraform_version` input. Also updated the action version to `hashicorp/setup-terraform@v4`, matching the current official README.
- The Dependabot example claimed patch-only updates but allowed all dependency updates while ignoring only major updates, which still allowed minor updates. Added `update-types: ["version-update:semver-patch"]` under the `allow` rule.
- The Renovate example used `requiredStatusChecks`, which is not a valid Renovate configuration option. Removed that key and clarified that auto-merge after CI depends on branch protection requiring the Terraform checks.
- The Renovate example used `config:base`; updated it to `config:recommended`, which is the current Renovate recommended preset name.

## Review Notes
The Terraform HCL snippets, module source examples, version constraint syntax, `terraform init -upgrade`, `terraform plan`, `terraform apply`, and `git revert` commands are technically valid. The example Terraform and provider versions are older than current releases but still function as illustrative pins rather than recommendations to use those exact versions.
