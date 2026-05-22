# Validation Summary: How to Use Savings Plans with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Savings Plans
- AWS Budgets
- Amazon EC2
- AWS Lambda
- Amazon ECS on AWS Fargate
- Amazon CloudWatch
- Amazon SNS

## Sources Consulted
- AWS Savings Plans User Guide: Savings Plans types: https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html
- AWS Savings Plans User Guide: Understanding how Savings Plans apply to your usage: https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html
- AWS Cost Management User Guide: Creating a Savings Plans budget: https://docs.aws.amazon.com/cost-management/latest/userguide/create-savingsplans-budget.html
- AWS Lambda Developer Guide: Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Amazon EC2 User Guide: CloudWatch metrics available for EC2 instances: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/viewing_metrics_with_cloudwatch.html
- Terraform language documentation: for_each meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform AWS Provider documentation: aws_budgets_budget resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget

## Issues Found
- The post said Savings Plans come in three types. AWS currently documents four types: Compute, Database, EC2 Instance, and SageMaker AI Savings Plans. Updated the section to include Database Savings Plans and the current SageMaker AI naming.
- The introduction implied all Savings Plans apply across instance families, sizes, and regions. Updated the wording to make that broad flexibility specific to Compute Savings Plans.
- The Terraform EC2 example used both `for_each` and `count` in the same `aws_instance` resource block. Terraform does not allow both meta-arguments in one block, so the example now flattens the configured counts into a single `for_each` map.
- The Lambda example used `nodejs18.x`, which AWS lists as deprecated as of September 1, 2025. Updated the example runtime to `nodejs22.x`.

## Review Notes
- The AWS Budgets examples use valid Savings Plans budget types and percentage units.
- The CloudWatch dashboard example is syntactically valid Terraform, but CPU utilization by instance type is only a coarse proxy for Savings Plans planning. Cost Explorer Savings Plans recommendations remain the authoritative source for commitment recommendations.
