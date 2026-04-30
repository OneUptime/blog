# How to Format Your OpenTofu Code with tofu fmt

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu fmt, Code Quality, HCL, Infrastructure as Code, DevOps

Description: A guide to using tofu fmt to automatically format OpenTofu configurations to the standard style.

## Introduction

`tofu fmt` automatically formats OpenTofu configuration files to follow the canonical style conventions. This ensures consistent formatting across your team and makes code reviews easier. It handles indentation, spacing, and alignment automatically.

## Basic Usage

```bash
# Format OpenTofu configuration files in the current directory

tofu fmt

# Format and show what was changed
tofu fmt -diff

# Check if files are formatted (exit non-zero if not)
tofu fmt -check

# Format recursively (all subdirectories)
tofu fmt -recursive

# Format a specific file
tofu fmt main.tf
```

## Before and After Formatting

### Before (unformatted):
```hcl
resource "aws_instance" "web" {
ami = "ami-0c55b159cbfafe1f0"
  instance_type="t2.micro"
  tags={
    Name="web-server"
    Environment    =    "dev"
  }
}
```

### After (`tofu fmt`):
```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t2.micro"
  tags = {
    Name        = "web-server"
    Environment = "dev"
  }
}
```

Notice that `tofu fmt`:
- Normalizes indentation (2 spaces)
- Aligns equals signs in consecutive assignments
- Adds/removes spaces consistently

## What tofu fmt Does

```hcl
# Before: Inconsistent spacing
variable "env"{
  type=string
  default ="dev"
  description="The environment name"
}

# After: Canonical formatting
variable "env" {
  type        = string
  default     = "dev"
  description = "The environment name"
}
```

## Common Flags

```bash
# -check: exit code 1 if files need formatting (for CI)
tofu fmt -check
echo $?  # 0 = formatted, 1 = needs formatting

# -diff: show the diff of changes to be made
tofu fmt -diff

# -list=false: don't list files that were changed
tofu fmt -list=false

# -recursive: format all configuration files in subdirectories
tofu fmt -recursive .

# -write=false: don't write changes (just show what would change)
tofu fmt -write=false -diff
```

## Setting Up in Pre-commit Hooks

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check if any configuration files need formatting
UNFORMATTED=$(tofu fmt -check -list -recursive)
if [ -n "$UNFORMATTED" ]; then
  echo "The following files need formatting:"
  echo "$UNFORMATTED"
  echo ""
  echo "Please run: tofu fmt -recursive"
  exit 1
fi

echo "Formatting check passed!"
```

```bash
chmod +x .git/hooks/pre-commit
```

## Using pre-commit Framework

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.105.0
    hooks:
      - id: terraform_fmt
        args:
          - --hook-config=--tf-path=tofu
          - --args=-recursive
```

```bash
# Install pre-commit
pip install pre-commit

# Install the hooks
pre-commit install
```

## CI/CD Integration

```yaml
# .github/workflows/terraform.yml
name: Validate

on: [push, pull_request]

jobs:
  format-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_version: "1.11.6"

      - name: Check formatting
        run: |
          tofu fmt -check -recursive
          echo "All files are properly formatted!"
```

## Editor Integration

### VS Code

Install the OpenTofu extension which runs `tofu fmt` on save:

```json
// .vscode/settings.json
{
  "[opentofu][opentofu-vars]": {
    "editor.defaultFormatter": "opentofu.vscode-opentofu",
    "editor.formatOnSave": true,
    "editor.formatOnSaveMode": "file"
  }
}
```

### Neovim with null-ls

```lua
-- In your null-ls configuration
local null_ls = require("null-ls")
null_ls.setup({
  sources = {
    null_ls.builtins.formatting.terraform_fmt.with({
      command = "tofu",
    }),
  }
})
```

## Makefile Integration

```makefile
# Makefile
.PHONY: fmt fmt-check

fmt:
	tofu fmt -recursive

fmt-check:
	@tofu fmt -check -recursive || (echo "Run 'make fmt' to fix formatting" && exit 1)
```

## Conclusion

`tofu fmt` is a simple but powerful tool that enforces consistent formatting across your OpenTofu codebase. Running it as a pre-commit hook or CI check ensures all code follows the canonical style. This reduces formatting-related code review comments and makes the codebase more readable for everyone on the team.
