# Validation Summary: How to Use RDS Proxy with Lambda for Database Connections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS Proxy
- AWS Lambda
- Amazon RDS and Aurora
- AWS Secrets Manager
- AWS IAM
- AWS CLI
- AWS CloudFormation
- Terraform security group configuration
- Node.js, `pg`, and AWS SDK for JavaScript v3
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon RDS Proxy User Guide: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html
- RDS Proxy concepts and connection pooling: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.howitworks.html
- Setting up database credentials for RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-secrets-arns.html
- Creating an RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-creating.html
- Connecting to a database through RDS Proxy: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-connecting.html
- RDS Proxy connection considerations: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-connections.html
- RDS Proxy CloudWatch metrics: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.monitoring.html
- AWS CLI `create-db-proxy` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-proxy.html
- AWS CLI `modify-db-proxy-target-group` guidance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-modifying-proxy.html
- CloudFormation `AWS::RDS::DBProxy`: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbproxy.html
- AWS SDK for JavaScript v3 RDS examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_rds_code_examples.html
- Amazon RDS Proxy pricing: https://aws.amazon.com/rds/proxy/pricing/

## Issues Found
- The post stated that RDS Proxy requires Secrets Manager credentials. Current RDS Proxy supports end-to-end IAM authentication without Secrets Manager credentials, so I qualified the prerequisite as applying to the password-based setup shown in the tutorial.
- The IAM authentication section said no password was needed without clarifying the standard IAM auth flow. I changed the text to explain that Lambda does not store the database password, while RDS Proxy still uses the Secrets Manager secret to authenticate to the database in the standard setup.
- The IAM authentication setup omitted the required `rds-db:connect` permission for the Lambda execution role. I added a minimal policy statement showing the proxy DB user ARN format.
- The Node.js IAM authentication example used `@aws-sdk/client-rds` and `rds.generateAuthenticationToken()`, which is not the AWS SDK for JavaScript v3 API. I replaced it with `@aws-sdk/rds-signer`, `new Signer(...)`, and `signer.getAuthToken()`.

## Review Notes
- The AWS CLI, CloudFormation, connection pool tuning, CloudWatch metric names, and pricing model were consistent with current AWS documentation.
- The TLS examples use `rejectUnauthorized: false`, which can be convenient for demos but disables certificate validation. A production implementation should validate TLS certificates rather than disabling verification.
