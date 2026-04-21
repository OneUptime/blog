# Validation Summary: How to Use tofu.applying for Plan vs Apply Differentiation in OpenTofu (2)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- OpenTofu ephemeral values and resources
- HCL
- AWS provider ephemeral resources
- Vault provider ephemeral resources
- Provider configuration and provisioners

## Sources Consulted
- OpenTofu Ephemerality documentation: https://opentofu.org/docs/v1.11/language/ephemerality/
- OpenTofu References to Named Values documentation: https://opentofu.org/docs/v1.11/language/expressions/references/
- OpenTofu Ephemeral Resources documentation: https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/v1.11/language/expressions/custom-conditions/
- OpenTofu `enabled` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/enabled/
- AWS provider `aws_ssm_parameter` ephemeral resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/ssm_parameter
- AWS provider `aws_secretsmanager_secret_version` ephemeral resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/secretsmanager_secret_version
- AWS provider configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Vault provider `vault_database_secret` ephemeral resource documentation: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/ephemeral-resources/database_secret

## Issues Found
- The post said `tofu.applying` and ephemeral resources are available in OpenTofu 1.10+. Updated this to OpenTofu 1.11+ based on the OpenTofu ephemerality and ephemeral resource documentation.
- The post described `tofu.applying` as `true` during `tofu apply` and `false` during `tofu plan`. Updated this to clarify that it is phase-based: `false` during plan and validate, and `true` during the apply phase.
- The `aws_ssm_parameter` ephemeral example used `name`, but the AWS provider ephemeral resource requires `arn`. Updated the example to use parameter ARNs.
- The Secrets Manager example used `secret_id = tofu.applying ? ... : null`, but `secret_id` is required. Updated the example to keep a valid `secret_id` and use `lifecycle { enabled = tofu.applying }` to skip opening the ephemeral resource outside apply.
- The local value example used invalid `locals { ephemeral log_level = ... }` syntax. Updated it to a normal local assignment; the local becomes ephemeral automatically because it references `tofu.applying`.
- The credential example used a non-existent `aws_iam_role` ephemeral resource. Replaced it with the AWS provider's documented `assume_role` configuration and used `tofu.applying` in the provider configuration.
- The side-effect section mentioned the regular `external` data source, which is not an ephemeral expression context. Removed that reference and kept the section focused on ephemeral resources.
- The Vault example used `count = tofu.applying ? 1 : 0` and indexed the resource. Updated it to use `lifecycle { enabled = tofu.applying }` and direct attribute access, matching the OpenTofu ephemeral resource lifecycle guidance.
- The custom condition example used `self` inside a `precondition`, but OpenTofu documents `self` for postconditions. Updated the section and code to use a postcondition.
- The limitations section incorrectly implied outputs and locals were categorically unavailable. Updated it to distinguish non-ephemeral outputs from ephemeral-aware contexts and explain that locals become ephemeral when they reference ephemeral values.

## Review Notes
Local CLI validation was not run because neither `tofu` nor `terraform` is installed in the review environment. The review was performed against official OpenTofu documentation and official provider documentation.
