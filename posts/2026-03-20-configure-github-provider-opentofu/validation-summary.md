# Validation Summary: How to Configure the GitHub Provider in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub provider (`integrations/github`)
- GitHub repository management
- GitHub App authentication
- Personal access tokens

## Sources Consulted
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- GitHub provider documentation: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/docs/index.md
- GitHub `github_repository` resource documentation: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/docs/resources/repository.md
- GitHub `github_repository_vulnerability_alerts` resource documentation: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/docs/resources/repository_vulnerability_alerts.md
- GitHub Docs, deciding when to build a GitHub App: https://docs.github.com/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app
- GitHub Docs, managing your personal access tokens: https://docs.github.com/github/extending-github/git-automation-with-oauth-tokens
- GitHub Docs, REST API endpoints for repositories: https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28
- GitHub Docs, creating a repository from a template: https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template

## Issues Found
- The PAT example exported `GITHUB_OWNER`, but the provider configuration in the post reads `owner = var.github_org`. I changed the example to export `TF_VAR_github_org` so the environment variable actually populates the declared OpenTofu variable and avoids the provider's documented owner-precedence quirk.
- The repository example used `vulnerability_alerts` inside `github_repository`, which is deprecated in the current provider. I replaced it with a separate `github_repository_vulnerability_alerts` resource, which is the documented current approach.
- The repository example combined a `template` block with `auto_init`, `gitignore_template`, and `license_template`. I removed those fields because template-based repository creation uses GitHub's template generation flow rather than repository-initialization options.

## Review Notes
- The post remains technically relevant and code-focused, so `validated` was the correct status after fixes.
- The provider documentation still supports `source = "integrations/github"` and `version = "~> 6.0"` for the 6.x provider line.
- The `organization` provider argument remains deprecated; the post correctly uses `owner`.
- The `tofu` CLI was not available in the local environment on 2026-05-06, so runtime `tofu init` verification could not be performed. The review relied on official OpenTofu documentation and the current upstream GitHub provider documentation instead.
