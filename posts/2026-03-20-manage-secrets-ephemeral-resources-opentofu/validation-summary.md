# Validation Summary: How to Manage Secrets Safely with Ephemeral Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Secrets Manager
- AWS RDS
- AWS Systems Manager Parameter Store
- AWS CloudTrail
- Amazon ECS task definitions
- HashiCorp Vault
- TLS provider
- Datadog provider

## Sources Consulted
- OpenTofu Ephemeral Resources: https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu Write-only Attributes: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- OpenTofu Local Values: https://opentofu.org/docs/v1.11/language/values/locals/
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu State and Plan Encryption: https://opentofu.org/docs/v1.11/language/state/encryption/
- What's new in OpenTofu 1.7?: https://opentofu.org/docs/v1.7/intro/whats-new/
- What's new in OpenTofu 1.8?: https://opentofu.org/docs/v1.8/intro/whats-new/
- OpenTofu `terraform_data`: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu `local-exec` provisioner: https://opentofu.org/docs/v1.8/language/resources/provisioners/local-exec/
- AWS provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_secretsmanager_secret_version` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- AWS provider `aws_secretsmanager_secret_version` ephemeral resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/secretsmanager_secret_version
- AWS provider `aws_ssm_parameter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Vault provider `vault_kv_secret_v2` ephemeral resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/ephemeral-resources/kv_secret_v2
- Vault provider `vault_database_secret` ephemeral resource: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/ephemeral-resources/database_secret
- TLS provider `tls_private_key` ephemeral resource: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/ephemeral-resources/private_key
- AWS CLI `lookup-events`: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- AWS CLI `rotate-secret`: https://docs.aws.amazon.com/goto/aws-cli/secretsmanager-2017-10-17/RotateSecret
- Amazon ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/userguide/task_definition_parameters.html
- Vault `audit list`: https://developer.hashicorp.com/vault/docs/commands/audit/list

## Issues Found
- The post used ephemeral values in ordinary managed-resource arguments such as `aws_db_instance.password`, `aws_db_instance.username`, `aws_ssm_parameter.value`, and `aws_ecs_task_definition.container_definitions`. OpenTofu only allows ephemeral values in specific contexts such as providers, provisioners, locals, connection blocks, and write-only attributes. I replaced those examples with valid write-only attributes or other supported ephemeral contexts.
- The RDS examples relied on `lifecycle.ignore_changes` to avoid storing secrets. That does not make a normal argument safe or ephemeral-aware. I changed the examples to use `password_wo` with `password_wo_version`, and kept the username non-ephemeral.
- The TLS section implied that an ephemeral `tls_private_key` output could be passed directly into `tls_self_signed_cert.private_key_pem`. That target argument is not write-only. I rewrote the example to store the generated private key using `aws_secretsmanager_secret_version.secret_string_wo`, which is a technically valid pattern.
- The rotation section claimed that omitting `version_id` "always gets the latest" and then injected the secret into ECS environment JSON. The AWS provider defaults the ephemeral secret lookup to the `AWSCURRENT` staging label, and using that plaintext inside `container_definitions` would persist it. I rewrote the section to a valid provider-configuration example and clarified the write-only update caveat.
- The Vault dynamic secrets section used leased credentials as long-lived `aws_db_instance` arguments. That mismatches how Vault dynamic credentials are intended to be used and also violates OpenTofu's ephemeral-value placement rules. I changed it to an apply-time migration example using `terraform_data` and `local-exec`.
- The state-encryption checklist labeled the example as `OpenTofu 1.7+` while using a variable inside the encryption block. Variable/local support in encryption configuration was added in OpenTofu 1.8, and existing-state migration also requires an `unencrypted` fallback block. I corrected both points.
- The audit and rotation commands needed qualification. I changed the Vault example to `vault audit list -detailed`, noted that the file-audit log path depends on configuration, and clarified that `aws secretsmanager rotate-secret` only works when rotation is already configured for that secret.
- The state-grep validation step said the command should return no matches. That is not reliably true because secret names and metadata can still contain those strings. I adjusted the wording to tell readers to inspect matches carefully.

## Review Notes
- The post is now technically accurate for OpenTofu 1.11+ ephemeral resources and write-only attributes.
- The encryption example is accurate as written for OpenTofu 1.8+ because it uses a variable inside the encryption configuration.
- Some snippets remain illustrative rather than full standalone modules; they intentionally omit surrounding `required_providers`, version pinning, and unrelated infrastructure.
- OpenTofu still requires an explicit non-ephemeral companion field such as `*_wo_version` when a provider uses write-only attributes to trigger updates.
