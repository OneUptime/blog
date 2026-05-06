# Validation Summary: How to Calculate CIDR Blocks with cidrsubnet in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- CIDR addressing
- AWS VPC subnet configuration

## Sources Consulted
- OpenTofu `cidrsubnet` function docs: https://opentofu.org/docs/language/functions/cidrsubnet/
- OpenTofu `cidrhost` function docs: https://opentofu.org/docs/language/functions/cidrhost/
- OpenTofu `console` command docs: https://opentofu.org/docs/cli/commands/console/
- OpenTofu `count` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu language documentation example: https://opentofu.org/docs/language/
- RFC 4632, CIDR notation reference cited by OpenTofu: https://www.rfc-editor.org/rfc/rfc4632

## Issues Found
- The `cidrhost("10.0.1.0/24", 1)` example was labeled as getting "the gateway address." OpenTofu only calculates a host IP inside the prefix and does not determine gateway semantics, so this was corrected to "the first usable host address" for technical precision.

## Review Notes
- The `cidrsubnet` syntax, explanation of `newbits` and `netnum`, and all subnet math examples are consistent with current OpenTofu documentation.
- The `count.index` subnet example matches OpenTofu's documented `count` behavior and the AWS/VPC subnetting pattern shown in the language docs.
- The local workspace did not have the `tofu` CLI installed, so command output was validated against the current official OpenTofu documentation rather than executed locally.
