# Validation Summary: How to Automate Compliance Audits with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu CLI
- GitHub Actions
- Python
- AWS CLI (`s3`, `ses`)
- `jq`
- Slack GitHub Action

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command docs: https://opentofu.org/docs/v1.9/cli/commands/show/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow commands and `GITHUB_OUTPUT`: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- OpenTofu GitHub Action setup docs: https://github.com/opentofu/setup-opentofu
- AWS CLI `ses send-email` command reference: https://docs.aws.amazon.com/cli/latest/reference/ses/send-email.html
- AWS provider S3 bucket docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- AWS provider S3 bucket versioning docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning

## Issues Found
- The drift workflow assumed `tofu` was already available on `ubuntu-latest`. I added `opentofu/setup-opentofu@v1`, which is the documented way to install OpenTofu in GitHub Actions.
- The drift workflow mishandled `tofu plan -detailed-exitcode` by continuing after exit code `1` and then attempting to read `tfplan`. I changed it to capture the exit code explicitly, fail on real plan errors, and only continue to `tofu show` for successful plan outcomes.
- The scheduled drift example used a normal plan and parsed `.resource_changes[]`, which can mix planned configuration changes with actual drift. I changed it to `tofu plan -refresh-only` and `.resource_drift[]?` so the workflow is specifically detecting drift.
- The Slack alert step used `if: failure()` alone, which could fire on general plan errors and send a misleading drift notification. I narrowed it to drift failures by checking for `steps.plan.outputs.exit_code == '2'`.
- The evidence export step wrote to `artifacts/state-...json` without creating the `artifacts/` directory first. I added `mkdir -p artifacts` so the redirect works on a clean runner.
- The `aws ses send-email` example used `--body`, which is not a valid shorthand flag for that CLI command, and its message implied an attachment that the command did not send. I replaced it with the valid `--text` shorthand and accurate wording.
- The Python compliance-check example used a brittle string match for SSH port detection and an outdated S3 versioning check on `aws_s3_bucket`. I updated it to use numeric port-range checking and the dedicated `aws_s3_bucket_versioning` resource pattern.

## Review Notes
- `tofu show -json` exposes sensitive state values in plain text, so any compliance archive receiving those artifacts should be access-controlled and encrypted.
- The custom `scripts/*.py` commands are project-specific examples rather than documented third-party CLIs, so the review focused on the surrounding platform behavior, workflow semantics, and shell command correctness.
