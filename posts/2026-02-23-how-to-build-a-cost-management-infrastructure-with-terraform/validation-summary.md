# Validation Summary: How to Build a Cost Management Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS Provider
- AWS Budgets
- AWS Cost Anomaly Detection
- Amazon SNS
- AWS Lambda
- Amazon EventBridge scheduled rules
- AWS Config
- AWS Organizations tag policies
- Amazon S3 lifecycle management and Intelligent-Tiering
- Amazon EC2 Auto Scaling
- AWS Cost and Usage Reports

## Sources Consulted
- Terraform AWS Provider `aws_budgets_budget` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/budgets_budget.html.markdown
- Terraform AWS Provider `aws_ce_anomaly_monitor` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_monitor.html.markdown
- Terraform AWS Provider `aws_ce_anomaly_subscription` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_subscription.html.markdown
- Terraform AWS Provider `aws_cur_report_definition` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cur_report_definition.html.markdown
- Terraform AWS Provider `aws_s3_bucket_lifecycle_configuration` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_lifecycle_configuration.html.markdown
- Terraform AWS Provider `aws_s3_bucket_intelligent_tiering_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_intelligent_tiering_configuration
- Terraform AWS Provider `aws_autoscaling_schedule` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/autoscaling_schedule.html.markdown
- Terraform AWS Provider `aws_cloudwatch_event_rule` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_rule.html.markdown
- Terraform AWS Provider `aws_config_config_rule` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_config_rule.html.markdown
- Terraform AWS Provider `aws_organizations_policy` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/organizations_policy.html.markdown
- AWS Cost Anomaly Detection SNS documentation: https://docs.aws.amazon.com/cost-management/latest/userguide/ad-SNS.html
- AWS Organizations tag policies documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies.html
- AWS Organizations tag policy enforcement documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies-enforcement.html
- AWS Config `required-tags` managed rule documentation: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- Amazon EventBridge scheduled rule documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html

## Issues Found
- The Cost Anomaly Detection SNS example created an SNS topic but did not grant `costalerts.amazonaws.com` permission to publish to it. Added an SNS topic policy and a `depends_on` relationship for the anomaly subscription.
- The Resource Scheduling heading was missing Markdown heading syntax. Changed it to a level-two heading.
- The EventBridge schedule comments did not mention that scheduled rules use UTC. Added a note and updated the comments to say 7 AM / 7 PM UTC.
- The Organizations policy was labeled as an SCP and described as preventing creation of resources without required tags, but the Terraform resource was a `TAG_POLICY`. Tag policies standardize tag usage and do not enforce missing tags on untagged resources. Updated the text and code comment to describe it as a tag policy.
- The Auto Scaling CPU policy comment said the policy keeps utilization between 40-70%, but a target tracking policy targets the configured value. Updated the comment to say it targets average CPU utilization at 60%.
- The Cost and Usage Report example omitted `additional_artifacts`, which the current Terraform AWS Provider documentation lists for `aws_cur_report_definition`. Added `additional_artifacts = ["ATHENA"]`, which is compatible with Parquet reports and `OVERWRITE_REPORT`.
- The wrapping-up paragraph overstated tagging enforcement. Updated it to say tagging checks help attribute costs to the right team.

## Review Notes
The snippets still assume surrounding infrastructure exists, such as the Lambda deployment package, scheduler IAM role, launch template, private subnet variable, and caller identity data source. That is acceptable for a focused blog example, but a production module would need those supporting resources and provider-region considerations, especially because Cost and Usage Reports are managed through `us-east-1`.
