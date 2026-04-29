# Validation Summary: How to Use the keys and values Functions in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu built-in functions
- OpenTofu `for_each`, `count`, and `for` expressions
- AWS provider examples

## Sources Consulted
- OpenTofu `keys` function docs: https://opentofu.org/docs/language/functions/keys/
- OpenTofu `values` function docs: https://opentofu.org/docs/language/functions/values/
- OpenTofu `for` expressions docs: https://opentofu.org/docs/language/expressions/for/
- OpenTofu references to named values docs: https://opentofu.org/docs/v1.11/language/expressions/references/
- OpenTofu `for_each` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu `setsubtract` function docs: https://opentofu.org/docs/v1.8/language/functions/setsubtract/
- GitHub author profile link check: https://github.com/nawazdhandala

## Issues Found
- The post described key ordering as `alphabetical`. OpenTofu documentation defines the ordering as `lexicographical`, which is more precise. I updated the intro, environment-name example comment, and summary to use the documented term.

## Review Notes
The function behavior described in the post matches the current OpenTofu documentation. In particular, the `values(aws_instance.app)[*].id` pattern for `for_each` resources is explicitly documented, and `for` expressions over maps/objects are documented as using lexical key ordering when producing ordered results.
