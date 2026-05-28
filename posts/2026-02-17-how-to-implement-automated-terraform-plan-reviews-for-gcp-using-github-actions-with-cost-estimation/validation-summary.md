# Validation Summary: How to Use Automated Terraform Plan Reviews for GCP Using GitHub Actions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Workload Identity Federation
- Google IAM and service accounts
- GitHub Actions
- Terraform CLI and Google Terraform provider resources
- Infracost CLI and GitHub Actions integration
- Bash, jq, and bc

## Sources Consulted
- Google GitHub Actions Auth README: https://github.com/google-github-actions/auth
- Google Cloud IAM Workload Identity Federation for deployment pipelines: https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- Terraform CLI `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform releases: https://github.com/hashicorp/terraform/releases
- GitHub Actions workflow syntax and permissions: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Infracost GitHub Actions documentation: https://www.infracost.io/docs/integrations/github_actions/
- Infracost GitHub Actions README: https://github.com/infracost/actions
- Infracost CLI command documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost Plan JSON API documentation: https://www.infracost.io/docs/integrations/infracost_api/

## Issues Found
- The workflow used `google-github-actions/auth@v2`; updated examples to `google-github-actions/auth@v3`, which is the current documented major version.
- The workflow pinned Terraform `1.7.0`; updated examples to Terraform `1.15.5`, the latest release available during validation.
- The `terraform plan ... | tee plan_output.txt` command recorded `$?`, which captures `tee`'s exit status rather than Terraform's exit status. Changed the snippet to use Bash `PIPESTATUS[0]`, write that value to `$GITHUB_OUTPUT`, and exit with the Terraform status.
- The `Save Plan JSON` step could run after a failed plan and fail because `tfplan` was missing. Added a condition so it only runs when the plan exit code is zero.
- The final plan failure check used the step outcome even though the step has `continue-on-error`. Changed it to check the explicit `steps.plan.outputs.exitcode` value.
- The Infracost baseline was described as coming from the main branch but the workflow only checked out the PR code. Added explicit checkout steps for the base branch before the baseline and the PR commit before the diff.
- The cost estimation workflow included a GCP authentication step even though Infracost does not need GCP credentials for price lookup. Removed that step from the example and clarified the security note.
- The cost threshold example assumed `diffTotalMonthlyCost` was always present and non-null. Updated the `jq` expression to default null or missing values to zero before numeric comparison.
- The description referred to automated approval workflows, but the post shows GitHub environment approval gates rather than automatic PR approval. Updated the wording to match the implementation.

## Review Notes
- `pull_request` workflows that post comments and use secrets may not work for untrusted fork pull requests because GitHub restricts token permissions and secrets in that context. The safer event choice depends on the repository's contribution model.
- The example uses broad `roles/viewer` and `roles/editor` roles for readability. Production workflows should replace them with least-privilege custom roles or narrower predefined roles for the specific Terraform-managed resources.
