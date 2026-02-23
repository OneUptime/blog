# How to Set Up Pre-Commit Hooks for Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Pre-Commit, Git, DevOps, Linting, Infrastructure as Code

Description: Learn how to set up pre-commit hooks for Terraform to automatically format code, validate configurations, run linters, and check for security issues before every commit.

---

Pre-commit hooks catch problems before code enters your repository. For Terraform, this means formatting issues, validation errors, security misconfigurations, and linting failures are flagged on the developer's machine, not in CI 10 minutes later. The `pre-commit` framework makes this easy to set up and share across a team.

## Why Pre-Commit Hooks for Terraform

Without pre-commit hooks, the typical developer workflow is:

1. Make changes
2. Commit and push
3. Wait for CI
4. CI fails because of a formatting issue
5. Fix, commit, push again
6. Wait for CI again

With pre-commit hooks, step 2 catches the formatting issue instantly. The feedback loop goes from minutes to seconds.

## Installing pre-commit

The `pre-commit` framework is a Python tool that manages Git hooks:

```bash
# Install with pip
pip install pre-commit

# Or with Homebrew on macOS
brew install pre-commit

# Verify installation
pre-commit --version
```

## Basic Configuration

Create a `.pre-commit-config.yaml` file in your repository root:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-tf-docs
    rev: v0.3.0
    hooks:
      - id: terraform-docs

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-merge-conflict
      - id: end-of-file-fixer
      - id: trailing-whitespace
      - id: check-yaml
      - id: check-json

  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.88.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tflint
      - id: terraform_trivy
```

Install the hooks:

```bash
# Install hooks into your git repository
pre-commit install

# Run all hooks against all files to check current state
pre-commit run --all-files
```

Now, every time you run `git commit`, the hooks execute automatically.

## Available Terraform Hooks

The `pre-commit-terraform` repository provides many hooks. Here are the most useful ones.

### terraform_fmt

Automatically formats your Terraform files:

```yaml
- id: terraform_fmt
  # Optional: specify directories to format
  args:
    - --args=-recursive
```

This runs `terraform fmt` and fails if any files need formatting. It also auto-fixes the files, so you just need to `git add` the formatted files and commit again.

### terraform_validate

Runs `terraform validate` to check configuration syntax:

```yaml
- id: terraform_validate
  args:
    - --args=-no-color
    # Initialize with no backend to avoid credential requirements
    - --init-args=-backend=false
```

### terraform_tflint

Runs TFLint to catch linting issues:

```yaml
- id: terraform_tflint
  args:
    - --args=--config=__GIT_WORKING_DIR__/.tflint.hcl
```

Make sure you have a `.tflint.hcl` configuration file and TFLint installed locally.

### terraform_trivy

Runs Trivy for security scanning:

```yaml
- id: terraform_trivy
  args:
    - --args=--severity=HIGH,CRITICAL
```

### terraform_docs

Auto-generates documentation from your Terraform modules:

```yaml
- id: terraform_docs
  args:
    - --args=--config=.terraform-docs.yml
```

### terraform_checkov

Runs Checkov for compliance checks:

```yaml
- id: terraform_checkov
  args:
    - --args=--quiet
    - --args=--compact
```

### infracost_breakdown

Check costs before committing:

```yaml
- id: infracost_breakdown
  args:
    - --args=--path=.
  # This requires INFRACOST_API_KEY to be set
```

## Comprehensive Configuration

Here is a production-ready configuration that covers formatting, validation, linting, security, and documentation:

```yaml
# .pre-commit-config.yaml
# Comprehensive Terraform pre-commit hooks

repos:
  # General file checks
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-merge-conflict
      - id: end-of-file-fixer
        exclude: '\.tfvars$'
      - id: trailing-whitespace
        exclude: '\.tfvars$'
      - id: check-yaml
      - id: check-json
      - id: detect-private-key
      - id: no-commit-to-branch
        args: ['--branch', 'main']

  # Terraform-specific hooks
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.88.0
    hooks:
      # Format all Terraform files
      - id: terraform_fmt

      # Validate Terraform configuration
      - id: terraform_validate
        args:
          - --init-args=-backend=false

      # Run TFLint
      - id: terraform_tflint
        args:
          - --args=--config=__GIT_WORKING_DIR__/.tflint.hcl

      # Security scanning with Trivy
      - id: terraform_trivy
        args:
          - --args=--severity=HIGH,CRITICAL
          - --args=--skip-dirs=test,examples

      # Generate documentation
      - id: terraform_docs
        args:
          - --hook-config=--path-to-file=README.md
          - --hook-config=--add-to-existing-file=true
          - --hook-config=--create-file-if-not-exist=true

  # Check for secrets
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.1
    hooks:
      - id: gitleaks
```

## Hook Execution Order

Hooks run in the order they are defined. Structure them from fastest to slowest:

1. **File checks** (check-merge-conflict, trailing-whitespace) - milliseconds
2. **terraform_fmt** - very fast
3. **terraform_validate** - fast but needs init
4. **terraform_tflint** - fast
5. **terraform_trivy** - moderate
6. **terraform_docs** - moderate

If a faster hook fails, the slower hooks do not run. This saves time by failing fast.

## Configuring Hook Scope

Control which files each hook runs on:

```yaml
hooks:
  - id: terraform_fmt
    # Only run on .tf files
    files: \.tf$
    # Exclude test fixtures
    exclude: 'test/fixtures/'

  - id: terraform_validate
    # Only run when Terraform files change
    files: \.tf$
    # Exclude example directories
    exclude: 'examples/'
```

## Skipping Hooks Temporarily

Sometimes you need to commit without running hooks (e.g., work in progress):

```bash
# Skip all hooks for this commit
git commit --no-verify -m "WIP: work in progress"

# Skip a specific hook
SKIP=terraform_trivy git commit -m "Quick fix"

# Skip multiple hooks
SKIP=terraform_trivy,terraform_tflint git commit -m "Quick fix"
```

Use this sparingly. The whole point of hooks is to catch issues early.

## Setting Up for a Team

When someone clones the repository, they need to install the hooks. Add these instructions to your README or use a setup script:

```bash
#!/bin/bash
# setup.sh
# One-time setup for new developers

# Install pre-commit if not already installed
if ! command -v pre-commit &> /dev/null; then
    pip install pre-commit
fi

# Install the TFLint plugins
if command -v tflint &> /dev/null; then
    tflint --init
fi

# Install the git hooks
pre-commit install

echo "Pre-commit hooks installed successfully"
```

You can also set up automatic installation:

```bash
# In your Makefile
.PHONY: init
init:
	pip install pre-commit
	pre-commit install
	tflint --init
```

## Running Hooks in CI

Pre-commit hooks also work in CI as a safety net for developers who bypass local hooks:

```yaml
# .github/workflows/pre-commit.yml
name: Pre-Commit

on:
  pull_request:

jobs:
  pre-commit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Install Tools
        run: |
          # Install TFLint
          curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash
          tflint --init

          # Install Trivy
          sudo apt-get install -y trivy

      - uses: pre-commit/action@v3.0.1
```

## Custom Local Hooks

You can add custom hooks that are specific to your project:

```yaml
# .pre-commit-config.yaml
repos:
  # ... other repos

  # Custom local hooks
  - repo: local
    hooks:
      # Check that all modules have tests
      - id: check-module-tests
        name: Check module tests exist
        entry: bash -c 'for dir in modules/*/; do if [ ! -d "${dir}tests" ]; then echo "Missing tests in $dir"; exit 1; fi; done'
        language: system
        files: 'modules/'
        pass_filenames: false

      # Verify that no hardcoded AWS account IDs exist
      - id: no-hardcoded-account-ids
        name: No hardcoded AWS account IDs
        entry: bash -c 'grep -rn "[0-9]\{12\}" --include="*.tf" . && echo "Found potential hardcoded AWS account IDs" && exit 1 || exit 0'
        language: system
        files: '\.tf$'
        pass_filenames: false

      # Check for TODO comments
      - id: check-todos
        name: Check for TODO comments
        entry: bash -c 'grep -rn "TODO\|FIXME\|HACK" --include="*.tf" . && echo "Found TODO/FIXME comments - resolve before committing" && exit 1 || exit 0'
        language: system
        files: '\.tf$'
        pass_filenames: false
```

## Updating Hooks

Keep your hooks up to date:

```bash
# Update all hooks to their latest versions
pre-commit autoupdate

# Test the updated hooks
pre-commit run --all-files
```

Run this periodically (monthly is a good cadence) to pick up new rules and bug fixes.

## Handling Slow Hooks

Some hooks (like Trivy scanning or terraform_validate with init) can be slow. Strategies for managing this:

```yaml
# Run slow hooks only on specific stages
hooks:
  - id: terraform_trivy
    stages: [push]  # Only run on git push, not on commit

  - id: terraform_fmt
    stages: [commit]  # Run on every commit (fast)
```

Install hooks for both stages:

```bash
pre-commit install
pre-commit install --hook-type pre-push
```

## Troubleshooting Common Issues

### Hook fails with "terraform not found"

Make sure Terraform is in your PATH. The hooks use whatever `terraform` binary is available.

### terraform_validate fails because of missing backend credentials

Use the `-backend=false` init argument:

```yaml
- id: terraform_validate
  args:
    - --init-args=-backend=false
```

### TFLint fails because plugins are not installed

Run `tflint --init` first, or add it to your setup script.

### Hooks take too long

Use the `stages` configuration to move slow hooks to `pre-push`, or use `SKIP` to skip them temporarily.

## Summary

Pre-commit hooks are the first line of defense for Terraform code quality. Set up the `pre-commit` framework, configure hooks for formatting, validation, linting, and security scanning, and share the configuration with your team through the `.pre-commit-config.yaml` file. The few seconds of hook execution on each commit save minutes of CI wait time and prevent avoidable issues from entering your codebase.

For the tools that power these hooks, see [How to Use Trivy for Terraform Security Scanning](https://oneuptime.com/blog/post/2026-02-23-how-to-use-trivy-for-terraform-security-scanning/view) and [How to Use Infracost with Terraform for Cost Testing](https://oneuptime.com/blog/post/2026-02-23-how-to-use-infracost-with-terraform-for-cost-testing/view).
