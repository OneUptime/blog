# Validation Summary: How to Implement Cost Governance with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Budgets
- AWS Config managed rules
- AWS Organizations tag policies and service control policies
- AWS Cost Explorer Cost Anomaly Detection
- Terraform Cloud run tasks and cost estimation workflows

## Sources Consulted
- Terraform AWS provider `aws_budgets_budget` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/budgets_budget.html.markdown
- Terraform AWS provider `aws_config_config_rule` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/config_config_rule.html.markdown
- Terraform AWS provider `aws_organizations_policy` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/organizations_policy.html.markdown
- Terraform AWS provider `aws_organizations_policy_attachment` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/organizations_policy_attachment.html.markdown
- Terraform AWS provider `aws_ce_anomaly_monitor` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_monitor.html.markdown
- Terraform AWS provider `aws_ce_anomaly_subscription` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_subscription.html.markdown
- AWS Config managed rule `required-tags` documentation: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS Organizations tag policy syntax and examples: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_example-tag-policies.html
- AWS Organizations tag policy enforcement documentation: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_tag-policies-enforcement.html
- AWS Organizations resource types that support tag policy enforcement: https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_supported-resources-enforcement.html
- AWS RDS service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrds.html
- AWS EC2 IAM policy examples for `ec2:InstanceType`: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ExamplePolicies_EC2.html
- Terraform `format` function documentation: https://developer.hashicorp.com/terraform/language/functions/format

## Issues Found
- The AWS Budgets tag cost filter used `user:Team$${each.key}`. In Terraform strings, `$${` escapes interpolation, so this would render the literal text `${each.key}` instead of the team name. Changed it to `format("user:Team$%s", each.key)`, which produces the `TagKey$TagValue` format documented for AWS Budgets tag filters.
- The AWS Config `REQUIRED_TAGS` scope included `AWS::Lambda::Function`, but the official `required-tags` managed rule resource type list does not include Lambda functions. Removed Lambda from that AWS Config rule scope.
- The AWS Organizations tag policy description implied that tag policies alone enforce missing required tags. AWS documentation distinguishes tag value/case enforcement from required tag key reporting and IaC enforcement. Updated the description wording and added `report_required_tag_for` entries for the shown EC2, RDS, and S3 resource types.

## Review Notes
- The Terraform snippets are illustrative and still assume surrounding resources and variables exist, such as `aws_sns_topic.cost_alerts`, budget variables, and resource collections used in the cost estimate output.
- SNS notifications for AWS Budgets and Cost Anomaly Detection generally require an SNS topic policy allowing the AWS service to publish to the topic. The post references an existing topic but does not show that supporting policy.
