# Validation Summary: How to Set Up AWS Transfer Family for SFTP Access to S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Transfer Family
- SFTP
- Amazon S3
- AWS IAM
- Amazon CloudWatch Logs
- Amazon Route 53
- AWS Lambda
- AWS CLI

## Sources Consulted
- AWS CLI Command Reference: `aws transfer create-server` - https://docs.aws.amazon.com/cli/latest/reference/transfer/create-server.html
- AWS CLI Command Reference: `aws transfer create-user` - https://docs.aws.amazon.com/cli/latest/reference/transfer/create-user.html
- AWS CLI Command Reference: `aws transfer describe-server` - https://docs.aws.amazon.com/cli/latest/reference/transfer/describe-server.html
- AWS CLI Command Reference: `aws transfer list-executions` - https://docs.aws.amazon.com/cli/latest/reference/transfer/list-executions.html
- AWS Transfer Family User Guide: Configure CloudWatch logging role - https://docs.aws.amazon.com/transfer/latest/userguide/configure-cw-logging-role.html
- AWS Transfer Family User Guide: Configuring an SFTP, FTPS, or FTP server endpoint - https://docs.aws.amazon.com/transfer/latest/userguide/sftp-for-transfer-family.html
- AWS Transfer Family User Guide: Create a server in a virtual private cloud - https://docs.aws.amazon.com/transfer/latest/userguide/create-server-in-vpc.html
- AWS Transfer Family User Guide: Working with custom hostnames - https://docs.aws.amazon.com/transfer/latest/userguide/requirements-dns.html
- AWS Transfer Family User Guide: Managing access controls and session policies - https://docs.aws.amazon.com/transfer/latest/userguide/users-policies.html
- AWS CLI Command Reference: `aws s3api create-bucket` - https://docs.aws.amazon.com/cli/latest/reference/s3api/create-bucket.html
- AWS CLI Command Reference: `aws s3api put-bucket-notification-configuration` - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-notification-configuration.html
- Amazon S3 User Guide: Granting permissions to publish event notification messages to a destination - https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-destinations-permissions-to-s3.html
- AWS CLI Command Reference: `aws lambda add-permission` - https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS CLI Command Reference: `aws route53 change-resource-record-sets` - https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- Added `logs:DescribeLogStreams` to the CloudWatch logging role policy to match AWS Transfer Family's documented logging role permissions.
- Changed the user IAM role description from path-scoped to a base user role, then added a `--policy` session policy to the `partner-acme` user so the example actually scopes access to the intended S3 prefix.
- Added `s3:GetBucketLocation` and `s3:DeleteObjectVersion` to the S3 policy examples, consistent with AWS's documented Transfer Family S3 access examples and the post's versioning setup.
- Added `--ssh-public-key-body` to the logical directory user example so the service-managed user can authenticate with an SSH key.
- Replaced invalid `aws transfer describe-server --query 'Server.Endpoint'` examples. Current AWS CLI output does not include a top-level `Server.Endpoint`; public IPv4 endpoint hostnames use the documented `server-id.server.transfer.region.amazonaws.com` format.
- Replaced the misleading `EndpointDetails.VpcEndpointId` "server endpoint" example with an explicit public endpoint hostname construction.
- Added `aws lambda add-permission` before configuring S3 event notifications, because S3 must have permission to invoke the Lambda destination.
- Corrected the monitoring section so `list-executions` is described as listing in-progress workflow executions, not user sessions.
- Updated the server status query to return `EndpointType` instead of the nonexistent `Endpoint` field.

## Review Notes
The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and AWS service documentation. The VPC endpoint example remains accurate for an internal VPC-hosted endpoint; internet-facing VPC endpoints require Elastic IP allocation IDs and related endpoint details.
