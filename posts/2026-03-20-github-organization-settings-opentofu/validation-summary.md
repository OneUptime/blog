# Validation Summary: How to Github Organization Settings with OpenTofu on GitHub

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- GitHub provider for Terraform/OpenTofu (`integrations/github`)
- GitHub branch protection
- GitHub teams and team membership
- GitHub Actions repository secrets
- GitHub repository webhooks

## Sources Consulted
- OpenTofu, "OpenTofu Settings": https://opentofu.org/docs/language/settings/
- OpenTofu, "Provider Requirements": https://opentofu.org/docs/language/providers/requirements/
- GitHub provider docs, provider configuration: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/index.html.markdown
- GitHub provider docs, `github_branch_protection`: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/branch_protection.html.markdown
- GitHub provider docs, `github_team`: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/team.html.markdown
- GitHub provider docs, `github_team_membership`: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/team_membership.html.markdown
- GitHub provider docs, `github_actions_secret`: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/actions_secret.html.markdown
- GitHub provider docs, `github_repository_webhook`: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/repository_webhook.html.markdown
- GitHub provider docs, `github_organization_settings`: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/organization_settings.html.markdown
- HashiCorp HCL native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md

## Issues Found
- The `github_actions_secret` example used `plaintext_value`, which the current provider documentation marks as deprecated. I changed it to `value`, which is the current argument for plaintext secret input.
- Three variable declarations used semicolons to separate multiple arguments inside a one-line block. Per the HCL native syntax, one-line blocks allow at most one inline attribute and normal attributes terminate with newlines, so those examples were not valid HCL. I converted the affected variables to standard multiline blocks.
- The title and surrounding explanatory text described the examples as "organization settings", but the code actually manages a mix of organization-scoped and repository-scoped resources. The provider has a separate `github_organization_settings` resource for actual org-wide settings. I corrected the wording so the post accurately describes the resources it shows.
- The provider section did not mention authentication prerequisites. I added a brief clarification that the GitHub provider must be authenticated with a token, GitHub CLI auth, or a GitHub App installation.

## Review Notes
- `github_team_membership` adds users to a team only after they are already members of the organization and have accepted any invitation.
- `github_actions_secret.value` is sensitive, but secret material can still be present in state. That is a provider behavior caveat, not an error in the post after the fix.
- The `~> 6.0` version constraint is valid and will allow later 6.x releases of the provider, not only 6.0.x.
