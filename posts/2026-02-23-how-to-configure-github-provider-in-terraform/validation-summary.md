# Validation Summary: How to Configure GitHub Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform GitHub provider (`integrations/github`)
- GitHub repositories, teams, branch protection, webhooks, Actions secrets, Actions variables, and environments
- GitHub personal access tokens and GitHub App authentication

## Sources Consulted
- Terraform Registry: GitHub provider documentation - https://registry.terraform.io/providers/integrations/github/latest/docs
- Terraform GitHub provider source docs: provider configuration - https://github.com/integrations/terraform-provider-github/blob/main/docs/index.md
- Terraform GitHub provider source docs: `github_repository` - https://github.com/integrations/terraform-provider-github/blob/main/docs/resources/repository.md
- Terraform GitHub provider source docs: `github_repository_vulnerability_alerts` - https://github.com/integrations/terraform-provider-github/blob/main/docs/resources/repository_vulnerability_alerts.md
- Terraform GitHub provider source docs: `github_branch_protection` - https://github.com/integrations/terraform-provider-github/blob/main/docs/resources/branch_protection.md
- Terraform GitHub provider source docs: `github_actions_secret` - https://github.com/integrations/terraform-provider-github/blob/main/docs/resources/actions_secret.md
- Terraform GitHub provider source docs: `github_actions_organization_secret` - https://github.com/integrations/terraform-provider-github/blob/main/docs/resources/actions_organization_secret.md
- Terraform GitHub provider source docs: `github_repository_environment` - https://github.com/integrations/terraform-provider-github/blob/main/docs/resources/repository_environment.md
- HashiCorp Terraform CLI import command reference - https://developer.hashicorp.com/terraform/cli/commands/import
- GitHub REST API rate limit documentation - https://docs.github.com/en/rest/rate-limit/rate-limit

## Issues Found
- The `github_repository` examples used `has_downloads`, which the current provider documents as deprecated and no longer in use. Removed it from the repository example.
- The `github_repository` examples used the deprecated `vulnerability_alerts` argument. Replaced it with the current `github_repository_vulnerability_alerts` resource in both the single-repository and bulk-repository examples.
- The Actions secret examples used the deprecated `plaintext_value` argument. Replaced it with the current `value` argument for both repository and organization secrets.
- The bulk repository example used `visibility = "internal"` without noting that internal repositories require GitHub Enterprise. Added an inline caveat.
- The Actions variable comment said variables are "visible in logs"; adjusted it to say they are not masked like secrets, which is the more precise operational distinction.

## Review Notes
The provider version constraint `~> 6.0` remains valid for the current 6.x provider line. The GitHub App authentication example correctly passes PEM file contents by wrapping a path variable with `file(...)`; environment-variable based GitHub App authentication would require PEM contents, not a file path.
