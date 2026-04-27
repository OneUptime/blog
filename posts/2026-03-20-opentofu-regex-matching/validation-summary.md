# Validation Summary: How to Use Regular Expressions for String Matching in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HashiCorp Configuration Language (HCL)
- RE2 regex syntax (Go's regexp engine)
- AWS resources (used in examples: IAM ARNs, AWS regions, RDS DB instance, CIDR blocks)

## Sources Consulted
- OpenTofu `regex` function docs: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `regexall` function docs: https://opentofu.org/docs/language/functions/regexall/
- OpenTofu `can` function docs: https://opentofu.org/docs/language/functions/can/
- Terraform `regex` function reference: https://developer.hashicorp.com/terraform/language/functions/regex
- Terraform `regexall` function reference: https://developer.hashicorp.com/terraform/language/functions/regexall
- Google RE2 syntax reference: https://github.com/google/re2/wiki/Syntax
- Terraform input variable validation docs: https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules

## Issues Found
1. **Incorrect comment in Step 2 (resource name extraction example)**: The pattern `^(dev|staging|prod)-` matched against `prod-app-server-01` was annotated with `# Result: "prod-"`. Per OpenTofu's `regex` semantics, when one or more unnamed capture groups are present the function returns a list of the captured substrings only (not the full match). Since the literal hyphen `-` lies outside the parentheses, it is not captured. The correct result of `[0]` is `"prod"`. Updated the comment accordingly.

## Review Notes
- The `regex` return-type rules are correct everywhere else in the post: `arn:aws:iam::([0-9]{12}):` returns `["123456789012"]`, `^([^:]+):` returns `["nginx"]`, and `:(.+)$` returns `["1.25.3"]` — all `[0]` accesses yield the documented string.
- The CIDR validation regex `^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$` is intentionally a structural check; it doesn't enforce octet ≤ 255 or prefix length ≤ 32. That's a reasonable simplification for an introductory post and matches typical Terraform/OpenTofu validation patterns.
- The AWS region regex `^[a-z]{2}-[a-z]+-[0-9]$` is a reasonable simplification but does not match GovCloud or partition-specific regions (e.g. `us-gov-east-1`), and would also reject any future regions ending in two digits. The post's error message clarifies the expected format, so this is acceptable for the tutorial's scope.
- For `regexall("\\$\\{([^}]+)\\}", local.template_content)`: because the pattern contains a capture group, each element of the returned list is itself a list of captured strings (i.e., `[["VAR1"], ["VAR2"]]`), not a flat list of variable names. The post's comment ("list of variable names used in template") is a reasonable high-level description but slightly imprecise. Not corrected since it doesn't introduce a code error and the description is acceptable as a summary.
- The claim that OpenTofu uses RE2 syntax (no lookaheads, no backreferences) is correct — OpenTofu inherits Go's `regexp` package via Terraform's lineage.
- `can(regex(...))` returning `false` instead of erroring on no-match is accurately described.

