# Validation Summary: How to Fix 'Error: Inconsistent Dependency Lock File' in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu provider dependency lock files
- Git
- GitHub Actions YAML

## Sources Consulted
- OpenTofu docs: Dependency Lock File - https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu docs: Command: init - https://opentofu.org/docs/cli/commands/init/
- OpenTofu docs: Command: providers lock - https://opentofu.org/docs/cli/commands/providers/lock/
- OpenTofu docs: Version Constraints - https://opentofu.org/docs/language/expressions/version-constraints/
- OpenTofu docs: Provider Requirements - https://opentofu.org/docs/language/providers/requirements/

## Issues Found
- The description and introduction said the error happens when installed providers in `.terraform/` do not match `.terraform.lock.hcl`. I changed this to match OpenTofu's documented behavior: the error is about provider selections in `.terraform.lock.hcl` being inconsistent with the current `required_providers` configuration.
- The sample error used `~> 5.0` as if it excluded `5.38.0`. I changed it to `~> 4.0` because OpenTofu documents `~>` as allowing the rightmost specified component to increment, so `~> 5.0` would still allow `5.38.0`.
- The platform-mismatch section presented missing platform checksums as the same "inconsistent dependency lock file" error. I changed it to clarify that this is a related lock file problem that usually produces a checksum verification error during `tofu init`.
- The merge-conflict guidance said to accept one version or the newer one in `.terraform.lock.hcl`. I changed it to resolve conflicts in `required_providers` and the lock file, then rerun `tofu init`, because a manually chosen newer lock entry is not necessarily valid for the merged constraints.
- The best-practices example mixed Bash and GitHub Actions YAML in one `bash` code fence and misdescribed `-lockfile=readonly`. I split the snippet into separate Bash and YAML blocks and corrected the explanation to say that `readonly` prevents lock file writes and fails when the current configuration would require lock file changes.
- The manual-edit section said only `tofu init` manages `.terraform.lock.hcl`. I changed it to say OpenTofu manages the file, because `tofu providers lock` is also an official way to write it.

## Review Notes
- Verified against current OpenTofu 1.11 documentation. No deprecations were found for `tofu init`, `tofu init -upgrade`, `tofu init -lockfile=readonly`, or `tofu providers lock`.
- `.terraform.lock.hcl` remains the documented dependency lock file name in OpenTofu.
- The `tofu` binary was not installed in this workspace, so command verification relied on official OpenTofu documentation rather than local `--help` output.
