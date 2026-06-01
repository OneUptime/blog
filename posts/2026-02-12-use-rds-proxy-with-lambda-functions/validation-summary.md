# Validation Summary: How to Use RDS Proxy with Lambda Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon RDS Proxy
- AWS Lambda
- Amazon RDS for PostgreSQL and MySQL
- AWS IAM database authentication
- AWS Secrets Manager
- AWS CLI
- Python, Boto3, and psycopg2
- Node.js, AWS SDK for JavaScript v3, and node-postgres
- Amazon CloudWatch metrics

## Sources Consulted
- AWS CLI Command Reference: create-db-proxy - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-proxy.html
- Amazon RDS User Guide: Creating a proxy for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-creating.html
- Amazon RDS User Guide: Configuring IAM authentication for RDS Proxy - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-iam-setup.html
- Amazon RDS User Guide: Setting up database credentials for RDS Proxy - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-secrets-arns.html
- Amazon RDS User Guide: Creating a database account using IAM authentication - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.DBAccounts.html
- Amazon RDS User Guide: IAM database authentication for MariaDB, MySQL, and PostgreSQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html
- Amazon RDS User Guide: Quotas and constraints for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- AWS Lambda Developer Guide: Giving Lambda functions access to resources in an Amazon VPC - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- Boto3 RDS generate_db_auth_token reference - https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/generate_db_auth_token.html
- AWS SDK for JavaScript v3 @aws-sdk/rds-signer Signer reference - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-rds-signer/Class/Signer/
- Amazon RDS Proxy CloudWatch metrics - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy.monitoring.html

## Issues Found
- The post described the example as IAM-based database authentication while the proxy command used `AuthScheme=SECRETS` with `IAMAuth=REQUIRED`. In AWS terminology, that requires IAM authentication from Lambda to the proxy while the proxy authenticates to the database with the Secrets Manager credentials. Updated the description, proxy wording, database-user setup, and troubleshooting note to make this distinction clear.
- The PostgreSQL example granted `rds_iam` to a user that the proxy would authenticate with a Secrets Manager password. For PostgreSQL, IAM authentication takes precedence over password authentication after `rds_iam` is granted, which conflicts with the shown proxy configuration. Changed the PostgreSQL user to a password-authenticated user matching the secret.
- The MySQL example created the user with `AWSAuthenticationPlugin`, which is for database IAM authentication, not the Secrets Manager-backed proxy mode shown in the post. Changed it to a password-authenticated user matching the secret.
- The Lambda execution role setup omitted the VPC access managed policy required when attaching a function to VPC subnets. Added the `AWSLambdaVPCAccessExecutionRole` attachment command.
- The post stated a specific `db.t3.medium` `max_connections = 100` value. RDS defaults are engine- and memory-formula based, so the example was changed to "100 available connections for this workload" rather than an inaccurate instance-specific claim.
- The performance tip said to "use short IAM token TTL," but RDS IAM auth tokens have a fixed 15-minute lifetime. Reworded it to generate tokens only when opening new connections.
- The VPC cold start note gave a fixed 1-2 second penalty. Current Lambda VPC networking uses Hyperplane ENIs, so the statement was changed to the concrete costs that still apply: token generation, TLS, and opening the database connection.
- Removed an unused `@aws-sdk/client-rds` import from the Node.js example.

## Review Notes
- The Python and Node.js snippets passed local syntax checks with `python3` and `node --check`.
- The examples assume the Lambda deployment package includes non-runtime dependencies such as `psycopg2`, `pg`, and `@aws-sdk/rds-signer`.
- The RDS Proxy `QueryRequests` metric has documented caveats for PostgreSQL extended protocol workloads; `DatabaseConnectionsCurrentlySessionPinned` is often useful alongside the original connection metrics.
