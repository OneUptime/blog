# Validation Summary: How to Configure the GitHub Provider in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub provider for OpenTofu/Terraform (`integrations/github`)
- GitHub repositories
- GitHub teams and repository permissions
- GitHub Actions variables

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu settings (`terraform` block compatibility): https://opentofu.org/docs/language/settings/
- OpenTofu CLI commands overview: https://opentofu.org/docs/cli/commands/
- OpenTofu `init`: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `validate`: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/cli/commands/apply/
- GitHub provider overview: https://registry.terraform.io/providers/integrations/github/latest/docs
- GitHub provider source docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/index.html.markdown
- `github_repository` resource docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/repository.html.markdown
- `github_team` resource docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/team.html.markdown
- `github_team_repository` resource docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/team_repository.html.markdown
- `github_branch_default` resource docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/branch_default.html.markdown
- `github_actions_variable` resource docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/actions_variable.html.markdown

## Issues Found
- The provider example used a placeholder `hashicorp/example` provider and `provider "example"` block. I replaced it with the real GitHub provider source `integrations/github` and a valid `provider "github"` configuration because the original code would not install or configure GitHub at all.
- The authentication example used fake environment variables (`PROVIDER_API_KEY`, `PROVIDER_TOKEN`, `PROVIDER_ORG`) and mismatched input variables. I replaced them with `GITHUB_TOKEN`, optional `GITHUB_BASE_URL` for GitHub Enterprise Server, and a `github_owner` variable because those are the current documented GitHub provider inputs.
- The post referred to organization settings generically but did not use the GitHub provider’s current `owner` argument. I changed the configuration to use `owner`, because `organization` is documented as deprecated.
- The resource examples (`example_project`, `example_team`, `example_alert`, `example_backup_policy`) were not GitHub provider resources and would not run. I replaced them with real GitHub resources: `github_repository`, `github_team`, `github_team_repository`, `github_branch_default`, and `github_actions_variable`.
- The outputs referenced nonexistent example resource attributes. I replaced them with valid repository outputs using `repo_id`, `name`, and `html_url` from `github_repository`.
- The rate-limiting advice suggested using `depends_on` to serialize creation. I replaced that guidance with the documented provider retry and delay settings (`write_delay_ms`, `read_delay_ms`, `retry_delay_ms`, `max_retries`) because those are the actual provider-level controls for API pacing.
- The conclusion claimed the guide configured the GitHub provider while the code actually showed a generic placeholder. I updated the conclusion so it accurately describes the GitHub resources managed by the corrected examples.

## Review Notes
- At review time on 2026-04-30, Terraform Registry listed the latest `integrations/github` provider version as `6.11.1`. The post now uses the documented `~> 6.0` constraint, which remains appropriate for the current 6.x line.
- OpenTofu keeps using the `terraform` block name; that part of the original structure was valid and was retained.
- The local environment did not have the `tofu` CLI installed, so `tofu init`, `tofu validate`, `tofu plan`, and `tofu apply` were verified against official OpenTofu CLI documentation rather than local `--help` output.
- The GitHub provider supports GitHub CLI auth and GitHub App auth in addition to `GITHUB_TOKEN`; the post now reflects that in prerequisites and authentication guidance.
