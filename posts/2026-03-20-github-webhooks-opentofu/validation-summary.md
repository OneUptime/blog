# Validation Summary: How to Create GitHub Webhooks with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (>= 1.6.0)
- GitHub provider for Terraform/OpenTofu (`integrations/github`)
- HashiCorp Configuration Language (HCL)
- GitHub repositories and repository webhooks

## Sources Consulted
- GitHub provider documentation: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/index.html.markdown
- `github_repository` resource documentation: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/r/repository.html.markdown
- `github_repository_webhook` resource documentation: https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/r/repository_webhook.html.markdown
- GitHub Docs, Types of webhooks: https://docs.github.com/en/webhooks/types-of-webhooks
- GitHub Docs, REST API endpoints for repository webhooks: https://docs.github.com/en/rest/repos/webhooks
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/

## Issues Found
The original post was a generic placeholder template rather than a GitHub webhook guide. I corrected the technically inaccurate parts directly in the post:

1. **Incorrect provider block.** The post used a fictional `hashicorp/example` provider and `provider "example"` configuration. I replaced these with the real GitHub provider source `integrations/github`, a valid version constraint `~> 6.0`, and a `provider "github"` block that reads `GITHUB_TOKEN` and `GITHUB_OWNER`.
2. **Incorrect authentication details.** The original `PROVIDER_API_KEY`, `PROVIDER_TOKEN`, and `PROVIDER_ORG` environment variables do not apply to the GitHub provider. I replaced them with the actual GitHub provider environment variables and updated the variable declarations to match a repository/webhook workflow.
3. **Unrelated placeholder resources.** The post used nonexistent `example_project`, `example_team`, `example_alert`, and `example_backup_policy` resources, none of which create GitHub webhooks. I replaced them with real `github_repository` and `github_repository_webhook` resources and a valid `configuration` block using `url`, `content_type`, `secret`, and `insecure_ssl`.
4. **Incorrect outputs.** The outputs referenced the placeholder project resource. I updated them to return the created repository name and webhook ID.
5. **Misleading rate-limiting guidance.** The advice to add `depends_on` to serialize creation is not the documented GitHub provider mechanism for API throttling. I replaced it with the provider's actual retry and delay settings: `write_delay_ms`, `read_delay_ms`, `max_retries`, and `retry_delay_ms`.

The OpenTofu command sequence in Step 6 (`tofu init`, `tofu validate`, `tofu plan`, `tofu apply`) was already correct and was left in place.

## Review Notes
- The example now creates a repository before attaching a webhook. In an existing repository, readers can point `github_repository_webhook.repository` at a repository name directly instead of creating a new `github_repository`.
- GitHub requires repository ownership or admin access to manage repository webhooks, and fine-grained tokens need the repository `Webhooks` permission with `write` access.
- The provider version constraint was updated to `~> 6.0`, which matches the current major version line documented by the provider. Readers should still check the provider docs for newer minor or patch releases before deploying.
