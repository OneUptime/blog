# Validation Summary: How to Install and Configure the CloudWatch Agent on EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon CloudWatch
- Amazon CloudWatch Agent
- CloudWatch Logs
- AWS Systems Manager Run Command
- AWS Systems Manager Parameter Store
- AWS IAM
- AWS CLI
- Linux package installation

## Sources Consulted
- AWS CloudWatch: Installing the CloudWatch agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-on-EC2-Instance.html
- AWS CloudWatch: Download the CloudWatch agent package: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-CloudWatch-Agent-on-EC2-Instance-commandline-first.html
- AWS CloudWatch: Manually create or edit the CloudWatch agent configuration file: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS CloudWatch: Examples of configuration files: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-cloudwatch-agent-configuration-file-examples.html
- AWS CloudWatch: Create the CloudWatch agent configuration file with the wizard: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-cloudwatch-agent-configuration-file-wizard.html
- AWS CloudWatch: Starting the CloudWatch agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/start-CloudWatch-Agent-on-premise-SSM-onprem.html
- AWS CloudWatch: Prerequisites for the CloudWatch agent: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/prerequisites.html
- AWS Managed Policy Reference: CloudWatchAgentServerPolicy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html
- AWS Systems Manager: Install or update Distributor packages: https://docs.aws.amazon.com/systems-manager/latest/userguide/distributor-working-with-packages-deploy.html
- AWS CLI Command Reference: cloudwatch list-metrics: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/list-metrics.html

## Issues Found
- The post implied the shown `processes` metrics would identify which processes consume the most CPU. The CloudWatch Agent `processes` section reports process state counts, not per-process CPU usage, so the question was changed to match the configured metrics.
- The Ubuntu/Debian package example used a single Ubuntu package URL for both platforms. I split Ubuntu and Debian into separate examples using the AWS-documented package URLs.
- The Red Hat/CentOS package example used the Red Hat package URL for both platforms. I split Red Hat and CentOS into separate examples using the AWS-documented package URLs.
- The minimum IAM policy omitted `logs:PutRetentionPolicy`, but the sample log configuration sets `retention_in_days`. I added the permission required for the agent to apply log group retention policies.
- The SSM Parameter Store example used `/cloudwatch-agent/config/linux`, which does not match the `AmazonCloudWatch-*` parameter ARN allowed by the AWS managed `CloudWatchAgentServerPolicy`. I changed the example parameter name to `AmazonCloudWatch-linux`.
- The private subnet note did not mention Systems Manager connectivity when installing the agent with Systems Manager or fetching configuration from Parameter Store. I added that caveat.

## Review Notes
The corrected CloudWatch Agent configuration structure, metric names, log collection fields, `amazon-cloudwatch-agent-ctl` usage, SSM package installation pattern, and `aws cloudwatch list-metrics` command syntax match AWS documentation. The sample still assumes x86-64 Linux packages and common interface/log paths; ARM64 instances, Ubuntu systems that use `/var/log/auth.log`, and applications with different log locations would need adjusted examples.
