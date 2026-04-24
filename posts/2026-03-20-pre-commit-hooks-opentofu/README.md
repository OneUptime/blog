# How to Use Pre-Commit Hooks for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Pre-Commit, Code Quality, Infrastructure as Code, IaC, Linting

Description: Learn how to configure pre-commit hooks for automatic OpenTofu formatting, validation, and documentation generation.

## Introduction

Learn how to configure pre-commit hooks for automatic OpenTofu formatting, validation, and documentation generation. This guide provides step-by-step instructions with practical examples to help you implement this in your infrastructure workflow.

## Prerequisites

- OpenTofu v1.6+ installed
- pre-commit installed
- Basic knowledge of OpenTofu concepts

## Step 1: Set Up the Environment

```bash
# Verify OpenTofu installation
tofu version

# Install and verify pre-commit
pip install pre-commit
pre-commit --version
```

## Step 2: Configure Your OpenTofu Project

```yaml
# .pre-commit-config.yaml
minimum_pre_commit_version: "4.4.0"

repos:
  - repo: local
    hooks:
      - id: tofu_fmt
        name: tofu fmt
        entry: tofu fmt -recursive
        language: unsupported
        files: '\.(tf|tofu|tfvars)(\.json)?$'
        pass_filenames: false

      - id: tofu_validate
        name: tofu validate
        entry: tofu validate -no-color
        language: unsupported
        files: '\.(tf|tofu)(\.json)?$'
        pass_filenames: false

  - repo: https://github.com/terraform-docs/terraform-docs
    rev: v0.22.0
    hooks:
      - id: terraform-docs-go
        args: ["markdown", "table", "--output-file", "README.md", "--output-mode", "inject", "."]
```

## Step 3: Implement the Core Feature

```bash
# Initialize the working directory for validation without connecting to a backend
tofu init -backend=false -input=false

# Install the Git hook and hook environments
pre-commit install --install-hooks

# Run all hooks once across the repository
pre-commit run --all-files
```

## Step 4: Set Up Automation

```yaml
# .github/workflows/infrastructure.yml
name: OpenTofu Pre-Commit

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-python@v6
        with:
          python-version: "3.13"

      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_wrapper: false

      - name: Install pre-commit
        run: pip install pre-commit

      - name: Initialize OpenTofu
        run: tofu init -backend=false -input=false

      - name: Run pre-commit hooks
        run: pre-commit run --all-files --show-diff-on-failure
```

## Step 5: Monitor and Verify

```bash
# Validate the pre-commit configuration itself
pre-commit validate-config

# Run a single hook on demand
pre-commit run tofu_validate --all-files

# Regenerate module documentation on demand
pre-commit run terraform-docs-go --all-files

# Confirm generated changes before committing
git diff
```

## Step 6: Implement Best Practices

```yaml
# .terraform-docs.yml
formatter: markdown table

output:
  file: README.md
  mode: inject
  template: |-
    <!-- BEGIN_TF_DOCS -->
    {{ .Content }}
    <!-- END_TF_DOCS -->
```

## Troubleshooting

If you encounter issues:

1. Upgrade pre-commit if `language: unsupported` is not recognized: `pip install --upgrade pre-commit`
2. Initialize the project before validation: Run `tofu init -backend=false -input=false`
3. Add `<!-- BEGIN_TF_DOCS -->` and `<!-- END_TF_DOCS -->` to `README.md` if you want generated docs inserted in a specific location
4. Update pinned hook revisions: Run `pre-commit autoupdate` then `pre-commit run --all-files`

## Conclusion

You have successfully implemented pre-commit hooks for OpenTofu. This approach gives you automatic formatting, local validation, and up-to-date module documentation before changes are committed. Combine it with CI enforcement and code review for a more reliable infrastructure workflow.
