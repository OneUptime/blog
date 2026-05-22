# Validation Summary: How to Set Up Terraform with VS Code and Extensions

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Terraform CLI
- Terraform Language Server (`terraform-ls`)
- HashiCorp Terraform VS Code extension
- Visual Studio Code settings, tasks, snippets, keyboard shortcuts, and integrated terminal
- VS Code extensions for HCL, YAML, GitLens, Error Lens, and Terraform autocomplete

## Sources Consulted
- HashiCorp Terraform VS Code extension repository and extension manifest: https://github.com/hashicorp/vscode-terraform
- HashiCorp Terraform VS Code extension Marketplace page: https://marketplace.visualstudio.com/items?itemName=hashicorp.terraform
- HashiCorp Terraform CLI formatting and validation docs: https://developer.hashicorp.com/terraform/cli/code
- `terraform fmt` command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- `terraform validate` command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- Terraform CLI configuration and plugin cache docs: https://developer.hashicorp.com/terraform/cli/config/config-file
- Visual Studio Code Linux installation docs: https://code.visualstudio.com/docs/setup/linux
- Visual Studio Code command-line extension installation docs: https://code.visualstudio.com/docs/configure/command-line
- Visual Studio Code tasks schema docs: https://code.visualstudio.com/docs/reference/tasks-appendix
- Visual Studio Code user snippets docs: https://code.visualstudio.com/docs/editing/userdefinedsnippets
- Visual Studio Marketplace pages for referenced extensions: https://marketplace.visualstudio.com/

## Issues Found
- The Linux installation snippet implied `sudo apt-get install code` works directly on Debian/Ubuntu. Updated it to show installing the downloaded official `.deb` package, and clarified that `apt install code` works after configuring Microsoft's apt repository.
- The "Setting the Terraform Path" section used `terraform.languageServer.path`, which points to the `terraform-ls` language server binary, while the surrounding text said it was for the Terraform CLI binary. Updated the heading and text, and added the correct `terraform.languageServer.terraform.path` setting for the Terraform CLI binary.
- The settings comment said `terraform.validation.enableEnhancedValidation` enables validation on save. Updated the comment to say "enhanced validation" because the extension validates Terraform files on open/change, while validate-on-save is a separate experimental setting.
- The integrated terminal example set `TF_PLUGIN_CACHE_DIR` without noting that the cache directory must already exist. Added a short note to create `~/.terraform.d/plugin-cache` first.

## Review Notes
The remaining VS Code settings, extension IDs, task definitions, keyboard shortcut command usage, snippets, and Terraform CLI commands are technically valid. Terraform CLI was not installed in the local environment, so command behavior was verified against HashiCorp documentation rather than local `terraform --help` output.
