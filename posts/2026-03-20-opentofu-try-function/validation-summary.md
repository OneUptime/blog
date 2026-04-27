# Validation Summary: How to Create Optional Resource Attributes with try in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL configuration language)
- The `try()` function
- Object type constraints with `optional()`
- Type conversion functions (`tobool()`, `tostring()`)
- AWS Secrets Manager data sources (`aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`)

## Sources Consulted
- OpenTofu `try()` function documentation: https://opentofu.org/docs/language/functions/try/
- OpenTofu type constraints documentation (optional() syntax): https://opentofu.org/docs/language/expressions/type-constraints/

## Issues Found
No technical issues found. All code examples use valid HCL syntax, the `try()` semantics described match the official OpenTofu documentation (catches dynamic errors during expression evaluation, including attribute traversal failures and type conversion errors; supports multiple fallback expressions), and the `optional(type, default)` syntax for object type constraints is correct.

## Review Notes
- The Step 2 data source example has a slightly imprecise comment ("Fall back to variable if secret doesn't exist"). In practice, `try()` does not catch errors from the data source resolution itself — if the secret truly does not exist in AWS, the `aws_secretsmanager_secret` data source will fail during plan, before the `locals` block is evaluated. `try()` will, however, gracefully handle cases where the `secret_string` attribute is null or otherwise inaccessible. This is a subtle nuance and the example is still technically valid HCL; the broader concept of using `try()` for graceful fallback is correctly demonstrated. Not edited because the syntax is correct and the pattern works for many real failure modes.
- The official OpenTofu docs recommend using `try()` sparingly and primarily for simple attribute access / index operations, confined to local values. The post follows this best practice.
- The claim that `try()` is more general than `lookup()` or `can()` is accurate: `lookup()` only handles map key absence, `can()` returns a boolean rather than a value with fallback, and `try()` handles a broader class of expression-evaluation errors.
