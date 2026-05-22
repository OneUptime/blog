# Validation Summary: How to Understand Terraform Primitive Types (string number bool)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform input variables
- Terraform type conversion functions

## Sources Consulted
- Terraform documentation: Types and Values - https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform documentation: Strings and Templates - https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform documentation: Operators - https://developer.hashicorp.com/terraform/language/expressions/operators
- Terraform documentation: Type Constraints - https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform documentation: Input Variables - https://developer.hashicorp.com/terraform/language/values/variables
- Terraform documentation: Custom Conditions - https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- Terraform function documentation: tostring - https://developer.hashicorp.com/terraform/language/functions/tostring
- Terraform function documentation: tonumber - https://developer.hashicorp.com/terraform/language/functions/tonumber
- Terraform function documentation: tobool - https://developer.hashicorp.com/terraform/language/functions/tobool
- HCL native syntax specification - https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md

## Issues Found
- Corrected the string literal dollar example. Terraform only needs escaping for literal interpolation sequences such as `$${`; a plain `$` in `"$100"` is already literal.
- Corrected the number representation explanation. Terraform numbers are arbitrary precision values, not internally 64-bit floating point values, though providers may convert them to narrower implementation types.
- Corrected the HCL scientific notation example. HCL numeric literals support exponent notation, so `1e6` is valid.
- Corrected equality comparison examples. Terraform equality operators do not perform automatic type conversion, so `"5" == 5` is false.
- Clarified the string-as-bool gotcha to avoid implying Terraform treats non-empty strings as truthy. Terraform conditionals require a bool condition.
- Clarified the `default = null` comment to say it defaults to `null`, rather than saying there is no default value.

## Review Notes
The AWS resource snippets are illustrative and omit surrounding provider setup and some resource dependencies. The Terraform language examples are now aligned with current Terraform and HCL documentation.
