# Validation Summary: How to Create Github Webhooks with OpenTofu on GitHub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- HCL2 (HashiCorp Configuration Language)
- GitHub Provider (`integrations/github`) v6.x
- GitHub resources: branch protection, teams, team membership, Actions secrets, repository webhooks

## Sources Consulted
- HCL2 native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- GitHub provider on Terraform Registry: https://registry.terraform.io/providers/integrations/github/latest/docs
- `github_branch_protection` docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/branch_protection.html.markdown
- `github_repository_webhook` docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/repository_webhook.html.markdown
- `github_team` / `github_team_membership` / `github_actions_secret` reference docs on Terraform Registry
- GitHub webhook event types: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- OpenTofu input variables: https://opentofu.org/docs/language/values/variables/

## Issues Found
- **Invalid HCL syntax in the variables block.** The original used semicolons inside single-line blocks to separate multiple attributes, e.g. `variable "team_members" { type = list(string); default = [] }` and `variable "deploy_key_value" { type = string; sensitive = true }`. Per the HCL2 native syntax spec, a `OneLineBlock` may contain at most one attribute and there is no semicolon separator — body items are separated by newlines. I confirmed this by attempting to parse the snippet with the python-hcl2 parser, which rejects the semicolon. I converted the offending entries to standard multi-line blocks so the snippet now parses as valid HCL2.

## Review Notes
- The provider pin `version = "~> 6.0"` and `source = "integrations/github"` are correct for the current GitHub provider.
- The `github_branch_protection` block, including `enforce_admins`, `require_conversation_resolution`, `allows_deletions`, `allows_force_pushes`, and the nested `required_status_checks { contexts = [...] }`, is consistent with the v6.x schema. Note that `contexts` is still supported but a nested `required_check` block is also available as an alternative.
- The `github_repository_webhook` `configuration` block is correct: `content_type` accepts `form` or `json`, `insecure_ssl` is a boolean, and `push` / `pull_request` are valid GitHub webhook event names.
- The post's title focuses on "GitHub Webhooks" but the body covers branch protection, teams, secrets, and webhooks together. This is a scoping/editorial observation rather than a technical error, so no change was made.
- The line `Resource Configuration` between the two HCL fences appears to be intended as a section heading (its peers use `##`) but is rendered as body text. This is a markdown formatting issue, not a technical error in the code, so it was left untouched per the review guidelines.
