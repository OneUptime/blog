# Validation Summary: How to Use Dynamic AWS Credentials with Vault and OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp Vault
- Vault AWS secrets engine
- Vault Agent
- Vault GitHub Action
- AWS IAM
- GitHub Actions
- HCL
- YAML
- Bash

## Sources Consulted
- HashiCorp Vault AWS secrets engine API docs: https://developer.hashicorp.com/vault/api-docs/secret/aws
- HashiCorp Vault lease revoke command docs: https://developer.hashicorp.com/vault/docs/commands/lease/revoke
- HashiCorp Vault system leases API docs: https://developer.hashicorp.com/vault/api-docs/system/leases
- HashiCorp Vault Agent AWS auto-auth docs: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/aws
- HashiCorp Vault Agent with AWS tutorial: https://developer.hashicorp.com/vault/tutorials/vault-agent/agent-aws
- HashiCorp Vault provider docs for `vault_aws_access_credentials`: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/d/aws_access_credentials.html.md
- HashiCorp Vault provider docs for ephemeral `vault_aws_access_credentials`: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/ephemeral-resources/aws_access_credentials.html.md
- OpenTofu docs for ephemeral resources: https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- `hashicorp/vault-action` README: https://github.com/hashicorp/vault-action/blob/main/README.md
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu/blob/main/README.md
- Terraform Registry provider metadata for `hashicorp/vault`: https://registry.terraform.io/v1/providers/hashicorp/vault
- Terraform Registry provider metadata for `hashicorp/aws`: https://registry.terraform.io/v1/providers/hashicorp/aws

## Issues Found
- The `vault_aws_access_credentials` example used `type = "iam_user"`, but the Vault provider expects `type = "creds"` or `type = "sts"`. I changed it to `type = "creds"` to match the documented schema.
- The provider version constraints in the OpenTofu example were outdated. I updated `hashicorp/vault` from `~> 3.0` to `~> 5.0` and `hashicorp/aws` from `~> 5.0` to `~> 6.0` to reflect current supported major versions as of 2026-05-01.
- The GitHub Actions example used `hashicorp/vault-action` with `method: jwt` but omitted the required workflow permissions for GitHub OIDC. I added `permissions: contents: read` and `id-token: write`.
- The OpenTofu setup action reference was outdated. I updated `opentofu/setup-opentofu@v1` to `opentofu/setup-opentofu@v2`.
- The architecture block was marked as `hcl` even though it is a text diagram, not valid HCL. I changed the fence to `text`.

## Review Notes
- No remaining technical errors were found after the fixes above.
- The Method 1 example uses the Vault provider data source, which is still valid, but the provider documentation notes that data source values are written to state. OpenTofu 1.11 and Vault provider 5 also support ephemeral resources if the post is expanded later to avoid persisting these credentials.
- The CI example reads from an `iam_user` role path, so `AWS_SESSION_TOKEN` is not required there. If that example is later changed to use an `assumed_role` or other STS-based role, the session token must also be exported and passed to AWS tooling.
