# Validation Summary: How to Create GitHub Repositories with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- GitHub provider for OpenTofu / Terraform-compatible HCL (`integrations/github`)
- GitHub repositories
- GitHub branch protection
- GitHub teams and repository permissions
- Bash environment variables

## Sources Consulted
- OpenTofu settings documentation: https://opentofu.org/docs/language/settings/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu `tofu init` command reference: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `tofu validate` command reference: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu `tofu plan` command reference: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command reference: https://opentofu.org/docs/cli/commands/apply/
- GitHub provider documentation: https://registry.terraform.io/providers/integrations/github/latest/docs
- GitHub provider `github_repository` resource documentation: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository
- GitHub provider `github_branch_default` resource documentation: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_default
- GitHub provider `github_branch_protection` resource documentation: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/branch_protection
- GitHub provider `github_team` resource documentation: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/team
- GitHub provider `github_team_repository` resource documentation: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/team_repository

## Issues Found
1. **The original post did not describe GitHub resources at all.** It used placeholder provider and resource names such as `hashicorp/example`, `example_project`, `example_team`, `example_alert`, and `example_backup_policy`, which would not work for GitHub repository management. I replaced them with the actual GitHub provider (`integrations/github`) and real resources: `github_repository`, `github_team`, `github_branch_default`, `github_branch_protection`, and `github_team_repository`.
2. **Authentication details were incorrect for the GitHub provider.** The original post used generic environment variables such as `PROVIDER_API_KEY`, `PROVIDER_TOKEN`, and `PROVIDER_ORG`, which are not recognized by the GitHub provider. I corrected the example to use `GITHUB_TOKEN` for provider authentication and `TF_VAR_...` environment variables for OpenTofu input variables.
3. **The provider configuration was technically wrong for the topic.** The original post configured a fake `example` provider and described unspecified credentials. I updated the provider block to use `owner = var.github_owner`, which matches the GitHub provider's documented configuration model for managing an organization.
4. **The resource model did not match the post title or description.** The original content talked about projects, monitoring alerts, backup policies, and generic access control instead of repositories, branch protection, and team access. I replaced those examples with a repository creation example, a team resource, default branch configuration, a branch protection rule, and repository permission assignment for the team.
5. **The outputs were wrong for GitHub resources.** The original outputs referenced `example_project.main.id` and `example_project.main.name`, which do not exist in the corrected GitHub configuration. I changed the outputs to `github_repository.main.name` and `github_repository.main.html_url`.
6. **The rate-limiting guidance was misleading.** The original advice said to add `depends_on` to serialize resource creation and avoid GitHub API rate limits. That is not the provider's documented rate-limit strategy and is not a general fix. I changed the guidance to the provider's documented delay and retry settings: `write_delay_ms`, `read_delay_ms`, `retry_delay_ms`, and `max_retries`.

## Review Notes
- The post remains valid as an OpenTofu guide because OpenTofu continues to use the `terraform {}` settings block and `required_providers` syntax.
- The GitHub provider documentation currently shows `~> 6.0` in its example configuration; the post now follows that pattern instead of using a fake provider source.
- The `github_team` and `github_team_repository` resources require a GitHub organization context, so the prerequisites and variable descriptions were tightened accordingly.
- The validated example uses `GITHUB_TOKEN` authentication. GitHub App authentication is supported by the provider, but it requires an `app_auth` block and different environment variables, so it was not implied in the corrected walkthrough.
- I could not run `tofu validate` locally because `tofu` is not installed in this workspace. The HCL was checked against the current provider documentation and resource examples instead.
