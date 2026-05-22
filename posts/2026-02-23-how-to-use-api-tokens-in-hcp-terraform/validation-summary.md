# Validation Summary: How to Use API Tokens in HCP Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- HCP Terraform
- Terraform Cloud API
- Terraform CLI
- Terraform Enterprise / HCP Terraform provider (`tfe`)
- GitHub Actions
- HashiCorp Vault

## Sources Consulted
- HashiCorp Developer: HCP Terraform API tokens - https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/api-tokens
- HashiCorp Developer: HCP Terraform API overview and authentication - https://developer.hashicorp.com/terraform/cloud-docs/api-docs
- HashiCorp Developer: User tokens API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/user-tokens
- HashiCorp Developer: Team tokens API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-tokens
- HashiCorp Developer: Organization tokens API reference - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organization-tokens
- HashiCorp Developer: Terraform CLI configuration file - https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Developer: `terraform login` command - https://developer.hashicorp.com/terraform/cli/commands/login
- Terraform Registry: `tfe_team_token` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_token
- HashiCorp setup-terraform GitHub Action - https://github.com/hashicorp/setup-terraform

## Issues Found
- The post described only three API token types without qualification. HCP Terraform now documents additional token categories, including audit trail, agent, and HCP Europe group tokens. I changed the wording to "three primary types of API tokens for general automation" to keep the guide focused without implying those are the only token types.
- The team token API examples used the legacy singular `/teams/:team_id/authentication-token` endpoint. Current HCP Terraform documentation recommends the plural `/teams/:team_id/authentication-tokens` endpoint for non-legacy team tokens, with a JSON API payload and unique description. I updated the create, expiration, and rotation examples accordingly.
- The team token revoke examples deleted by team ID through the legacy endpoint. Current team-token deletion uses `DELETE /authentication-tokens/:token_id`, so I updated the rotation and revocation snippets to use a token ID.
- The organization token creation example omitted the required JSON API request payload. I added the required `data.type` of `authentication-token` and an expiration attribute.
- The manual CLI credentials example wrote JSON directly to `credentials.tfrc.json`. Terraform's documented manual CLI configuration uses an HCL `credentials` block, while `credentials.tfrc.json` is the file written by `terraform login`. I changed the manual CI example to create an HCL CLI config file and point `TF_CLI_CONFIG_FILE` at it.
- The GitHub Actions example used `hashicorp/setup-terraform@v3`. The current action release line is `v4`, so I updated the workflow example.
- The team token listing example used the legacy team-token lookup endpoint. I replaced it with the documented organization team-token listing endpoint.

## Review Notes
The guide is technically valid after the fixes. Organization tokens still should not be used for Terraform CLI plan/apply workflows; the article's CLI examples use user or team-token paths, which matches HashiCorp guidance.
