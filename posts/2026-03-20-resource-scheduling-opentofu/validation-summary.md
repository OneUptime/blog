# Validation Summary: How to Configure Resource Scheduling with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- AWS EventBridge scheduled rules
- AWS Lambda
- AWS IAM roles and inline policies
- Amazon EC2 instance tags and start/stop APIs
- Amazon RDS DB instance tags and start/stop APIs
- Amazon EC2 Auto Scaling scheduled actions
- HashiCorp AWS provider

## Sources Consulted
- OpenTofu configuration syntax documentation: https://opentofu.org/docs/language/syntax/configuration/
- OpenTofu `jsonencode` function documentation: https://opentofu.org/docs/language/functions/jsonencode/
- HashiCorp AWS provider `aws_lambda_function` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- HashiCorp AWS provider `aws_cloudwatch_event_rule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_rule.html.markdown
- HashiCorp AWS provider `aws_cloudwatch_event_target` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_target.html.markdown
- HashiCorp AWS provider `aws_lambda_permission` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- HashiCorp AWS provider `aws_autoscaling_schedule` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_schedule.html.markdown
- HashiCorp AWS provider `aws_iam_role` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role.html.markdown
- HashiCorp AWS provider `aws_iam_role_policy` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy.html.markdown
- AWS EventBridge scheduled rule documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- AWS EventBridge resource-based policy guidance for Lambda targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS Lambda runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS IAM example for starting or stopping EC2 instances by tag: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_ec2-start-stop-tags.html
- AWS Service Authorization Reference for Amazon EC2: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS Service Authorization Reference for Amazon RDS: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrds.html
- AWS EC2 Auto Scaling scheduled scaling documentation: https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html
- Amazon RDS stopping a DB instance documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html

## Issues Found
- The post described the approach as AWS Instance Scheduler, but the code implements a custom Lambda invoked by EventBridge scheduled rules. I updated the description, heading, and conclusion to refer to EventBridge scheduled rules.
- The cost-saving claim referred to overall costs. Because stopped EC2/RDS resources can still incur storage, backup, and related charges, I narrowed the claim to compute costs.
- The EventBridge cron expressions and comments mixed Eastern Time, UTC, and daylight saving assumptions. EventBridge scheduled rules use UTC, so I changed the examples to explicit 7 AM and 7 PM UTC schedules and aligned the Lambda timezone variable with UTC.
- The EventBridge Lambda targets were missing `aws_lambda_permission` resources, so EventBridge would not have permission to invoke the function. I added separate permissions for the start and stop rules.
- The IAM inline policy applied an `aws:ResourceTag/Environment` condition to both mutating and `Describe*` actions. I split the policy so `DescribeInstances` and `DescribeDBInstances` remain unrestricted by tag condition, while start/stop actions stay tag-scoped.
- The Auto Scaling scheduled action examples used fixed Eastern-to-UTC conversions that were inconsistent with the Lambda schedule. I updated the recurrences to 7 AM and 7 PM UTC and added `time_zone = "Etc/UTC"`.

## Review Notes
- The snippets still assume supporting configuration exists elsewhere, including the Lambda deployment package, Lambda handler code, AWS provider configuration, variables, AMI lookup, and Auto Scaling group.
- EventBridge Scheduler is a better future option for schedules that must follow a local timezone and daylight saving changes.
- RDS DB instances stopped manually or by automation can restart after seven consecutive stopped days, and storage-related charges continue while stopped.
- `tofu` and `terraform` were not installed locally, so validation was performed by static review against official documentation rather than by running a local plan.
