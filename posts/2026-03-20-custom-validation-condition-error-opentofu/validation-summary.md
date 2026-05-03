# Validation Summary: How to Use Custom Validation with Condition and Error Message in OpenTofu (2)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (variable validation feature)
- HCL (HashiCorp Configuration Language)
- AWS resource references (IAM ARNs, KMS, EC2 instance types, CloudWatch Logs)
- Built-in OpenTofu functions: `can()`, `regex()`, `contains()`, `alltrue()`, `anytrue()`, `jsondecode()`, `keys()`, `values()`, `length()`, `trimspace()`

## Sources Consulted
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu Variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu 1.9 Changelog: https://github.com/opentofu/opentofu/blob/v1.9/CHANGELOG.md
- AWS CloudWatch Logs PutRetentionPolicy API: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutRetentionPolicy.html
- AWS CLI logs put-retention-policy reference: https://docs.aws.amazon.com/cli/latest/reference/logs/put-retention-policy.html

## Issues Found

1. **Outdated note about cross-variable references in validations** — In the "Validating Dependent Conditions" section, the comment stated "validations can't reference other variables directly, but they can reference the current variable". This was true in older versions of OpenTofu/Terraform but is no longer accurate: OpenTofu 1.9 added support for referencing other variables, locals, and data sources in validation blocks. Updated the comment to reflect current capability.

2. **Incomplete CloudWatch Logs retention values list** — In the "Complex Multi-Condition Validations" section, the `retention_days` validation list was missing several officially supported values. The full set per the AWS API documentation is: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653. Added the missing values (1096, 2192, 2557, 2922, 3288) to both the `contains()` list and the corresponding error message.

## Review Notes

- The statement that error messages "Must be a complete sentence ending with period, question mark, or exclamation" is slightly stronger than the actual OpenTofu enforcement (it is a recommendation/soft warning rather than a hard error). This is consistent with documented best practice, so it was left as-is.
- All regex patterns shown (with HCL `\\` escaping) and function usages (`can()`, `jsondecode()`, `alltrue()`, `anytrue()`, `trimspace()`) are syntactically and semantically correct.
- The example regexes for instance types (`^t3\.`, `^t4g\.`, `^m5\.`) are illustrative; in real usage these families also include specific size suffixes which the regex appropriately leaves unconstrained.
- Now that OpenTofu 1.9+ supports cross-variable references, the `enable_encryption` / `kms_key_id` example could be expanded in a future revision to actually use that capability (e.g., requiring a KMS ARN when `enable_encryption` is true). The current example was left intact to preserve scope, with only the outdated comment corrected.
