# Validation Summary: How to Install Terraform on Windows Step by Step

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Terraform CLI
- Windows PowerShell
- Chocolatey
- Windows Package Manager (winget)
- Windows PATH environment variable
- Windows Subsystem for Linux (WSL)
- Ubuntu apt package management
- HCL

## Sources Consulted
- HashiCorp Terraform install documentation: https://developer.hashicorp.com/terraform/install
- HashiCorp Terraform CLI install tutorial: https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli
- HashiCorp Terraform version command reference: https://developer.hashicorp.com/terraform/cli/commands/version
- HashiCorp Terraform CLI commands and shell tab-completion documentation: https://developer.hashicorp.com/terraform/cli/commands
- HashiCorp Terraform releases index: https://releases.hashicorp.com/terraform/
- Microsoft winget install command documentation: https://learn.microsoft.com/en-us/windows/package-manager/winget/install
- Microsoft winget overview documentation: https://learn.microsoft.com/en-us/windows/package-manager/winget/
- Microsoft winget upgrade command documentation: https://github.com/microsoft/winget-cli/blob/master/doc/windows/package-manager/winget/upgrade.md
- Chocolatey Terraform package page: https://community.chocolatey.org/packages/Terraform

## Issues Found
- The post tagged the topic as "Window" instead of "Windows"; updated the tag to the correct platform name.
- The manual download example described downloading the latest Terraform zip but used Terraform 1.7.5. HashiCorp's install page listed Terraform 1.15.4 as the latest stable release on 2026-05-22, so the download URL and sample `terraform -version` output were updated to 1.15.4.
- The winget examples used `HashiCorp.Terraform`. The package identifier used by the Windows Package Manager community manifest is `Hashicorp.Terraform`, so the install and upgrade examples were updated to use `--id Hashicorp.Terraform --exact`.
- The PowerShell tab completion snippet was not a documented Terraform completion setup and would not produce correct Terraform argument completions. Replaced it with Terraform's documented `terraform -install-autocomplete` command and clarified that built-in completion supports bash and zsh, which applies to Git Bash or WSL on Windows.
- The WSL apt repository command was older than the current HashiCorp Linux install command. Updated it to include the architecture selector and the current Ubuntu codename lookup used in HashiCorp's official documentation.

## Review Notes
The Chocolatey commands are technically valid, but HashiCorp notes that it does not maintain the Chocolatey Terraform package. The post's package-manager guidance is otherwise accurate for a Windows installation guide.
