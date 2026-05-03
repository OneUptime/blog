# Validation Summary: How to Use Custom Validation with Condition and Error Message in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (input variables, validation blocks, preconditions)
- HCL (HashiCorp Configuration Language)
- Built-in functions: `can()`, `regex()`, `contains()`, `length()`
- Heredoc string templates (`<<-EOT`)

## Sources Consulted
- [OpenTofu Custom Conditions documentation](https://opentofu.org/docs/language/expressions/custom-conditions/)
- [OpenTofu Input Variables documentation](https://opentofu.org/docs/language/values/variables/)
- [What's new in OpenTofu 1.9](https://opentofu.org/docs/v1.9/intro/whats-new/)
- [OpenTofu issue #1336 - Allow Variable Validation Conditions to Refer to Other Variables](https://github.com/opentofu/opentofu/issues/1336)
- [OpenTofu CHANGELOG](https://github.com/opentofu/opentofu/blob/main/CHANGELOG.md)

## Issues Found

1. **Incorrect claim about cross-variable references in OpenTofu 1.9.** The original post stated: "As of OpenTofu 1.9, validation conditions can only reference `var.<name>` (the variable being validated), not other variables." This is the opposite of reality — OpenTofu 1.9's release notes explicitly call out that "References to variables, data, etc. are now usable in variable validation." Cross-variable references in validation blocks were *added* in 1.9, not prohibited. Updated the section to reflect this, kept the `precondition` example as an equivalent alternative, and added a `validation`-block example showing the now-supported in-variable cross-reference.

2. **Error message punctuation list incomplete.** The post stated the `error_message` "Must be a non-empty string ending with a period or exclamation mark." OpenTofu's documented recommendation accepts period, exclamation mark, **or question mark**, and the rule is a recommendation rather than a hard requirement. Reworded the comment to "Should be a non-empty string; OpenTofu recommends full sentences ending with a period, exclamation mark, or question mark."

## Review Notes

- All HCL syntax in code examples (validation blocks, regex patterns, `contains()` usage, heredoc, multiple validation blocks per variable, `sensitive = true`) is valid for current OpenTofu versions.
- The advice about not echoing `sensitive` variable values in `error_message` is correct and aligns with OpenTofu's behavior of redacting sensitive values from plan output.
- The regex pattern `^[a-z]+-[a-z]+-[0-9]+$` for AWS region format is a reasonable example pattern (it would match `us-east-1`, `eu-west-2`, etc.).
- Multiple `validation` blocks per variable (used in the `database_password` example) is supported and evaluated independently — accurate.
