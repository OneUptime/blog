# Validation Summary: How to Downgrade Terraform to a Previous Version Safely

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Terraform (CLI, state files, lock files, version constraints)
- tfenv (Terraform version manager)
- Homebrew (macOS package manager)
- HCL (HashiCorp Configuration Language)
- GitHub Actions (`hashicorp/setup-terraform@v3`)
- GitLab CI with Docker (`hashicorp/terraform` image)
- jq (JSON processor)

## Sources Consulted
- Terraform CLI documentation: https://developer.hashicorp.com/terraform/cli
- `terraform state pull` / `terraform state push` docs: https://developer.hashicorp.com/terraform/cli/commands/state/pull and https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform version constraints docs: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- `required_version` settings: https://developer.hashicorp.com/terraform/language/settings
- HashiCorp Releases archive: https://releases.hashicorp.com/terraform/
- tfenv project: https://github.com/tfutils/tfenv
- `hashicorp/setup-terraform` action: https://github.com/hashicorp/setup-terraform
- Homebrew `brew extract` documentation: https://docs.brew.sh/Manpage#extract--version-version-formula-tap

## Issues Found
1. **Incorrect Homebrew formula syntax** — The original post showed `brew install hashicorp/tap/terraform@1.5.7`. The `hashicorp/tap` repository does not publish versioned formulas (no `terraform@1.5.7` exists), so this command would fail with a "no available formula" error. I replaced the example with the correct approach using `brew tap-new` + `brew extract --version=...`, which is Homebrew's documented way to install a historical version of a formula. The note about preferring tfenv was preserved.

## Review Notes
- The state-version incompatibility error wording shown (`state snapshot was created by Terraform vX.Y.Z, which is newer than current vA.B.C`) matches Terraform's actual error output for state-version mismatches.
- `terraform state push -force` uses a single-dash flag, which matches Terraform CLI conventions.
- `terraform state pull | grep terraform_version` works because the JSON output emits the field on its own line.
- The `~> 1.5.0` pessimistic constraint correctly allows only 1.5.x (not 1.6.0+), and the `= 1.5.7` exact constraint description is accurate per the Terraform version-constraints docs.
- The releases.hashicorp.com URL pattern for downloading specific Terraform versions is correct.
- `hashicorp/setup-terraform@v3` is the current major version of HashiCorp's official setup action.
- 1.5.7 is a real Terraform release and the example version choice is reasonable. Readers should note Terraform 1.5.x was the last MPL-licensed release before BSL; this is not addressed in the post but is not technically incorrect.
- The recommendation to delete `.terraform.lock.hcl` and re-run `terraform init` is appropriate when changing versions, though users with strict reproducibility requirements may want to update the lock file via `terraform providers lock` rather than regenerate it from scratch. This is a stylistic preference and not an error.
