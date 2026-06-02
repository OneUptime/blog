# Validation Summary: How to Install the CloudWatch Agent on EC2 Linux Instances

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Amazon EC2
- Amazon CloudWatch
- CloudWatch Agent
- AWS Systems Manager Run Command
- IAM roles and managed policies
- Linux package installation with yum, dpkg, and rpm
- CloudWatch Agent JSON configuration
- systemd service management

## Sources Consulted
- AWS CloudWatch documentation: Collect metrics, logs, and traces using the CloudWatch agent - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html
- AWS CloudWatch documentation: Download the CloudWatch agent package - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-CloudWatch-Agent-on-EC2-Instance-commandline-first.html
- AWS CloudWatch documentation: Install the CloudWatch agent using AWS Systems Manager - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/installing-cloudwatch-agent-ssm.html
- AWS CloudWatch documentation: Manually create or edit the CloudWatch agent configuration file - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS CloudWatch documentation: Examples of configuration files - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/create-cloudwatch-agent-configuration-file-examples.html
- AWS CloudWatch documentation: Starting the CloudWatch agent - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/start-CloudWatch-Agent-on-premise-SSM-onprem.html
- AWS Managed Policy Reference: CloudWatchAgentServerPolicy - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/CloudWatchAgentServerPolicy.html

## Issues Found
- The IAM setup comment said to attach `AmazonSSMManagedInstanceCore` if storing the configuration in SSM Parameter Store. That policy is needed for Systems Manager managed-node operations such as Run Command; the agent's server policy already includes `ssm:GetParameter` for `AmazonCloudWatch-*` parameters. Updated the comment to tie the policy to installing or managing the agent through Systems Manager.
- The SSM installation section said SSM Agent is pre-installed on "Amazon Linux 2 and most recent AMIs." AWS documents preinstallation for Amazon Linux, Amazon Linux 2, and some AMIs, so the wording was narrowed.
- The package-manager section used Ubuntu's `.deb` download URL for both Ubuntu and Debian. AWS publishes separate Ubuntu and Debian package URLs, so Debian now has its own command block.
- The package-manager section used Red Hat's `.rpm` download URL for both RHEL and CentOS. AWS publishes separate Red Hat and CentOS package URLs, so CentOS now has its own command block.
- The post description and manual configuration introduction said the sample collected custom metrics, but the JSON only collects system metrics and log files. Updated those sentences to describe the sample accurately.
- The user-data example downloaded the agent configuration from S3 without noting that the instance profile needs S3 read access. Added a short prerequisite sentence for that example.

## Review Notes
The CloudWatch Agent configuration fields, metric names, log collection settings, retention values, `amazon-cloudwatch-agent-ctl` usage, and systemd service commands were checked against current AWS documentation and are technically valid. The sample uses `/data` and `eth0`, which may not exist on every EC2 instance; readers should adjust those values for their own mount points and network interface names.
