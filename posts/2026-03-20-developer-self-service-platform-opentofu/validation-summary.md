# Validation Summary: How to Build a Developer Self-Service Platform with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu
- Amazon ECS on AWS Fargate
- AWS Systems Manager Parameter Store
- GitHub Actions
- AWS OIDC-based authentication for GitHub Actions

## Sources Consulted
- OpenTofu backend configuration docs: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu `init` command docs: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu input variables docs: https://opentofu.org/docs/language/values/variables/
- OpenTofu workspace docs: https://opentofu.org/docs/cli/workspaces/
- OpenTofu `workspace select` docs: https://opentofu.org/docs/cli/commands/workspace/select/
- OpenTofu module source docs: https://opentofu.org/docs/v1.9/language/modules/sources/
- GitHub Actions workflow syntax docs: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions event docs for `pull_request`: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request
- GitHub OIDC to AWS docs: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- `opentofu/setup-opentofu` action docs: https://github.com/opentofu/setup-opentofu
- `aws-actions/configure-aws-credentials` action docs: https://github.com/aws-actions/configure-aws-credentials
- Amazon ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/userguide/task_definition_parameters.html
- Amazon ECS Fargate task definition differences: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- Amazon ECS container health checks: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html

## Issues Found
- The platform module interface omitted the `environment` input even though the internal example used `var.environment` in SSM parameter lookups. I added the missing variable so the public and internal module snippets match.
- The root `infra/main.tf` example referenced `var.environment` and `var.image_tag` without declaring those root variables, and it did not pass `environment` into the child module. I added both variable declarations and passed `environment = var.environment` in the module call.
- The GitHub Actions workflow would not work on a standard GitHub-hosted runner because it ran `tofu` from the repository root instead of `infra`, did not install OpenTofu, did not initialize the working directory with `tofu init`, and did not authenticate to AWS. I updated the workflow to use `working-directory: infra`, `opentofu/setup-opentofu`, AWS OIDC authentication via `aws-actions/configure-aws-credentials`, and `tofu init`.
- The provisioning workflow used `github.sha` for a `pull_request` event. GitHub documents that `GITHUB_SHA` on `pull_request` points to the merge commit, not the PR head commit. I changed the image tag input to `github.event.pull_request.head.sha` so the example aligns with PR-image tagging workflows.
- The ECS/Fargate variable descriptions implied a narrow fixed set of CPU and memory values. AWS now supports a broader set of valid Fargate sizes, and valid memory values depend on the selected CPU. I adjusted the descriptions to present those values as examples rather than an exhaustive list.

## Review Notes
- The S3 backend example uses `var.environment` inside the backend block. This is supported in current OpenTofu documentation, but it relies on that variable being available during `tofu init`.
- The workflow is technically correct for repositories where the runner is allowed to assume an AWS role. For fork-based pull requests, GitHub Actions approval and repository security settings can affect whether the workflow is allowed to run.
