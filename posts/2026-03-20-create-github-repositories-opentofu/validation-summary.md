# Validation Summary: How to Create Github Repositories with OpenTofu on GitHub

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL2)
- GitHub Terraform provider (`integrations/github` v6.x)
- GitHub resources: repositories, branch protection, teams, Actions secrets, webhooks
- Infrastructure as Code / GitOps

## Sources Consulted
- HCL2 native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- `integrations/github` provider docs (Terraform Registry): https://registry.terraform.io/providers/integrations/github/latest/docs
- `github_actions_secret` resource source docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/actions_secret.html.markdown
- `github_branch_protection` resource source docs: https://github.com/integrations/terraform-provider-github/blob/main/website/docs/r/branch_protection.html.markdown

## Issues Found

1. **Invalid HCL semicolon syntax in `variable` blocks.** The original used single-line blocks with multiple attributes separated by semicolons, e.g. `variable "team_members" { type = list(string); default = [] }`. HCL2 does not accept semicolons as statement separators inside a block body — attributes must be newline-separated, or a single-line one-line-block may contain only one attribute. These declarations would fail to parse. Fixed by expanding the multi-attribute variable definitions (`team_members`, `deploy_key_value`, `webhook_secret`) to multi-line block form. Single-attribute lines were left intact since one-line blocks with a single attribute are valid HCL.

2. **Deprecated `plaintext_value` in `github_actions_secret`.** The provider docs explicitly mark `plaintext_value` (and `encrypted_value`) as deprecated; the current attribute is `value` (and `value_encrypted`). Replaced `plaintext_value = var.deploy_key_value` with `value = var.deploy_key_value`.

3. **Missing markdown heading prefix on "Resource Configuration".** The line was rendered as plain text instead of a section header. Added `## ` prefix.

## Review Notes
- `contexts` in `required_status_checks` is **not** deprecated in `integrations/github` v6.x — there is no `checks` attribute on `github_branch_protection.required_status_checks` (that exists on a different resource, `github_repository_ruleset`). The post's usage is correct.
- The `repository_id` attribute on `github_branch_protection` accepts either the repository name or its node ID, so passing either kind of value through the variable is acceptable.
- `github_team_membership` manages a single team membership; if the user later wants authoritative management of all team members, `github_team_members` is the alternative resource.
- Provider source `integrations/github` is canonical; the older `hashicorp/github` namespace is a legacy mirror and should not be used for new code.
