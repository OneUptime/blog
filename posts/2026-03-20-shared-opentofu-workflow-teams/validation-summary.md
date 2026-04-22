# Validation Summary: How to Set Up a Shared OpenTofu Workflow for Teams

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu configuration files
- pre-commit hooks
- GitHub Actions
- GNU Make / Makefile
- terraform-docs
- TFLint

## Sources Consulted
- OpenTofu CLI `fmt` documentation: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu CLI `init` documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu CLI `validate` documentation: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu CLI `plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI `apply` documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu files and directories documentation: https://opentofu.org/docs/language/files/
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- opentofu/setup-opentofu action documentation and releases: https://github.com/opentofu/setup-opentofu
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout releases: https://github.com/actions/checkout/releases
- pre-commit configuration documentation: https://pre-commit.com/
- tofuutils/pre-commit-opentofu documentation and releases: https://github.com/tofuutils/pre-commit-opentofu
- terraform-docs markdown table and output documentation: https://terraform-docs.io/reference/markdown-table/ and https://terraform-docs.io/user-guide/configuration/output/
- mise OpenTofu tool documentation: https://mise-versions.jdx.dev/tools/opentofu

## Issues Found
- The pre-commit example used Terraform-specific hooks from `antonbabenko/pre-commit-terraform` and an old pinned revision. I changed it to the OpenTofu-specific `tofuutils/pre-commit-opentofu` repository, pinned to `v2.3.0`, and updated the hook IDs to `tofu_fmt`, `tofu_validate`, `tofu_tflint`, and `tofu_docs`.
- The Makefile `validate` target only discovered `*.tf` files, skipped current OpenTofu `.tofu` and JSON configuration extensions, and ran `tofu validate` without ensuring each directory was initialized. I updated it to find `.tf`, `.tf.json`, `.tofu`, and `.tofu.json` files, exclude hidden directories correctly, and run `tofu init -backend=false` before `tofu validate`.
- The GitHub Actions path filters omitted `.tf.json`, `.tofu`, `.tofu.json`, and `.tfvars.json` files. I updated the filters so workflow checks run for current OpenTofu configuration and variable file types.
- The workflow used older action majors (`actions/checkout@v4` and `opentofu/setup-opentofu@v1`). I updated them to the current documented majors, `actions/checkout@v6` and `opentofu/setup-opentofu@v2`.
- The CI `plan` job ran `tofu plan` without first running `tofu init`. I added `make init ENVIRONMENT=production` before `make plan`.
- The CI `apply` job tried to run `tofu apply tfplan` without creating `tfplan` in that job. I changed the job to initialize, create the saved plan, and then apply that saved plan.
- The best-practices section referenced `make plan ENV=production`, but the Makefile defines `ENVIRONMENT`. I corrected the example to `make plan ENVIRONMENT=production`.

## Review Notes
The conventions section says `tofu plan` output should be posted as a PR comment, but the workflow example only runs the plan. That is a reasonable team requirement, and the `opentofu/setup-opentofu` action documents wrapper outputs that can be used for PR comments. I did not add a comment-posting step because it would expand the example beyond the corrections needed for executable validation and apply behavior.

Local `tofu`, `pre-commit`, and `terraform-docs` binaries were not installed in this workspace, so CLI verification was performed against current official or authoritative documentation rather than local command execution.
