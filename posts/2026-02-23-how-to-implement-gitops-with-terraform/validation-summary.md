# Validation Summary: How to Implement GitOps with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform CLI and HCL
- Terraform workspaces, plans, applies, and drift detection
- GitOps principles
- GitHub Actions workflows
- AWS IAM policies and AWS Organizations service control policies
- Git audit commands
- Slack webhook notification pattern

## Sources Consulted
- OpenGitOps principles: https://github.com/open-gitops/documents/blob/main/PRINCIPLES.md
- Terraform CLI plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform saved plan workflow: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- Terraform apply command and saved plans: https://developer.hashicorp.com/terraform/tutorials/cli/apply
- Terraform workspace select command: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform CLI workspaces overview: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform yamldecode function: https://developer.hashicorp.com/terraform/language/functions/yamldecode
- Terraform file function reference: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp Terraform release checkpoint: https://checkpoint-api.hashicorp.com/v1/check/terraform
- hashicorp/setup-terraform action documentation: https://github.com/hashicorp/setup-terraform
- GitHub Actions pull_request branch filter documentation: https://docs.github.com/en/actions/how-tos/writing-workflows/choosing-when-your-workflow-runs/triggering-a-workflow
- GitHub Actions upload-artifact documentation: https://github.com/actions/upload-artifact
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- AWS IAM global condition key documentation for aws:PrincipalArn: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS Organizations SCP syntax documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_syntax.html

## Issues Found
- Pull request planning was mapped to a fake `plan-only` environment. The workflow would try to select or create a `plan-only` workspace and read `envs/plan-only.tfvars`, which would normally fail and would not produce a useful plan for the target environment. Changed the environment selection to use the pull request base branch for PRs and `GITHUB_REF_NAME` for pushes, while keeping `should_apply=false` on PRs.
- The workflow description said CI runs `fmt`, `validate`, and `plan`, but the workflow only ran `plan`. Added `terraform fmt -check -recursive` and `terraform validate -no-color` before planning.
- The GitHub Actions examples assumed role-based AWS credentials but did not request the `id-token: write` permission needed for GitHub OIDC role assumption. Added `permissions: contents: read` and `id-token: write` to both workflows.
- Terraform CLI commands in automation could still prompt for input in some cases. Added `-input=false` to `init`, `plan`, and `apply` commands.
- The workspace creation pattern used `terraform workspace select "$ENV" || terraform workspace new "$ENV"`. Replaced it with the documented `terraform workspace select -or-create "$ENV"` option in the planning job.
- Saved plan applies used `-auto-approve`. Terraform treats applying a saved plan file as prior approval and does not prompt, so the flag is unnecessary. Removed `-auto-approve` from saved-plan apply commands.
- The examples pinned Terraform `1.7.0`, which is stale for a 2026 post. Updated the CI examples to Terraform `1.15.4`, the current version reported by HashiCorp's release checkpoint during review.
- The Slack webhook `curl` command did not quote the webhook URL or send a JSON content type. Quoted the URL and added `Content-Type: application/json`.
- The Markdown code fence around the pull request template was broken by an inner triple-backtick plan block and a stray ```text closer. Changed the outer fence to four backticks and corrected the inner closing fence.

## Review Notes
- The Terraform and AWS snippets are illustrative and still require real account IDs, backend configuration, trust policy setup for GitHub OIDC, provider configuration, and matching `envs/*.tfvars` files before use.
- The GitOps framing is broadly correct, but Terraform with GitHub Actions is typically a CI-driven approximation of GitOps unless a pull-based reconciler or platform is responsible for continuously reconciling state.
- Running Terraform plans with AWS credentials on pull requests should be restricted to trusted branches or hardened carefully for public repositories and forked PRs.
