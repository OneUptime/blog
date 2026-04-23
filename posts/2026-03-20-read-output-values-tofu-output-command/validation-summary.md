# Validation Summary: How to Read Output Values with tofu output Command

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu output values
- Bash
- `jq`
- `kubectl`
- OpenSSH `ssh`

## Sources Consulted
- OpenTofu command reference: https://opentofu.org/docs/cli/commands/output/
- OpenTofu output values reference: https://opentofu.org/docs/language/values/outputs/
- OpenTofu v1.11.0 command implementation: https://github.com/opentofu/opentofu/blob/v1.11.0/internal/command/output.go
- OpenTofu v1.11.0 output rendering implementation: https://github.com/opentofu/opentofu/blob/v1.11.0/internal/command/views/output.go
- OpenTofu v1.11.0 output rendering tests: https://github.com/opentofu/opentofu/blob/v1.11.0/internal/command/views/output_test.go
- OpenTofu v1.11.0 release artifacts: https://github.com/opentofu/opentofu/releases/tag/v1.11.0
- OpenSSH manual page for `ssh`: https://man.openbsd.org/cgi-bin/man.cgi/OpenBSD-current/man1/ssh.1
- Local verification against the OpenTofu v1.11.0 release binary using a minimal state with sensitive outputs

## Issues Found
- The post showed sensitive values in `tofu output` list output as `(sensitive value)`. For `tofu output` with no named output, current OpenTofu redacts them as `<sensitive>`. I corrected the example output to match actual CLI behavior.
- The post stated that `tofu output <sensitive_name>` shows a redacted value by default. In OpenTofu v1.11.0, reading a named sensitive output returns the actual value. I updated the sensitive-output section to reflect that and added the correct `-show-sensitive` example for listing all outputs with secrets visible.
- The `-json` example incorrectly implied that sensitive values are hidden in JSON output and used an inaccurate object type/value representation. I replaced it with a technically accurate example that shows the real value plus the correct `type` metadata shape.
- The raw-output guidance was slightly too broad. `-raw` only works for values OpenTofu can convert to strings, namely strings, numbers, and booleans. I tightened the wording in the relevant sections.
- The shell example used `ssh ubuntu@$IP -i ~/.ssh/id_rsa`, but OpenSSH expects options before the destination. I corrected it to `ssh -i ~/.ssh/id_rsa ubuntu@$IP`.

## Review Notes
- The post is technically sound after the corrections above.
- Verified behavior directly with the OpenTofu v1.11.0 release binary because the public docs page and current source/tests differ on named sensitive output behavior; the edited post reflects the observed CLI behavior.
