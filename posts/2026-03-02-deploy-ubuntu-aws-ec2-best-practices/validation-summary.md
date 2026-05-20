# Validation Summary: How to Deploy Ubuntu on AWS EC2 with Best Practices

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Ubuntu 24.04 LTS
- AWS EC2
- Amazon EBS gp3 volumes and EBS encryption
- EC2 security groups
- IAM roles and instance profiles
- AWS Systems Manager Session Manager
- EC2 User Data
- UFW, OpenSSH, unattended-upgrades, and fail2ban
- Amazon CloudWatch agent
- Elastic IP and DNS
- AWS cost optimization services

## Sources Consulted
- Canonical Ubuntu on AWS documentation: https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/
- AWS EC2 CLI command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/
- Amazon EBS gp3 documentation: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- Amazon EBS encryption by default documentation: https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html
- AWS Systems Manager Session Manager documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html
- AmazonSSMManagedInstanceCore managed policy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonSSMManagedInstanceCore.html
- Amazon CloudWatch agent installation documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html
- Amazon CloudWatch agent download package documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/download-CloudWatch-Agent-on-EC2-Instance-commandline-first.html
- Amazon CloudWatch agent manual installation documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/manual-installation.html
- Amazon CloudWatch agent startup documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/start-CloudWatch-Agent-on-premise-SSM-onprem.html
- Amazon EC2 detailed monitoring documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/manage-detailed-monitoring.html

## Issues Found
- The post said AWS maintains official Ubuntu AMIs. Changed this to Canonical publishes official Ubuntu AMIs on AWS, matching Canonical's Ubuntu on AWS documentation and the documented Canonical owner ID.
- The gp3 maximum IOPS claim was outdated at 16,000 IOPS for regular EBS volumes. Updated it to 80,000 IOPS on sufficiently large volumes, matching current Amazon EBS documentation.
- The IAM role example only attached `AmazonSSMManagedInstanceCore`, but the CloudWatch agent also needs permission to publish metrics. Added `CloudWatchAgentServerPolicy`.
- The User Data example attempted to install `amazon-cloudwatch-agent` with `apt`. AWS documents package-manager installation for Amazon Linux, while Ubuntu uses the downloaded `.deb` package. Replaced it with the official Ubuntu `.deb` download and `dpkg` install flow.
- The SSH restart command used `systemctl restart sshd`, which is not the standard Ubuntu OpenSSH service name. Changed it to `systemctl restart ssh`.
- The UFW example allowed HTTP and HTTPS but not SSH before enabling the firewall, which could lock out SSH-based administration. Added a restricted SSH allow rule matching the earlier organization CIDR example.
- The CloudWatch agent section installed the agent with `apt` and started the systemd service directly. Replaced this with the official Ubuntu `.deb` install and `amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s` command so the JSON configuration is loaded.
- The cost section referred to AWS Cost Explorer alerts for budget thresholds. Changed this to AWS Budgets alerts, which is the AWS service used for budget threshold alerts.

## Review Notes
The examples are intentionally illustrative and use placeholder IDs such as `ami-0abcdef1234567890`, `sg-0123456789abcdef0`, and `i-0123456789abcdef0`; readers still need to substitute real IDs, regions, VPCs, and CIDR ranges. The CloudWatch agent package URL shown is for x86-64 Ubuntu; Graviton instances should use the documented ARM64 Ubuntu package URL.
