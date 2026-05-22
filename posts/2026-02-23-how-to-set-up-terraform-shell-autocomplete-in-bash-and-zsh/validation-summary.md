# Validation Summary: How to Set Up Terraform Shell Autocomplete in Bash and Zsh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Bash programmable completion
- Zsh completion system and bashcompinit
- Oh My Zsh Terraform plugin
- Fish shell completions

## Sources Consulted
- Terraform CLI overview, Shell Tab-completion: https://developer.hashicorp.com/terraform/cli/commands
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform source code, CLI autocomplete configuration: https://github.com/hashicorp/terraform
- posener/complete source code used by Terraform autocomplete installation: https://github.com/posener/complete
- GNU Bash manual, Programmable Completion: https://www.gnu.org/s/bash/manual/html_node/Programmable-Completion.html
- GNU Bash manual, Programmable Completion Builtins: https://www.gnu.org/software/bash/manual/html_node/Programmable-Completion-Builtins.html
- Zsh manual, Completion System and bashcompinit: https://zsh.sourceforge.io/Doc/Release/Completion-System.html
- Oh My Zsh Terraform plugin source and README: https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/terraform

## Issues Found
- The post incorrectly stated that Terraform's Bash autocomplete relies on the separate `bash-completion` package. Terraform uses Bash's built-in programmable completion through `complete -C`, so the package installation instructions were replaced with a check for Bash and the `complete` builtin.
- The post said Terraform writes Bash configuration to `~/.bashrc` without qualifying macOS. Terraform's installer uses `~/.bash_profile` for Bash on macOS, so the quick-start and manual Bash instructions now distinguish Linux and macOS profile files.
- The Zsh manual examples omitted the `-o nospace` option used by Terraform's generated Zsh completion hook. The Zsh snippets now include `complete -o nospace -C ...`.
- The top-level command and flag examples were written as fixed lists, which can become inaccurate as Terraform versions add commands and options. They now say the output depends on the Terraform version and present examples rather than exhaustive lists.
- The Fish shell section claimed Terraform does not natively support Fish completions. Terraform's current official documentation focuses on Bash and Zsh, so the wording now avoids that overstatement and points Fish users to community-maintained completions.

## Review Notes
Terraform's official CLI documentation says shell tab-completion supports Bash and Zsh and completes all command names plus some command arguments. The exact command and flag suggestions vary by Terraform version, so future edits should avoid presenting completion output as exhaustive.
