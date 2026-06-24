# How to Fix 'Error: Inconsistent Dependency Lock File' in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Troubleshooting, Lock File, Dependency, Error, Infrastructure as Code

Description: Learn how to diagnose and fix the inconsistent dependency lock file error in OpenTofu, which occurs when installed providers do not match the versions recorded in .terraform.lock.hcl.

## Introduction

The "inconsistent dependency lock file" error means that the provider selections recorded in `.terraform.lock.hcl` do not match the current `required_providers` configuration. This typically happens after changing provider version constraints, adding a new provider, or resolving a merge without re-running `tofu init`.

## Error Message

```text
Error: Inconsistent dependency lock file

The following dependency selections recorded in the lock file are inconsistent with the current configuration:
  - provider registry.opentofu.org/hashicorp/aws: locked version selection 5.38.0 doesn't match the current version constraints "~> 4.0"

To update the locked dependency selections to match a changed configuration, run:
  tofu init -upgrade
```

## Cause 1: Configuration Changed - Run tofu init

The most common cause is that `required_providers` or its version constraints changed but `tofu init` was not re-run to update `.terraform.lock.hcl`:

```bash
# Refresh provider selections to match the current configuration

tofu init

# Or if you intentionally updated version constraints
tofu init -upgrade
```

## Cause 2: Lock File Was Not Committed

If a teammate added a new provider but did not commit the updated `.terraform.lock.hcl`:

```bash
# On your machine, re-generate the lock file
tofu init

# Review and commit the updated lock file
git add .terraform.lock.hcl
git commit -m "chore: update dependency lock file"
```

## Cause 3: Missing Platform Checksums in the Lock File

A separate but related lock file problem is when the lock file only has checksums for one platform (for example, macOS) but you are running on Linux in CI. This usually causes a provider checksum error during `tofu init`, and you fix it by updating the lock file:

```bash
# On macOS (developer machine), add checksums for all target platforms
tofu providers lock \
  -platform=linux_amd64 \
  -platform=darwin_arm64 \
  -platform=darwin_amd64 \
  -platform=windows_amd64

# Commit the updated lock file with all platform checksums
git add .terraform.lock.hcl
git commit -m "chore: add multi-platform provider checksums"
```

## Cause 4: Conflicting Version Constraints After a Merge

After merging two branches that each updated `required_providers`, the lock file may conflict:

```bash
# Resolve the merge conflict in required_providers and .terraform.lock.hcl
# Then re-run init to select a valid provider version

# Re-run init to re-validate
tofu init

# If using upgrade to get the latest allowed version
tofu init -upgrade
```

## Cause 5: Manual Edits to the Lock File

Never manually edit `.terraform.lock.hcl`. Always let OpenTofu manage it:

```bash
# If the lock file is corrupt, delete it and regenerate
rm .terraform.lock.hcl
tofu init

# Add multi-platform checksums
tofu providers lock -platform=linux_amd64 -platform=darwin_arm64
git add .terraform.lock.hcl
git commit -m "chore: regenerate lock file"
```

## Best Practices to Prevent This Error

```bash
# Always commit the lock file
# .gitignore should NOT contain .terraform.lock.hcl
```

```yaml
# Run init in CI before any plan/apply
- name: OpenTofu Init
  run: tofu init -lockfile=readonly
  # -lockfile=readonly prevents updating .terraform.lock.hcl
  # and fails if the current configuration needs lock file changes
```

## Conclusion

Inconsistent lock file errors are resolved by running `tofu init` to sync `.terraform.lock.hcl` with the current provider requirements. For multi-platform teams, use `tofu providers lock -platform=...` to pre-populate checksums for all target platforms before committing. Use `-lockfile=readonly` in CI to catch unintended lock file changes early.
