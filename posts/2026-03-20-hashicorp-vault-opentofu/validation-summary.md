# Validation Summary: How to Integrate HashiCorp Vault with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp Vault
- Vault provider for OpenTofu/Terraform
- AWS provider
- Vault KV v2 secrets engine
- Vault AWS secrets engine
- Vault AppRole authentication
- AWS RDS

## Sources Consulted
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu Write-only Attributes: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- HashiCorp Vault provider index docs: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/index.html.markdown
- HashiCorp Vault provider `vault_aws_access_credentials` data source docs: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/d/aws_access_credentials.html.md
- HashiCorp Vault provider `vault_kv_secret_v2` data source docs: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/d/kv_secret_v2.html.md
- HashiCorp Vault provider `vault_kv_secret_v2` resource docs: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/kv_secret_v2.html.md
- HashiCorp Vault provider `vault_kv_secret_v2` data source implementation: https://github.com/hashicorp/terraform-provider-vault/blob/main/vault/data_source_kv_secret_v2.go
- HashiCorp Vault provider `vault_kv_secret_v2` resource implementation: https://github.com/hashicorp/terraform-provider-vault/blob/main/vault/resource_kv_secret_v2.go
- Vault AWS secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/aws
- Vault AppRole docs: https://developer.hashicorp.com/vault/docs/auth/approle
- Vault AppRole API docs: https://developer.hashicorp.com/vault/api-docs/auth/approle

## Issues Found
- The description, introduction, and conclusion overstated the security properties of the Vault provider by implying secrets never touch OpenTofu artifacts. I corrected that wording to reflect the official provider and OpenTofu docs: Vault secrets retrieved through provider data sources are still stored in state and plan files and must be protected.
- The `vault_aws_access_credentials` example used `type = "iam_user"`, which is not a valid value for that data source. I changed it to `type = "creds"` to match the provider documentation for IAM user style credentials.
- The AppRole example referenced `var.vault_role_id` and `var.vault_secret_id` without declaring them. I added `variable` blocks so the snippet is syntactically complete and matches how OpenTofu input variables are used.
- The Vault policy example granted only `create` and `update` on `secret/data/prod/generated/*`, which is insufficient for the shown `vault_kv_secret_v2` resource flow because the provider reads secrets for drift detection and may delete them during lifecycle operations. I expanded the capabilities to include `read` and `delete`.

## Review Notes
- The post explicitly pins `hashicorp/vault` to `~> 4.0`. That keeps the `data "vault_kv_secret_v2"` example version-accurate, but provider v5 deprecates that data source and introduces ephemeral resources and write-only attributes for newer OpenTofu workflows.
