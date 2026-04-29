# Validation Summary: How to Use the lookup Function in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider examples

## Sources Consulted
- OpenTofu `lookup` function documentation: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu configuration syntax documentation: https://opentofu.org/docs/language/syntax/configuration/
- OpenTofu types and values documentation: https://opentofu.org/docs/language/expressions/types/

## Issues Found
- The post said the `default` argument is required in the latest versions. I changed this to reflect the current OpenTofu documentation: the argument is still optional for historical reasons, but omitting it is deprecated.
- The `lookup vs Direct Map Access` example used bare assignments at the top level of the file. I moved those expressions into a `locals` block so the example matches valid OpenTofu configuration syntax.

## Review Notes
The remaining `lookup()` examples are consistent with current OpenTofu documentation. Some AWS snippets are illustrative fragments and assume surrounding provider or data source configuration exists elsewhere in the module.
