# Validation Summary: How to Configure IDE Extensions for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Terraform VS Code extension
- `terraform-ls`
- Visual Studio Code
- JetBrains IDEs
- Neovim LSP
- Vim
- Emacs

## Sources Consulted
- OpenTofu docs: https://opentofu.org/docs/language/files/
- OpenTofu 1.8 release notes (`.tofu` extension): https://opentofu.org/blog/opentofu-1-8-0/
- OpenTofu 1.9 release notes (JetBrains/OpenTofu support context): https://opentofu.org/blog/opentofu-1-9-0/
- HashiCorp Terraform VS Code extension marketplace page: https://marketplace.visualstudio.com/items?itemName=HashiCorp.terraform
- HashiCorp Terraform VS Code extension source and README: https://github.com/hashicorp/vscode-terraform
- HashiCorp Terraform VS Code extension `package.json` settings definitions: https://raw.githubusercontent.com/hashicorp/vscode-terraform/main/package.json
- Terraform Language Server installation docs: https://raw.githubusercontent.com/hashicorp/terraform-ls/main/docs/installation.md
- Terraform Language Server settings docs: https://raw.githubusercontent.com/hashicorp/terraform-ls/main/docs/SETTINGS.md
- VS Code configuration scopes: https://code.visualstudio.com/api/references/contribution-points#contributes.configuration
- VS Code CLI docs: https://code.visualstudio.com/docs/editor/command-line
- JetBrains Terraform/OpenTofu docs: https://www.jetbrains.com/help/idea/terraform.html
- `nvim-lspconfig` quickstart and `terraformls` config: https://github.com/neovim/nvim-lspconfig and https://raw.githubusercontent.com/neovim/nvim-lspconfig/master/lsp/terraformls.lua
- `nvim-treesitter` parser list: https://raw.githubusercontent.com/nvim-treesitter/nvim-treesitter/master/lockfile.json
- `vim-terraform` help: https://raw.githubusercontent.com/hashivim/vim-terraform/master/doc/terraform.txt
- `terraform-mode` README and source: https://raw.githubusercontent.com/hcl-emacs/terraform-mode/master/README.md and https://raw.githubusercontent.com/hcl-emacs/terraform-mode/master/terraform-mode.el
- `lsp-mode` Terraform client: https://raw.githubusercontent.com/emacs-lsp/lsp-mode/master/clients/lsp-terraform.el
- Syntastic README and checker docs: https://raw.githubusercontent.com/scrooloose/syntastic/master/README.markdown and https://raw.githubusercontent.com/scrooloose/syntastic/master/doc/syntastic-checkers.txt

## Issues Found
- The VS Code workspace settings snippet incorrectly set `terraform.languageServer.path` to the `tofu` binary. I moved language-server binary configuration into user settings and kept the OpenTofu CLI override on `terraform.languageServer.terraform.path`, which matches the extension's documented settings.
- The VS Code post treated machine-scoped settings as shareable workspace settings. I corrected the text and conclusion to distinguish workspace-safe settings from machine-specific user settings.
- The VS Code snippet associated `*.tfvars` with the wrong language ID and used an undocumented `hcl` association. I replaced that with a targeted `*.tofu` association, which is the relevant OpenTofu-specific adjustment.
- The post said VS Code users should install `terraform-ls` separately for the best experience. I corrected this because the HashiCorp VS Code extension bundles `terraform-ls`; separate installation is only needed for editors that do not bundle it.
- The Linux `terraform-ls` installation commands were incomplete and wrote the GPG output with an unsafe shell redirection. I replaced them with the current HashiCorp packaging steps that add the repository and run `apt update` before installation.
- The JetBrains instructions pointed to the wrong settings page and referenced options not documented there. I replaced them with the current `Tools | Terraform Tools` OpenTofu executable setting and the documented formatting setting under `Editor | Code Style | Terraform/OpenTofu | Other`.
- The JetBrains `.editorconfig` keys were not documented in the official JetBrains Terraform/OpenTofu docs. I removed that block and replaced it with the documented IDE setting path instead of leaving unsupported property names in the post.
- The Neovim example used the deprecated `require('lspconfig').terraformls.setup(...)` pattern and passed Terraform CLI settings through `settings`, which `terraform-ls` does not use for configuration changes. I updated it to the current `vim.lsp.config` / `vim.lsp.enable` flow and passed the OpenTofu path through `init_options`.
- The Neovim example also registered the `hcl` filetype for `terraform-ls`, which does not match the upstream `terraformls` config. I removed that extra filetype.
- The Vim example enabled `g:terraform_align`, which depends on Tabularize even though the post did not install Tabularize. I removed that hidden dependency.
- The Vim example configured Syntastic for Terraform/TFLint, but Syntastic's published checker docs do not list a Terraform checker. I removed the Syntastic-specific lines rather than leave a non-documented integration.
- The Emacs example used `terraform-binary-path`, which is not the current `terraform-mode` customization variable. I replaced it with `terraform-command`, which is what `terraform-mode` uses when invoking `fmt` and related commands.
- The Emacs example manually registered a Terraform LSP client even though `lsp-mode` already provides a `terraform-ls` client. I simplified the snippet to the supported hook-based configuration.

## Review Notes
- The updated Neovim snippet uses the current `nvim-lspconfig` / Neovim 0.11+ API. Older Neovim setups may still use the legacy `require('lspconfig')` pattern, but that path is now deprecated upstream.
- OpenTofu supports both `.tf` and `.tofu` files. Editor support for `.tofu` remains uneven, so the post now explicitly notes that some editors need file associations or binary-path overrides.
