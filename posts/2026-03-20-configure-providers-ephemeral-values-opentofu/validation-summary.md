# Validation Summary: How to Configure Providers with Ephemeral Values in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (ephemeral resources / `ephemeral` block, introduced in OpenTofu v1.11)
- HashiCorp AWS Provider (ephemeral resources `aws_secretsmanager_secret_version`, `aws_eks_cluster_auth`)
- HashiCorp Vault Provider (ephemeral resources `vault_kv_secret_v2`, `vault_aws_access_credentials`)
- GitHub provider (`github`)
- Datadog provider (`datadog`)
- PagerDuty provider (`pagerduty`)
- Slack provider (`slack`)
- Kubernetes provider (`kubernetes`)
- Helm provider (`helm`)
- PostgreSQL provider (`postgresql`)
- Terraform Cloud provider (`tfe`)
- AWS Secrets Manager / HashiCorp Vault (secret stores)

## Sources Consulted
- OpenTofu 1.11 ephemeral resources docs: https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu 1.11 release notes: https://opentofu.org/blog/opentofu-1-11-0/
- AWS provider ephemeral `secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/secretsmanager_secret_version
- AWS provider ephemeral `eks_cluster_auth`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/eks_cluster_auth
- Vault provider ephemeral `kv_secret_v2`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/ephemeral-resources/kv_secret_v2
- Vault provider ephemeral resources guide: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/guides/using_ephemeral_resources
- Vault `aws_access_credentials` data source schema (mirrored by ephemeral form): https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/aws_access_credentials
- HashiCorp ephemeral block reference: https://developer.hashicorp.com/terraform/language/block/ephemeral

## Issues Found
No technical issues found.

Verifications performed:
- `ephemeral "TYPE" "NAME" { ... }` block syntax is correct.
- `ephemeral.<type>.<name>.<attribute>` reference syntax is correct.
- Ephemeral values are explicitly allowed in `provider "..." { ... }` configuration blocks.
- `aws_secretsmanager_secret_version` exists as an ephemeral resource in the AWS provider with `secret_id` input and `secret_string` output.
- `vault_kv_secret_v2` exists as an ephemeral resource with `mount`, `name` inputs and a `data_json` / `data` map output; `data["token"]` map access is valid.
- `vault_aws_access_credentials` exists as an ephemeral resource (mirroring the data source schema) with `backend` and `role` inputs and `access_key`, `secret_key`, `security_token` outputs.
- `aws_eks_cluster_auth` is available as an ephemeral resource (since AWS provider v5.84.0) and exposes a `token` attribute.
- Passing ephemeral values through `locals` (as done in the Vault and Postgres examples) is supported; the resulting local values become ephemeral.
- Provider block argument names used in examples (`token`, `api_key`, `app_key`, `access_key`, `secret_key`, `host`, `cluster_ca_certificate`, etc.) are correct for their respective providers.
- Helm provider's nested `kubernetes { ... }` block is the documented way to configure cluster auth for that provider.

## Review Notes
- OpenTofu's ephemeral resources feature shipped in OpenTofu v1.11 (Terraform shipped the equivalent in v1.10). The post does not name a specific minimum version, which keeps it from going stale but readers should be aware they need OpenTofu >= 1.11.
- The AWS `aws_eks_cluster_auth` ephemeral form requires AWS provider v5.84.0 or newer; older provider versions only expose it as a data source (which writes the token to state).
- Vault provider's ephemeral resources require the Vault provider v5.x and OpenTofu/Terraform >= 1.11.
- The post's `provider "tfe"` example uses `data["token"]`. Both `data["token"]` and `data.token` work; it can sometimes be helpful to wrap with `tostring(...)` when feeding write-only arguments, but it is not required here.
- The example using `var.region`, `var.environment`, `var.tfc_organization` assumes those variables are declared elsewhere - this is standard for tutorial snippets and acceptable.
