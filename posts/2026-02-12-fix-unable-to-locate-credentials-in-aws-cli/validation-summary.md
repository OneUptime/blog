# Validation Summary: How to Fix 'Unable to Locate Credentials' in AWS CLI

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS CLI
- AWS IAM
- AWS IAM Identity Center / SSO
- Amazon EC2 instance profiles and instance metadata
- AWS Lambda execution roles
- Docker containers
- Amazon ECS task roles
- Boto3

## Sources Consulted
- AWS CLI User Guide: Authentication and access credentials for the AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-authentication.html
- AWS CLI User Guide: Configuration and credential file settings: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS CLI User Guide: Configuring environment variables: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
- AWS CLI User Guide: Command line options: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-options.html
- AWS CLI User Guide: Using Amazon EC2 instance metadata as credentials: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-metadata.html
- AWS CLI Command Reference: create-instance-profile: https://docs.aws.amazon.com/cli/latest/reference/iam/create-instance-profile.html
- AWS CLI Command Reference: associate-iam-instance-profile: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-iam-instance-profile.html
- AWS Lambda Developer Guide: Defining Lambda function permissions with an execution role: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda Developer Guide: Working with Lambda environment variables: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- Amazon ECS Developer Guide: Amazon ECS task IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html
- Amazon ECS Developer Guide: Best practices for IAM roles in Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-iam-roles.html
- Boto3 documentation: Credentials: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/credentials.html

## Issues Found
- The AWS CLI credential precedence list was incomplete and out of order. Updated it to include assume-role, web identity, IAM Identity Center, custom credential process, shared files, container credentials, and EC2 instance profile credentials in the order documented by AWS.
- The environment variable example omitted `AWS_SESSION_TOKEN` for temporary credentials. Added a note that temporary credentials also require the session token.
- The `AWS_PROFILE` troubleshooting note said a missing profile would specifically produce the "Unable to locate credentials" error. Adjusted it to describe the more accurate profile-not-found or unexpected-profile behavior.
- The credentials-file "wrong format" example incorrectly labeled the no-spaces-around-equals form as wrong. Replaced it with an actually invalid example using incorrect key names.
- The EC2 instance metadata check used an IMDSv1-only request. Updated it to fetch an IMDSv2 token and pass it when checking IAM role credentials.
- The Lambda Boto3 example claimed that passing `None` credentials clears automatic credentials. Replaced it with an example that removes Lambda-provided credential environment variables before creating the client.
- The ECS `taskRoleArn` example used a 9-digit account ID. Corrected it to a 12-digit AWS account ID.

## Review Notes
The post is technically relevant and remains a useful troubleshooting guide. The examples use long-term access-key placeholders for local development; in future updates, it would be worth emphasizing AWS's current recommendation to prefer short-term credentials where practical.
