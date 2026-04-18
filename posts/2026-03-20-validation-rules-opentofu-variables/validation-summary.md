# Validation Summary: How to Add Validation Rules to OpenTofu Variables - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (variable validation blocks)
- HCL (HashiCorp Configuration Language)
- OpenTofu built-in functions: `contains`, `length`, `can`, `regex`, `cidrhost`, `tonumber`, `split`, `distinct`, `alltrue`, `jsondecode`

## Sources Consulted
- OpenTofu Variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu function reference (contains, regex, can, cidrhost, alltrue, distinct, jsondecode, tonumber, split)
- Terraform/OpenTofu custom condition checks / validation rules documentation

## Issues Found
- **CIDR section comment mismatch (README.md CIDR Block Validation section)**: The comment read `# Ensure it's at least a /16 network`, but the condition `tonumber(split("/", var.vpc_cidr)[1]) <= 24` permits prefix lengths from /0 through /24 (including /24, which is strictly smaller than /16). The error message was also ambiguous ("at most /24"). Updated the comment and error message to accurately describe the rule: "prefix length must be /24 or less (numerically), e.g., /8, /16, /24".

## Review Notes
- All HCL syntax in the examples is valid for OpenTofu 1.6+ (and Terraform >= 0.13, which is when multiple `validation` blocks per variable were introduced).
- Port validation: `var.port > 1023` correctly starts the range at 1024 (first non-privileged port), matching the error message.
- Regex patterns for bucket names and IP-address check are syntactically valid and functionally correct for their stated purposes (S3 naming approximation).
- The `can(cidrhost(var.vpc_cidr, 0))` idiom is the idiomatic way to validate CIDR blocks in OpenTofu/Terraform.
- The post does not mention that custom error messages can interpolate variables (a minor feature), but this is not incorrect — just an omission of an advanced capability.
