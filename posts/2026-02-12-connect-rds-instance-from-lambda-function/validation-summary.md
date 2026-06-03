# Validation Summary: How to Connect to an RDS Instance from a Lambda Function

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon RDS
- Amazon RDS Proxy
- AWS IAM database authentication
- AWS CLI
- Python
- psycopg2
- Node.js
- node-postgres
- PostgreSQL

## Sources Consulted
- AWS Lambda VPC configuration docs: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS managed policy AWSLambdaVPCAccessExecutionRole: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
- AWS CLI create-db-proxy command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-proxy.html
- Amazon RDS Proxy creation docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-creating.html
- Amazon RDS Proxy concepts and connection pooling docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.howitworks.html
- Amazon RDS Proxy pinning docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html
- Amazon RDS Proxy connection and IAM authentication docs: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-connecting.html
- Boto3 RDS generate_db_auth_token docs: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/generate_db_auth_token.html
- AWS Lambda reserved concurrency docs: https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
- node-postgres Client API docs: https://node-postgres.com/apis/client
- psycopg2 connection docs: https://www.psycopg.org/docs/connection.html

## Issues Found
- The Lambda VPC IAM policy omitted `ec2:DescribeSubnets`, which is included in AWS's current managed `AWSLambdaVPCAccessExecutionRole` permissions for VPC-attached Lambda functions. Added it to the policy snippet.
- The RDS Proxy benefits section claimed IAM authentication means "no database passwords needed." AWS documents that clients can use IAM authentication to the proxy, while the proxy can still use Secrets Manager credentials to connect to the database unless end-to-end IAM is configured. Reworded this to say database passwords do not need to be stored in Lambda.
- The RDS Proxy multiplexing wording implied all Lambda connections are always compressed into a smaller database connection pool. AWS documents that session pinning can reduce multiplexing effectiveness. Added the pinned-session caveat.
- The monitoring section mentioned only connection borrow rate for RDS Proxy. Added pinned sessions because AWS documents `DatabaseConnectionsCurrentlySessionPinned` as an important RDS Proxy metric.

## Review Notes
Python and JSON snippets were syntax-checked locally. The JavaScript snippet was syntax-checked with Node.js. The local environment did not have the AWS CLI installed, so AWS CLI commands were verified against AWS's official CLI command reference and service documentation.
