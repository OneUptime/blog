# How to Lock Provider Versions with .terraform.lock.hcl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Lock File, Version Management, Infrastructure as Code, DevOps

Description: Learn how the .terraform.lock.hcl file works, how it locks provider versions and hashes for reproducible builds, and how to manage it across platforms and teams.

---

The `.terraform.lock.hcl` file pins the exact provider versions and cryptographic hashes used by your Terraform configuration. Without it, running `terraform init` on different machines or at different times could download different provider versions, even within your version constraints. This leads to inconsistent behavior and hard-to-debug issues.

This guide explains how the lock file works, how to generate and update it, and how to handle it across different platforms and teams.

## What the Lock File Contains

After running `terraform init`, Terraform creates a `.terraform.lock.hcl` file that looks like this:

```hcl
# .terraform.lock.hcl
# This file is maintained automatically by "terraform init".
# Manual edits may be lost in future updates.

provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.30.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:abc123...",
    "zh:def456...",
    "zh:ghi789...",
  ]
}

provider "registry.terraform.io/hashicorp/random" {
  version     = "3.6.0"
  constraints = "~> 3.5"
  hashes = [
    "h1:jkl012...",
    "zh:mno345...",
  ]
}
```

Each provider entry contains:

- **version:** The exact version that was selected and installed.
- **constraints:** The version constraint from your `required_providers` block.
- **hashes:** Cryptographic checksums of the provider binary. Terraform verifies these on every init to detect tampering or corruption.

## How Hashing Works

Terraform records two types of hashes:

- **h1:** A hash of the provider package zip file. Platform-specific.
- **zh:** A hash of the provider binary content. Also platform-specific.

When you run `terraform init` on a Mac, the lock file gets hashes for `darwin_arm64`. If a teammate on Linux runs `terraform init`, their hashes for `linux_amd64` are added.

```hcl
# Lock file with hashes for multiple platforms
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.30.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:abc123...",   # darwin_arm64
    "h1:xyz789...",   # linux_amd64
    "zh:def456...",   # darwin_arm64
    "zh:uvw234...",   # linux_amd64
  ]
}
```

## Generating the Lock File

The lock file is created automatically when you run `terraform init`:

```bash
# Generate lock file for the current platform
terraform init
```

To generate hashes for multiple platforms at once (important for teams with mixed OS environments):

```bash
# Generate lock entries for multiple platforms
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64

# This updates .terraform.lock.hcl with hashes for all three platforms
```

The most common platforms:

| Platform | Description |
|----------|-------------|
| `linux_amd64` | Linux x86_64 (most CI/CD runners) |
| `linux_arm64` | Linux ARM64 (Graviton instances) |
| `darwin_amd64` | macOS Intel |
| `darwin_arm64` | macOS Apple Silicon |
| `windows_amd64` | Windows x86_64 |

## Updating Provider Versions

When you change a version constraint and want to update the lock file:

```bash
# Update all providers to the latest version within constraints
terraform init -upgrade

# This updates .terraform.lock.hcl with new versions and hashes
```

To update a specific provider:

```bash
# Change the version constraint in required_providers first
# Then re-run init with upgrade
terraform init -upgrade
```

You can also edit the lock file manually and remove a provider entry to force Terraform to re-resolve it:

```bash
# Remove the aws provider entry from the lock file
# Then re-initialize
terraform init

# Terraform will select the latest version matching your constraint
# and add it back to the lock file
```

## Lock File Verification

Every `terraform init` verifies the downloaded provider against the lock file hashes:

```bash
# If a hash mismatch is detected:
# Error: Failed to install provider
#
# The current platform's checksum does not match any of the
# checksums recorded in the lock file.
```

This can happen when:
- The lock file was generated on a different platform and does not include your platform's hashes.
- Someone tampered with the provider binary.
- A mirror serves a different version than expected.

Fix a missing platform hash:

```bash
# Add hashes for the current platform
terraform providers lock -platform=linux_amd64
```

## Lock File in CI/CD

CI/CD runners typically use Linux. Generate hashes for both your development machines and CI/CD:

```bash
# Run this during development to ensure CI/CD compatibility
terraform providers lock \
  -platform=darwin_arm64 \
  -platform=linux_amd64

# Commit the updated lock file
git add .terraform.lock.hcl
git commit -m "Update provider lock file with multi-platform hashes"
```

In your CI/CD pipeline:

```yaml
# .github/workflows/terraform.yml
jobs:
  plan:
    runs-on: ubuntu-latest  # linux_amd64
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init
        # This verifies the lock file hashes match

      - name: Terraform Plan
        run: terraform plan
```

## Lock File and Modules

The lock file is only created at the root module level. Modules consumed by the root module contribute to the root's lock file:

```hcl
# Root module's required_providers
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.30"
    }
  }
}

# Module that also requires aws
module "vpc" {
  source = "./modules/vpc"
  # The module's aws provider requirement is merged with the root's
  # Both constraints must be satisfied
}
```

The lock file records the resolved version that satisfies all constraints from both the root module and its child modules.

## Resolving Lock File Conflicts

When multiple team members update the lock file, Git merge conflicts can occur:

```text
<<<<<<< HEAD
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.30.0"
=======
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.31.0"
>>>>>>> feature-branch
```

The safest way to resolve this:

```bash
# Accept the newer version (or whichever is correct)
# Then regenerate the lock file
terraform init -upgrade

# Generate hashes for all platforms
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64

# Commit the clean lock file
git add .terraform.lock.hcl
git commit -m "Resolve lock file conflict, use aws 5.31.0"
```

Do not try to manually merge lock file entries. The hashes need to match exactly, and manual editing is error-prone.

## Automating Lock File Updates

Use a scheduled pipeline to keep providers up to date:

```yaml
# .github/workflows/update-providers.yml
name: Update Provider Versions

on:
  schedule:
    - cron: '0 8 * * 1'  # Every Monday at 8 AM

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Update Providers
        run: |
          terraform init -upgrade
          terraform providers lock \
            -platform=linux_amd64 \
            -platform=darwin_arm64

      - name: Create Pull Request
        uses: peter-evans/create-pull-request@v6
        with:
          title: "Update Terraform provider versions"
          body: "Automated provider version update. Review the lock file changes."
          branch: "update-terraform-providers"
          commit-message: "Update Terraform provider lock file"
```

## Best Practices

1. **Commit `.terraform.lock.hcl` to version control.** It ensures every team member and CI/CD pipeline uses the same provider versions.
2. **Generate hashes for all platforms your team uses.** Run `terraform providers lock` with `-platform` flags for each OS/architecture combination.
3. **Do not manually edit the lock file.** Use `terraform init -upgrade` and `terraform providers lock` commands instead.
4. **Resolve merge conflicts by regenerating.** Accept one side, run `terraform init -upgrade`, and regenerate hashes.
5. **Automate provider updates** with scheduled pipelines that create pull requests.
6. **Review lock file changes in pull requests.** Version bumps in the lock file should be deliberate, not accidental.
7. **Include `linux_amd64` hashes** even if you develop on Mac. CI/CD runners almost always run Linux.

The `.terraform.lock.hcl` file is your guarantee that the same provider binary runs everywhere. Treat it with the same care as your `package-lock.json` or `go.sum` files.
