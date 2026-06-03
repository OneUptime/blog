# Validation Summary: How to Use EC2 Instance Profiles for IAM Role Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM roles and instance profiles
- Amazon EC2
- AWS CLI
- EC2 Instance Metadata Service, including IMDSv2
- AWS SDK for Python (boto3)
- AWS SDK for JavaScript v3
- AWS SDK for Java 2.x
- Terraform AWS Provider
- Amazon S3, Amazon SQS, and Amazon CloudWatch Logs IAM permissions

## Sources Consulted
- AWS EC2 User Guide: IAM roles for Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html
- AWS IAM User Guide: Use an IAM role to grant permissions to applications running on Amazon EC2 instances - https://docs.aws.amazon.com/IAM/latest/UserGuide/roles-usingrole-ec2instance.html
- AWS EC2 User Guide: Retrieve security credentials from instance metadata - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-security-credentials.html
- AWS EC2 User Guide: Use the Instance Metadata Service to access instance metadata - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS EC2 User Guide: Configure the Instance Metadata Service options - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html
- AWS CLI Command Reference: associate-iam-instance-profile - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-iam-instance-profile.html
- AWS SDKs and Tools Reference Guide: Standardized credential providers - https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html
- Amazon SQS Developer Guide: Overview of managing access in Amazon SQS - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-overview-of-managing-access.html
- AWS Service Authorization Reference: Actions, resources, and condition keys for Amazon CloudWatch Logs - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html
- AWS SDK for Java 2.x Developer Guide: Amazon S3 examples - https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/java_s3_code_examples.html
- Terraform Registry: aws_iam_instance_profile - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- Terraform Registry: aws_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- OneUptime linked post: How to Monitor AWS Infrastructure with CloudWatch - https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view

## Issues Found
- The custom SQS policy used an S3 ARN (`arn:aws:s3:::my-app-queue`) for SQS actions. Changed it to an SQS queue ARN (`arn:aws:sqs:us-east-1:123456789012:my-app-queue`) because SQS queue resources use the `arn:aws:sqs:region:account-id:queue-name` format.
- The CloudWatch Logs policy used one log-group ARN for `CreateLogGroup`, `CreateLogStream`, and `PutLogEvents`. Split it into separate statements so `CreateLogGroup` uses a log-group ARN and `CreateLogStream` / `PutLogEvents` use a log-stream ARN, matching CloudWatch Logs resource requirements.
- The IMDS verification commands used IMDSv1-style unauthenticated metadata requests, which fail when IMDSv2 is required. Added token retrieval and token headers to the metadata curl examples.
- The JavaScript S3 example called `forEach` on `response.Contents` directly. Changed it to handle an empty or omitted `Contents` list.
- The Java AWS SDK v2 example referenced `Region.US_EAST_1` without importing `software.amazon.awssdk.regions.Region`. Added the missing import.

## Review Notes
- The post is technically relevant and its main guidance is correct: EC2 instance profiles provide temporary credentials through instance metadata, SDKs and the AWS CLI can consume them automatically, and IMDSv2 should be required where possible.
- The AWS CLI was not installed in the local workspace, so CLI syntax was verified against official AWS CLI documentation rather than local `aws --help` output.
