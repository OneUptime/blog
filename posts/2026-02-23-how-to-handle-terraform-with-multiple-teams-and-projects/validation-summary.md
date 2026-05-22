# Validation Summary: How to Handle Terraform with Multiple Teams and Projects

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Cloud workspaces
- Terraform S3 backend and remote state
- AWS IAM
- Amazon ECS
- AWS Systems Manager Parameter Store
- GitHub Actions
- GitHub CODEOWNERS
- Amazon CloudWatch dashboards and Metrics Insights

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform cloud block documentation: https://developer.hashicorp.com/terraform/language/settings/terraform-cloud
- HashiCorp Terraform remote state data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Terraform plan/apply documentation: https://developer.hashicorp.com/terraform/tutorials/cli/plan
- Terraform AWS provider `aws_iam_role` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
- Terraform AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider `aws_ssm_parameter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter
- Terraform AWS provider `aws_cloudwatch_dashboard` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_dashboard
- AWS IAM global condition key documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS S3 condition key documentation: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- AWS CloudWatch dashboard body documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- AWS CloudWatch Metrics Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-insights-querylanguage.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub CODEOWNERS documentation: https://docs.github.com/articles/about-codeowners
- AWS credentials GitHub Action documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The S3 backend example used `dynamodb_table` for state locking. DynamoDB-based S3 backend locking is now deprecated, so the example was changed to `use_lockfile = true`.
- The IAM policy example combined `ec2:Describe*` with a resource-tag condition. Many AWS discovery actions require `Resource = "*"` and do not support resource-level tag filtering, so the snippet was changed to keep EC2 discovery as a separate read-only statement.
- The S3 read example used the global `aws:ResourceTag` key for object reads. For S3 object tag checks, the snippet now uses `s3:ExistingObjectTag/Shared`.
- The GitHub Actions workflow assumed an AWS role but did not grant the workflow OIDC token permission. Added `permissions: id-token: write` and `contents: read`.
- The CloudWatch dashboard example used `"${each.key}-*"` as a metric dimension value. CloudWatch metric dimensions require exact values in direct metric arrays, so the widget now uses a Metrics Insights expression filtered by `tag.Team` and grouped by `ServiceName`.
- The CloudWatch metric widget omitted `region`, which is required in metric widget properties. Added `region = "us-east-1"`.

## Review Notes
Some Terraform snippets are intentionally partial examples and reference surrounding resources or variables that are not shown, such as ECS task definitions, security groups, and team maps. The examples are technically valid patterns once those surrounding resources are supplied.
