# How to Use terraform fmt Check in CI Pipelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Formatting, DevOps, Code Quality

Description: Learn how to integrate terraform fmt check into your CI pipelines to enforce consistent code formatting across your team and catch style violations before they reach main.

---

Consistent formatting in Terraform code is one of those things that sounds trivial until you are reviewing a pull request with mixed indentation, inconsistent spacing, and randomly aligned equals signs. The built-in `terraform fmt` command solves this problem, and when you add it to your CI pipeline, you never have to argue about formatting in code reviews again.

## What terraform fmt Actually Does

The `terraform fmt` command rewrites Terraform configuration files to follow HashiCorp's canonical style. It handles indentation, alignment of equals signs in argument blocks, and other cosmetic issues.

When you run it with the `-check` flag, it does not modify files. Instead, it exits with a non-zero status code if any files would be changed. This is exactly what you need in CI.

```bash
# Check formatting without modifying files
# Exit code 0 = all files formatted correctly
# Exit code 3 = files need formatting
terraform fmt -check -recursive
```

The `-recursive` flag tells it to check all subdirectories, not just the current one. Without it, you will miss files in nested modules.

## Adding fmt Check to a Generic CI Pipeline

The simplest approach works in any CI system. Create a script that runs the check and provides useful output when it fails.

```bash
#!/bin/bash
# scripts/check-format.sh
# Checks Terraform formatting and prints which files need changes

set -e

# Run fmt check and capture output
# The -diff flag shows what would change
RESULT=$(terraform fmt -check -recursive -diff 2>&1) || true

if [ -n "$RESULT" ]; then
    echo "The following Terraform files are not properly formatted:"
    echo ""
    # List just the file names that need formatting
    terraform fmt -check -recursive 2>&1
    echo ""
    echo "Run 'terraform fmt -recursive' locally to fix formatting."
    exit 1
fi

echo "All Terraform files are properly formatted."
```

The key detail here is using `-diff` to show what would change. When a developer sees their CI fail, they want to know exactly what is wrong, not just that something failed.

## GitHub Actions Implementation

Here is a complete GitHub Actions workflow that checks formatting on every pull request.

```yaml
# .github/workflows/terraform-fmt.yml
name: Terraform Format Check

on:
  pull_request:
    paths:
      # Only run when Terraform files change
      - '**.tf'
      - '**.tfvars'

jobs:
  fmt-check:
    name: Check Terraform Formatting
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          # Pin to a specific version for consistency
          terraform_version: 1.7.0

      - name: Check formatting
        id: fmt
        run: terraform fmt -check -recursive -diff
        # Continue on error so we can post a comment
        continue-on-error: true

      - name: Post comment on failure
        if: steps.fmt.outcome == 'failure'
        uses: actions/github-script@v7
        with:
          script: |
            // Post a helpful comment on the PR
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Terraform formatting check failed. Run \`terraform fmt -recursive\` locally and push the changes.`
            })

      - name: Fail if formatting is wrong
        if: steps.fmt.outcome == 'failure'
        run: exit 1
```

The `paths` filter prevents this workflow from running when non-Terraform files change. No point in checking formatting when someone edits documentation.

## GitLab CI Implementation

For GitLab CI, the approach is similar but uses GitLab's syntax.

```yaml
# .gitlab-ci.yml
terraform-fmt:
  stage: validate
  image: hashicorp/terraform:1.7.0
  # Only run on merge requests that touch Terraform files
  rules:
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - "**/*.tf"
        - "**/*.tfvars"
  script:
    # Check formatting and show diff on failure
    - terraform fmt -check -recursive -diff
  allow_failure: false
```

## Handling Multiple Terraform Directories

Many projects have Terraform code spread across multiple directories - environments, modules, shared configs. You might have a structure like this:

```
infrastructure/
  environments/
    dev/
    staging/
    production/
  modules/
    networking/
    compute/
    database/
```

The `-recursive` flag handles this if you run it from the root. But if your Terraform directories are not all under one parent, you need a different approach.

```bash
#!/bin/bash
# scripts/check-format-multi.sh
# Check formatting across multiple Terraform directories

TERRAFORM_DIRS=(
  "infrastructure/environments"
  "infrastructure/modules"
  "terraform/shared"
)

FAILED=0

for dir in "${TERRAFORM_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Checking $dir..."
    if ! terraform fmt -check -recursive "$dir"; then
      FAILED=1
    fi
  fi
done

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "Fix formatting with: terraform fmt -recursive"
  exit 1
fi
```

## Pre-commit Hook as a Complement

CI checks catch formatting issues, but it is faster to catch them before the code even gets pushed. A pre-commit hook runs `terraform fmt` automatically.

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.86.0
    hooks:
      - id: terraform_fmt
        # Automatically fix formatting before commit
        args:
          - --args=-recursive
```

The pre-commit hook fixes formatting automatically. The CI check acts as a safety net for cases where someone skips the hook or has not set it up locally.

## Common Pitfalls

There are a few things that trip people up when setting this up.

### Version Mismatches

Different Terraform versions can produce slightly different formatting. If your CI runs Terraform 1.7 but developers use 1.6 locally, you will get inconsistent results. Pin your Terraform version in CI and document it for your team.

```bash
# .terraform-version (used by tfenv)
1.7.0
```

### Generated Files

Some tools generate Terraform files that might not match canonical formatting. If you have generated `.tf` files, either run `terraform fmt` as part of the generation process or exclude those directories from the check.

```bash
# Exclude generated directories
terraform fmt -check -recursive \
  | grep -v "generated/" \
  | grep -v ".terraform/"
```

### tfvars Files

By default, `terraform fmt` checks `.tf` files but not `.tfvars` files. If you want consistent formatting in your variable files too, you need to explicitly include them.

```bash
# Check both .tf and .tfvars files
terraform fmt -check -recursive
# terraform fmt already handles .tfvars files in recent versions
```

Actually, as of Terraform 1.0+, `terraform fmt` does handle `.tfvars` files. But if you are on an older version, you might need to handle them separately.

## Integrating with Other Validation Steps

Formatting is usually the first step in a Terraform validation pipeline. A complete setup looks like this:

```yaml
# GitHub Actions example with full validation
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      # Step 1: Format check (fastest, catches style issues)
      - name: Format check
        run: terraform fmt -check -recursive

      # Step 2: Init (needed for validate)
      - name: Initialize
        run: terraform init -backend=false

      # Step 3: Validate (catches syntax and type errors)
      - name: Validate
        run: terraform validate

      # Step 4: Lint with tflint (catches provider-specific issues)
      - name: Lint
        uses: terraform-linters/setup-tflint@v4
      - run: |
          tflint --init
          tflint --recursive
```

Running `fmt` first makes sense because it is the fastest check and catches the most trivial issues. No point waiting for a full validation if the code is not even formatted correctly.

## Making It Work for Your Team

The goal of adding `terraform fmt` to CI is not to annoy developers. It is to eliminate formatting debates and keep the codebase consistent. Here are some tips:

1. Add the pre-commit hook first so developers get immediate feedback
2. Document the expected Terraform version somewhere obvious
3. When the CI check fails, make the error message helpful - include instructions on how to fix it
4. Consider an auto-fix bot that applies formatting on PRs if your team prefers that workflow

You can even set up a GitHub Action that automatically commits formatting fixes:

```yaml
- name: Auto-fix formatting
  if: steps.fmt.outcome == 'failure'
  run: |
    terraform fmt -recursive
    git config user.name "terraform-fmt-bot"
    git config user.email "bot@example.com"
    git add -A
    git commit -m "style: auto-fix terraform formatting"
    git push
```

Whether you prefer the auto-fix approach or the fail-and-fix approach depends on your team's workflow. Either way, `terraform fmt -check` in CI is a small addition that prevents a whole category of code review noise.

For more on Terraform testing practices, check out [How to Test Terraform Variable Validation](https://oneuptime.com/blog/post/2026-02-23-how-to-test-terraform-variable-validation/view) and [How to Set Up End-to-End Terraform Testing Pipelines](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-end-to-end-terraform-testing-pipelines/view).
