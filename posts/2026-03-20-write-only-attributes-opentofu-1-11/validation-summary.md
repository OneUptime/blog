# Validation Summary: How to Use Write-Only Attributes Introduced in OpenTofu 1.11

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu 1.11 (write-only attributes, ephemeral resources)
- HashiCorp Terraform AWS provider (`aws_db_instance`, `aws_secretsmanager_secret_version`)
- terraform-plugin-framework (Go, schema definitions)
- HCL configuration language

## Sources Consulted
- [OpenTofu 1.11 release notes / What's new](https://opentofu.org/docs/intro/whats-new/)
- [OpenTofu Write-only attributes docs](https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/)
- [OpenTofu State and Plan Encryption docs](https://opentofu.org/docs/language/state/encryption/)
- [OpenTofu Sensitive Data in State docs](https://opentofu.org/docs/language/state/sensitive-data/)
- [HashiCorp Terraform: Use temporary write-only arguments](https://developer.hashicorp.com/terraform/language/manage-sensitive-data/write-only)
- [HashiCorp Terraform Plugin Framework: Write-only Arguments](https://developer.hashicorp.com/terraform/plugin/framework/resources/write-only-arguments)
- [AWS provider `aws_db_instance` resource docs (Terraform Registry)](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)
- [AWS provider `aws_secretsmanager_secret_version` ephemeral resource docs](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/secretsmanager_secret_version)

## Issues Found
- **"Sensitive attributes are stored in state (encrypted)"** — incorrect. By default, OpenTofu writes sensitive values to state in **plaintext**; the `sensitive` flag only masks them in CLI output. State encryption is a separate, opt-in feature (introduced in OpenTofu 1.7) that must be configured explicitly. Updated the sentence to: *"Sensitive attributes are still stored in state (in plaintext by default, just masked in CLI output); write-only attributes are not stored at all."* This also matches the inline code comment already present (`# Sensitive attribute - stored in state, masked in output`), so the post is now internally consistent.

## Review Notes
- The `password_wo` / `password_wo_version` arguments on `aws_db_instance` are accurate; they require AWS provider v5.88.0+ and OpenTofu 1.11 / Terraform 1.11+. The post does not call out the provider version requirement, but this is a stylistic omission rather than a technical error.
- Marking a write-only attribute as both `WriteOnly: true` and `Sensitive: true` in the Plugin Framework example is technically valid (write-only attributes are inherently kept out of state, so `Sensitive` is somewhat redundant but not wrong).
- The ephemeral resource attribute reference `ephemeral.aws_secretsmanager_secret_version.db_password.secret_string` matches the AWS provider's ephemeral resource schema.
- The OpenTofu 1.11 release date and feature attribution (write-only attributes + ephemeral support) are correct.
