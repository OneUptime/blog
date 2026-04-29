# Validation Summary: How to Create Lambda with CloudWatch Scheduled Events in OpenTofu

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- OpenTofu CLI
- HCL / OpenTofu configuration language
- AWS Lambda
- Amazon EventBridge scheduled rules (formerly CloudWatch Events)
- AWS IAM
- Terraform-compatible AWS provider resources: `aws_lambda_function`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, `aws_lambda_permission`
- Terraform-compatible Archive provider data source: `archive_file`
- Python 3.12

## Sources Consulted
- [OpenTofu CLI docs](https://opentofu.org/docs/cli/commands/)
- [OpenTofu init command docs](https://opentofu.org/docs/cli/init/)
- [Amazon EventBridge: Creating a scheduled rule (legacy)](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html)
- [Amazon EventBridge: Setting a schedule pattern for scheduled rules (legacy)](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html)
- [Amazon EventBridge: Using resource-based policies](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html)
- [AWS Lambda runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html)
- [AWS Lambda Python handler documentation](https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html)
- [Python 3.12 deprecations](https://docs.python.org/3/whatsnew/3.12.html)
- [Terraform Registry: `archive_file` data source](https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/archive_file)
- [Terraform Registry: `aws_cloudwatch_event_rule`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule)
- [Terraform Registry: `aws_cloudwatch_event_target`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target)
- [Terraform Registry: `aws_lambda_permission`](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission)

## Issues Found
1. **Prerequisites understated required AWS permissions**: The post said only Lambda and EventBridge permissions were needed, but the example also creates an IAM role and attaches a managed policy. Updated the prerequisites to include IAM permissions.
2. **Weekly rule was never wired to the Lambda target**: The post defined `aws_cloudwatch_event_rule.weekly_report` but did not create a matching `aws_cloudwatch_event_target` or `aws_lambda_permission`, so that schedule would never invoke the function. Added the missing weekly target and invoke permission.
3. **Python handler example would not run as written**: The handler called undefined helper functions and used `datetime.utcnow()` even though that API is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)` and added minimal helper implementations for daily, weekly, and cleanup jobs so the snippet is internally consistent.
4. **Conclusion overclaimed use of target `input`**: The text said to "Always" pass structured input via `input`, but EventBridge also supports sending the matched event, `input_path`, and `input_transformer`. Narrowed the wording so it accurately describes this pattern as useful when reusing one Lambda across multiple schedules.

## Review Notes
- AWS currently documents EventBridge scheduled rules as a legacy feature and recommends EventBridge Scheduler for new scheduled workloads. The post remains technically valid because scheduled rules still work, but readers should know Scheduler is the newer service.
- The cron examples are valid for EventBridge scheduled rules, and the UTC wording in the post is correct. Scheduled rules run on UTC+0 and have one-minute minimum precision.
- The examples also correctly use Lambda resource-based permissions with the `events.amazonaws.com` principal and the rule ARN as the source.
- `tofu` was not installed in this workspace, so the deploy commands were validated against official OpenTofu documentation rather than local `--help` output.
