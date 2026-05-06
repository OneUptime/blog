# Validation Summary: How to Use the -chdir Global Option in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Infrastructure as Code (IaC)
- GitHub Actions
- Bash

## Sources Consulted
- OpenTofu CLI docs: Basic CLI Features, https://opentofu.org/docs/cli/commands/
- OpenTofu CLI docs: Command: init, https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI docs: Command: apply, https://opentofu.org/docs/cli/commands/apply/
- OpenTofu language docs: Backend Configuration, https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu language docs: References to Named Values, https://opentofu.org/docs/language/expressions/references/
- OpenTofu language docs: `file` Function, https://opentofu.org/docs/language/functions/file/
- OpenTofu language docs: Module Sources, https://opentofu.org/docs/language/modules/sources/

## Issues Found
- The path-resolution section was too broad. I updated it to reflect that `-chdir` changes the root module directory for the command, `path.cwd` still points to the original launch directory, and the `file()` example should use `path.module` for an accurate, documented file reference pattern.

## Review Notes
- The workspace did not have the `tofu` CLI installed, so command behavior was verified against the official OpenTofu documentation rather than local `tofu -help` output.
