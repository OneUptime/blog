# Validation Summary: How to Build Terraform Type Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL) type constraints
- Terraform primitive types (string, number, bool)
- Terraform collection types (list, set, map)
- Terraform structural types (object, tuple)
- Terraform `optional()` for object attributes (Terraform 1.3+)
- Terraform variable `validation` blocks
- Terraform `any` type
- Terraform built-in functions: `contains`, `length`, `can`, `regex`, `cidrhost`
- AWS EKS (used as a practical module example)
- AWS S3 bucket naming rules (used as a validation example)

## Sources Consulted
- Terraform Type Constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform Input Variables documentation: https://developer.hashicorp.com/terraform/language/values/variables
- Terraform Custom Variable Validation: https://developer.hashicorp.com/terraform/language/values/variables#custom-validation-rules
- Terraform `optional()` object type attributes documentation (GA in Terraform 1.3): https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Terraform CHANGELOG for v1.3 (optional attribute GA): https://github.com/hashicorp/terraform/blob/main/CHANGELOG.md
- Terraform `cidrhost`, `regex`, `can`, `contains` function docs: https://developer.hashicorp.com/terraform/language/functions
- AWS S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html

## Issues Found

1. **S3 bucket name validation regex did not match its error message.**
   - The original regex `\\.\\.|-\\.` catches `..` (consecutive periods) and `-.` (hyphen-period), but the error message stated "consecutive periods or period-hyphen" — `period-hyphen` would be `.-`, which the regex did not catch.
   - Fixed by expanding the regex to `\\.\\.|-\\.|\\.-` so it catches all three problematic adjacencies, and updating the error message to read "consecutive periods, hyphen-period, or period-hyphen" so the message and regex agree.

2. **Misleading claim about string-to-number coercion in the "Debugging Type Errors" section.**
   - The original text claimed: `Strings like "3" will not work where a number is expected.` In practice, Terraform automatically converts numeric strings to numbers (per its primitive type conversion rules), so `"3"` does work where a number is expected. The error case is actually non-numeric strings.
   - Fixed the line to: `Terraform automatically converts numeric strings (like "3") to numbers, but non-numeric strings (like "three") will fail.`

## Review Notes
- All Terraform syntax (variable blocks, type constraints, validation blocks, `optional()` attributes, `cidrhost`, `regex`, `can`, `contains`) is correct.
- The statement that `optional()` for object attributes is supported in "Terraform 1.3+" is accurate (it was promoted from experimental to GA in Terraform 1.3.0, August 2022).
- The EKS example uses `version = optional(string, "1.28")` as a default. By mid-2026 EKS 1.28 will be out of standard support; however, this is just a sample default in a configuration example and not a factual claim about Terraform behavior, so it was left as-is. Readers using this in production should pick a currently supported EKS version.
- The Mermaid hierarchy diagram showing `any` at the top with primitives, collections, and structural types beneath is a reasonable mental model. In strict Terraform terminology, `any` is a placeholder for "type to be inferred" rather than a true supertype, but as a teaching aid the diagram is acceptable.
- The "Conditional Required Fields" validation pattern (Pattern 3) correctly uses an `optional(string)` (no default) so the attribute is `null` when not supplied, allowing the `!= null` check in the validation condition to work as intended.
- The bucket-name validation example uses reasonable rules; note that AWS S3's documented hard rule is "two adjacent periods", while adjacency of dots and hyphens is more of a best practice. The example is still pedagogically useful for showing multiple `validation` blocks.
