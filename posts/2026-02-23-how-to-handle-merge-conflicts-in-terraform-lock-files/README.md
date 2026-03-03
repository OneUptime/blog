# How to Handle Merge Conflicts in Terraform Lock Files

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Git, Merge Conflicts, Lock File, DevOps

Description: Resolve merge conflicts in Terraform dependency lock files correctly to maintain provider consistency and prevent infrastructure drift across environments.

---

The `.terraform.lock.hcl` file is one of the most frequently conflicted files in Terraform repositories. Every time a developer runs `terraform init` with a new provider version or on a different platform, the lock file can change. When multiple developers make these changes on different branches, merge conflicts are almost guaranteed.

Unlike conflicts in `.tf` files where you need to reason about infrastructure intent, lock file conflicts have a specific resolution process. Getting it wrong can lead to provider version inconsistencies across your team, which in turn causes different plan outputs for the same configuration.

## Understanding the Terraform Lock File

The `.terraform.lock.hcl` file records the exact versions and checksums of every provider your configuration uses:

```hcl
# .terraform.lock.hcl
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.31.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:abcdef1234567890abcdef1234567890abcdef1234=",
    "zh:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "zh:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
  ]
}

provider "registry.terraform.io/hashicorp/random" {
  version     = "3.6.0"
  constraints = "~> 3.0"
  hashes = [
    "h1:xyz7890abcdef1234567890abcdef1234567890abcd=",
    "zh:fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
  ]
}
```

The `hashes` field contains checksums for different platforms. A developer on macOS will generate different hash entries than one on Linux. This cross-platform hash accumulation is the primary source of lock file conflicts.

## Why Lock File Conflicts Happen

There are three main causes of lock file conflicts.

### Different Platforms

When Developer A runs `terraform init` on macOS and Developer B runs it on Linux, each adds platform-specific hashes to the lock file:

```hcl
# Developer A on macOS adds:
"zh:darwin_amd64_hash..."
"zh:darwin_arm64_hash..."

# Developer B on Linux adds:
"zh:linux_amd64_hash..."
```

If both commit their changes, the lock file will conflict because the hash lists differ.

### Provider Version Updates

When two branches independently update the same provider to different versions:

```hcl
# Branch A updated AWS provider
provider "registry.terraform.io/hashicorp/aws" {
<<<<<<< HEAD
  version = "5.31.0"
  hashes = [
    "h1:abc...",
  ]
=======
  version = "5.32.0"
  hashes = [
    "h1:def...",
  ]
>>>>>>> feature-branch
}
```

### New Provider Additions

When two branches add different new providers, the lock file entries for existing providers can conflict if `terraform init` also refreshed their hashes.

## The Correct Resolution Process

Unlike application code conflicts where you manually merge lines, lock file conflicts should be resolved by regenerating the lock file.

### Step 1: Accept One Side of the Conflict

Start by accepting either side of the conflict. It does not matter which side you choose because you will regenerate the file:

```bash
# Accept the current branch's version
git checkout --ours .terraform.lock.hcl

# Or accept the incoming branch's version
git checkout --theirs .terraform.lock.hcl

# Mark as resolved
git add .terraform.lock.hcl
```

### Step 2: Merge the Provider Constraints

Before regenerating, make sure your `.tf` files have the correct provider version constraints. If both branches updated provider versions, you need to decide which version to use in the actual configuration:

```hcl
# versions.tf - resolve this file first
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.32.0"  # Use the version your team agreed on
    }
  }
}
```

### Step 3: Regenerate the Lock File

Run `terraform init` with the `-upgrade` flag to regenerate the lock file based on your resolved configuration:

```bash
# Regenerate the lock file
terraform init -upgrade

# If you need hashes for multiple platforms
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64 \
  -platform=linux_arm64
```

The `terraform providers lock` command is critical for teams with mixed operating systems. It generates hashes for all specified platforms in a single operation.

### Step 4: Commit the Regenerated Lock File

```bash
# Stage the regenerated lock file
git add .terraform.lock.hcl

# Commit with a clear message
git commit -m "Regenerate lock file after merge conflict resolution

Resolved conflict between provider updates on both branches.
Generated hashes for linux_amd64, darwin_amd64, darwin_arm64,
and linux_arm64 platforms."
```

## Automating Lock File Conflict Resolution

Set up your CI pipeline to detect and help resolve lock file conflicts:

```yaml
# .github/workflows/lockfile-check.yml
name: Lock File Validation

on:
  pull_request:
    paths:
      - '.terraform.lock.hcl'
      - '**/*.tf'

jobs:
  validate-lockfile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.7.0

      - name: Validate Lock File
        run: |
          # Initialize with the existing lock file
          terraform init

          # Check if the lock file needs updating
          terraform providers lock \
            -platform=linux_amd64 \
            -platform=darwin_amd64 \
            -platform=darwin_arm64

          # Check if the lock file changed
          if git diff --exit-code .terraform.lock.hcl; then
            echo "Lock file is up to date"
          else
            echo "Lock file needs updating"
            echo "Run: terraform providers lock -platform=linux_amd64 -platform=darwin_amd64 -platform=darwin_arm64"
            exit 1
          fi
```

This check ensures that the lock file includes hashes for all required platforms before the PR can be merged.

## Preventing Lock File Conflicts

### Standardize Platform Hashes

Always generate hashes for all platforms your team uses. Add this to your development workflow:

```bash
# create a Makefile target for consistent lock file updates
# Makefile
.PHONY: lock
lock:
	terraform providers lock \
		-platform=linux_amd64 \
		-platform=darwin_amd64 \
		-platform=darwin_arm64 \
		-platform=windows_amd64
```

When every developer runs `make lock` instead of just `terraform init`, the lock file will contain the same set of hashes regardless of who generated it.

### Centralize Provider Version Updates

Designate a single person or automated process to update provider versions:

```yaml
# .github/workflows/update-providers.yml
name: Update Terraform Providers

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am

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
            -platform=darwin_amd64 \
            -platform=darwin_arm64

      - name: Create PR
        run: |
          git checkout -b update-providers-$(date +%Y%m%d)
          git add .terraform.lock.hcl
          git commit -m "Update Terraform provider versions"
          git push origin HEAD
          gh pr create \
            --title "Update Terraform providers" \
            --body "Automated weekly provider update"
```

This approach eliminates the scenario where multiple developers independently update providers on different branches.

### Use Git Merge Strategies

Configure Git to use a specific merge strategy for lock files:

```text
# .gitattributes
.terraform.lock.hcl merge=ours
```

This tells Git to always keep the current branch's version of the lock file during a merge. You then need to regenerate it as part of your merge process. While this does not truly resolve the conflict, it eliminates the manual conflict resolution step and replaces it with a consistent regeneration step.

## Troubleshooting Common Issues

### Hash Mismatch After Resolution

If `terraform init` fails with a hash mismatch after resolving a conflict:

```bash
# Remove the lock file and regenerate from scratch
rm .terraform.lock.hcl
rm -rf .terraform/

# Reinitialize
terraform init

# Generate platform hashes
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64
```

### CI Fails on Lock File After Merge

If your CI pipeline reports lock file issues after a merge, it usually means the lock file was resolved incorrectly. The fix is always the same: regenerate it.

For more on handling other types of Terraform merge conflicts, see our guide on [merge conflicts in Terraform configurations](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-merge-conflicts-in-terraform-configurations/view).

Lock file conflicts are tedious but not dangerous as long as you follow the correct resolution process. Always regenerate rather than manually editing, always include all platform hashes, and consider automating provider updates to reduce the frequency of conflicts.
