# Validation Summary: How to Github Branch Protection Rules with OpenTofu on GitHub

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- GitHub Terraform/OpenTofu provider (`integrations/github`)
- GitHub branch protection
- GitHub Actions secrets
- GitHub repository webhooks
- GitHub teams and team memberships

## Sources Consulted
- GitHub provider overview: https://registry.terraform.io/providers/integrations/github/latest/docs
- `github_branch_protection`: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection
- `github_actions_secret`: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/actions_secret
- `github_repository_webhook`: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_webhook
- `github_team`: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/team
- `github_team_membership`: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/team_membership
- GitHub REST API, protected branches: https://docs.github.com/en/rest/branches/branch-protection?apiVersion=2022-11-28
- GitHub REST API, repository webhooks: https://docs.github.com/en/rest/repos/webhooks?apiVersion=2022-11-28
- GitHub Actions secrets reference: https://docs.github.com/en/actions/reference/secrets-reference
- HCL native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md

## Issues Found
- The `github_actions_secret` example used `plaintext_value`, which is deprecated in the current `integrations/github` provider. I changed it to `value`, which is the current argument documented by the provider.
- Three variable blocks used multiple arguments inside single-line HCL blocks. Per the HCL native syntax, one-line blocks can contain at most one argument. I rewrote `team_members`, `deploy_key_value`, and `webhook_secret` as multi-line blocks so the example is valid HCL/OpenTofu syntax.

## Review Notes
- The `github_branch_protection` example is valid for provider `~> 6.0`; `repository_id` may be either the repository name or the repository node ID.
- The branch protection settings shown are consistent with GitHub’s current protected-branch capabilities, including required reviews, status checks, conversation resolution, deletion protection, and force-push protection.
