# Validation Summary: How to Create IAM Roles for Cross-Service Access in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL syntax, `aws_iam_role`, `aws_iam_policy`, `aws_iam_role_policy`, `aws_iam_role_policy_attachment`, `aws_iam_policy_document` data source, `for_each`, `for` expressions, `jsonencode`, `title()`)
- AWS IAM (roles, trust policies, permission policies, `sts:AssumeRole`, `iam:PassRole`, `iam:PassedToService` condition key)
- AWS API Gateway (service principal `apigateway.amazonaws.com`, `lambda:InvokeFunction`)
- AWS EventBridge / CloudWatch Events (service principal `events.amazonaws.com`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, event patterns with `detail-type`)
- AWS Step Functions (service principal `states.amazonaws.com`, `states:StartExecution`)
- AWS Lambda (service principal `lambda.amazonaws.com`)
- AWS ECS (service principal `ecs-tasks.amazonaws.com`)
- AWS S3, DynamoDB, SQS, SNS, CloudWatch Logs (action names and ARN formats)

## Sources Consulted
- AWS IAM service-linked roles and service principals: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
- IAM `PassRole` permission: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html
- `iam:PassedToService` condition key: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- Terraform AWS provider `aws_iam_role`, `aws_iam_policy`, `aws_iam_policy_document` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider `aws_cloudwatch_event_rule` / `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- AWS EventBridge event patterns: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html
- AWS Step Functions logging permissions (vendedlogs / `logs:CreateLogDelivery` family): https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html
- HCL native syntax specification (identifier rules — hyphens allowed after first character): https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- Terraform `for_each` on data sources (supported since 0.13): https://developer.hashicorp.com/terraform/language/meta-arguments/for_each

## Issues Found
No technical issues found.

Verified specifically:
- All AWS service principals used in trust policies are the correct identifiers (`apigateway.amazonaws.com`, `events.amazonaws.com`, `states.amazonaws.com`, `lambda.amazonaws.com`, `ecs-tasks.amazonaws.com`).
- IAM action names (`sts:AssumeRole`, `lambda:InvokeFunction`, `states:StartExecution`, DynamoDB / SQS / SNS / S3 / CloudWatch Logs actions) and the `iam:PassedToService` condition key are accurate.
- The CloudWatch Logs actions listed for Step Functions (`logs:CreateLogDelivery`, `logs:GetLogDelivery`, `logs:UpdateLogDelivery`, `logs:DeleteLogDelivery`, `logs:ListLogDeliveries`, `logs:PutResourcePolicy`, `logs:DescribeResourcePolicies`, `logs:DescribeLogGroups`) match AWS's documented set required for Step Functions log delivery.
- HCL syntax is valid: `for_each` on `data "aws_iam_policy_document"` (supported since Terraform 0.13), `for` expressions producing object lists, `title()` built-in, `jsonencode` usage, and the `detail-type` key in EventBridge event patterns (hyphens are permitted in HCL identifiers after the first character).
- Internal links to the two related blog posts (`...lambda-functions-in-terraform` and `...ecs-tasks-in-terraform`) reference existing posts in this blog.

## Review Notes
- The post uses inline `Resource` lists with a single element in a couple of places (e.g., `Resource = ["arn:aws:lambda:us-east-1:*:function:api-*"]`). This is valid IAM JSON and valid HCL; readers could equivalently use a bare string.
- All ARNs and account IDs in examples use placeholder values (`*` and `123456789012`), which is appropriate for a tutorial.
- The S3 → Lambda section sets up the Lambda execution role but doesn't show the `aws_lambda_permission` or `aws_s3_bucket_notification` glue needed to actually wire S3 events to Lambda. That's consistent with the post's scope (IAM roles, not the full event integration), but a future expansion could mention this.
- The post does not pin a specific AWS provider version. All resources and arguments used are stable in modern AWS provider versions (4.x and 5.x), so this is fine, but a `required_providers` block example could be useful in a future revision.
