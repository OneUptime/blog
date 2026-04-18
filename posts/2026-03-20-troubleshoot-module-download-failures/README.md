# How to Troubleshoot Module Download Failures in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Module, Git, Infrastructure as Code

Description: Learn how to diagnose and fix module download failures in OpenTofu including Git authentication errors, version constraint conflicts, and registry connectivity issues.

## Introduction

Module download failures during `tofu init` stop everything before any infrastructure work can happen. The failures usually fall into three categories: Git authentication issues (for private modules), registry connectivity problems, or version/ref mismatches. This guide covers each one systematically.

## Error: Git SSH Authentication Failure

```text
Error: Failed to download module "vpc"
error downloading 'ssh://git@github.com/my-org/infra-modules.git': ...
git exited with 128:
Permission denied (publickey).
```

```bash
# Test SSH connectivity to GitHub

ssh -T git@github.com

# If that fails, check your SSH key is loaded
ssh-add -l

# Add your key if missing
ssh-add ~/.ssh/id_ed25519

# Test the specific repository
git ls-remote git@github.com:my-org/infra-modules.git

# In CI/CD, use SSH key from secrets
# GitHub Actions example:
# - uses: webfactory/ssh-agent@v0.9.0
#   with:
#     ssh-private-key: ${{ secrets.MODULE_REPO_SSH_KEY }}
```

## Error: HTTPS Authentication Failure

```text
Error: Failed to download module "vpc"
error downloading 'https://github.com/my-org/infra-modules.git':
Authentication failed
```

```bash
# Test HTTPS access directly
git ls-remote https://github.com/my-org/infra-modules.git

# For GitHub with a token, use the token in the URL
git ls-remote https://oauth2:${GITHUB_TOKEN}@github.com/my-org/infra-modules.git

# Configure git to use the token for a specific host
git config --global url."https://oauth2:${GITHUB_TOKEN}@github.com".insteadOf "https://github.com"

# For GitLab
git config --global url."https://oauth2:${GITLAB_TOKEN}@gitlab.com".insteadOf "https://gitlab.com"
```

For CI/CD, set this in the workflow before running `tofu init`.

```yaml
- name: Configure Git for private modules
  run: |
    git config --global url."https://oauth2:${{ secrets.GITHUB_TOKEN }}@github.com".insteadOf "https://github.com"
- name: Initialize OpenTofu
  run: tofu init
```

## Error: Module Version or Ref Not Found

```text
Error: Failed to download module "vpc"
Module version "2.5.0" is not available
```

```hcl
# Check the exact ref format - use ?ref= for Git sources
module "vpc" {
  # Wrong: missing ?ref=
  source = "git::https://github.com/my-org/modules.git//vpc"

  # Correct: with version tag
  source = "git::https://github.com/my-org/modules.git//vpc?ref=v2.5.0"

  # Or use a commit SHA for stability
  source = "git::https://github.com/my-org/modules.git//vpc?ref=a1b2c3d4"
}
```

```bash
# List available tags to find the correct version
git ls-remote --tags https://github.com/my-org/modules.git | grep "refs/tags"

# For registry modules, check available versions
curl -s https://registry.opentofu.org/v1/modules/hashicorp/consul/aws/versions | \
  python3 -m json.tool | grep '"version"'
```

## Error: Registry Module Not Found

```text
Error: Module not found
Module "my-org/vpc/aws" not found in registry
```

```hcl
# Verify the exact source address format: namespace/name/provider
module "vpc" {
  # Registry module
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
}
```

```bash
# Test registry connectivity
curl -s https://registry.opentofu.org/v1/modules/terraform-aws-modules/vpc/aws

# If using a private registry, verify the URL
curl -s https://my-registry.internal.com/v1/modules/my-org/vpc/aws
```

## Error: Subdir Path Not Found in Module

```text
Error: Failed to download module "app"
The requested module subdirectory "modules/app" does not exist
```

```hcl
# Double-slash separates repo URL from subdirectory
module "app" {
  # Wrong: single slash
  source = "git::https://github.com/my-org/modules.git/services/app?ref=v1.0"

  # Correct: double slash before subdirectory
  source = "git::https://github.com/my-org/modules.git//services/app?ref=v1.0"
}
```

## Caching and Cleanup

When module downloads get stuck in a bad state, clearing the cache helps.

```bash
# Remove cached modules and re-download
rm -rf .terraform/modules/
tofu init

# Re-download modules per their version constraints (no provider changes)
tofu get -update

# With debug logging to see exactly what's happening
TF_LOG=DEBUG tofu init 2>&1 | grep -i "module\|download\|git\|error"
```

## Summary

Module download failures are almost always one of: SSH key not loaded (test with `ssh -T git@github.com`), missing HTTPS token (configure `git config url.insteadOf`), wrong ref or tag (verify with `git ls-remote --tags`), malformed source URL (double-slash before subdirectory for Git), or stale `.terraform/modules` cache (delete and re-init). Enable `TF_LOG=DEBUG` to see the exact git command being run when the error isn't clear.
