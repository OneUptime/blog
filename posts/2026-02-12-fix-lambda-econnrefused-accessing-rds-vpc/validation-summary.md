# Validation Summary: How to Fix Lambda 'ECONNREFUSED' When Accessing RDS in VPC

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon RDS
- Amazon RDS Proxy
- Amazon VPC
- Amazon EC2 security groups
- AWS IAM
- AWS CLI
- Python
- PyMySQL

## Sources Consulted
- AWS Lambda documentation: Giving Lambda functions access to resources in an Amazon VPC: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda documentation: Enable internet access for VPC-connected Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html
- AWS managed policy reference: AWSLambdaVPCAccessExecutionRole: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
- AWS CLI command reference: ec2 authorize-security-group-ingress: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI command reference: lambda update-function-configuration: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- Amazon RDS documentation: Creating a proxy for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-creating.html
- AWS CLI command reference: rds create-db-proxy: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-proxy.html
- AWS CLI command reference: rds register-db-proxy-targets: https://docs.aws.amazon.com/cli/latest/reference/rds/register-db-proxy-targets.html

## Issues Found
- The opening explanation treated ECONNREFUSED and a MySQL timeout example as the same failure mode. Updated it to say this is usually a networking issue, while also noting that refused connections can mean the database is not listening on the requested port.
- The description of `AWSLambdaVPCAccessExecutionRole` listed only three EC2 actions. Updated the permission list to include the current managed policy's additional subnet, private IP address, and CloudWatch Logs permissions.
- The RDS Proxy example created a proxy using the RDS security group and did not register a database target. Updated the example to create a proxy security group, allow Lambda-to-proxy and proxy-to-RDS traffic, use the proxy security group when creating the proxy, and register the database with the proxy's default target group.
- The Lambda VPC subnet guidance implied two subnets are a hard requirement for Lambda VPC configuration. Adjusted wording to present two subnets as high-availability guidance.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against the current AWS CLI command reference rather than local `--help` output. The Python sample is syntactically valid and uses the current PyMySQL connection API style for a basic connectivity check.
