# Validation Summary: How to Avoid Running tofu apply Without a Saved Plan

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- GitHub Actions
- Atlantis
- Bash

## Sources Consulted
- OpenTofu `tofu plan` documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` documentation: https://opentofu.org/docs/v1.9/cli/commands/apply/
- OpenTofu initialization documentation: https://opentofu.org/docs/cli/init/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- GitHub Actions workflow syntax reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions workflow commands reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub Actions deployments and environments reference: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- Atlantis custom workflows documentation: https://www.runatlantis.io/docs/custom-workflows.html
- Atlantis usage documentation: https://www.runatlantis.io/docs/using-atlantis.html
- Atlantis repo-level `atlantis.yaml` documentation: https://www.runatlantis.io/docs/repo-level-atlantis-yaml.html

## Issues Found
- The timeline block was labeled as `hcl`, but the contents were plain explanatory text rather than valid HCL. I changed the fence to `text` so the snippet is not presented as runnable configuration.
- The GitHub Actions example handled `tofu plan -detailed-exitcode` incorrectly. On GitHub-hosted Linux runners, `run` steps use `bash -e` by default, so an exit code of `2` would stop the script before `changed=$?` was written to `$GITHUB_OUTPUT`. I replaced it with explicit exit-code capture and correct error handling.
- The GitHub Actions `plan` and `apply` jobs were missing `tofu init`. Fresh runners must initialize the working directory before `tofu plan` or `tofu apply`, so I added `tofu init -input=false` to both jobs.
- The GitHub Actions artifact upload ran unconditionally. I gated the upload on `steps.plan.outputs.changed == '2'` so the workflow only publishes a plan artifact when there are actual changes to apply.
- The comment `environment: production  # requires manual approval` overstated GitHub Actions behavior. An environment can require approval only when protection rules such as required reviewers are configured, so I corrected the comment.
- The Atlantis workflow example incorrectly tried to force a custom plan filename and pass a literal plan filename into the built-in `apply` step. Atlantis already manages its saved plan file internally. I replaced those steps with valid built-in `plan` and `apply` steps.
- The Atlantis example omitted the required top-level `version: 3` key and did not specify `terraform_distribution: opentofu`. I added both so the snippet is valid for an OpenTofu-based Atlantis setup.
- The summary described a saved plan file as a "cryptographic commitment", which is not how OpenTofu documents plan files. I rewrote that line to describe it accurately as an opaque saved-plan artifact containing the apply decisions made at plan time.

## Review Notes
- OpenTofu documents saved plan files as potentially sensitive artifacts because they include the full configuration, input values, and planned changes in cleartext. That caveat is relevant whenever plans are uploaded to CI artifacts.
- The freshness-check script uses GNU `stat -c %Y`, so it is Linux-specific as written.
- Runtime validation with `tofu` was not possible in this workspace because the CLI is not installed. The review relied on current official documentation and syntax inspection, and `validation.json` can be validated locally with `jq`.
