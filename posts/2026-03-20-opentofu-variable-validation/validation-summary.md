# Validation Summary: How to Use Variable Validation Rules in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (variable validation blocks)
- HCL (HashiCorp Configuration Language)
- Terraform-compatible built-in functions: `contains`, `can`, `regex`, `length`, `toset`, `startswith`, `endswith`, `cidrhost`, `cidrcontains`, `keys`
- AWS resources referenced as examples (S3, EC2, VPC, AMI)

## Sources Consulted
- [OpenTofu Input Variables documentation](https://opentofu.org/docs/language/values/variables/)
- [OpenTofu Custom Conditions documentation](https://opentofu.org/docs/language/expressions/custom-conditions/)
- [OpenTofu cidrhost function](https://opentofu.org/docs/language/functions/cidrhost/)
- [OpenTofu cidrcontains function](https://opentofu.org/docs/language/functions/cidrcontains/)
- [OpenTofu startswith / endswith functions](https://opentofu.org/docs/language/functions/startswith/)
- [OpenTofu plan command documentation](https://opentofu.org/docs/cli/commands/plan/)

## Issues Found
No technical issues found.

Verified items:
- The `validation { condition = ..., error_message = ... }` block syntax matches the OpenTofu spec.
- `contains()`, `can()`, `regex()`, `length()`, `toset()`, `keys()` are all valid HCL functions used correctly.
- `startswith()` and `endswith()` are valid OpenTofu functions and used with the correct `(string, prefix/suffix)` argument order.
- `cidrhost(var.vpc_cidr, 0)` is a valid usage; wrapping it in `can()` to test CIDR validity is the conventional pattern.
- `cidrcontains("10.0.0.0/8", var.vpc_cidr)` is correct — `cidrcontains` accepts either an IP address or a CIDR prefix as the second argument, and returns true when the second argument is contained within the first.
- Multiple `validation` blocks per variable are supported and produce separate error messages, as described.
- The `${var.bucket_name}` interpolation inside `error_message` is valid; OpenTofu supports referencing the variable's value in error messages.
- The validation timing claim ("runs at the very beginning of `tofu plan`, before reading data sources and planning resource changes") is consistent with OpenTofu's documented early-evaluation behavior.

## Review Notes
- The S3 bucket-name regex `^[a-z0-9-]+$` is intentionally stricter than the full AWS rule set (AWS additionally allows dots, with extra restrictions). The post's prose accurately describes what the regex enforces ("lowercase letters, numbers, and hyphens"), so this is a reasonable simplification rather than an error.
- The AMI regex `^ami-[0-9a-f]+$` accepts any non-empty hex tail; in practice AWS uses 8- or 17-character hex AMI IDs. The looser pattern is fine as a format sanity check, which is how the post frames it.
- The bullet "Evaluating locals" under "Validation Timing" is a minor simplification: in modern OpenTofu (1.8+) variable validation can reference locals that themselves only depend on variables, so those locals must be evaluated to support the reference. The general intent of the section — that validation runs early, before data sources and resource planning — is correct, so no edit was made.
