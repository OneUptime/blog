# Validation Summary: How to Audit Infrastructure Changes Made by OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Git
- GitHub Actions
- AWS CloudTrail
- Amazon Athena
- AWS CLI and Amazon S3

## Sources Consulted
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `show` command docs: https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- OpenTofu machine-readable UI docs: https://opentofu.org/docs/v1.8/internals/machine-readable-ui/
- Git `git-config` docs: https://git-scm.com/docs/git-config
- Git pathspec reference: https://git-scm.com/docs/gitglossary.html
- GitHub docs for signing commits: https://docs.github.com/en/authentication/managing-commit-signature-verification/signing-commits
- GitHub docs for protected branches and required signed commits: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub Actions workflow commands docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Actions workflow run history docs: https://docs.github.com/en/actions/how-tos/monitor-workflows/view-workflow-run-history?tool=webui
- GitHub Actions artifact retention docs: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- AWS CloudTrail `EventSelector` API reference: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_EventSelector.html
- AWS CloudTrail management events docs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-management-events-with-cloudtrail.html
- Amazon Athena docs for querying CloudTrail logs: https://docs.aws.amazon.com/athena/latest/ug/cloudtrail-logs.html
- Amazon Athena example CloudTrail queries: https://docs.aws.amazon.com/athena/latest/ug/query-examples-cloudtrail-logs.html

## Issues Found
- The Git snippet claimed `git config --global commit.gpgsign true` would "require" signed commits in a repository. I changed the wording to signing commits by default and switched the command to `git config commit.gpgsign true`, because `commit.gpgsign` sets a Git client default rather than enforcing a repository policy.
- The `tofu show` example used the legacy positional plan-file form. I updated it to `tofu show -json -plan=tfplan.binary` to match the current OpenTofu command syntax guidance.
- The plan logging section did not mention that `tofu show -json` can expose sensitive values in plain text. I added a storage warning so the recommendation is technically safe.
- The structured apply logging example wrote to `apply-logs/...` without creating the directory first. I added `mkdir -p apply-logs` so the command works as written.
- The GitHub Actions section described Actions as providing a built-in audit log and used `-auto-approve` with a saved plan file. I changed the wording to run history/logs/artifacts and removed `-auto-approve`, because saved plan mode already implies approval.
- The CloudTrail and Athena sections overstated coverage by implying all OpenTofu-made changes are captured and that the sample SQL isolated OpenTofu-initiated events. I narrowed the wording to AWS control plane and infrastructure changes, and corrected the SQL comment so it matches the queried event names.
- The conclusion said the approach would satisfy most compliance frameworks. I changed that to help satisfy change-management and auditability requirements, because actual compliance depends on implementation details and surrounding controls.

## Review Notes
- `tofu show -json` output can include sensitive values in plain text, so access to stored plan JSON should be tightly controlled.
- `tofu apply -json` produces a machine-readable JSON event stream, not a single JSON document.
- The CloudTrail HCL example is intentionally partial and assumes the referenced S3 bucket and any required bucket policy already exist.
