# Validation Summary: How to Save and Apply Plan Files in OpenTofu - Save Apply

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu saved plan files
- OpenTofu state and plan encryption
- GitHub Actions
- jq

## Sources Consulted
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu initialization documentation: https://opentofu.org/docs/cli/init/
- OpenTofu JSON output format documentation: https://opentofu.org/docs/internals/json-format/
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu setup action documentation: https://github.com/opentofu/setup-opentofu
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts
- GitHub Actions deployment environment documentation: https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments

## Issues Found
- The introduction and conclusion overstated saved plans as preventing all drift between review and deployment. Updated the wording to say saved plans prevent OpenTofu from generating a different plan at deployment time, while stale saved plans still require replanning.
- The plan file format section said plan files are encrypted when state encryption is configured. OpenTofu has separate state and plan encryption configuration, and unencrypted plan files can contain sensitive values in cleartext. Updated the wording accordingly.
- The saved plan validity section incorrectly required unchanged configuration and resource state. Saved plans are tied primarily to the captured state snapshot, backend configuration, plan options, and input values. Rewrote the bullets to describe backend state staleness, backend/encryption usability, and ephemeral variables.
- The GitHub Actions example did not install OpenTofu or run `tofu init`, so it would fail on standard GitHub-hosted runners. Added `opentofu/setup-opentofu@v1` and initialization steps to both plan and apply jobs.
- The GitHub Actions example treated any `tofu plan -detailed-exitcode` failure as "has changes." Since exit code 1 is an error and exit code 2 means changes are present, updated the workflow to capture the exit code, fail on errors, and mark changes only for exit code 2.
- The GitHub Actions environment comment implied that `environment: production` always requires approval. Updated it to point readers to environment protection rules, which are what enforce approval.
- The `jq` action-count example grouped only by the first planned action, which hid replacement actions such as `delete,create`. Updated it to group by the full action list.

## Review Notes
Plan artifacts should be access-controlled because saved plan files can contain sensitive values. For production CI/CD, pinning the OpenTofu version used in both plan and apply jobs would further improve reproducibility.
