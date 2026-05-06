# Validation Summary: How to Create CloudWatch Log Groups and Streams with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for OpenTofu
- Amazon CloudWatch Logs
- AWS Key Management Service (AWS KMS)
- AWS CLI
- AWS Lambda
- Amazon API Gateway
- Amazon ECS

## Sources Consulted
- OpenTofu resource and meta-argument documentation: https://opentofu.org/docs/language/resources/
- AWS provider `aws_cloudwatch_log_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_group
- AWS provider `aws_cloudwatch_log_stream` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_stream
- AWS provider `aws_caller_identity` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity
- AWS provider `aws_region` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region
- CloudWatch Logs KMS encryption documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html
- CloudWatch Logs concepts and log group/log stream definitions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatchLogsConcepts.html
- Working with log groups and log streams: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html
- API Gateway CloudWatch logging documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- Lambda log group configuration documentation: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-loggroups.html
- AWS CLI `aws logs tail` reference: https://docs.aws.amazon.com/cli/latest/reference/logs/tail.html
- AWS CLI `aws logs filter-log-events` reference: https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html
- Amazon CloudWatch pricing: https://aws.amazon.com/cloudwatch/pricing/

## Issues Found
- The prerequisites only mentioned CloudWatch Logs permissions, but the KMS-backed examples also require AWS KMS permissions. I updated the prerequisites to reflect that.
- The Lambda log group comment said the name must match `/aws/lambda/<function-name>`. AWS now supports custom Lambda log groups, so I corrected the comment to describe this as the default log group naming pattern.
- The API Gateway example labeled `/aws/apigateway/${var.project_name}` as an execution log group. API Gateway execution log groups are service-managed and named `API-Gateway-Execution-Logs_{rest-api-id}/{stage_name}` for REST APIs, so I corrected the example to describe it as an access log group instead.
- The KMS snippet referenced the current account and region context incompletely for a standalone example. I added `aws_caller_identity` and `aws_region` data sources and used the current provider region in the service principal and encryption-context ARN.
- The dynamic log stream example would collide with the two statically declared stream names (`instance-1` and `instance-2`) if applied together. I changed the dynamic example to generate distinct worker stream names.
- The conclusion said the shown KMS condition restricts the key to specific log groups, but the wildcard ARN in the snippet actually scopes usage to log groups in the configured account and region. I corrected the explanation.
- The conclusion included a hard-coded `$0.03/GB/month` storage claim without region context. CloudWatch pricing is region-specific and subject to change, so I changed this to the stable technical point that indefinite retention continues to accrue storage charges.

## Review Notes
- The AWS provider documentation was used for the OpenTofu HCL resource syntax because OpenTofu uses the same AWS provider resources and arguments.
- The current KMS example is valid for scoping use to log groups in the configured account and region. If stricter isolation is required, the condition can be narrowed further to exact log group ARNs as shown in AWS CloudWatch Logs KMS documentation.
