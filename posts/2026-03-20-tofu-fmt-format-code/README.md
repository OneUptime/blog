# How to Use tofu fmt to Format Code - Tofu Format Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use tofu fmt to automatically format OpenTofu configuration files to the canonical style, ensuring consistent code formatting across your team.

## Introduction

`tofu fmt` applies the OpenTofu canonical formatting style to your configuration files. Consistent formatting improves readability, reduces diff noise in code reviews, and is enforced as a best practice. This guide covers formatting commands, CI enforcement, and editor integration.

## Basic Usage

```bash
# Format supported OpenTofu native-syntax files in the current directory

tofu fmt

# Output: lists files that were reformatted
# main.tf
# variables.tf

# If nothing needs formatting, no output is shown
tofu fmt  # Silent = already formatted
```

## What tofu fmt Does

The formatter:
- Aligns `=` signs in consecutive single-line attribute assignments
- Adjusts indentation to 2 spaces
- Normalizes spacing around arguments and nested structures
- Normalizes trailing spaces

```hcl
# Before formatting:
resource "aws_instance" "web" {
ami = "ami-0c55b159cbfafe1f0"
    instance_type = "t3.micro"
  tags = {
      Name = "web"
    Environment="prod"
  }
}

# After tofu fmt:
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  tags = {
    Name        = "web"
    Environment = "prod"
  }
}
```

## Recursive Formatting

```bash
# Format supported OpenTofu native-syntax files in subdirectories
tofu fmt -recursive

# Useful for formatting a project with modules
tofu fmt -recursive ./
```

## Check Mode (Don't Modify)

```bash
# Check if formatting is needed without modifying files
tofu fmt -check

# Exit code 0: all files properly formatted
# Exit code 3: files need formatting

# Useful in CI to fail on unformatted code
if ! tofu fmt -check -recursive; then
  echo "Files need formatting. Run: tofu fmt -recursive"
  exit 1
fi
```

## View Diff Without Modifying

```bash
# Show what would change without modifying files
tofu fmt -diff -write=false

# Output:
# main.tf
# --- old/main.tf
# +++ new/main.tf
# @@ -1,5 +1,5 @@
#  resource "aws_instance" "web" {
# -    ami = "ami-0c55b159cbfafe1f0"
# +  ami           = "ami-0c55b159cbfafe1f0"
```

## Combining Flags

```bash
# Check recursively and show diff for any unformatted files
tofu fmt -check -diff -recursive
```

## CI/CD Integration

### GitHub Actions

```yaml
jobs:
  format-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Check Formatting
        run: |
          if ! tofu fmt -check -recursive; then
            echo "::error::OpenTofu files are not formatted. Run 'tofu fmt -recursive' locally."
            exit 1
          fi
```

### Pre-commit Hook

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.92.0
    hooks:
      - id: terraform_fmt
        args: [--hook-config=--tf-path=tofu, --args=-recursive]
```

## Editor Integration

### VS Code (OpenTofu Extension)

Install the "OpenTofu" extension and enable format on save:

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

### Vim / Neovim

```vim
" Add to .vimrc
autocmd BufWritePost *.tf silent exec "!tofu fmt %"
```

### IntelliJ IDEA

The Terraform and HCL plugin can invoke `terraform fmt` or `tofu fmt` when reformatting code. Enable Reformat code on save in the IDE if you want save-time formatting.

## Formatting JSON Files

```bash
# tofu fmt ignores JSON-format configs when scanning directories
tofu fmt

# Format JSON configs with a JSON formatter instead
python3 -m json.tool config.tf.json > config.tf.json.tmp
mv config.tf.json.tmp config.tf.json

# Validate JSON-format configs are well-formed
python3 -m json.tool config.tf.json > /dev/null
```

## What tofu fmt Does NOT Format

- Comment text
- Template content inside strings or heredocs
- Variable values (it formats structure, not content)
- JSON-format OpenTofu files (for example, `.tf.json`, `.tofu.json`, `.tfvars.json`, `.tftest.json`)
- JSON values within strings

## Conclusion

`tofu fmt` is essential for maintaining consistent, readable OpenTofu code. Integrate it as a pre-commit hook and CI check to enforce formatting across your team. The formatter is opinionated by design - don't fight it. Just run `tofu fmt -recursive` before every commit and let the tool handle the style details while you focus on the infrastructure logic.
