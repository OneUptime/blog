# Validation Summary: How to Iterate Over Modules with for_each in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu modules
- `for_each`
- OpenTofu provider configurations
- AWS provider aliases

## Sources Consulted
- OpenTofu module syntax: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu references to child module outputs: https://opentofu.org/docs/v1.9/language/expressions/references/
- OpenTofu module `providers` meta-argument: https://opentofu.org/docs/language/meta-arguments/module-providers/
- OpenTofu provider configuration and provider-instance `for_each`: https://opentofu.org/docs/language/providers/configuration/

## Issues Found
- The multi-region example referenced `aws.regional[each.key]` in the module `providers` map without defining the corresponding multi-instance provider configuration. I added the missing `provider "aws"` block with `alias = "regional"` and `for_each = var.regional_configs` so the example matches OpenTofu's documented pattern for passing different provider instances to different module instances.

## Review Notes
- The rest of the post is technically correct for current OpenTofu documentation: module blocks support `for_each`, module instances created with `for_each` are addressed by key, and child-module outputs from a `for_each` module call are exposed as a map of objects.
- The multi-region pattern depends on keeping provider instances available long enough to destroy removed module instances, which is a documented OpenTofu caveat for provider-instance `for_each`.
