# Validation Summary: How to Implement Infrastructure Cost Optimization Strategy with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Terraform AWS Provider
- AWS EC2, RDS, Lambda, IAM, EventBridge Scheduler, and EC2 Auto Scaling
- GitHub Actions
- Infracost CLI
- FinOps and cloud cost allocation tagging

## Sources Consulted
- Terraform CLI `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform AWS Provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS Provider `aws_scheduler_schedule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/scheduler_schedule
- Terraform AWS Provider `aws_lambda_permission` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS Lambda supported runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS EventBridge scheduled rules documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- AWS EventBridge Scheduler schedule types documentation: https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html
- Infracost CLI commands documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost GitHub Actions documentation: https://github.com/marketplace/actions/infracost-actions
- HashiCorp AWS Provider default tags guidance: https://support.hashicorp.com/hc/en-us/articles/4406026108435-Known-issues-with-default-tags-in-the-Terraform-AWS-Provider-3-38-0-4-67-0

## Issues Found
- The scheduling example used `aws_cloudwatch_event_rule` and `aws_cloudwatch_event_target` for scheduled Lambda invocation. AWS now documents EventBridge scheduled rules as a legacy feature and recommends EventBridge Scheduler for new scheduled workloads. I changed the example to `aws_scheduler_schedule`.
- The scheduling example manually converted Eastern time to UTC, which is only correct during standard time and does not handle daylight saving time. I changed the schedule expressions to local Eastern times and added `schedule_expression_timezone = "America/New_York"`.
- The scheduling example did not include the execution role that EventBridge Scheduler needs to invoke the Lambda target. I added an IAM role trusted by `scheduler.amazonaws.com` and an inline policy granting `lambda:InvokeFunction` on the scheduler Lambda.
- The GitHub Actions example ran Terraform and Infracost commands without installing Terraform or installing/authenticating the Infracost CLI. I added `hashicorp/setup-terraform@v3` and `infracost/actions/setup@v3` with `INFRACOST_API_KEY`.
- The GitHub Actions example posted a PR comment without explicitly granting token permissions. I added workflow permissions for repository contents, issues, and pull requests.
- The `actions/github-script` step called `github.rest.issues.createComment` without awaiting the API call. I added `await` so the script waits for the comment request to complete.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The snippets were reviewed against official provider and service documentation instead.
- AWS Lambda `python3.11` remains a supported runtime as of the review date, but AWS recommends moving Amazon Linux 2 based runtimes to Amazon Linux 2023 based runtimes when practical.
- The AWS provider `default_tags` approach is valid. For older AWS provider versions 3.38.0 through 4.67.0, HashiCorp documents known edge cases when default tags overlap with identical resource-level tags; AWS provider 5.0.0 and newer fixed several of those issues.
