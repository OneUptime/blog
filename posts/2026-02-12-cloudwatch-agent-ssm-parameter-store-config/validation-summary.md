# Validation Summary: How to Use CloudWatch Agent with SSM Parameter Store for Config

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon CloudWatch Agent
- AWS Systems Manager Parameter Store
- AWS Systems Manager Run Command
- Amazon EC2
- AWS IAM
- AWS CLI
- EC2 Instance Metadata Service v2
- AWS KMS SecureString parameters

## Sources Consulted
- AWS CloudWatch documentation: Manually create or edit the CloudWatch agent configuration file - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS CloudWatch documentation: Install the CloudWatch agent using AWS Systems Manager - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/installing-cloudwatch-agent-ssm.html
- AWS CloudWatch documentation: Create the CloudWatch agent configuration file - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-cloudwatch-agent-configuration-file.html
- AWS Prescriptive Guidance: Managing CloudWatch agent configuration files - https://docs.aws.amazon.com/prescriptive-guidance/latest/implementing-logging-monitoring-cloudwatch/create-store-cloudwatch-configurations.html
- AWS Systems Manager documentation: Working with parameter versions in Parameter Store - https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-versions.html
- AWS CLI Command Reference: ssm put-parameter - https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- AWS CLI Command Reference: ssm send-command - https://docs.aws.amazon.com/cli/latest/reference/ssm/send-command.html
- AWS Managed Policy Reference: CloudWatchAgentServerPolicy - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
- AWS Managed Policy Reference: AmazonSSMManagedInstanceCore - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html
- Amazon EC2 documentation: Access instance metadata for an EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- AWS Systems Manager documentation: AWS KMS encryption for SecureString parameters - https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html

## Issues Found
- The EC2 user-data example used IMDSv1 metadata requests. This can fail on instances configured to require IMDSv2, so the snippet now obtains an IMDSv2 token and sends it when retrieving the instance ID and Region.
- The IAM section pointed readers primarily to `AmazonSSMManagedInstanceCore`. That policy includes SSM managed-instance permissions, but the CloudWatch agent workload permissions are covered by `CloudWatchAgentServerPolicy`, which also includes `ssm:GetParameter` for `AmazonCloudWatch-*` parameters and `logs:PutRetentionPolicy` for the post's `retention_in_days` example. The text now states this distinction and notes that `AmazonSSMManagedInstanceCore` is still needed when using Run Command to manage the instance.

## Review Notes
The remaining CloudWatch Agent control commands, `ssm:` configuration source syntax, `append-config` usage, Run Command document parameters, Parameter Store version examples, and CloudWatch Agent JSON fields were consistent with the consulted AWS documentation.
