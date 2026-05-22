# Validation Summary: How to Use OpenTofu with CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- Terraform-compatible infrastructure as code workflows
- CI/CD pipeline automation
- GitHub Actions OIDC authentication
- GitHub CLI pull request comments
- AWS credential federation
- Shell scripting
- YAML scheduling

## Sources Consulted
- OpenTofu installation documentation: https://opentofu.org/docs/intro/install/standalone/
- OpenTofu Docker image documentation: https://opentofu.org/docs/intro/install/docker/
- OpenTofu CLI plan command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI apply command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu CLI init command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI validate command documentation: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu CLI fmt command documentation: https://opentofu.org/docs/v1.9/cli/commands/fmt/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu state locking documentation: https://opentofu.org/docs/language/state/locking/
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu 1.12.0 release announcement: https://opentofu.org/blog/opentofu-1-12-0/
- AWS credentials GitHub Action OIDC documentation: https://github.com/aws-actions/configure-aws-credentials
- GitHub CLI `gh pr comment` manual: https://cli.github.com/manual/gh_pr_comment

## Issues Found
- The OpenTofu version examples used `1.8.0`, which is outdated as of the review date. Updated the direct download example to `1.12.0`, matching the current OpenTofu release announcement.
- The Docker install example used direct `docker pull ghcr.io/opentofu/opentofu`, but current OpenTofu documentation says direct usage of the official images is no longer supported starting with OpenTofu 1.10. Replaced it with a supported CI image build that copies the `tofu` binary from the minimal OpenTofu image.
- The multi-environment directory-based example changed into `environments/${ENVIRONMENT}` and then referenced `environments/${ENVIRONMENT}/backend.hcl` and `environments/${ENVIRONMENT}/terraform.tfvars`, which would resolve to the wrong nested paths. Updated those references to `backend.hcl` and `terraform.tfvars` after the `cd`.
- The state-lock retry script ran `tofu apply` once, then ran it a second time only to check whether the first failure was a lock error. Updated the script to capture and inspect the output from the single attempted apply.
- The drift detection schedule snippet used a top-level `schedule` key, which is not valid GitHub Actions workflow syntax. Updated it to use `on.schedule`.
- The GitHub Actions OIDC example used `aws-actions/configure-aws-credentials@v4`. Updated it to `v6.1.0`, matching the current official action README example at review time.
- The plan file security snippet referred to "OpenTofu state encryption" while the official feature is documented as state and plan encryption. Updated the wording to avoid implying that state-only encryption automatically covers plan files.

## Review Notes
- The saved-plan apply examples use `-auto-approve`; OpenTofu ignores `-auto-approve` when a saved plan file is passed because passing the plan file itself is treated as approval. This is harmless but redundant.
- The `tofu plan -detailed-exitcode` examples correctly document exit codes 0, 1, and 2. CI systems often treat any non-zero exit as failure, so real pipelines should explicitly map exit code 2 to the desired workflow outcome.
