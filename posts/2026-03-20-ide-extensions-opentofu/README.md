# How to Configure IDE Extensions for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, IDE, VS Code, JetBrains, Developer Experience

Description: Learn how to configure IDE extensions and plugins for OpenTofu development in VS Code, JetBrains IDEs, Neovim, and other editors to get syntax highlighting, auto-completion, and inline validation.

## Introduction

IDE extensions for OpenTofu provide syntax highlighting, auto-completion, inline error detection, and formatting integration. Since OpenTofu uses the same HCL syntax as Terraform, many Terraform extensions also work for OpenTofu, though some editors need file associations for `.tofu` files or a custom `tofu` binary path. This guide covers setup for the most common development environments.

## VS Code Setup

```json
// .vscode/extensions.json - recommend to team
{
  "recommendations": [
    "hashicorp.terraform",
    "editorconfig.editorconfig",
    "ms-azuretools.vscode-docker",
    "redhat.vscode-yaml",
    "github.vscode-github-actions"
  ]
}
```

Install the HashiCorp Terraform extension (works with OpenTofu):

```bash
code --install-extension hashicorp.terraform
```

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.rulers": [120],
  "[terraform]": {
    "editor.defaultFormatter": "hashicorp.terraform",
    "editor.formatOnSave": true
  },
  "[terraform-vars]": {
    "editor.defaultFormatter": "hashicorp.terraform",
    "editor.formatOnSave": true
  },
  "files.associations": {
    "*.tofu": "terraform"
  },
  "terraform.experimentalFeatures.prefillRequiredFields": true,
  "terraform.experimentalFeatures.validateOnSave": true
}
```

## Configuring the Language Server for OpenTofu

The HashiCorp extension bundles `terraform-ls` by default. In your user settings, keep the language server pointed at `terraform-ls` and set its CLI path to the OpenTofu binary:

```json
// User settings.json
{
  "terraform.languageServer.enable": true,
  // Optional: override the bundled language server with your own binary
  "terraform.languageServer.path": "/usr/local/bin/terraform-ls",
  "terraform.languageServer.args": ["serve"],
  // Use OpenTofu for fmt, validate, and other CLI-backed features
  "terraform.languageServer.terraform.path": "/usr/local/bin/tofu"
}
```

For editors that do not bundle it, install `terraform-ls` separately:

```bash
# macOS

brew install hashicorp/tap/terraform-ls

# Linux
wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(grep -oP '(?<=UBUNTU_CODENAME=).*' /etc/os-release || lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform-ls
```

## JetBrains IDEs (IntelliJ, GoLand, PyCharm)

Install the HashiCorp Terraform/HCL plugin:

1. Settings → Plugins → Marketplace → Search "HashiCorp Terraform and HCL"
2. Install and restart

Configure the plugin to use OpenTofu:

```text
Settings → Tools → Terraform Tools
  → OpenTofu executable path: /usr/local/bin/tofu
  → Click Detect and Test if needed
```

```text
Settings → Editor → Code Style → Terraform/OpenTofu → Other
  → Invoke 'terraform/tofu fmt' for formatting
```

## Neovim Setup (LSP)

```lua
-- ~/.config/nvim/lua/lsp.lua
-- Install terraform-ls first: brew install hashicorp/tap/terraform-ls

vim.lsp.config('terraformls', {
  cmd = { "terraform-ls", "serve" },
  filetypes = { "terraform", "terraform-vars" },
  root_markers = { ".terraform", ".git" },
  init_options = {
    terraform = {
      path = "/usr/local/bin/tofu"
    }
  }
})

vim.lsp.enable('terraformls')

-- Format on save
vim.api.nvim_create_autocmd("BufWritePre", {
  pattern = { "*.tf", "*.tfvars" },
  callback = function()
    vim.lsp.buf.format({ async = false })
  end,
})
```

```lua
-- Install treesitter parser for syntax highlighting
-- In your treesitter config:
require('nvim-treesitter.configs').setup({
  ensure_installed = { "hcl", "terraform" },
  highlight = { enable = true }
})
```

## Vim Setup

```vim
" ~/.vimrc or ~/.vim/plugs.vim

" Using vim-plug:
Plug 'hashivim/vim-terraform'

" Configuration
let g:terraform_fmt_on_save = 1
let g:terraform_binary_path = '/usr/local/bin/tofu'
```

## Emacs Setup

```elisp
;; .emacs or init.el
;; Install terraform-mode from MELPA

(use-package terraform-mode
  :hook (terraform-mode . terraform-format-on-save-mode)
  :custom
  (terraform-command "tofu"))

;; LSP with terraform-ls
(use-package lsp-mode
  :hook (terraform-mode . lsp-deferred))
```

## Workspace Recommendations File

Commit this to share extension recommendations with your team:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "hashicorp.terraform",
    "editorconfig.editorconfig",
    "redhat.vscode-yaml",
    "timonwong.shellcheck",
    "ms-python.python",
    "github.vscode-pull-request-github",
    "eamodio.gitlens"
  ],
  "unwantedRecommendations": [
    "4ops.terraform"
  ]
}
```

## Conclusion

The HashiCorp Terraform extension for VS Code and the JetBrains Terraform plugin both work with OpenTofu, but the `tofu` and `terraform-ls` binary paths are machine-specific settings rather than workspace settings. The `terraform-ls` language server provides the most features - auto-completion, go-to-definition, hover documentation, and inline validation - across editors that support LSP. Commit `.vscode/extensions.json` and workspace-safe `.vscode/settings.json` preferences to share team defaults, and keep local binary paths in user settings.
