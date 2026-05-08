# Validation Summary: How to Write Assertions in Check Blocks in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- Infrastructure as Code
- OpenTofu check blocks and assertions

## Sources Consulted
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `can` function documentation: https://opentofu.org/docs/language/functions/can/
- OpenTofu `try` function documentation: https://opentofu.org/docs/language/functions/try/
- OpenTofu `regex` function documentation: https://opentofu.org/docs/language/functions/regex/
- OpenTofu `contains` function documentation: https://opentofu.org/docs/language/functions/contains/
- OpenTofu Strings and Templates documentation: https://opentofu.org/docs/language/expressions/strings/

## Issues Found
- The conclusion recommended using `can()` for optional attributes as a blanket rule. OpenTofu documents that `can()` is primarily intended for simple validation tests and generally recommends `try()` for error handling elsewhere. Updated the sentence to recommend `try()` or `can()` for safe optional attribute checks, matching the examples in the post and the official guidance.

## Review Notes
- The check block structure, use of `condition` and `error_message`, membership checks with `contains`, regex checks with `can(regex(...))`, safe access with `try`, and the claim that multiple failed assertions are reported are consistent with the official OpenTofu documentation.
- The `tofu` CLI was not installed in the workspace, so examples were reviewed against official documentation rather than executed locally.
