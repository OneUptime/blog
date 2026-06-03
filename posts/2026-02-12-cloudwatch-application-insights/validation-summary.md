# Validation Summary: How to Set Up CloudWatch Application Insights

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CloudWatch Application Insights
- AWS CLI
- AWS Resource Groups
- AWS CloudFormation
- AWS IAM
- Amazon SNS
- AWS Systems Manager OpsCenter

## Sources Consulted
- AWS CloudWatch Application Insights command-line setup guide: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/appinsights-setting-up-command.html
- AWS CLI `application-insights create-application` reference: https://docs.aws.amazon.com/cli/latest/reference/application-insights/create-application.html
- AWS CLI `application-insights update-component-configuration` reference: https://docs.aws.amazon.com/cli/latest/reference/application-insights/update-component-configuration.html
- AWS CLI `application-insights list-problems` reference: https://docs.aws.amazon.com/cli/latest/reference/application-insights/list-problems.html
- AWS CLI `application-insights describe-problem` reference: https://docs.aws.amazon.com/cli/latest/reference/application-insights/describe-problem.html
- AWS CLI `application-insights describe-problem-observations` reference: https://docs.aws.amazon.com/cli/latest/reference/application-insights/describe-problem-observations.html
- AWS CLI `resource-groups create-group` reference: https://docs.aws.amazon.com/cli/latest/reference/resource-groups/create-group.html
- AWS CloudFormation `AWS::ApplicationInsights::Application` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-applicationinsights-application.html
- AWS CloudFormation `AWS::ResourceGroups::Group` and `ResourceQuery` references: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-resourcegroups-group.html
- AWS CloudFormation `AWS::ResourceGroups::Group Query` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resourcegroups-group-query.html
- AWS IAM policy for CloudWatch Application Insights: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/appinsights-iam.html
- AWS CloudWatch Application Insights supported components: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/appinsights-what-is.html

## Issues Found
- The IAM policy example was fenced as JSON but included a `//` comment, which makes it invalid JSON. Removed the comment.
- The IAM policy example omitted AWS's documented setup permissions for Application Insights onboarding: `iam:CreateServiceLinkedRole`, `iam:ListRoles`, and `resource-groups:ListGroups`. Added these actions to the policy.
- The CLI application creation example did not enable auto-configuration even though the post describes automatic setup. Added `--auto-config-enabled`, which is the current AWS CLI flag for automatically configuring unmonitored resources.
- The `update-component-configuration` example used `--monitor true`, but AWS CLI boolean flags use `--monitor` or `--no-monitor`. Changed it to `--monitor`.
- The example problem IDs used `p-1234567890`, which does not match the current AWS CLI/API problem ID pattern. Replaced them with UUID-shaped placeholder IDs.

## Review Notes
- The CloudFormation `AWS::ApplicationInsights::Application` properties in the post are current and match the official template reference.
- The CloudFormation `AWS::ResourceGroups::Group` tag-based query shape is current and valid for CloudFormation, where `Query` is a structured object rather than the escaped JSON string used by the Resource Groups CLI.
- The post's supported-resource overview is broadly accurate; AWS currently documents support for EC2, EBS, RDS, ELB, Auto Scaling groups, Lambda, SQS, DynamoDB tables, S3 bucket metrics, Step Functions, API Gateway REST API stages, ECS, EKS, Kubernetes on EC2, and SNS topics.
