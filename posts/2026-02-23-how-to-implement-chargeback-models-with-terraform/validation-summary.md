# Validation Summary: How to Implement Chargeback Models with Terraform

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform
- AWS Cost Explorer cost allocation tags
- AWS Cost Categories
- AWS Cost and Usage Reports
- Amazon S3 lifecycle configuration
- Amazon Athena
- AWS Glue crawlers
- AWS Lambda
- Amazon EventBridge
- Amazon SNS
- AWS Budgets

## Sources Consulted
- Terraform input variable validation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions#input-variable-validation
- Terraform `sum` function: https://developer.hashicorp.com/terraform/language/functions/sum
- Terraform `format` function: https://developer.hashicorp.com/terraform/language/functions/format
- Terraform AWS provider `aws_ce_cost_allocation_tag`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_cost_allocation_tag
- Terraform AWS provider `aws_ce_cost_category`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_cost_category
- Terraform AWS provider `aws_cur_report_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cur_report_definition
- Terraform AWS provider `aws_athena_database`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/athena_database
- Terraform AWS provider `aws_glue_crawler`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/glue_crawler
- Terraform AWS provider `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sns_topic_subscription
- Terraform AWS provider `aws_budgets_budget`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- AWS Cost Categories split charge rules: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/splitcharge-cost-categories.html
- AWS Cost Explorer `CostCategorySplitChargeRuleParameter`: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_CostCategorySplitChargeRuleParameter.html

## Issues Found
- The tagging section claimed to validate cost center format, but the original code only declared a `cost_center_pattern` variable and never used it. I replaced it with a Terraform `validation` block on `var.chargeback_tags.cost_center`.
- The EventBridge schedule targeted a Lambda function but did not grant EventBridge permission to invoke it. I added an `aws_lambda_permission` resource using `principal = "events.amazonaws.com"` and the schedule rule ARN as `source_arn`.
- The shared-cost allocation example defined percentages but did not apply them. I changed the cost category to create team values and added a `split_charge_rule` with `method = "FIXED"` and `ALLOCATION_PERCENTAGES`.
- The AWS Budgets tag filter used `"$${each.key}"`, which would escape interpolation and leave the team key literal instead of inserting the Terraform value. I changed it to `format("user:Team$%s", each.key)`, matching the AWS provider's documented `TagKeyValue` format.

## Review Notes
- Terraform was not installed in the workspace, so I could not run `terraform validate`. The snippets were checked against current HashiCorp Terraform language documentation, Terraform AWS provider documentation, and AWS Cost Management API documentation instead.
- The snippets still assume supporting IAM roles, Lambda source archive data, variables, and bucket policies are defined elsewhere, which is normal for a focused blog excerpt but would be required in a complete runnable module.
