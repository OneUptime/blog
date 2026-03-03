# How to Fix Inconsistent Dependency Lock File Error in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Dependency Management, Lock File, DevOps

Description: How to resolve the Inconsistent Dependency Lock File error in Terraform caused by platform mismatches, missing hashes, or outdated lock files.

---

You run `terraform init` and get:

```text
Error: Inconsistent dependency lock file

The following dependency selections recorded in the lock file are
inconsistent with the current configuration:

- provider registry.terraform.io/hashicorp/aws: locked version selection
  5.30.0 doesn't match the updated version constraints "~> 5.40"

To update the locked dependency selections to match a changed configuration,
run:
  terraform init -upgrade
```

Or this variant:

```text
Error: Inconsistent dependency lock file

The following dependency selections recorded in the lock file are
inconsistent with the current configuration:

- provider registry.terraform.io/hashicorp/aws: the checksums for
  this provider plugin don't match any of the checksums recorded in the
  dependency lock file
```

The `.terraform.lock.hcl` file is Terraform's way of ensuring reproducible builds. It records the exact provider versions and their checksums. When something does not match up, you get this error. Let us fix it.

## Understanding the Lock File

The `.terraform.lock.hcl` file looks something like this:

```hcl
provider "registry.terraform.io/hashicorp/aws" {
  version     = "5.30.0"
  constraints = "~> 5.0"
  hashes = [
    "h1:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx=",
    "zh:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "zh:yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy",
  ]
}
```

It records:
- The exact version installed
- The version constraints from your configuration
- Checksums (hashes) for multiple platforms

## Error: Version Constraint Mismatch

The most straightforward case. You changed the version constraint in your configuration but the lock file still has the old version:

```hcl
# You changed this from "~> 5.0" to "~> 5.40"
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}
```

But the lock file still has version 5.30.0 locked, which does not satisfy `~> 5.40`.

**Fix**: Run init with the upgrade flag:

```bash
terraform init -upgrade
```

This updates the lock file to the latest version that matches your new constraints. The lock file is then updated in place.

## Error: Checksum Mismatch (Platform Issue)

This is the most common variant of this error. It happens when:

- The lock file was generated on a Mac (darwin_arm64) but CI runs on Linux (linux_amd64)
- A team member on a different OS generated the lock file
- The lock file was generated before Apple Silicon support was added

```text
Error: Inconsistent dependency lock file

The following dependency selections recorded in the lock file are
inconsistent with the current configuration:

- provider registry.terraform.io/hashicorp/aws: the current package for
  registry.terraform.io/hashicorp/aws 5.30.0 doesn't match any of the
  checksums previously recorded in the dependency lock file
```

**Fix**: Generate checksums for all platforms your team uses:

```bash
# Generate hashes for all platforms used by your team and CI
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64 \
  -platform=windows_amd64
```

This updates `.terraform.lock.hcl` with checksums for each platform. Commit this file to version control.

```bash
# Verify the lock file now has multiple hashes
grep "h1:" .terraform.lock.hcl | wc -l
```

Then run init again:

```bash
terraform init
```

## Error: Lock File Missing a Provider

When you add a new provider to your configuration but the lock file does not include it:

```text
Error: Inconsistent dependency lock file

The following dependency selections recorded in the lock file are
inconsistent with the current configuration:

- provider registry.terraform.io/hashicorp/random: required by this
  configuration but no version is selected
```

**Fix**: Run init to add the new provider to the lock file:

```bash
terraform init
```

Or if you want to be explicit about platforms:

```bash
terraform init
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64
```

## Error: Lock File Has a Provider That Is No Longer Needed

This is the opposite case. You removed a provider from your configuration, but it is still in the lock file:

```text
Warning: Unused provider lock

The lock file contains a provider lock for
registry.terraform.io/hashicorp/template which is not used by the
current configuration.
```

This is actually a warning, not an error, and it does not block anything. But to clean it up:

**Fix**: Delete the lock file and regenerate it:

```bash
rm .terraform.lock.hcl
terraform init
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64
```

## Error: Corrupted Lock File

If the lock file has been manually edited or corrupted:

```text
Error: Failed to install providers

Could not parse dependency lock file: syntax error
```

**Fix**: Delete and regenerate:

```bash
rm .terraform.lock.hcl
rm -rf .terraform/providers
terraform init
```

Then regenerate with multi-platform support:

```bash
terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64
```

## Setting Up a Team Workflow

To avoid lock file issues across a team, establish these practices:

### 1. Always Generate Multi-Platform Hashes

Add a script or Makefile target for regenerating the lock file:

```bash
#!/bin/bash
# update-lock-file.sh
# Run this whenever you change provider versions

terraform init -upgrade

terraform providers lock \
  -platform=linux_amd64 \
  -platform=darwin_amd64 \
  -platform=darwin_arm64

echo "Lock file updated. Please commit .terraform.lock.hcl"
```

### 2. Commit the Lock File

Always commit `.terraform.lock.hcl` to version control:

```bash
git add .terraform.lock.hcl
git commit -m "Update Terraform provider lock file"
```

### 3. Do NOT Commit the .terraform Directory

Make sure your `.gitignore` excludes the providers directory but includes the lock file:

```gitignore
# .gitignore
.terraform/
*.tfstate
*.tfstate.backup
*.tfvars
!.terraform.lock.hcl
```

### 4. Add Lock File Validation to CI

```yaml
# GitHub Actions - verify lock file is up to date
- name: Terraform Init
  run: terraform init -lockfile=readonly

# The -lockfile=readonly flag makes init fail if the lock file
# would need to be updated, ensuring CI uses exactly what was committed
```

The `-lockfile=readonly` flag is particularly important. It ensures that your CI pipeline uses exactly the provider versions that were committed, without silently upgrading:

```bash
# In CI, always use readonly mode
terraform init -lockfile=readonly

# Locally, when you want to update providers
terraform init -upgrade
```

## Quick Reference: Common Fixes

| Error | Fix |
|-------|-----|
| Version constraint changed | `terraform init -upgrade` |
| Checksum mismatch (platform) | `terraform providers lock -platform=linux_amd64 -platform=darwin_arm64` |
| New provider added | `terraform init` |
| Provider removed | Delete lock file, `terraform init` |
| Corrupted lock file | Delete lock file and `.terraform/providers`, `terraform init` |

The dependency lock file is a key part of maintaining reproducible Terraform builds. Treat it like you would `package-lock.json` or `go.sum` - commit it to version control, regenerate it properly when making changes, and use `-lockfile=readonly` in CI to catch issues early. Once your workflow is set up correctly, lock file errors become rare.
