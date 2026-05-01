# Validation Summary: How to Estimate Costs Before Applying with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Infracost CLI
- GitHub Actions
- YAML
- Bash
- jq
- bc

## Sources Consulted
- Infracost CLI commands: https://www.infracost.io/docs/features/cli_commands/
- Infracost config file reference: https://www.infracost.io/docs/features/config_file/
- Infracost usage costs: https://www.infracost.io/docs/features/usage_based_resources/
- Infracost GitHub Actions README: https://github.com/infracost/actions
- Infracost usage example file: https://raw.githubusercontent.com/infracost/infracost/master/infracost-usage-example.yml
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout README: https://github.com/actions/checkout
- OpenTofu `plan` command reference: https://opentofu.org/docs/cli/commands/plan/

## Issues Found
- The workflow diagram implied `tofu plan` feeds `infracost breakdown`. Infracost's documented CLI flow can read the project directory directly, so the diagram was corrected to show OpenTofu code flowing into `infracost breakdown`.
- The local `infracost diff --path .` example was incomplete for directory-based diffs. `infracost diff` needs a baseline JSON via `--compare-to`, so a baseline `breakdown` command was added before the diff.
- The `terraform_var_files` entries incorrectly repeated each project's directory. Infracost resolves those file paths relative to the project's `path`, so they were changed to `terraform.tfvars`.
- The GitHub Actions job set only `pull-requests: write`. Because job-level `permissions` make unspecified scopes `none`, `contents: read` was added so `actions/checkout` has the documented token permission it expects.
- The Infracost setup action was pinned to `infracost/actions/setup@v2`; the official Infracost GitHub Action examples now use `@v3`, so the example was updated.
- The cost-gate flow tried to pipe diff text into `infracost comment github`. The comment command expects an Infracost JSON file via `--path`, so the workflow now writes `/tmp/infracost.json` once, reuses it for the threshold check, and passes it to the PR comment command.
- The usage-based estimate example was not a valid Infracost usage file: it used `infracost_usage.yml`, embedded usage as HCL comments, and used the wrong Lambda duration key. It was replaced with a valid `infracost-usage.yml` YAML example using `resource_usage`, `monthly_requests`, and `request_duration_ms`.
- The cross-environment comparison example incorrectly used directories with `--compare-to`. Infracost compares directories to a baseline JSON or compares two Infracost JSON outputs, so the example was corrected to compare JSON baselines.

## Review Notes
- Infracost's current GitHub integration docs recommend the GitHub App as the simpler and faster default, but the CLI-based GitHub Actions workflow used in the post is still supported.
- The CI example assumes `INFRACOST_API_KEY` and pull-request comment permissions are available to the workflow. Repositories that accept untrusted fork PRs often need separate handling for secrets and comment posting.
