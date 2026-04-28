# Validation Summary: How to Use tofu init to Initialize a Project

## Status
validated

## Post Type
Tutorial / CLI reference guide

## Technologies Covered
- OpenTofu (`tofu init` command)
- Terraform-compatible CLI configuration (`.tofurc`, `provider_installation` block)
- Backend configuration (S3-style example)
- Environment variables: `TF_CLI_CONFIG_FILE`, `TF_PLUGIN_CACHE_DIR`
- Bash / shell scripting (CI/CD usage)

## Sources Consulted
- OpenTofu `tofu init` command reference: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI config file documentation: https://opentofu.org/docs/cli/config/config-file/
- ShellCheck SC1143 (backslash line continuation with comments): https://www.shellcheck.net/wiki/SC1143

## Issues Found
1. **CI/CD bash example had broken line continuation.** The original snippet used an inline comment after a backslash:
   ```bash
   tofu init \
     -input=false \         # Non-interactive
     -backend-config="key=${ENVIRONMENT}/terraform.tfstate"
   ```
   In bash, a backslash followed by whitespace and a `#` comment does **not** continue the line — the `\` escapes the space, the `#` starts a comment that consumes the rest of the line including the newline, and the next line is then parsed as a separate command (ShellCheck SC1143). I moved the explanatory comment up to the leading description line and removed the inline comment so the multi-line command parses correctly.

## Review Notes
- All `tofu init` flags referenced in the post (`-upgrade`, `-backend-config`, `-reconfigure`, `-migrate-state`, `-backend=false`, `-input=false`) are valid against the official OpenTofu CLI reference.
- The `provider_installation { filesystem_mirror { path = ... } }` block syntax is correct.
- `TF_CLI_CONFIG_FILE` is the correct environment variable for overriding the CLI config file location in OpenTofu (it preserves the `TF_` prefix for Terraform compatibility).
- `TF_PLUGIN_CACHE_DIR` and the conventional `~/.terraform.d/plugin-cache` path are still valid in OpenTofu.
- The `.terraform/` directory and `.terraform.lock.hcl` file names match what OpenTofu actually creates.
- The claim that `tofu init` is "always safe" and "will not modify your infrastructure" is accurate — `init` only touches the local working directory and (with `-migrate-state`) state file location, never infrastructure.
- Minor stylistic note (not changed): the description of `tofu init` as "idempotent" is slightly imprecise — `-upgrade` mutates the lock file and `-migrate-state` moves state — but for the basic invocation discussed in the intro, the claim is reasonable.
