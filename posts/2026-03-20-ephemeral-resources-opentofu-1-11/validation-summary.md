# Validation Summary: How to Use Ephemeral Resources Introduced in OpenTofu 1.11

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu 1.11
- OpenTofu ephemeral resources
- OpenTofu write-only attributes
- AWS provider
- Vault provider
- Kubernetes provider

## Sources Consulted
- OpenTofu ephemerality overview: https://opentofu.org/docs/language/ephemerality/
- OpenTofu ephemeral resources reference: https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu provider configuration reference: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu checks reference: https://opentofu.org/docs/language/checks/
- OpenTofu custom conditions reference: https://opentofu.org/docs/language/expressions/custom-conditions/
- Terraform write-only arguments reference: https://developer.hashicorp.com/terraform/language/manage-sensitive-data/write-only
- AWS provider ephemeral `aws_secretsmanager_secret_version` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/ephemeral-resources/secretsmanager_secret_version.html.markdown
- AWS provider `aws_db_instance` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- Vault provider ephemeral `vault_aws_access_credentials` documentation: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/ephemeral-resources/aws_access_credentials.html.md
- Vault provider ephemeral `vault_kv_secret_v2` documentation: https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/ephemeral-resources/kv_secret_v2.html.md
- Kubernetes provider `kubernetes_secret_v1` documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/secret_v1.md
- Kubernetes provider `resource_kubernetes_secret_v1` source: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/kubernetes/resource_kubernetes_secret_v1.go

## Issues Found
- The original `aws_db_instance` example passed an ephemeral value to `password`, which is not an allowed context for ephemeral values. I changed it to the documented write-only arguments `password_wo` and `password_wo_version`, and added the required RDS arguments so the example is structurally valid.
- The provider-configuration example used `aws_sts_assume_role`, which is not a documented AWS provider ephemeral resource. I replaced it with the documented `vault_aws_access_credentials` ephemeral resource, which can supply short-lived AWS credentials to an `aws` provider block.
- The Vault-to-Kubernetes example used `kubernetes_secret.data`, which would store secret material in state and is not a valid target for ephemeral values. I changed it to `kubernetes_secret_v1.data_wo` with `data_wo_revision`, which is the provider's documented write-only path.
- The lifecycle explanation implied a single open/close flow for the whole operation and only mentioned state files. I corrected it to match OpenTofu 1.11 behavior: validation happens first, opening can be deferred until apply, and ephemeral values are not written to state or plan files.
- The check-block example used an ephemeral value inside `assert`, but OpenTofu only allows ephemeral values in specific contexts and `check` assertions are not one of them. I replaced it with a valid `lifecycle.postcondition` example on the ephemeral resource itself.
- The introduction and summary were slightly overstated because they omitted plan-file behavior and provider support requirements. I tightened both statements to match the official docs.

## Review Notes
- The post is now technically correct for OpenTofu 1.11, but provider support remains version-specific. Ephemeral resources are not a drop-in replacement for arbitrary `data` sources; each example depends on the relevant provider exposing an ephemeral resource or a write-only attribute.
