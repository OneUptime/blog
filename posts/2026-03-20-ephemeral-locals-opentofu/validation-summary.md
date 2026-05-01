# Validation Summary: How to Use Ephemeral Locals in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL (OpenTofu configuration language)
- Ephemeral values, variables, resources, outputs, and locals
- AWS provider examples and AWS Secrets Manager

## Sources Consulted
- OpenTofu Docs: Local Values — https://opentofu.org/docs/language/values/locals/
- OpenTofu Docs: Ephemerality — https://opentofu.org/docs/language/ephemerality/
- OpenTofu Docs: Input Variables — https://opentofu.org/docs/language/values/variables/
- OpenTofu Docs: Output Values — https://opentofu.org/docs/language/values/outputs/
- OpenTofu Docs: Ephemeral resources — https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu Docs: What's new in OpenTofu 1.11? — https://opentofu.org/docs/intro/whats-new/
- OpenTofu Docs: `jsondecode` Function — https://opentofu.org/docs/language/functions/jsondecode/

## Issues Found

1. **State-only persistence wording was incomplete.** The post said ephemeral locals were not stored in state, but the official docs specify ephemeral values are not stored in either state or plan data. Updated the description, introduction, and conclusion to reflect both state and plan.

2. **The propagation example referenced undeclared credential variables while labeling them as ephemeral.** `aws_access_key_id` and `aws_secret_access_key` were used as if they were ephemeral inputs, but only `aws_session_token` was declared. Added explicit ephemeral, sensitive variable declarations so the example matches the explanation.

3. **The provider example depended on an unrelated provider-specific auth block instead of a documented OpenTofu ephemerality pattern.** Replaced it with an AWS provider configuration example that uses an ephemeral local for `access_key` and `secret_key`, matching the official ephemerality documentation’s provider usage pattern.

4. **The practical example used an unverified ephemeral resource type.** Replaced `ephemeral "aws_temporary_credentials"` with the documented `ephemeral "aws_secretsmanager_secret_version"` pattern and used `jsondecode(...)` on `secret_string`, which matches the official OpenTofu ephemerality example.

5. **The limitations section was too narrow about outputs and allowed contexts.** Updated it to distinguish root module outputs from child-module ephemeral outputs and to include other supported ephemeral contexts such as write-only attributes, other locals, and ephemeral variables.

## Review Notes
- Root module outputs cannot be marked `ephemeral`; only child module outputs can use `ephemeral = true`.
- Root module ephemeral variables require careful handling when values are passed with `-var` or `-var-file`; the OpenTofu docs call this out explicitly.
- The practical example assumes the Secrets Manager `secret_string` contains JSON in the expected shape for `jsondecode(...)`.
- Ephemeral resource support is provider-specific. The OpenTofu language supports the `ephemeral` block from v1.11 onward, but individual resource types depend on provider support.
