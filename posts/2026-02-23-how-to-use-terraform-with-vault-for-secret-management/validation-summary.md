# Validation Summary: How to Use Terraform with Vault for Secret Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Vault
- Terraform Vault provider
- Vault KV v2 secrets engine
- Vault database secrets engine
- Vault AppRole and AWS IAM authentication
- Vault PKI secrets engine
- Vault transit secrets engine
- AWS RDS, AWS Secrets Manager, and AWS Certificate Manager

## Sources Consulted
- HashiCorp Terraform Vault Provider documentation: https://registry.terraform.io/providers/hashicorp/vault/latest/docs
- HashiCorp Terraform Vault Provider source documentation: https://github.com/hashicorp/terraform-provider-vault/tree/main/website/docs
- Vault provider `vault_kv_secret_v2` data source documentation: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/d/kv_secret_v2.html.md
- Vault provider database connection and role resource documentation: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/database_secret_backend_connection.md and https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/database_secret_backend_role.md
- Vault provider AppRole resource and provider authentication documentation: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/approle_auth_backend_role.html.md and https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/index.html.markdown
- Vault provider PKI certificate, root certificate, and role resource documentation: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/pki_secret_backend_cert.html.md, https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/pki_secret_backend_root_cert.html.md, and https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/pki_secret_backend_role.html.md
- Vault provider transit key resource documentation: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/transit_secret_backend_key.html.md
- Terraform state and sensitive output documentation: https://docs.hashicorp.com/terraform/language/state and https://developer.hashicorp.com/terraform/tutorials/configuration-language/outputs
- AWS provider ACM certificate resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate

## Issues Found
- The post claimed Terraform and Vault ensure secrets are never stored in state files in plain text. This is incorrect: the official Vault provider documentation states that secrets read or written through Terraform can be persisted in Terraform state and plan files. I revised the introduction and "Why Vault with Terraform" section to explain that Vault avoids hardcoding secrets but Terraform state and plans must still be treated as sensitive.
- The post described Vault transit as encrypting sensitive values in Terraform state. Terraform does not automatically encrypt state with Vault transit. I changed the section to recommend secure remote state storage and clarified that transit only applies to custom state artifact encryption workflows.
- The Vault provider version constraint used `~> 3.0`, which is outdated for a 2026 guide. I updated it to `~> 5.0`, matching the current major provider line.
- The AWS IAM auth example used `auth_login` with `path = "auth/aws/login"` but omitted `method = "aws"`, which the provider uses for AWS request signing. I added `method = "aws"`.
- The provider setup snippet showed three unaliased `provider "vault"` blocks in one configuration, which would conflict. I added aliases to the alternative AppRole and AWS IAM examples.
- The PostgreSQL database connection used `password`, which is stored in Terraform state. I changed it to the provider's write-only `password_wo` argument with `password_wo_version`.
- The policy section implied Vault policies directly control Terraform workspaces. I clarified that the policies apply to the Vault tokens used by each workspace or environment.
- The PKI certificate example used `data "vault_pki_secret_backend_cert"`, but the current Vault provider documents this as a resource. I changed it to `resource "vault_pki_secret_backend_cert"`.
- The ACM import example passed Vault's `ca_chain` directly to `certificate_chain`; AWS expects a PEM-formatted chain string. I changed it to `join("\n", vault_pki_secret_backend_cert.app.ca_chain)`.
- The best-practices section said `sensitive = true` prevents values from appearing in logs or plan output. I narrowed this to normal CLI output, because Terraform still stores sensitive outputs in state and can reveal them through state or JSON output.

## Review Notes
- I could not run `terraform fmt` or `terraform validate` locally because the `terraform` binary is not installed in this environment.
- Several examples are illustrative and assume supporting resources, variables, enabled Vault auth methods, mounted secrets engines, and AWS provider configuration exist elsewhere.
