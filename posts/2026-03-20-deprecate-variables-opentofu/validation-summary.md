# Validation Summary: How to Deprecate Variables in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu module development
- AWS EC2 examples
- AWS Secrets Manager examples

## Sources Consulted
- OpenTofu v1.9 input variables documentation: https://opentofu.org/docs/v1.9/language/values/variables/
- OpenTofu v1.10 input variables documentation: https://opentofu.org/docs/v1.10/language/values/variables/
- OpenTofu v1.10 “What’s new” documentation: https://opentofu.org/docs/v1.10/intro/whats-new/
- OpenTofu module refactoring documentation: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu type constraints documentation: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu 1.11.0-beta1 announcement: https://opentofu.org/blog/help-us-test-opentofu-1-11-0-beta1/
- OpenTofu plan command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The post said the `deprecated` attribute was added in OpenTofu 1.9. The official v1.9 variable docs do not include `deprecated`; OpenTofu 1.10 introduces deprecation support as experimental, and the official 1.11.0-beta1 announcement says it became stable in 1.11. I updated the introduction and the minimum version example to match the documented version history.
- The warning example showed a different warning shape than the official docs. Deprecated module variable warnings are documented at the module caller site with the summary `Variable marked as deprecated by the module author`, not as a warning on the variable declaration itself. I updated the warning example to match the documented behavior.
- The backward-compatibility example used a fully populated default for `server`, which meant `var.server.instance_type` was always set and the deprecated `instance_type` variable would never be used as a fallback. I changed the replacement object to use optional attributes so the fallback logic works as described.
- The deprecated `database_password` variable was still required because it had no default value. I added `default = null` so callers can migrate to `database_secret_arn` without having to set both inputs.

## Review Notes
- The post is technically relevant and contains executable-style configuration examples, so it was reviewed as a code-focused guide.
- The examples now align with OpenTofu deprecation support in 1.10+; the stable path is OpenTofu 1.11+.
- The local review environment did not have the `tofu` CLI installed, so command and warning verification was done against official OpenTofu documentation rather than local CLI execution.
