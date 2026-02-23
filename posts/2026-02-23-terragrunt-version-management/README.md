# How to Handle Terragrunt Version Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Version Management, DevOps, Infrastructure as Code

Description: Learn how to manage Terragrunt and Terraform versions across teams and environments using version constraints, tgenv, tfenv, and CI/CD version pinning strategies.

---

Version management is one of those things that seems minor until you have five engineers running different Terragrunt versions and producing inconsistent plans. Or until a CI pipeline picks up a new Terraform version that introduces a breaking change. Getting version management right means fewer "works on my machine" problems and more predictable deployments.

## Pinning the Terragrunt Version

Terragrunt doesn't have a built-in version constraint like Terraform's `required_version`. Instead, you handle it with tooling.

### Using tgenv

`tgenv` is the go-to version manager for Terragrunt, similar to how `tfenv` works for Terraform:

```bash
# Install tgenv
git clone https://github.com/cunymatthieu/tgenv.git ~/.tgenv
echo 'export PATH="$HOME/.tgenv/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Install a specific Terragrunt version
tgenv install 0.55.0

# Use a specific version
tgenv use 0.55.0

# Check current version
terragrunt --version
```

Pin the version for your project with a `.terragrunt-version` file:

```bash
# Create the version file in your repo root
echo "0.55.0" > .terragrunt-version
```

When any developer enters the project directory and runs `terragrunt`, `tgenv` automatically switches to the pinned version.

### Using tfenv for Terraform

Similarly, pin the Terraform version:

```bash
# Install tfenv
git clone https://github.com/tfutils/tfenv.git ~/.tfenv
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.bashrc

# Install and pin a version
tfenv install 1.7.0
echo "1.7.0" > .terraform-version
```

Both `.terragrunt-version` and `.terraform-version` should be committed to your repository.

### Using asdf

If your team uses `asdf` for managing multiple tool versions:

```bash
# Add the plugins
asdf plugin add terragrunt
asdf plugin add terraform

# Install specific versions
asdf install terragrunt 0.55.0
asdf install terraform 1.7.0

# Pin versions in .tool-versions
echo "terragrunt 0.55.0" >> .tool-versions
echo "terraform 1.7.0" >> .tool-versions
```

## Terraform Version Constraints in Terragrunt

While Terragrunt itself doesn't enforce version constraints, you can generate a `versions.tf` file that does:

```hcl
# root terragrunt.hcl

generate "versions" {
  path      = "versions.tf"
  if_exists = "overwrite"
  contents  = <<EOF
terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}
EOF
}
```

This ensures that even if someone runs a different Terraform version, they'll get a clear error if it's outside the acceptable range.

## Version Management in CI/CD

In CI pipelines, always pin exact versions:

```yaml
# GitHub Actions example
- name: Setup Terraform
  uses: hashicorp/setup-terraform@v3
  with:
    terraform_version: 1.7.0      # Exact version, not latest
    terraform_wrapper: false

- name: Setup Terragrunt
  run: |
    TERRAGRUNT_VERSION="0.55.0"   # Exact version
    curl -sL "https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_amd64" \
      -o /usr/local/bin/terragrunt
    chmod +x /usr/local/bin/terragrunt
```

For Docker-based CI:

```dockerfile
# Pin both versions in your CI image
FROM hashicorp/terraform:1.7.0

ARG TERRAGRUNT_VERSION=0.55.0
RUN wget -q "https://github.com/gruntwork-io/terragrunt/releases/download/v${TERRAGRUNT_VERSION}/terragrunt_linux_amd64" \
    -O /usr/local/bin/terragrunt && \
    chmod +x /usr/local/bin/terragrunt
```

### Reading Versions from Files

A better approach is reading the version from the repo's version files:

```yaml
# GitHub Actions - read version from .terragrunt-version file
- name: Get Terragrunt Version
  id: tg_version
  run: echo "version=$(cat .terragrunt-version)" >> "$GITHUB_OUTPUT"

- name: Setup Terragrunt
  run: |
    curl -sL "https://github.com/gruntwork-io/terragrunt/releases/download/v${{ steps.tg_version.outputs.version }}/terragrunt_linux_amd64" \
      -o /usr/local/bin/terragrunt
    chmod +x /usr/local/bin/terragrunt
```

## Upgrade Strategy

Upgrading Terragrunt or Terraform versions should be deliberate, not accidental. Here's a process that works well:

### Step 1: Test Locally

```bash
# Install the new version alongside the current one
tgenv install 0.56.0

# Switch to the new version
tgenv use 0.56.0

# Run plans across your modules to check for issues
cd infrastructure/dev
terragrunt run-all plan
```

### Step 2: Check the Changelog

Before upgrading, always check:
- [Terragrunt changelog](https://github.com/gruntwork-io/terragrunt/releases) for breaking changes
- [Terraform changelog](https://github.com/hashicorp/terraform/releases) for deprecations

### Step 3: Update One Environment First

```bash
# Update the version file
echo "0.56.0" > .terragrunt-version

# Plan and apply to dev first
cd infrastructure/dev
terragrunt run-all plan
terragrunt run-all apply

# If everything works, promote to staging, then prod
```

### Step 4: Update CI

Only update the CI version after local testing passes:

```bash
# Update version files
echo "0.56.0" > .terragrunt-version
echo "1.8.0" > .terraform-version

# Commit both
git add .terragrunt-version .terraform-version
git commit -m "Upgrade Terragrunt to 0.56.0 and Terraform to 1.8.0"
```

## Provider Version Locking

Don't forget about provider versions. The `.terraform.lock.hcl` file pins exact provider versions:

```bash
# Update provider lock files across all modules
cd infrastructure/dev
terragrunt run-all init -upgrade

# Commit the updated lock files
git add **/.terraform.lock.hcl
git commit -m "Update provider lock files"
```

The lock file ensures reproducible builds. Always commit it to your repository.

## Handling Version Drift

When team members are running different versions, you'll see symptoms like:
- Plans that show changes on one machine but not another
- State file format version warnings
- Provider schema differences

To detect drift early, add a version check hook:

```hcl
# root terragrunt.hcl

terraform {
  before_hook "version_check" {
    commands = ["plan", "apply"]
    execute  = [
      "bash", "-c",
      "echo \"Terraform: $(terraform version -json | jq -r .terraform_version)\" && echo \"Terragrunt: $(terragrunt --version)\""
    ]
  }
}
```

Or a more strict check:

```bash
#!/bin/bash
# scripts/check-versions.sh
EXPECTED_TG=$(cat .terragrunt-version)
EXPECTED_TF=$(cat .terraform-version)
ACTUAL_TG=$(terragrunt --version | grep -oP 'v\K[0-9.]+')
ACTUAL_TF=$(terraform version -json | jq -r .terraform_version)

if [ "$EXPECTED_TG" != "$ACTUAL_TG" ]; then
  echo "ERROR: Expected Terragrunt $EXPECTED_TG but found $ACTUAL_TG"
  echo "Run: tgenv use $EXPECTED_TG"
  exit 1
fi

if [ "$EXPECTED_TF" != "$ACTUAL_TF" ]; then
  echo "ERROR: Expected Terraform $EXPECTED_TF but found $ACTUAL_TF"
  echo "Run: tfenv use $EXPECTED_TF"
  exit 1
fi

echo "Version check passed"
```

## Multiple Terraform Versions

In rare cases, different modules might need different Terraform versions. You can handle this by setting the Terraform binary per module:

```hcl
# modules/legacy-app/terragrunt.hcl
terraform_binary = "/usr/local/bin/terraform-1.5"
```

This should be a last resort. It's better to upgrade all modules to the same version.

## Summary

Pin your versions, commit the version files, and upgrade deliberately. Use `tgenv` and `tfenv` for local development, pin exact versions in CI, and always test upgrades in dev before promoting. The few minutes spent on version management saves hours of debugging version-related issues. For related best practices, see our [Terragrunt module versioning guide](https://oneuptime.com/blog/post/2026-02-23-terragrunt-module-versioning/view).
