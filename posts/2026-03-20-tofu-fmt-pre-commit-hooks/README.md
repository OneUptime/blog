# How to Use tofu fmt in Pre-Commit Hooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Tofu fmt, Pre-Commit, Code Formatting, Developer Experience

Description: Learn how to configure tofu fmt in pre-commit hooks to automatically format OpenTofu configurations before commits, ensuring consistent code style across your team.

## Introduction

`tofu fmt` formats OpenTofu configuration files according to the canonical style conventions - consistent indentation, spacing, and alignment. Running it as a pre-commit hook ensures every commit has properly formatted code, eliminating formatting-related diff noise in pull requests.

## tofu fmt Basics

```bash
# Format supported OpenTofu files in the current directory
# (.tf, .tofu, .tfvars, .tftest.hcl, .tofutest.hcl)

tofu fmt

# Format recursively across all subdirectories
tofu fmt -recursive

# Check formatting without modifying files (for CI)
tofu fmt -check
tofu fmt -check -recursive

# Show what would change without modifying files (dry run with diff)
tofu fmt -diff -write=false
tofu fmt -diff -write=false -recursive

# Check exit code: 0 = formatted, non-zero = formatting needed or error
tofu fmt -check; echo "Exit code: $?"
```

## What tofu fmt Does

```hcl
# BEFORE formatting:
resource "aws_instance" "web" {
ami="ami-12345"
instance_type     =   "t3.medium"
  tags = {
Name = "web"
    Environment="prod"
  }
}

# AFTER tofu fmt:
resource "aws_instance" "web" {
  ami           = "ami-12345"
  instance_type = "t3.medium"
  tags = {
    Name        = "web"
    Environment = "prod"
  }
}
```

## Pre-commit Hook Setup

```bash
# Install pre-commit
pip install pre-commit
# or: brew install pre-commit
```

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.105.0
    hooks:
      - id: terraform_fmt
        name: OpenTofu fmt
        # Use tofu instead of terraform, even if both binaries are installed
        args:
          - --hook-config=--tf-path=tofu
          - --args=-recursive
```

Or use a custom hook:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: tofu-fmt
        name: OpenTofu Format Check
        language: unsupported
        entry: tofu fmt
        args: [-recursive, -check]
        files: \.(tf|tofu|tfvars|tftest\.hcl|tofutest\.hcl)$
        pass_filenames: false
```

## Auto-Fix Hook (Formats and Stages)

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: tofu-fmt-fix
        name: OpenTofu Format (auto-fix)
        language: unsupported
        entry: bash
        args:
          - -c
          - |
            tofu fmt -recursive .
            # Stage any files that were modified
            git diff --name-only -z -- '*.tf' '*.tofu' '*.tfvars' '*.tftest.hcl' '*.tofutest.hcl' | while IFS= read -r -d '' file; do
              git add -- "$file"
            done
        files: \.(tf|tofu|tfvars|tftest\.hcl|tofutest\.hcl)$
        pass_filenames: false
```

## Installing and Testing

```bash
# Install the pre-commit hooks
pre-commit install

# Test the hooks on all files
pre-commit run --all-files

# Test a specific hook
pre-commit run tofu-fmt --all-files
# or: pre-commit run terraform_fmt --all-files

# Skip the hook for a specific commit (use sparingly)
git commit -m "WIP" --no-verify
```

## CI/CD Integration

```yaml
# .github/workflows/fmt-check.yml
name: Format Check

on: [pull_request]

jobs:
  fmt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: opentofu/setup-opentofu@v2

      - name: Check formatting
        run: |
          if ! tofu fmt -check -recursive .; then
            echo "::error::OpenTofu files are not formatted. Run 'tofu fmt -recursive .' to fix."
            exit 1
          fi
```

## EditorConfig Integration

```ini
# .editorconfig - ensures consistent formatting in editors
[*.tf]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

## Team Adoption

```bash
# First run - format everything in the repo
tofu fmt -recursive .
git diff --name-only -z -- '*.tf' '*.tofu' '*.tfvars' '*.tftest.hcl' '*.tofutest.hcl' | while IFS= read -r -d '' file; do
  git add -- "$file"
done
git commit -m "chore: apply tofu fmt formatting"

# Now enable the pre-commit hook
pre-commit install

# Verify all files are already formatted
tofu fmt -check -recursive .  # Should exit 0
```

## Conclusion

`tofu fmt` as a pre-commit hook is a zero-cost improvement - it runs in milliseconds, requires no configuration, and eliminates formatting debates entirely. The CI check ensures that any files that slip past the pre-commit hook (or direct pushes) are caught before merging. Run `tofu fmt -recursive .` in a single commit to format the entire codebase before enabling the hook, to avoid a flood of formatting changes in subsequent pull requests.
