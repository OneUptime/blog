# Validation Summary: How to Set Up OpenTofu Autocompletion in Bash - Autocompletion

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- OpenTofu (CLI)
- Bash shell
- bash-completion package
- `complete` builtin

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu plan command reference: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu test command reference: https://opentofu.org/docs/cli/commands/test/
- OpenTofu source for top-level command registration: https://github.com/opentofu/opentofu/blob/main/cmd/tofu/commands.go

## Issues Found
- The "Expected output" example for `tofu <TAB>` was missing four valid top-level commands (`fmt`, `get`, `graph`, `metadata`) while the rest of the listed commands were correct. Updated the example output to include all visible top-level commands so the demonstration matches what bash autocompletion actually returns. No other technical errors were found:
  - `tofu -install-autocomplete` is a real flag that writes a `complete -C <path-to-tofu> tofu` line into `~/.bashrc`.
  - `complete -C /usr/local/bin/tofu tofu` is the correct invocation form for the posener/complete-style completion that OpenTofu (inherited from Terraform) uses.
  - The `tofu plan` flag list (`-compact-warnings`, `-detailed-exitcode`, `-input`, `-json`, `-lock`, `-lock-timeout`, `-no-color`, `-out`, `-parallelism`, `-refresh`, `-refresh-only`, `-replace`, `-state`, `-target`, `-var`, `-var-file`) is consistent with the official `tofu plan` reference.
  - Troubleshooting commands (`sudo apt install bash-completion`, `complete -p tofu`) are accurate.

## Review Notes
- The plan-flag example does not enumerate every flag exposed by `tofu plan` (it omits newer/less common options such as `-exclude`, `-target-file`, `-generate-config-out`, `-consolidate-warnings`, `-show-sensitive`, etc.). This is an illustrative subset and not technically wrong, so it was left as-is.
- The system-wide install snippet (`sudo bash -c '... > /etc/bash_completion.d/tofu'`) is functional but largely duplicates what `tofu -install-autocomplete` does for the current user; readers should know that the per-user install is the documented path and the `/etc/bash_completion.d` approach is a manual alternative rather than an "official" mechanism.
- Workspace-name completion shown in the "Verify with Examples" section depends on a workspace selector being implemented in the OpenTofu autocomplete handler; the example is a reasonable expectation but real-world output depends on the version of OpenTofu installed.
- The example assumes `tofu` is installed at `/usr/local/bin/tofu`. Users on Homebrew (Apple Silicon) or distro packages may have it elsewhere; the post correctly tells readers to verify with `which tofu`.
