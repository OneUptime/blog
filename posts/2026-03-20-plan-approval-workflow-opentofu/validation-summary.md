# Validation Summary: How to Build a Custom Plan Approval Workflow for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- GitHub Actions
- GitHub Actions environments and deployment protection rules
- AWS GitHub Actions OIDC authentication
- Slack incoming webhooks
- Bash
- YAML workflow configuration

## Sources Consulted
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub reviewing deployments: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments
- GitHub events that trigger workflows: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `show` command: https://opentofu.org/docs/cli/commands/show/
- OpenTofu backend configuration and plan-file sensitivity notes: https://opentofu.org/docs/language/settings/backends/configuration/
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- AWS credentials action README: https://github.com/aws-actions/configure-aws-credentials
- Slack incoming webhooks: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/
- Slack messaging structure and attachment guidance: https://docs.slack.dev/messaging/

## Issues Found
- The introduction said the workflow used pull request reviews, but the implementation actually posts a pull request comment and uses GitHub environment approvals for the gating step. I changed the wording to match the workflow.
- The `tofu plan ... | tee plan_output.txt` step could mask `tofu plan` failures in GitHub Actions because the default shell behavior does not add `pipefail` unless `shell: bash` is explicitly set. I added `shell: bash` and quoted `"$GITHUB_OUTPUT"` so failures propagate correctly and the output write is safer.
- The apply jobs installed the default OpenTofu version while the plan job was pinned to `1.9.0`. I pinned the apply jobs to `1.9.0` as well so the saved-plan workflow does not drift between plan and apply steps.
- The GitHub Environments section omitted an important platform limitation: required reviewers are only available for public repositories on GitHub Free, Pro, and Team. I added that caveat.
- The review paragraph implied the saved plan artifact itself was the thing reviewers would inspect, and it did not mention that saved plan files can contain sensitive data in cleartext. I clarified that reviewers inspect the PR comment or download the artifact for `tofu show`, and I added the sensitivity warning.
- The Slack example used OpenTofu's legacy `tofu show <file>` form. I updated it to the current explicit `tofu show -plan="$PLAN_FILE"` form recommended by the OpenTofu docs.

## Review Notes
- Slack `attachments` are still supported, but Slack documents them as legacy secondary attachments and recommends `blocks` for newer message layouts.
- For pull requests from forks, GitHub documents that `GITHUB_TOKEN` is read-only. If this workflow needs to comment on external contributor PRs, it will need a different design than the one shown here.
- The workflow was reviewed against official documentation; it was not executed end-to-end locally because it depends on GitHub Actions runtime behavior, repository environment settings, and cloud credentials.
