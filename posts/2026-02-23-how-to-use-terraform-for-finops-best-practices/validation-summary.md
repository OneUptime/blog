# Validation Summary: How to Use Terraform for FinOps Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Cost and Usage Reports
- AWS Budgets
- Amazon EC2 Auto Scaling
- Amazon EventBridge
- Amazon S3 lifecycle policies
- AWS Cost Explorer Anomaly Detection
- Infracost
- GitHub Actions

## Sources Consulted
- Terraform AWS Provider documentation: `aws_cur_report_definition` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cur_report_definition
- Terraform AWS Provider documentation: `aws_budgets_budget` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Terraform AWS Provider documentation: `aws_autoscaling_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Terraform AWS Provider documentation: `aws_cloudwatch_event_rule` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS Provider documentation: `aws_s3_bucket_lifecycle_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS Provider documentation: `aws_ce_anomaly_subscription` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ce_anomaly_subscription
- AWS Cost Explorer API documentation for anomaly subscriptions - https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_CreateAnomalySubscription.html
- Infracost GitHub Actions documentation - https://github.com/infracost/actions
- Infracost CI/CD documentation - https://www.infracost.io/docs/integrations/cicd/
- GitHub Actions workflow syntax documentation - https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions

## Issues Found
- The Spot Instances example mixed `c6i`, `m6i`, and `c6g` instance types under one launch template. Graviton instance types require an ARM-compatible AMI or an instance-level launch template override, so the example was changed from `c6g.xlarge` to `c5.xlarge` to keep the override list architecture-compatible.
- The Infracost workflow used `infracost/actions/comment@v1`, which is not the current documented workflow in the maintained Infracost Actions repository. The example was updated to use the documented `infracost/actions/diff@v4` action with separate base and head checkouts.
- The best practices section grouped Spot Instances and Savings Plans together for predictable workloads. This was corrected to recommend Savings Plans for predictable workloads and Spot Instances for fault-tolerant, flexible workloads.

## Review Notes
Terraform was not installed in the local environment, so local `terraform validate` could not be run. The EventBridge schedule example correctly defines schedule rules, but a production auto-shutdown implementation also needs targets, permissions, and automation logic such as Lambda or SSM Automation. Several snippets intentionally omit surrounding resources and variables for brevity.
