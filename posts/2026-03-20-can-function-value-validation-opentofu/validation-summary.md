# Validation Summary: How to Use can Function for Value Validation in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu built-in functions (`can`, `try`, `regex`, `cidrhost`, `tonumber`)
- AWS KMS ARN format validation

## Sources Consulted
- OpenTofu `can` function docs: https://opentofu.org/docs/language/functions/can/
- OpenTofu custom condition expressions docs: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `regex` function docs: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `try` function docs: https://opentofu.org/docs/language/functions/try/
- OpenTofu `cidrhost` function docs: https://opentofu.org/docs/language/functions/cidrhost/
- OpenTofu type constraints docs (`optional(...)` behavior): https://opentofu.org/docs/language/expressions/type-constraints/
- AWS KMS key identifiers and ARN format: https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html

## Issues Found
- The introduction described `can` too broadly as ideal for general conditional logic. I corrected the wording to match current OpenTofu guidance: `can` is primarily for turning dynamic errors into boolean results in validation and other condition expressions, while `try` is the better fit when a fallback value is needed.
- The optional object attribute example incorrectly used `can(var.db_config.read_replica)`. For typed object attributes declared with `optional(...)`, OpenTofu populates omitted attributes with `null`, so `can(...)` is unnecessary and misleading there. I changed the example to a direct `null` check.
- The KMS ARN validation regex was too narrow and too permissive at the same time: it rejected valid multi-Region KMS key ARNs and accepted malformed key IDs. I updated the pattern to match the documented ARN structure and both standard and multi-Region KMS key ID formats.

## Review Notes
- No deprecated OpenTofu syntax or APIs were found in the remaining examples.
- `tofu` was not installed in the local environment, so example behavior was verified against official documentation rather than a live `tofu console` session.
