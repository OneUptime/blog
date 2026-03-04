# How to Set Up Terraform with VS Code and Extensions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, VS Code, IDE, Extensions, Development, DevOps, Productivity

Description: Set up Visual Studio Code for Terraform development with syntax highlighting, auto-formatting, IntelliSense, and helpful extensions for a productive workflow.

---

Visual Studio Code is one of the best editors for Terraform development. With the right extensions, you get syntax highlighting, auto-completion, inline documentation, code formatting, and even error detection - all without leaving the editor. This guide walks through setting up VS Code for a productive Terraform development experience.

## Installing VS Code

If you do not have VS Code installed yet:

```bash
# macOS (via Homebrew)
brew install --cask visual-studio-code

# Windows (via winget)
winget install Microsoft.VisualStudioCode

# Linux (Debian/Ubuntu)
sudo apt-get install code

# Linux (RHEL/CentOS) - download from https://code.visualstudio.com
```

## The Essential Extension: HashiCorp Terraform

The most important extension is the official one from HashiCorp. It provides:

- Syntax highlighting for `.tf` and `.tfvars` files
- IntelliSense with auto-completion for resources, data sources, and attributes
- Go-to-definition for variables, modules, and resources
- Hover documentation showing attribute types and descriptions
- Code formatting with `terraform fmt` integration
- Validation and error highlighting

### Installing the Extension

1. Open VS Code
2. Press `Cmd+Shift+X` (macOS) or `Ctrl+Shift+X` (Windows/Linux) to open the Extensions panel
3. Search for "HashiCorp Terraform"
4. Click Install

Or install from the command line:

```bash
# Install the HashiCorp Terraform extension via CLI
code --install-extension hashicorp.terraform
```

### Configuring the Extension

Open VS Code settings (`Cmd+,` or `Ctrl+,`) and search for "terraform". Here are the key settings:

```json
{
  // Enable the Terraform language server
  "terraform.languageServer.enable": true,

  // Format on save using terraform fmt
  "editor.formatOnSave": true,
  "[terraform]": {
    "editor.defaultFormatter": "hashicorp.terraform",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },
  "[terraform-vars]": {
    "editor.defaultFormatter": "hashicorp.terraform",
    "editor.formatOnSave": true,
    "editor.tabSize": 2
  },

  // Enable validation on save
  "terraform.validation.enableEnhancedValidation": true
}
```

The `formatOnSave` setting is particularly useful. Every time you save a `.tf` file, it automatically runs `terraform fmt` to ensure consistent formatting.

### Setting the Terraform Path

If the extension cannot find your Terraform binary, set the path explicitly:

```json
{
  "terraform.languageServer.path": "/usr/local/bin/terraform-ls"
}
```

The extension uses `terraform-ls` (Terraform Language Server), which it usually manages automatically. But if you need to specify a custom path, this setting is available.

## Recommended Additional Extensions

### 1. Terraform Autocomplete (erd0s.terraform-autocomplete)

This extension provides resource and attribute auto-completion based on the AWS, Azure, and GCP providers. While the official HashiCorp extension has gotten better at this, this one can fill in some gaps:

```bash
code --install-extension erd0s.terraform-autocomplete
```

### 2. HCL (hashicorp.hcl)

For editing other HashiCorp configuration files (Packer, Vault, Consul) that use HCL:

```bash
code --install-extension hashicorp.hcl
```

### 3. Bracket Pair Colorizer (Built into VS Code)

VS Code now has built-in bracket pair colorization. Enable it for Terraform files to make nested blocks easier to read:

```json
{
  "editor.bracketPairColorization.enabled": true,
  "editor.guides.bracketPairs": true
}
```

### 4. YAML (redhat.vscode-yaml)

Many Terraform workflows involve YAML files (CI/CD pipelines, Kubernetes manifests). The Red Hat YAML extension provides validation and auto-completion:

```bash
code --install-extension redhat.vscode-yaml
```

### 5. GitLens (eamodio.gitlens)

For tracking changes to your Terraform configurations in Git:

```bash
code --install-extension eamodio.gitlens
```

### 6. Error Lens (usernamehw.errorlens)

Shows errors and warnings inline, right next to the problematic code. Helpful for catching Terraform syntax errors immediately:

```bash
code --install-extension usernamehw.errorlens
```

## Configuring the Integrated Terminal

VS Code's integrated terminal is where you will run Terraform commands. Configure it for a smooth experience:

```json
{
  // Use your preferred shell
  "terminal.integrated.defaultProfile.osx": "zsh",
  "terminal.integrated.defaultProfile.linux": "bash",

  // Increase scrollback for long terraform plan output
  "terminal.integrated.scrollback": 10000,

  // Set environment variables for the terminal
  "terminal.integrated.env.osx": {
    "TF_PLUGIN_CACHE_DIR": "${env:HOME}/.terraform.d/plugin-cache"
  }
}
```

## Setting Up Keyboard Shortcuts

Create custom keyboard shortcuts for common Terraform operations. Open keyboard shortcuts (`Cmd+K Cmd+S`) and add:

```json
[
  {
    "key": "ctrl+shift+t i",
    "command": "workbench.action.terminal.sendSequence",
    "args": { "text": "terraform init\n" }
  },
  {
    "key": "ctrl+shift+t p",
    "command": "workbench.action.terminal.sendSequence",
    "args": { "text": "terraform plan\n" }
  },
  {
    "key": "ctrl+shift+t a",
    "command": "workbench.action.terminal.sendSequence",
    "args": { "text": "terraform apply\n" }
  },
  {
    "key": "ctrl+shift+t v",
    "command": "workbench.action.terminal.sendSequence",
    "args": { "text": "terraform validate\n" }
  }
]
```

## Using VS Code Tasks for Terraform

Create a `.vscode/tasks.json` file in your project for reusable Terraform tasks:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Terraform Init",
      "type": "shell",
      "command": "terraform init",
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Terraform Plan",
      "type": "shell",
      "command": "terraform plan",
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Terraform Apply",
      "type": "shell",
      "command": "terraform apply",
      "group": "build",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Terraform Validate",
      "type": "shell",
      "command": "terraform validate",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    },
    {
      "label": "Terraform Format Check",
      "type": "shell",
      "command": "terraform fmt -check -recursive",
      "group": "test",
      "presentation": {
        "reveal": "always",
        "panel": "shared"
      }
    }
  ]
}
```

Run tasks with `Cmd+Shift+P` (or `Ctrl+Shift+P`) and typing "Run Task".

## Code Snippets for Terraform

Create custom snippets to speed up writing common patterns. Go to Preferences > Configure User Snippets > Terraform:

```json
{
  "Terraform Resource": {
    "prefix": "resource",
    "body": [
      "resource \"${1:type}\" \"${2:name}\" {",
      "  ${3}",
      "}"
    ],
    "description": "Create a Terraform resource block"
  },
  "Terraform Variable": {
    "prefix": "variable",
    "body": [
      "variable \"${1:name}\" {",
      "  type        = ${2:string}",
      "  description = \"${3:Description}\"",
      "  default     = \"${4}\"",
      "}"
    ],
    "description": "Create a Terraform variable block"
  },
  "Terraform Output": {
    "prefix": "output",
    "body": [
      "output \"${1:name}\" {",
      "  value       = ${2}",
      "  description = \"${3:Description}\"",
      "}"
    ],
    "description": "Create a Terraform output block"
  },
  "Terraform Data Source": {
    "prefix": "data",
    "body": [
      "data \"${1:type}\" \"${2:name}\" {",
      "  ${3}",
      "}"
    ],
    "description": "Create a Terraform data source block"
  },
  "Terraform Module": {
    "prefix": "module",
    "body": [
      "module \"${1:name}\" {",
      "  source = \"${2:source}\"",
      "  ${3}",
      "}"
    ],
    "description": "Create a Terraform module block"
  }
}
```

## Workspace Settings for Teams

For team projects, create a `.vscode/settings.json` in your repository so everyone uses the same editor settings:

```json
{
  "editor.formatOnSave": true,
  "[terraform]": {
    "editor.defaultFormatter": "hashicorp.terraform",
    "editor.tabSize": 2
  },
  "[terraform-vars]": {
    "editor.defaultFormatter": "hashicorp.terraform",
    "editor.tabSize": 2
  },
  "files.associations": {
    "*.tf": "terraform",
    "*.tfvars": "terraform-vars",
    "*.tfstate": "json"
  },
  "files.exclude": {
    "**/.terraform": true,
    "**/.terraform.lock.hcl": false
  }
}
```

Commit this file to your repository so the whole team benefits.

## Troubleshooting

### Language Server Not Starting

If the Terraform extension's language server is not working:

```bash
# Check if terraform-ls is installed
which terraform-ls

# The extension usually manages this, but you can install it manually
brew install hashicorp/tap/terraform-ls
```

### Slow IntelliSense on Large Projects

For very large Terraform configurations, the language server might be slow. You can limit its scope:

```json
{
  "terraform.languageServer.indexing.ignorePaths": [
    "modules/legacy/**"
  ]
}
```

### Extension Conflicts

If you have multiple Terraform-related extensions, they might conflict. Keep only the official HashiCorp Terraform extension active and disable older alternatives like `mauve.terraform` or `4ops.terraform`.

## Conclusion

A well-configured VS Code setup makes Terraform development significantly more productive. The official HashiCorp extension handles the heavy lifting with syntax highlighting, IntelliSense, and formatting. Adding a few complementary extensions and custom settings gives you an IDE-like experience for infrastructure code. The time you invest in setting this up pays back quickly in faster development cycles and fewer syntax errors.
