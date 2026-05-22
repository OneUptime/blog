# Validation Summary: How to Implement Manual Approval Gates for Terraform Apply

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform CLI
- GitHub Actions environments and deployment approvals
- GitHub REST API and GitHub CLI
- GitLab CI manual jobs, needs, artifacts, and protected environments
- AWS CodePipeline manual approval actions
- Terraform AWS provider `aws_codepipeline`
- Azure DevOps deployment jobs, environments, approvals, and pipeline artifacts
- Slack Block Kit interactive messages
- Python Slack SDK

## Sources Consulted
- GitHub Docs: REST API endpoints for deployment environments - https://docs.github.com/rest/deployments/environments
- GitHub Docs: Reviewing deployments - https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments
- GitHub CLI manual / local `gh api --help` - https://cli.github.com/manual/gh_api
- HashiCorp Developer: `terraform plan` command - https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Developer: Create and apply saved Terraform plans - https://developer.hashicorp.com/terraform/tutorials/cli/plan
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Control how jobs run / manual jobs - https://docs.gitlab.com/ci/jobs/job_control/
- GitLab Docs: Protected environments - https://docs.gitlab.com/ci/environments/protected_environments/
- AWS CodePipeline Docs: Add a manual approval action - https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-action-add.html
- Terraform Registry: AWS provider `aws_codepipeline` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codepipeline
- Microsoft Learn: Azure Pipelines approvals and checks - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals
- Microsoft Learn: Azure DevOps environments - https://learn.microsoft.com/en-us/azure/devops/pipelines/process/environments
- Microsoft Learn: Azure Pipelines publish and download pipeline artifacts - https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pipeline-artifacts
- Microsoft Learn: Azure Pipelines checkout step - https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/steps-checkout
- Slack API Docs: Block Kit blocks and button elements - https://api.slack.com/reference/block-kit/blocks and https://api.slack.com/reference/block-kit/block-elements
- Slack Python SDK Docs: Basic usage with `WebClient` and `chat_postMessage` - https://tools.slack.dev/python-slack-sdk/legacy/basic_usage/

## Issues Found
- The GitHub API example used `gh api --field reviewers='[...]'`, which sends the reviewers payload as a string rather than a JSON array. Changed it to pass a JSON request body with `--input -`, matching GitHub's deployment environment API schema.
- The GitHub Actions Terraform plan step masked `terraform plan` failures because the command was piped through `tee` and only treated exit code `2` specially. Captured `${PIPESTATUS[0]}` immediately, handled exit codes `0` and `2`, and now exits non-zero for real Terraform errors.
- The GitLab example described a manual approval gate as "specific approvers" even though a plain manual job does not by itself restrict approvals to specific users. Changed the comment to "blocking manual job"; the protected environment section remains the correct mechanism for restricted deployers/approvers.
- The GitLab `apply` job combined `dependencies` with `needs`, which GitLab advises against. Replaced it with structured `needs` entries and explicit `artifacts: true` for the plan job so the saved Terraform plan is downloaded correctly.
- The Azure DevOps deployment job attempted to `cd terraform` without explicitly checking out the repository. Deployment jobs default to no checkout, so added `checkout: self` before running Terraform commands.
- The GitHub time-based approval snippet implied the wait timer could be configured inside workflow YAML. Updated the comment to clarify the wait timer is configured on the environment in GitHub settings.

## Review Notes
- The Terraform examples pin `terraform_version: 1.7.0` / `hashicorp/terraform:1.7.0`. That version is still usable for the shown commands, but HashiCorp's current CLI documentation lists newer versions; future edits may want to update the pinned example version.
- GitHub environment protection rules have plan and repository visibility constraints, especially for private/internal repositories on some plans.
- GitLab protected environments and deployment approvals have tier-specific availability.
- Terraform saved plan files can contain sensitive data in cleartext, so artifact retention and access controls should be reviewed in production pipelines.
