# Validation Summary: How to Build Plan Approval Dashboards for OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu plan JSON output
- GitHub Actions
- GitHub Environments
- GitHub workflow artifacts
- Python 3
- `marocchino/sticky-pull-request-comment`

## Sources Consulted
- OpenTofu JSON Output Format: https://opentofu.org/docs/internals/json-format/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `show` command: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu initialization docs: https://opentofu.org/docs/cli/init/
- OpenTofu core workflow guide: https://opentofu.org/docs/intro/core-workflow/
- GitHub Docs, workflow artifacts: https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts
- GitHub Docs, store and share data with workflow artifacts: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub Docs, deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Docs, reviewing deployments: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments
- Python 3.12 deprecations: https://docs.python.org/3.12/deprecations/
- `opentofu/setup-opentofu` action: https://github.com/opentofu/setup-opentofu
- `marocchino/sticky-pull-request-comment` action: https://github.com/marocchino/sticky-pull-request-comment

## Issues Found
- The post described the dashboard as if it directly approved or rejected deployments, but the actual approval gate is a GitHub Environment review. I corrected the introductory explanation, updated the architecture diagram, and replaced the placeholder HTML buttons with guidance that points readers to the GitHub approval step.
- The Python example used `datetime.utcnow()`, which is deprecated in Python 3.12. I replaced it with `datetime.now(timezone.utc)` and updated the import accordingly.
- The workflow example did not include the steps needed to make the OpenTofu commands actually run in CI. I added repository checkout, OpenTofu setup, `tofu init`, creation of a saved plan, and JSON export from that saved plan.
- The apply job tried to run `tofu apply -auto-approve tfplan` in a separate job without transferring the saved plan between jobs. I added artifact upload/download for `tfplan`, initialized OpenTofu in the apply job, and changed the command to `tofu apply tfplan`, which matches saved-plan mode.
- The PR comment text linked to the workflow run page but implied it was a direct dashboard download. I updated the wording so it correctly tells readers to open the workflow run and download the `plan-dashboard` artifact.
- The replacement styling in the dashboard example was inconsistent: replacement actions were defined in CSS but rendered with delete styling in the detailed change list. I fixed the CSS class selection so replacements are highlighted distinctly.
- The GitHub Environments section omitted an important platform caveat. I added that required reviewers are only available for public repositories on GitHub Free, Pro, and Team, and clarified that the job waits for review rather than claiming a specific notification path.

## Review Notes
- Saved OpenTofu plan files can contain sensitive data in cleartext. Uploading `tfplan` as a workflow artifact is valid for this pattern, but access and retention should be scoped carefully.
- The workflow snippets still assume cloud/provider credentials are configured for `tofu init`, `tofu plan`, and `tofu apply`.
