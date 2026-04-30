# Validation Summary: How to Format Your OpenTofu Code with tofu fmt

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI (`tofu fmt`)
- HCL / OpenTofu configuration files
- Git hooks and pre-commit
- `antonbabenko/pre-commit-terraform`
- GitHub Actions
- VS Code
- Neovim `null-ls`

## Sources Consulted
- OpenTofu `fmt` command docs: https://opentofu.org/docs/v1.9/cli/commands/fmt/
- OpenTofu style conventions: https://opentofu.org/docs/v1.8/language/syntax/style/
- OpenTofu files and directories docs: https://opentofu.org/docs/language/files/
- OpenTofu VS Code extension: https://github.com/opentofu/vscode-opentofu
- `opentofu/setup-opentofu` action docs: https://github.com/opentofu/setup-opentofu
- OpenTofu releases: https://github.com/opentofu/opentofu/releases
- `pre-commit-terraform` docs: https://github.com/antonbabenko/pre-commit-terraform
- `none-ls.nvim` `terraform_fmt` source: https://raw.githubusercontent.com/nvimtools/none-ls.nvim/main/lua/null-ls/builtins/formatting/terraform_fmt.lua
- `null-ls.nvim` archive notice: https://github.com/jose-elias-alvarez/null-ls.nvim/issues/1621

## Issues Found
- The post described `tofu fmt` as formatting `.tf` files only. I updated that wording to "OpenTofu configuration files" / "configuration files" because official OpenTofu docs describe `fmt` as operating on configuration files, and OpenTofu supports both `.tf` and `.tofu` source files.
- The `pre-commit-terraform` example did not explicitly force the `tofu` binary. I added `--hook-config=--tf-path=tofu` because the hook checks `terraform` before `tofu` when both are installed, which could otherwise run `terraform fmt` instead of `tofu fmt`.
- The `pre-commit-terraform` revision pin was stale (`v1.88.0`). I updated it to `v1.105.0`, which is the latest tag available as of April 30, 2026.
- The GitHub Actions example used `opentofu/setup-opentofu@v1` and pinned OpenTofu `1.9.0`. I updated it to `opentofu/setup-opentofu@v2` and OpenTofu `1.11.6`, matching current published tags and releases as of April 30, 2026.
- The VS Code snippet targeted the HashiCorp Terraform formatter (`hashicorp.terraform`) and `[terraform]` language scope. I updated it to the official OpenTofu VS Code extension (`opentofu.vscode-opentofu`) and OpenTofu language scopes (`[opentofu][opentofu-vars]`), which is the documented way to run `tofu fmt` on save.
- The Neovim `null-ls` snippet used `terraform_fmt` without overriding its command. I updated it to `terraform_fmt.with({ command = "tofu" })` because the upstream builtin invokes the `terraform` binary by default.

## Review Notes
- The `tofu fmt` flags used in the post (`-check`, `-diff`, `-list=false`, `-write=false`, `-recursive`) match the OpenTofu CLI documentation.
- `null-ls.nvim` is archived upstream. The corrected snippet is still workable, but a future revision of the post may want to prefer a currently maintained Neovim formatter integration.
