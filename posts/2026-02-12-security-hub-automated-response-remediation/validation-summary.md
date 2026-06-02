# Validation Summary: How to Use Security Hub Automated Response and Remediation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Security Hub CSPM
- Amazon EventBridge
- AWS Lambda
- AWS Systems Manager Automation
- AWS CloudFormation
- AWS Step Functions
- Amazon S3
- Amazon EC2 security groups
- AWS CloudTrail
- AWS CLI
- Python / boto3

## Sources Consulted
- AWS Security Hub: Using EventBridge for automated response and remediation: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cloudwatch-events.html
- AWS Security Hub: Configuring an EventBridge rule for Security Hub findings: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-all-findings.html
- AWS Security Hub: Creating a custom action: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-configure.html
- AWS Security Hub: Defining an EventBridge rule for custom actions: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-define-rule.html
- AWS Security Hub: Event formats for custom actions: https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-event-formats.html
- AWS CLI: securityhub batch-update-findings: https://docs.aws.amazon.com/cli/latest/reference/securityhub/batch-update-findings.html
- AWS CLI: securityhub get-findings: https://docs.aws.amazon.com/cli/latest/reference/securityhub/get-findings.html
- AWS Solutions: Automated Security Response on AWS deployment guide: https://docs.aws.amazon.com/solutions/latest/automated-security-response-on-aws/deployment.html
- Amazon S3 API: PutBucketEncryption: https://docs.aws.amazon.com/AmazonS3/latest/API/API_PutBucketEncryption.html
- AWS Systems Manager Automation runbook reference: AWS-ConfigureS3BucketLogging: https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-configures3bucketlogging.html
- AWS Lambda CLI: add-permission: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- Amazon EventBridge: resource-based policies and Lambda permissions: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html

## Issues Found
- The AWS-provided solution deployment example used the old `aws-security-hub-automated-response-and-remediation` template URL and an invalid `LogLevel` parameter for the current solution template. Updated the command to use the current `automated-security-response-on-aws` admin template and a documented parameter.
- The solution deployment text implied a single stack completes the whole current ASR deployment. Updated it to note that the admin stack is deployed first and member roles/member stacks are also required.
- The security group remediation revoked the full matching `IpPermission`, which could remove non-public CIDR rules bundled in the same permission. Updated the code to revoke only the unrestricted IPv4/IPv6 ranges.
- The EventBridge-to-Lambda CLI example omitted the Lambda resource-based permission needed for EventBridge invocation. Added `aws lambda add-permission` with the `events.amazonaws.com` principal and rule ARN.
- The Security Hub custom action EventBridge rule filtered by `detail.actionName`. AWS documentation recommends matching the custom action ARN in the event `resources` field. Updated the event pattern.
- The SSM Automation example referenced a non-existent `AWS-EnableS3BucketLogging` runbook. Updated it to the documented `AWS-ConfigureS3BucketLogging` runbook and added the required grantee parameters.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI verification was performed against current official AWS CLI and service documentation instead of local `--help` output.
- The S3 logging runbook uses ACL grantee parameters. Amazon S3 ended support for creating new email grantee ACLs on October 1, 2025, so the example uses the S3 log delivery group URI rather than an email grantee.
