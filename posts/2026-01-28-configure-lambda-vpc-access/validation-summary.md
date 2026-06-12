# Validation Summary: How to Configure Lambda VPC Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS VPC (subnets, security groups, ENIs)
- AWS CLI (ec2, lambda commands)
- Terraform (aws_security_group, aws_lambda_function, aws_vpc_endpoint, aws_nat_gateway, aws_cloudwatch_metric_alarm)
- AWS SAM / CloudFormation (AWS::Serverless::Function, AWS::EC2::SecurityGroup)
- IAM (AWSLambdaVPCAccessExecutionRole managed policy)
- AWS VPC Endpoints (Gateway and Interface)
- AWS NAT Gateway
- Amazon RDS (PostgreSQL)
- Node.js (pg library)

## Sources Consulted
- AWS Lambda VPC documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda execution roles / managed policies: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS CLI v2 reference for `ec2 authorize-security-group-egress`, `ec2 create-security-group`, `lambda update-function-configuration`
- Terraform AWS provider docs: aws_lambda_function, aws_security_group, aws_vpc_endpoint, aws_nat_gateway, aws_eip, aws_cloudwatch_metric_alarm
- AWS SAM policy templates: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-templates.html (VPCAccessPolicy is valid)
- CloudWatch Usage Metrics / Service Quotas integration: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Usage-Metrics.html
- node-postgres (pg) client docs: https://node-postgres.com/apis/client and https://node-postgres.com/apis/pool
- AWS VPC Endpoint service names: `com.amazonaws.<region>.<service>` format

## Issues Found

1. **Non-existent CloudWatch metric for ENI monitoring.** The "Monitor ENI Usage" example used `metric_name = "NetworkInterfaceCount"` in `namespace = "AWS/EC2"`. No such metric exists in the AWS/EC2 namespace — the AWS/EC2 namespace contains per-instance metrics (CPU, NetworkIn/Out, status checks), not ENI inventory counts. Fixed by switching to `namespace = "AWS/Usage"` with `metric_name = "ResourceCount"` and adding the `dimensions` block (Service/Class/Resource/Type) that Service Quotas publishes for tracking ENI quota usage.

2. **Pool-only options passed to a pg Client.** The RDS example built a `new Client(dbConfig)` but `dbConfig` included `idleTimeoutMillis` and `max` — these are options for `pg.Pool`, not `pg.Client`, and would be silently ignored. The comment "Connection pool settings for Lambda" was also misleading since a single Client (not a Pool) is being used. Removed the Pool-only fields and updated the comment to reflect the single-connection-per-instance intent.

## Review Notes

- ENI cold-start / deployment delay claim ("30-90 seconds"): historically accurate for Lambda VPC ENI provisioning. AWS introduced Hyperplane ENIs (sharing ENIs across function invocations) in 2019, which significantly reduced invocation cold-start impact, but ENI creation during function configuration changes can still take tens of seconds. The post's framing is fine.
- The Terraform `aws_eip` resource correctly uses `domain = "vpc"` (the current attribute; the older `vpc = true` was deprecated in AWS provider v5).
- Lambda runtime `nodejs20.x` is currently a supported runtime as of the review date.
- VPC endpoint Interface pricing (~$7.50/month) is per AZ/per endpoint; the example deploys to multiple subnets so real cost will scale accordingly. The "+ data" note covers the variable component, so the figure is acceptable as a ballpark.
- The IAM permissions block matches the contents of the managed `AWSLambdaVPCAccessExecutionRole` policy.
- The AWS CLI `--vpc-config` shorthand (`SubnetIds=subnet-a,subnet-b,SecurityGroupIds=sg-x`) is valid AWS CLI shorthand syntax; list elements are comma-separated until the next `Key=` is encountered.
- The `aws ec2 authorize-security-group-egress --source-group` usage is a common pattern in AWS docs and CLI examples; left as-is. Readers preferring strict v2 shorthand can equivalently use `--ip-permissions` with `UserIdGroupPairs`.
- The exact dimensions for AWS/Usage ResourceCount ENI tracking can vary depending on whether Service Quotas usage tracking is enabled for the relevant quota in the account; the example shows the standard schema used by Service Quotas.
