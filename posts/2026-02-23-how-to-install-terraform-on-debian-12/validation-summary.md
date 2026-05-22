# Validation Summary: How to Install Terraform on Debian 12

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Terraform CLI
- Debian 12 Bookworm
- HashiCorp APT repository
- APT package management
- Linux shell commands
- Terraform CLI configuration and plugin cache

## Sources Consulted
- HashiCorp Developer: Install Terraform - https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli
- HashiCorp Developer: Terraform CLI overview and autocomplete - https://developer.hashicorp.com/terraform/cli/commands
- HashiCorp Developer: terraform version command - https://developer.hashicorp.com/terraform/cli/commands/version
- HashiCorp Developer: Terraform CLI environment variables - https://developer.hashicorp.com/terraform/cli/config/environment-variables
- HashiCorp Developer: Terraform CLI configuration file - https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Releases: Terraform versions - https://releases.hashicorp.com/terraform/
- HashiCorp Releases: Terraform 1.15.2 binaries - https://releases.hashicorp.com/terraform/1.15.2/

## Issues Found
- The prerequisites and APT setup used `wget` and `lsb_release` but only installed `curl` and `gnupg`. Updated the prerequisites and install command to include `wget` and `lsb-release`.
- The GPG key installation command used `sudo gpg --dearmor -o ...`, which can prompt or fail when overwriting an existing keyring. Updated it to the official pipeline using `gpg --dearmor | sudo tee ... > /dev/null`, including the troubleshooting command.
- The HashiCorp APT source entry omitted the architecture filter used in the current official documentation. Added `arch=$(dpkg --print-architecture)` to the repository examples.
- The expected Terraform output and manual installation examples referenced older Terraform versions. Updated them to Terraform v1.15.x / 1.15.2 based on the current HashiCorp documentation and release listing.
- The manual installation flow included an ARM64 download example but later hard-coded the AMD64 archive name for extraction, cleanup, and manual updates. Updated the examples to use a `TERRAFORM_ARCH` variable consistently.
- The autocomplete instructions did not ensure the shell profile file existed before running `terraform -install-autocomplete`. Added `touch ~/.bashrc` and `touch ~/.zshrc`, matching HashiCorp's current guidance.

## Review Notes
None.
