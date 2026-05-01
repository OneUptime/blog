# Validation Summary: How to Set Up EC2 Instance Connect with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS EC2
- EC2 Instance Connect
- EC2 Instance Connect Endpoint
- AWS CLI
- AWS IAM
- SSH

## Sources Consulted
- AWS CLI Command Reference: `ec2-instance-connect ssh` — https://docs.aws.amazon.com/cli/latest/reference/ec2-instance-connect/ssh.html
- Amazon EC2 User Guide: Prerequisites for EC2 Instance Connect — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-prerequisites.html
- Amazon EC2 User Guide: Install EC2 Instance Connect on your EC2 instances — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-set-up.html
- Amazon EC2 User Guide: Grant IAM permissions for EC2 Instance Connect — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-configure-IAM-role.html
- Amazon EC2 User Guide: Connect to a Linux instance using EC2 Instance Connect — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-methods.html
- Amazon EC2 User Guide: Connect to an Amazon EC2 instance using EC2 Instance Connect Endpoint — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-using-eice.html
- Amazon EC2 User Guide: Security groups for EC2 Instance Connect Endpoint — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/eice-security-groups.html
- Amazon EC2 User Guide: Grant permissions to use EC2 Instance Connect Endpoint — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/permissions-for-ec2-instance-connect-endpoint.html
- Amazon EC2 User Guide: Log Amazon EC2 API calls using AWS CloudTrail — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitor-with-cloudtrail.html
- Amazon EC2 User Guide: Log connections established over EC2 Instance Connect Endpoint — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/log-ec2-instance-connect-endpoint-using-cloudtrail.html
- Terraform AWS Provider docs: `aws_ec2_instance_connect_endpoint` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_instance_connect_endpoint.html.markdown
- Terraform AWS Provider docs: `aws_instance` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- Amazon Linux 2 on Amazon EC2 — https://docs.aws.amazon.com/linux/al2/ug/ec2.html
- Amazon Linux 2 release notes (2026-04-13) — https://docs.aws.amazon.com/AL2/latest/relnotes/relnotes-20260413.html

## Issues Found
- The prerequisites omitted AWS CLI v2, but the `aws ec2-instance-connect ssh` command is only available in AWS CLI v2. I added that requirement.
- The IAM example only allowed `ec2-instance-connect:SendSSHPublicKey`, which is insufficient for connecting to private instances through an EC2 Instance Connect Endpoint. I added `ec2-instance-connect:OpenTunnel` scoped to port 22 on the endpoint.
- The IAM snippet referenced `data.aws_caller_identity.current.account_id` without declaring the `aws_caller_identity` data source. I added the missing data source so the HCL is self-contained.
- The endpoint example enabled `preserve_client_ip = true` without fixing the endpoint IP type. I added `ip_address_type = "ipv4"` because client IP preservation is supported only on IPv4 EC2 Instance Connect Endpoints.
- The EC2 instance example referenced an AMI data source and an instance profile that were not defined in the post. I added the missing AMI lookup and removed the unrelated `iam_instance_profile` line so the example can stand on its own.
- The CLI example did not explicitly select the endpoint-based connection path. I added `--connection-type eice`, which matches the official AWS guidance for EC2 Instance Connect Endpoint usage.
- The post created an IAM policy but did not say it must be attached to the connecting IAM user or role. I added that clarification because the policy is ineffective until attached.

## Review Notes
- The post is technically valid after the fixes above.
- The sample instance still uses Amazon Linux 2. AWS states Amazon Linux 2 reaches end of life on June 30, 2026, so a future refresh should consider switching the example AMI to AL2023.
