# Validation Summary: How to Use HashiCorp Vault with Terraform for Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Terraform
- HashiCorp Vault
- Terraform Vault provider
- Terraform AWS provider
- Vault KV v1 and KV v2 secrets engines
- Vault AWS secrets engine
- Vault database secrets engine
- Vault AppRole, Kubernetes, token, and AWS auth methods
- AWS RDS
- Kubernetes Secrets

## Sources Consulted
- Terraform Registry: HashiCorp Vault provider documentation - https://registry.terraform.io/providers/hashicorp/vault/latest/docs
- Terraform Registry: `vault_kv_secret_v2` data source - https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/kv_secret_v2
- Terraform Registry: `vault_aws_access_credentials` data source - https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/aws_access_credentials
- Terraform Registry: `vault_mount` resource - https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/mount
- Terraform Registry: HashiCorp AWS provider `aws_db_instance` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp Vault documentation: AWS secrets engine - https://developer.hashicorp.com/vault/docs/secrets/aws
- HashiCorp Vault documentation: database secrets engine - https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault API documentation: PostgreSQL database plugin statements - https://developer.hashicorp.com/vault/api-docs/secret/databases/postgresql
- HashiCorp Vault documentation: AppRole auth method - https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault API documentation: AppRole login - https://developer.hashicorp.com/vault/api-docs/auth/approle
- HashiCorp Vault documentation: Kubernetes auth method - https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault documentation: AWS auth method - https://developer.hashicorp.com/vault/docs/auth/aws

## Issues Found
- The post implied Vault prevents Terraform state exposure for secrets. The official Vault provider documentation states that secrets read or written by Terraform can be persisted in Terraform state and plan files. Added a warning to protect state and plan artifacts.
- The provider version constraints used older major versions. Updated the examples to use current major versions: `hashicorp/vault` `~> 5.9` and `hashicorp/aws` `~> 6.0`.
- The `aws_db_instance` example omitted `allocated_storage`, which is required unless creating from a snapshot or replica source. Added `allocated_storage = 20` to the RDS examples.
- The `vault_aws_access_credentials` example used `type = "iam_user"`, but the data source expects `type = "creds"` or `type = "sts"`. Changed it to `type = "creds"` for an `iam_user` Vault role.
- The dynamic AWS credentials section did not mention that Terraform does not renew the Vault lease. Added a note that long runs can fail if the leased credentials expire before the run finishes.
- The AWS IAM Vault authentication example used a generic `auth_login` block with only a role parameter. Updated it to the provider-supported `auth_login_aws` block, which handles AWS auth signing.

## Review Notes
The remaining examples are technically valid as tutorial snippets, but production use should further narrow AWS IAM permissions, avoid putting long-lived root credentials in shell history, configure secure remote Terraform state, and consider Terraform 1.10+ ephemeral Vault provider resources where supported by downstream write-only attributes.
