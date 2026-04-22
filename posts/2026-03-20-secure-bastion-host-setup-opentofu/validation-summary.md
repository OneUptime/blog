# Validation Summary: How to Build a Secure Bastion Host Setup with OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- Terraform/OpenTofu HCL
- AWS Provider for Terraform/OpenTofu
- Amazon EC2
- EC2 Instance Connect
- AWS Identity and Access Management (IAM)
- Amazon VPC security groups
- Amazon CloudWatch Logs
- Amazon CloudWatch Agent
- Amazon CloudWatch metric alarms
- AWS Systems Manager Session Manager

## Sources Consulted
- OpenTofu resource block syntax: https://opentofu.org/docs/language/resources/syntax/
- OpenTofu configuration syntax: https://opentofu.org/docs/language/syntax/configuration/
- Terraform AWS Provider `aws_instance` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- Terraform AWS Provider `aws_security_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown
- Terraform AWS Provider `aws_cloudwatch_metric_alarm` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- Terraform AWS Provider `aws_iam_role_policy_attachment` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/iam_role_policy_attachment.html.markdown
- Terraform AWS Provider `aws_region` data source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/region.html.markdown
- AWS EC2 Instance Connect setup documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-set-up.html
- AWS EC2 Instance Connect connection methods: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-methods.html
- AWS CLI `ec2-instance-connect ssh` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/ssh.html
- Amazon CloudWatch Agent manual installation documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/manual-installation.html
- Amazon CloudWatch Agent configuration file documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- Deprecated CloudWatch Logs agent documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/UsePreviousCloudWatchLogsAgent.html
- Amazon EC2 CloudWatch alarm actions documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/UsingAlarmActions.html
- Amazon CloudWatch `PutMetricAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_PutMetricAlarm.html
- AWS Systems Manager Session Manager documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- AWS Systems Manager Session Manager logging documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging.html
- AWS Systems Manager Session Manager CloudWatch Logs documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-logging-cloudwatch-logs.html
- AWS Systems Manager start-session documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html
- AWS Systems Manager instance profile permissions documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started-instance-profile.html
- Amazon VPC security group documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html
- Amazon VPC NAT gateway use cases: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html

## Issues Found
- The `aws_instance` example used `user_data = base64encode(...)`. The AWS provider expects raw user data in `user_data`; base64-encoded data belongs in `user_data_base64`. Changed the example to a raw heredoc so cloud-init receives and runs the shell script.
- The post installed the deprecated `awslogs` agent and did not configure any log forwarding. Replaced it with the unified Amazon CloudWatch Agent, added a minimal log collection configuration for SSH auth/session logs, enabled `rsyslog`, and added the required `CloudWatchAgentServerPolicy` IAM attachment.
- The security group egress comment said traffic would route through NAT while the rule only allowed `10.0.0.0/8`. Updated the comment to describe the intended VPC endpoint/private AWS API access pattern.
- The EC2 Instance Connect wording implied that SSH keys are eliminated entirely. Adjusted it to say EC2 Instance Connect uses temporary SSH public keys and avoids long-lived public keys on the instance.
- The Session Manager example said all sessions are logged. AWS documents logging as configurable and notes limitations for SSH/port-forwarding sessions. Updated the wording to say session data can be logged when Session Manager logging preferences are configured.
- The idle alarm sent only an SNS notification, which would not stop the instance by itself. Changed the alarm action to the documented EC2 stop action ARN and added an `aws_region` data source to construct it.

## Review Notes
- The HCL snippets still assume surrounding module, variable, provider, and AMI data source definitions exist elsewhere in the reader's configuration.
- The restricted egress example requires private access to AWS services, such as VPC endpoints, for package installation and CloudWatch Logs delivery.
- The CloudWatch Agent example captures SSH authentication/session log records, not full terminal transcripts. Full command/session recording would require additional session recording tooling or configured Session Manager logging.
- The local environment did not have `tofu` or `terraform` installed, so validation was performed against official documentation rather than by running `tofu validate`.
