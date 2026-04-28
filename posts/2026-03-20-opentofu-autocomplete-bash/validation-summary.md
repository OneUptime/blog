# Validation Summary: How to Set Up OpenTofu Autocompletion in Bash

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- OpenTofu CLI (`tofu`)
- Bash shell
- bash-completion package (v2)
- Linux package managers (apt-get, dnf)
- Homebrew (macOS)

## Sources Consulted
- OpenTofu CLI commands documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu state command documentation: https://opentofu.org/docs/cli/commands/state/
- Bash builtin `complete` documentation (GNU Bash manual)
- bash-completion project (https://github.com/scop/bash-completion)
- posener/complete library (used by Terraform/OpenTofu for shell completion)

## Issues Found
No technical issues found.

The post's technical claims were verified:
- `tofu -install-autocomplete` flag exists and works as described (inherited from the posener/complete library used by Terraform/OpenTofu).
- The `complete -C <binary> <command>` Bash syntax is correct — it instructs Bash to invoke the command itself for completion (the command reads `COMP_LINE` and `COMP_POINT` env vars).
- The list of `tofu state` subcommands (list, mv, pull, push, replace-provider, rm, show) matches the official documentation exactly.
- Package names for installing bash-completion (`bash-completion` on apt/dnf, `bash-completion@2` on Homebrew) are correct. The Homebrew `@2` formula is the appropriate choice given the Bash 4.0+ prerequisite.
- `type _init_completion` is a valid check for bash-completion v2 being loaded.
- The `tofu apply` flags shown (-auto-approve, -backup, -compact-warnings, -input, -lock) are all real OpenTofu apply flags.
- The `.bash_profile` vs `.bashrc` distinction (login vs non-login interactive shells) is correctly explained as a generalization for macOS vs Linux defaults.

## Review Notes
- The example output for `tofu <TAB><TAB>` shows a representative subset of subcommands but omits some that exist in current OpenTofu (e.g., `force-unlock`, `get`, `login`, `logout`, `metadata`, `test`). This is presented as illustrative example output, so it isn't technically incorrect, but the actual completion output on a current OpenTofu install will include additional commands.
- The `source /etc/bash_completion.d/tofu` line works because the file contains a `complete` directive, but in general practice, opening a new shell or sourcing `~/.bashrc` is the more conventional way to pick up new completion definitions.
- The post does not mention `tofu -uninstall-autocomplete`, which is the official counterpart to `-install-autocomplete` and would be a cleaner alternative to the manual `sed` removal shown. Not an error, but a future improvement.
