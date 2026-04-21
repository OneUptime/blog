# Validation Summary: How to Tear Down Temporary Environments with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu workspaces and lifecycle meta-arguments
- GitHub Actions
- AWS IAM/OIDC for GitHub Actions
- AWS Lambda
- Amazon EventBridge scheduled rules
- AWS Budgets and cost allocation tags
- Terraform AWS provider resources

## Sources Consulted
- OpenTofu plan command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu destroy command documentation: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu show command documentation: https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu init documentation: https://opentofu.org/docs/cli/init/
- OpenTofu workspace delete documentation: https://opentofu.org/docs/v1.11/cli/commands/workspace/delete/
- OpenTofu strings and templates documentation: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu format function documentation: https://opentofu.org/docs/language/functions/format/
- OpenTofu v1.11.0 release notes: https://github.com/opentofu/opentofu/releases/tag/v1.11.0
- GitHub Actions OIDC reference: https://docs.github.com/en/actions/reference/security/oidc
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- opentofu/setup-opentofu documentation: https://github.com/opentofu/setup-opentofu
- Terraform AWS provider aws_budgets_budget documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS provider aws_cloudwatch_event_target documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider aws_lambda_permission documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Amazon EventBridge scheduled rule documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- AWS Budgets filter documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/budgets-create-filters.html/
- AWS cost allocation tag documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/operatorguide/sdks-functions.html

## Issues Found
- The GitHub Actions cleanup workflow assumed a role through OIDC but did not grant `id-token: write`. Added workflow permissions with `id-token: write` and `contents: read`.
- The cleanup workflow ran OpenTofu commands on a fresh runner without initializing the working directory. Added `tofu init -input=false` before selecting the workspace.
- The automated destroy command could still prompt for input variables in CI. Added `-input=false` to the `tofu destroy -auto-approve` command.
- The EventBridge scheduled target for the Lambda function was missing the resource-based Lambda permission required for EventBridge to invoke the function. Added an `aws_lambda_permission` resource with `principal = "events.amazonaws.com"` and the rule ARN as `source_arn`.
- The EventBridge schedule comment said midnight without specifying the timezone. Updated it to midnight UTC, matching EventBridge scheduled rule behavior.
- The AWS Budgets tag filter used `$${var.pr_number}`, which escapes interpolation in OpenTofu strings instead of appending the variable after the AWS tag-value separator. Replaced it with `format("user:PRNumber$%s", var.pr_number)`.
- The best-practice tag key used `PR`, while the budget filter used `PRNumber`. Updated the best practice to use `PRNumber` consistently.
- The budget guidance did not mention that user-defined AWS cost allocation tags must be activated before tag-based Budgets filtering works. Added that requirement to the best-practice bullet.
- The destroy-plan review bullet implied `tofu plan -destroy` can reveal cloud resources not tracked in state. Clarified that orphaned tagged resources must be checked separately.
- The state retention bullet conflicted with deleting the workspace after destroy. Updated it to recommend retaining destroy logs or backend state version history for debugging.

## Review Notes
- The dynamic `prevent_destroy = !local.is_ephemeral` example is valid for current OpenTofu 1.11.x, which allows `prevent_destroy` to refer to same-module symbols. Older OpenTofu versions require literal lifecycle values.
- The `aws_cloudwatch_event_rule` scheduled-rule resource remains valid, but AWS documents scheduled rules as a legacy EventBridge feature; EventBridge Scheduler is generally preferable for new schedule-heavy designs.
- The `nodejs20.x` Lambda runtime was still supported on 2026-04-21, but AWS lists its deprecation date as 2026-04-30. Consider moving examples to `nodejs22.x` in a future content refresh.
