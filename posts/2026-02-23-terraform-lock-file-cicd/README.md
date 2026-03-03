# How to Handle Terraform Lock File in CI/CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CI/CD, Lock File, Dependency Management, DevOps

Description: Learn how to properly manage the Terraform dependency lock file in CI/CD pipelines including generation, platform hashes, troubleshooting, and update workflows.

---

The `.terraform.lock.hcl` file was introduced in Terraform 0.14 to pin provider versions and their checksums. It works much like `package-lock.json` in Node.js or `go.sum` in Go. Getting it right in CI/CD is important because mismatches between your local development environment and your CI runner cause frustrating init failures.

This post covers everything you need to know about the lock file in CI/CD contexts.

## What the Lock File Contains

The lock file records two things for each provider:

1. The exact version that was selected
2. Cryptographic hashes for the provider binary on each platform

```hcl
# .terraform.lock.hcl
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.35.0"
  constraints = "~> 5.35.0"
  hashes = [
    "h1:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX=",
    "zh:0123456789abcdef...",  # SHA256 hash for linux_amd64
    "zh:fedcba9876543210...",  # SHA256 hash for darwin_arm64
  ]
}
```

The `h1:` prefix indicates a hash of the provider's zip archive. The `zh:` prefix indicates hashes of individual files within the archive.

## The Platform Mismatch Problem

The most common CI/CD issue with lock files: you develop on macOS (darwin_arm64) but your CI runs on Linux (linux_amd64). If the lock file only has macOS hashes, CI will fail:

```text
Error: Failed to install provider

Could not verify the integrity of
registry.terraform.io/hashicorp/aws v5.35.0

The current .terraform.lock.hcl file includes hashes
for only darwin_arm64, but this machine is linux_amd64.
```

## Generating Cross-Platform Hashes

The fix is to generate hashes for all platforms your team uses:

```bash
# Generate lock file with hashes for all relevant platforms
terraform providers lock \
  -platform=linux_amd64 \   # CI runners (GitHub Actions, GitLab CI)
  -platform=darwin_amd64 \  # Intel Macs
  -platform=darwin_arm64 \  # Apple Silicon Macs
  -platform=linux_arm64     # ARM-based CI runners
```

This updates the lock file with hashes for each platform:

```hcl
# .terraform.lock.hcl - now with multi-platform hashes
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.35.0"
  constraints = "~> 5.35.0"
  hashes = [
    "h1:abc...=",  # darwin_amd64
    "h1:def...=",  # darwin_arm64
    "h1:ghi...=",  # linux_amd64
    "h1:jkl...=",  # linux_arm64
    "zh:...",
    "zh:...",
  ]
}
```

## Lock File in CI/CD Pipeline

### Committing the Lock File

The lock file should always be committed to version control:

```yaml
# .gitignore
# Do NOT ignore the lock file
# .terraform.lock.hcl  <- Don't add this

# DO ignore the provider binaries
.terraform/
```

### Verifying the Lock File in CI

Add a check that the lock file is present and up to date:

```yaml
# .github/workflows/terraform.yml
- name: Verify Lock File
  working-directory: infrastructure
  run: |
    # Check lock file exists
    if [ ! -f .terraform.lock.hcl ]; then
      echo "ERROR: .terraform.lock.hcl not found. Run 'terraform init' and commit the lock file."
      exit 1
    fi

    # Init with lock file verification
    terraform init -lockfile=readonly

    # The -lockfile=readonly flag prevents terraform from modifying
    # the lock file. If providers don't match, init will fail
    # rather than silently updating the lock file.
```

The `-lockfile=readonly` flag is critical for CI/CD. Without it, Terraform might silently update the lock file, meaning your CI could be using different provider versions than what was tested locally.

### CI Pipeline with Lock File Best Practices

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  pull_request:
    paths: ['infrastructure/**']
  push:
    branches: [main]
    paths: ['infrastructure/**']

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.4"

      - name: Check Lock File
        working-directory: infrastructure
        run: |
          if [ ! -f .terraform.lock.hcl ]; then
            echo "::error::Missing .terraform.lock.hcl file"
            exit 1
          fi

      # Use -lockfile=readonly to prevent lock file changes
      - name: Terraform Init
        working-directory: infrastructure
        run: terraform init -lockfile=readonly

      - name: Terraform Validate
        working-directory: infrastructure
        run: terraform validate

  plan:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1

      - name: Terraform Init
        working-directory: infrastructure
        run: terraform init -lockfile=readonly

      - name: Terraform Plan
        working-directory: infrastructure
        run: terraform plan -out=tfplan -no-color
```

## Automated Lock File Updates

Create a workflow that periodically updates provider versions and the lock file:

```yaml
# .github/workflows/update-providers.yml
name: Update Terraform Providers
on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am
  workflow_dispatch:       # Allow manual trigger

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.7.4"

      - name: Update Providers
        working-directory: infrastructure
        run: |
          # Initialize to get current state
          terraform init

          # Update to latest allowed versions
          terraform init -upgrade

          # Regenerate lock file with cross-platform hashes
          terraform providers lock \
            -platform=linux_amd64 \
            -platform=darwin_amd64 \
            -platform=darwin_arm64

      - name: Check for Changes
        id: changes
        working-directory: infrastructure
        run: |
          if git diff --quiet .terraform.lock.hcl; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
          else
            echo "changed=true" >> "$GITHUB_OUTPUT"

            # Show what changed
            git diff .terraform.lock.hcl | head -50
          fi

      - name: Create PR
        if: steps.changes.outputs.changed == 'true'
        run: |
          BRANCH="update-terraform-providers-$(date +%Y%m%d)"
          git checkout -b "$BRANCH"
          git add infrastructure/.terraform.lock.hcl
          git commit -m "Update Terraform provider versions"
          git push origin "$BRANCH"

          gh pr create \
            --title "Update Terraform provider versions" \
            --body "Automated provider version update. Please review the lock file changes and run a plan to verify." \
            --reviewer platform-team
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Troubleshooting Common Issues

### Hash Mismatch After Provider Update

```bash
# Error: provider hash doesn't match lock file
# Solution: Regenerate hashes for all platforms
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64
```

### Lock File Conflicts in PRs

When multiple PRs update the lock file, you get merge conflicts. Resolve by regenerating:

```bash
# After resolving .tf file conflicts, regenerate the lock file
rm .terraform.lock.hcl
terraform init
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64
```

### Missing Hashes for New Platforms

When adding a new CI runner platform (e.g., ARM runners):

```bash
# Add hashes for the new platform
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64 \
  -platform=linux_arm64   # New platform
```

## Pre-commit Hook

Enforce multi-platform hashes before code is pushed:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: terraform-lock
        name: Check Terraform lock file
        entry: bash -c 'cd infrastructure && terraform providers lock -platform=linux_amd64 -platform=darwin_amd64 -platform=darwin_arm64 && git diff --exit-code .terraform.lock.hcl'
        language: system
        files: '\.tf$'
        pass_filenames: false
```

## Summary

Handling the Terraform lock file in CI/CD:

1. Always commit `.terraform.lock.hcl` to version control
2. Generate hashes for all platforms with `terraform providers lock -platform=...`
3. Use `-lockfile=readonly` in CI to prevent silent lock file changes
4. Automate provider updates with a scheduled workflow that creates PRs
5. Regenerate the lock file when resolving merge conflicts
6. Use pre-commit hooks to catch missing platform hashes before push

The lock file is your guarantee of reproducible Terraform runs. Treat it with the same care as any other dependency lock file. For the complete CI/CD pipeline setup, see [Terraform CI/CD with pull request workflows](https://oneuptime.com/blog/post/2026-02-23-terraform-cicd-pull-request-workflows/view).
