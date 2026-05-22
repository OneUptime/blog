# Validation Summary: How to Write Rego Policies for Terraform Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform plan JSON
- Open Policy Agent (OPA)
- Rego policy language
- OPA CLI testing and evaluation
- AWS Terraform provider resources

## Sources Consulted
- Open Policy Agent Policy Language documentation: https://www.openpolicyagent.org/docs/policy-language
- Open Policy Agent `contains` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/contains
- Open Policy Agent debugging and `print()` documentation: https://www.openpolicyagent.org/docs/policy-reference/builtins/opa
- Terraform `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- AWS provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Local OPA CLI 1.16.2 `opa test --help`, `opa eval --help`, `opa check`, and `opa test` output.

## Issues Found
- Updated Rego examples to current Rego v1 syntax. Partial set rules now use `deny contains msg if { ... }`, helper/test rules use `if`, and examples import `rego.v1` where appropriate. This aligns the snippets with current OPA syntax.
- Updated the S3 encryption example and tests from the inline `aws_s3_bucket.server_side_encryption_configuration` shape to the current `aws_s3_bucket_server_side_encryption_configuration` resource shape. The AWS provider now documents the standalone resource as the preferred way to manage S3 bucket encryption configuration.
- Corrected negated membership expressions to use Rego syntax such as `not "delete" in resource.change.actions`.
- Added `some i` to the explicit-index iteration example so the index variable is declared clearly under Rego v1.
- Changed the missing-tag set comprehension to explicitly declare `some key`, which is clearer and valid under current Rego syntax.
- Removed the version-specific claim that `print()` is for OPA 0.40+. Current OPA documentation describes `print()` as the standard debugging built-in without that version qualifier.
- Changed the RDS KMS wording from "customer-managed KMS key" to "KMS key ARN" because the example checks only that `kms_key_id` starts with `arn:aws:kms:`, which does not prove the key is customer-managed.
- Corrected the null/missing-key pitfall wording. Missing direct references become undefined in Rego; `object.get()` is useful when a default value is needed.

## Review Notes
The updated S3 policy and test snippets were run with OPA 1.16.2 and passed. Representative helper, tag, compute, and encryption snippets were also checked with `opa check`. The internal cross-links were reviewed for plausibility but not changed.
