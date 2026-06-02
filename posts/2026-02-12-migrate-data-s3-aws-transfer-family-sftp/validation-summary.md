# Validation Summary: How to Migrate Data to S3 Using AWS Transfer Family (SFTP)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Transfer Family
- SFTP
- Amazon S3
- AWS IAM
- AWS CLI
- Amazon Route 53
- AWS Lambda
- Amazon CloudWatch
- S3 Event Notifications

## Sources Consulted
- AWS Transfer Family User Guide: What is AWS Transfer Family? https://docs.aws.amazon.com/transfer/latest/userguide/what-is-aws-transfer-family.html
- AWS Transfer Family User Guide: Create an IAM role and policy https://docs.aws.amazon.com/transfer/latest/userguide/requirements-roles.html
- AWS Transfer Family User Guide: Allowing read and write access to an Amazon S3 bucket https://docs.aws.amazon.com/transfer/latest/userguide/users-policies-all-access.html
- AWS CLI Command Reference: aws transfer create-server https://docs.aws.amazon.com/cli/latest/reference/transfer/create-server.html
- AWS CLI Command Reference: aws transfer create-user https://docs.aws.amazon.com/cli/latest/reference/transfer/create-user.html
- AWS Transfer Family User Guide: Implementing logical directories https://docs.aws.amazon.com/transfer/latest/userguide/implement-log-dirs.html
- AWS Transfer Family User Guide: Create a server in a virtual private cloud https://docs.aws.amazon.com/transfer/latest/userguide/create-server-in-vpc.html
- AWS Transfer Family User Guide: Working with custom hostnames https://docs.aws.amazon.com/transfer/latest/userguide/requirements-dns.html
- AWS Transfer Family User Guide: Using AWS Lambda to integrate your identity provider https://docs.aws.amazon.com/transfer/latest/userguide/custom-lambda-idp.html
- Amazon S3 User Guide: Event notification types and destinations https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html
- Amazon S3 API Reference: PutBucketNotificationConfiguration https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketNotificationConfiguration.html
- AWS Transfer Family User Guide: Using CloudWatch metrics for Transfer Family servers https://docs.aws.amazon.com/transfer/latest/userguide/metrics.html
- AWS Transfer Family API Reference: StopServer https://docs.aws.amazon.com/transfer/latest/APIReference/API_StopServer.html
- AWS Transfer Family Pricing https://aws.amazon.com/aws-transfer-family/pricing/

## Issues Found
- The IAM policy grouped bucket-level and object-level S3 permissions in one statement across both bucket and object ARNs. I split it into separate bucket and object statements to match AWS's documented S3 access policy pattern.
- The VPC endpoint explanation said it keeps SFTP traffic within the VPC. I clarified that a VPC-hosted endpoint can be internal-only or internet-facing with Elastic IP addresses and security groups.
- The Lambda custom identity provider example called `validate_password` without defining it. I added a minimal placeholder implementation so the Python example is runnable as a simplified example.
- The S3 event notification command omitted the Lambda resource permission required for S3 to invoke the function. I added the `aws lambda add-permission` command before the bucket notification configuration.
- The CloudWatch alarm was labeled as failed authentication monitoring but used the `FilesIn` metric, which measures files transferred into the server. I changed it to a no-files-arrived alarm and added a note that failed authentication monitoring should use CloudWatch Logs and metric filters.
- The cost section said stopping the server during off-hours would save endpoint costs. AWS documentation states that stopping a Transfer Family server does not reduce endpoint billing; the server must be deleted to stop those charges. I corrected the pricing explanation.

## Review Notes
- The AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI and AWS service documentation rather than local `aws --help` output.
- The example bucket name `sftp-landing-bucket` is illustrative; in a real account, S3 bucket names must be globally unique.
- The trust policy shown works, but production roles should consider AWS's confused deputy prevention guidance by adding appropriate `aws:SourceArn` and account conditions.
