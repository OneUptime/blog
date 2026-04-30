# Validation Summary: How to Manage GitHub Branch Protection Rules with OpenTofu

## Status
not-technically-relevant

## Post Type
Placeholder / generated template

## Technologies Covered
- OpenTofu
- GitHub
- GitHub branch protection
- HCL configuration

## Sources Consulted
- OpenTofu documentation: Provider Requirements — https://opentofu.org/docs/language/providers/requirements/
- OpenTofu documentation: Provider Configuration — https://opentofu.org/docs/language/providers/configuration/
- GitHub provider documentation (`integrations/github`) — https://registry.terraform.io/providers/integrations/github/latest/docs
- GitHub provider source documentation: `github_branch_protection` — https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/branch_protection.html.markdown
- GitHub Docs: Managing a branch protection rule — https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule
- GitHub Docs: REST API endpoints for protected branches — https://docs.github.com/en/rest/branches/branch-protection

## Issues Found
1. The post content does not match its title or description. It claims to explain GitHub branch protection with OpenTofu, but every code sample uses generic placeholder resources such as `hashicorp/example`, `example_project`, `example_team`, `example_alert`, and `example_backup_policy`, none of which are related to GitHub branch protection.

2. The provider configuration is a template placeholder rather than a working GitHub example. The correct provider for this topic is `integrations/github`, with authentication via `GITHUB_TOKEN`, GitHub CLI auth, or GitHub App configuration, not `PROVIDER_API_KEY` / `PROVIDER_TOKEN` placeholders.

3. The resource examples are not salvageable with small technical edits. A valid article for this topic needs `github_branch_protection` configuration with fields such as `repository_id`, `pattern`, `required_status_checks`, and `required_pull_request_reviews`; the current post has none of that and instead documents unrelated fictitious resources.

4. The operational guidance is misleading for this subject. For example, the "Rate Limiting" advice about adding `depends_on` is not the relevant guidance from the GitHub provider docs, which instead expose provider settings such as `write_delay_ms`, `read_delay_ms`, `retry_delay_ms`, and `max_retries`.

Because the post is a placeholder rather than a technically incorrect but salvageable draft, it should be removed instead of validated.

## Review Notes
- A separate post already exists in this repository with actual GitHub branch protection OpenTofu content at `posts/2026-03-20-github-branch-protection-rules-opentofu/README.md`, which reinforces that this target post is an erroneous placeholder/duplicate rather than a draft worth validating.
