# Validation Summary: How to Read Vault Secrets in OpenTofu Configurations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HashiCorp Vault
- Vault provider for Terraform/OpenTofu
- AWS provider
- Amazon RDS
- Amazon ECS
- AWS Certificate Manager (ACM)
- HCL

## Sources Consulted
- OpenTofu sensitive state documentation: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu `nonsensitive` function documentation: https://opentofu.org/docs/language/functions/nonsensitive/
- Vault provider overview and security caveats: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/index.html.markdown
- Vault `vault_kv_secret_v2` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/d/kv_secret_v2.html.md
- Vault `vault_kv_secret` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/d/kv_secret.html.md
- Vault `vault_generic_secret` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/d/generic_secret.html.md
- Vault PKI API documentation: https://developer.hashicorp.com/vault/api-docs/secret/pki
- Vault PKI certificate resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/r/pki_secret_backend_cert.html.md
- AWS `aws_acm_certificate` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate.html.markdown
- AWS `aws_ecs_task_definition` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecs_task_definition.html.markdown
- Terraform Registry listing for current Vault provider version: https://registry.terraform.io/providers/hashicorp/vault
- Terraform Registry listing for current AWS provider version: https://registry.terraform.io/providers/hashicorp/aws

## Issues Found
- The post incorrectly claimed that reading Vault secrets via data sources avoids storing them in state. I corrected the description, introduction, and conclusion because the official Vault provider docs state that secrets read through the provider are persisted in state and can also appear in plan files or console output.
- The provider version pins were outdated for the review date. I updated the examples from `hashicorp/vault ~> 4.0` to `~> 5.0` and from `hashicorp/aws ~> 5.0` to `~> 6.0` to match the current major versions available on April 23, 2026.
- The "Reading Generic Secrets" example was invalid. It used `vault_generic_secret` against `pki/issue/web-server`, but that PKI issuance path is a POST endpoint, while `vault_generic_secret` only works for paths that support `vault read`/GET. It also referenced a nonexistent `aws_acm_certificate_import` resource. I replaced it with a valid read-only `vault_generic_secret` example and a valid `aws_acm_certificate` import configuration.
- The "Preventing Secrets from Appearing in Plan Output" section overstated what `sensitive = true` does and included a misleading `nonsensitive()` example. I rewrote the section to accurately state that sensitive outputs reduce accidental CLI exposure but do not remove values from state or plan files.
- The "Caching Vault Reads" section was technically inaccurate because using `locals` does not cache Vault reads beyond the existing data source evaluation. I renamed and rewrote that section to describe reuse of a single read result instead.
- The RDS examples were incomplete as written. I added required `aws_db_instance` arguments so the examples are workable rather than placeholders missing essential configuration.

## Review Notes
- The ECS example is syntactically valid, but because it uses the `environment` field, those secret values will also be stored in the ECS task definition JSON registered in AWS, in addition to OpenTofu state.
- If the intended goal is to have Vault issue certificates directly, the dedicated Vault PKI APIs or the `vault_pki_secret_backend_cert` resource are the correct mechanisms; `vault_generic_secret` is only for read-only paths that support `vault read`.
- Version guidance in the post now reflects documentation checked on April 23, 2026.
