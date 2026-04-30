# Validation Summary: How to Github Actions Secrets with OpenTofu on GitHub

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub provider for Terraform/OpenTofu (`integrations/github`)
- GitHub Actions secrets
- GitHub branch protection
- GitHub teams
- GitHub repository webhooks

## Sources Consulted
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- GitHub provider overview: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/index.html.markdown
- GitHub provider `github_actions_secret` resource docs: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/r/actions_secret.html.markdown
- GitHub provider `github_branch_protection` resource docs: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/r/branch_protection.html.markdown
- GitHub provider `github_team` resource docs: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/r/team.html.markdown
- GitHub provider `github_team_membership` resource docs: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/r/team_membership.html.markdown
- GitHub provider `github_repository_webhook` resource docs: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/r/repository_webhook.html.markdown
- GitHub Actions secrets docs: https://docs.github.com/en/actions/concepts/security/secrets
- GitHub branch protection docs: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- GitHub repository webhooks REST docs: https://docs.github.com/en/rest/repos/webhooks
- GitHub team members REST docs: https://docs.github.com/en/rest/teams/members?apiVersion=2022-11-28
- GitHub Actions secrets REST docs: https://docs.github.com/en/rest/actions/secrets?apiVersion=2022-11-28

## Issues Found
- The `github_actions_secret` example used the deprecated `plaintext_value` argument. I replaced it with the current `value` argument documented by the GitHub provider.
- The `team_members`, `deploy_key_value`, and `webhook_secret` variable declarations used semicolon-separated arguments inside inline `variable` blocks. That syntax does not parse as valid HCL/OpenTofu, so I reformatted those declarations into valid blocks without changing their meaning.

## Review Notes
- The `terraform {}` block is still the correct top-level settings block in OpenTofu v1.x; OpenTofu has not renamed it to `tofu {}`.
- The provider example is valid with externally supplied authentication such as `GITHUB_TOKEN`, GitHub CLI auth, or GitHub App auth, which the provider supports.
- `sensitive = true` only suppresses CLI output. OpenTofu and the GitHub provider docs both note that sensitive values can still exist in state, so state storage should still be treated as sensitive.
- After the fixes, the combined HCL snippets were re-checked with a local HCL2 parser and parsed successfully.
