# Validation Summary: How to Set Up AWS Transfer Family for FTPS Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Transfer Family
- FTPS
- AWS Certificate Manager
- Amazon VPC endpoints and security groups
- Amazon Route 53
- Amazon S3
- AWS IAM
- AWS Lambda custom identity providers
- AWS Transfer Family managed workflows
- Amazon CloudWatch Logs and metrics
- AWS CLI

## Sources Consulted
- AWS Transfer Family User Guide: Create an FTPS-enabled server: https://docs.aws.amazon.com/transfer/latest/userguide/create-server-ftps.html
- AWS CLI Command Reference: transfer create-server: https://docs.aws.amazon.com/cli/latest/reference/transfer/create-server.html
- AWS Transfer Family User Guide: Configuring SFTP, FTPS, or FTP server endpoints: https://docs.aws.amazon.com/transfer/latest/userguide/sftp-for-transfer-family.html
- AWS Transfer Family User Guide: Working with custom hostnames: https://docs.aws.amazon.com/transfer/latest/userguide/requirements-dns.html
- AWS Transfer Family User Guide: Create an IAM role and policy: https://docs.aws.amazon.com/transfer/latest/userguide/requirements-roles.html
- AWS Transfer Family User Guide: Creating a session policy for an Amazon S3 bucket: https://docs.aws.amazon.com/transfer/latest/userguide/users-policies-session.html
- AWS Transfer Family User Guide: Using AWS Lambda to integrate your identity provider: https://docs.aws.amazon.com/transfer/latest/userguide/custom-lambda-idp.html
- AWS CLI Command Reference: transfer create-workflow: https://docs.aws.amazon.com/cli/latest/reference/transfer/create-workflow.html
- AWS Transfer Family User Guide: Transferring files using a client: https://docs.aws.amazon.com/transfer/latest/userguide/transfer-file.html
- AWS Transfer Family User Guide: CloudWatch log structure: https://docs.aws.amazon.com/transfer/latest/userguide/cw-structure-logs.html
- AWS Transfer Family User Guide: CloudWatch metrics: https://docs.aws.amazon.com/transfer/latest/userguide/metrics.html
- Amazon CloudWatch Logs User Guide: Filter pattern syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html

## Issues Found
- The server creation example used `SERVICE_MANAGED` for an FTPS server. AWS CLI documentation states that FTP/FTPS servers must use `AWS_DIRECTORY_SERVICE`, `AWS_LAMBDA`, or `API_GATEWAY`, so the example now uses an AWS Lambda identity provider.
- The user creation section used `aws transfer create-user` and SSH keys for FTPS users. Service-managed users and SSH keys are SFTP-oriented; FTPS authentication should come from AWS Managed Microsoft AD or a custom identity provider. The section now shows a Lambda identity provider response and `test-identity-provider`.
- The IAM role policy used `${transfer:UserName}` directly in an IAM role policy. Transfer Family policy variables are for session policies supplied to users, not managed policies or IAM role definitions. The role policy now grants bucket access and the per-user restriction is shown as a custom identity provider session policy.
- The FTPS test command used curl with an SSH private key. FTPS uses TLS plus username/password authentication, not SSH key authentication. The curl example now uses `--ssl-reqd` and a password.
- The managed workflow example used `${transfer:UserName}`. Workflow variables use `${Transfer:UserName}`, so the variable casing was corrected.
- The monitoring alarm used a non-existent `AWS/Transfer` metric named `InvocationsFailed` for authentication failures. The post now creates a CloudWatch Logs metric filter for `AUTH_FAILURE` events and alarms on that custom metric.
- The security policy note implied `TransferSecurityPolicy-2024-01` was the latest available policy. AWS documents it as the default, while newer policy names exist, so the wording was updated.

## Review Notes
The post remains a high-level tutorial and assumes the Lambda/API Gateway identity provider implementation already exists. A future improvement would be to link directly to a complete custom identity provider implementation or include a minimal Lambda handler.
