# Validation Summary: How to Set Up OpenTofu Autocompletion in Zsh

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu CLI (`tofu`)
- Zsh shell
- bashcompinit / Zsh completion system
- Oh My Zsh (custom plugins)
- Powerlevel10k prompt theme

## Sources Consulted
- OpenTofu CLI commands documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu apply command documentation: https://opentofu.org/docs/cli/commands/apply/
- Oh My Zsh terraform plugin: https://github.com/ohmyzsh/ohmyzsh/tree/master/plugins/terraform
- Powerlevel10k repository: https://github.com/romkatv/powerlevel10k

## Issues Found
1. **Incorrect `apply` short description.** The post showed `apply -- Build or change infrastructure`, which is the older Terraform wording. OpenTofu's current short description is "Create or update infrastructure". Updated the comment in the example completion output to match.
2. **Inaccurate claim about the Oh My Zsh `terraform` plugin.** The post stated the terraform plugin "also works for OpenTofu". That plugin only provides completion and aliases for the `terraform` binary; it does not complete `tofu`. Rewrote the intro to Method 3 to clarify that users need a custom plugin for OpenTofu, and removed the misleading `plugins=(... terraform)` snippet that suggested adding the terraform plugin would enable tofu completion.
3. **Incorrect Powerlevel10k segment description.** The post said the `terraform` p10k segment "shows OpenTofu version when in a tofu directory". The `terraform` segment actually displays the current workspace; version information comes from the separate `terraform_version` segment. Corrected the comments to reflect both segments and what each one shows.

## Review Notes
- `tofu -install-autocomplete` is documented in the OpenTofu CLI docs and adds bash-style completion to both `~/.bashrc` and `~/.zshrc` (with `bashcompinit`). Method 1 is accurate.
- The manual setup using `autoload -U +X bashcompinit && bashcompinit` followed by `complete -o nospace -C $(which tofu) tofu` is the same pattern OpenTofu/Terraform use internally; verified.
- The Powerlevel10k terraform/terraform_version segments work for OpenTofu when the `tofu` binary is on PATH (recent p10k versions detect both terraform and tofu); no change needed beyond fixing the description.
- The `taint` and `untaint` commands listed in the completion sample remain available in OpenTofu but are deprecated in favor of `tofu apply -replace=...`. Not changed since the post is about completion output, not recommendations on usage.
