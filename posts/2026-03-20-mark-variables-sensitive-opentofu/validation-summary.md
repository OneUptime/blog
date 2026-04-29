# Validation Summary: How to Mark Variables as Sensitive in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu CLI (`tofu plan`, `tofu apply`, `tofu output`, `tofu show`, `tofu state show`)
- Sensitive variables and outputs
- Remote state handling

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Output Values: https://opentofu.org/docs/language/values/outputs/
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu CLI `output`: https://opentofu.org/docs/cli/commands/output/
- OpenTofu CLI `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `show`: https://opentofu.org/docs/cli/commands/show/
- OpenTofu CLI `state show`: https://opentofu.org/docs/cli/commands/state/show/

## Issues Found
- The post claimed that `sensitive = true` redacts values from "all output" and keeps them out of plan files. I corrected the description, intro, inline HCL comment, and summary to clarify that sensitivity affects normal CLI output, while saved plan files and commands such as `tofu output -raw`, `tofu output -json`, `tofu show -json`, and `-show-sensitive` can still reveal values.
- The state section said sensitive values may be stored as "base64 or plain text depending on backend." I corrected this to match the docs: local state is plain-text JSON, remote-state encryption depends on the backend, and saved plan files can contain cleartext sensitive values.
- The `tofu output db_connection_string` example showed `(sensitive value)`. I changed it to the documented CLI format `db_connection_string = <sensitive>`.

## Review Notes
- OpenTofu's `ephemeral` feature can prevent certain values from being stored in state or saved plans at all, but that is outside this post's current scope.
- The `tofu` CLI was not installed in the workspace, so command behavior was validated against the current official OpenTofu documentation rather than local `--help` output.
