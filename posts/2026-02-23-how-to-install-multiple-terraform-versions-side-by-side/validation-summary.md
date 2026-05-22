# Validation Summary: How to Install Multiple Terraform Versions Side by Side

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Terraform CLI
- Terraform version constraints and state compatibility
- tfenv
- tfswitch
- asdf
- Docker
- Bash shell scripting

## Sources Consulted
- HashiCorp Developer: Install Terraform CLI - https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli
- HashiCorp Developer: Manage Terraform versions - https://developer.hashicorp.com/terraform/tutorials/configuration-language/versions
- HashiCorp Releases: Terraform versions - https://releases.hashicorp.com/terraform/
- tfenv README - https://github.com/tfutils/tfenv
- TFSwitch installation documentation - https://tfswitch.warrensbox.com/Installation/
- TFSwitch usage documentation - https://tfswitch.warrensbox.com/usage/general/
- asdf command reference - https://asdf-vm.com/manage/commands.html
- asdf version management documentation - https://asdf-vm.com/manage/versions.html
- asdf plugin shortname repository - https://github.com/asdf-vm/asdf-plugins
- HashiCorp Terraform Docker image - https://hub.docker.com/r/hashicorp/terraform/

## Issues Found
- The manual switcher script used `cat > /usr/local/bin/tfswitch-manual`, which normally fails for non-root users because shell redirection happens before `sudo` can be applied. Changed it to `sudo tee /usr/local/bin/tfswitch-manual > /dev/null <<'SCRIPT'` so the command works as written.
- The tfswitch Linux install command used the `release` branch URL. The current tfswitch installation documentation shows the `master` branch URL, so the command was updated to match the documented installer path.
- The asdf examples used legacy `asdf global` and `asdf local` commands. Current asdf documentation uses `asdf set -u` for the home-level default and `asdf set` for the current project. Updated those commands while preserving the same behavior.

## Review Notes
- The Terraform state version discussion is consistent with HashiCorp's documentation: Terraform records the CLI version in state and can reject older Terraform versions when they cannot read the state format.
- The specific Terraform versions used in the examples, including 1.5.7, 1.6.6, and 1.7.5, are present on the HashiCorp releases site.
- Docker examples are correct for the official `hashicorp/terraform` image, but real projects often need additional environment variables or mounted credential files for provider authentication.
