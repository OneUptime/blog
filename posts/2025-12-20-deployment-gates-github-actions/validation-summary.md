# Validation Summary: How to Set Up Deployment Gates in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (workflows, jobs, environments)
- GitHub Actions environment protection rules (required reviewers, wait timers, deployment branches)
- `workflow_dispatch` manual triggers with inputs
- YAML workflow syntax
- Bash / shell scripting in workflow steps (`curl`, `jq`, `bc`, `date`)

## Sources Consulted
- GitHub Docs — Managing environments for deployment: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- GitHub Docs — Deployments and environments (reference): https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Docs — Required reviewers and wait timer behavior (environment protection rules)

## Issues Found
1. **Incorrect required-reviewers configuration claim.** The "Setting Up Approval Requirements" section instructed readers to "Set how many approvals are needed (1-6)." This is inaccurate. Per GitHub's documentation, you can add up to 6 reviewers, but **only one of the listed reviewers needs to approve** for the deployment to proceed — there is no setting to configure the number of approvals required. Changed step 3 to "Add up to 6 individuals or teams who can approve deployments" and step 4 to clarify that only one of the listed reviewers needs to approve.

## Review Notes
- The wait timer maximum of 43200 minutes (30 days) is correct. The post writes the range as "0-43200"; GitHub treats 0 effectively as no wait, so this is acceptable.
- The "Custom Protection Rules" section intro mentions "the Deployments API," but the examples that follow actually implement gates via job dependencies (`needs:`) and conditional logic rather than GitHub's true custom deployment protection rules (which require a GitHub App). The code is valid and the patterns work as written; this is a framing imprecision rather than a technical error, so it was left unchanged.
- The rollback example correctly uses `steps.health.outcome == 'failure'` together with `continue-on-error: true` — `outcome` reflects the step result before `continue-on-error` is applied, so the rollback step triggers as intended.
- Boolean `workflow_dispatch` inputs are correctly compared against the string `'true'` (`github.event.inputs.skip_canary != 'true'`), since dispatch inputs arrive as strings.
- All YAML, job orchestration (`needs`), `$GITHUB_OUTPUT` usage, and shell snippets (`curl`/`jq`/`bc`/`TZ date`) are syntactically valid and current.
- `actions/checkout@v4` is a current, non-deprecated action version.
